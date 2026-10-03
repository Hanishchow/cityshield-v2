/**
 * Picks the backend. The live API is preferred; if /health does not answer the
 * app switches to offline demo mode and keeps probing, switching back when the
 * server returns. An emergency app must never refuse to open because a server
 * is down — 112 stays one tap away in either mode.
 */
import { create } from 'zustand';
import type { Health } from '@shared/contract.ts';
import type { Backend } from './backend.ts';
import { createHttpBackend } from './http.ts';
import { createOfflineBackend } from './offline.ts';
import { ApiError } from './backend.ts';
import { getToken, setToken } from './identity.ts';

interface ConnState {
  backend: Backend | null;
  mode: 'live' | 'offline' | 'connecting';
  health: Health | null;
  /** serverTime - Date.now(), so every client animates on the server's clock. */
  offset: number;
}
export const useConn = create<ConnState>(() => ({ backend: null, mode: 'connecting', health: null, offset: 0 }));

let offsetRef = 0;
export const serverNow = () => Date.now() + offsetRef;

const PROBE_MS = 2500;
async function probe(): Promise<Health | null> {
  if (import.meta.env.VITE_FORCE_OFFLINE === '1') return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), PROBE_MS);
  try {
    const base = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';
    const r = await fetch(base + '/health', { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) return null;
    const h = (await r.json()) as Health;
    return h && h.ok ? h : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

let started = false, watch: ReturnType<typeof setInterval> | null = null, failures = 0;
let onSwitch: (() => void) | null = null;
export function onBackendSwitch(fn: () => void) { onSwitch = fn; }

function adopt(backend: Backend, health: Health) {
  const prev = useConn.getState().backend;
  if (prev && prev !== backend) prev.dispose();
  offsetRef = health.serverTime - Date.now();
  useConn.setState({ backend, mode: backend.mode, health, offset: offsetRef });
  if (prev) onSwitch?.();
}

export async function initConnection() {
  if (started) return;
  started = true;
  const h = await probe();
  if (h) adopt(createHttpBackend(), h);
  else { const off = createOfflineBackend(); adopt(off, await off.health()); }
  watch = setInterval(async () => {
    const { mode } = useConn.getState();
    const live = await probe();
    if (mode === 'offline' && live) { failures = 0; adopt(createHttpBackend(), live); }
    else if (mode === 'live') {
      if (live) { failures = 0; offsetRef = live.serverTime - Date.now(); useConn.setState({ health: live, offset: offsetRef }); }
      else if (++failures >= 2) { const off = createOfflineBackend(); adopt(off, await off.health()); }
    }
  }, 15_000);
}
export function stopConnection() { if (watch) clearInterval(watch); }

/** Device session first, so SOS never waits on a sign-in. Re-authenticates on 401. */
export async function ensureUser(b: Backend) {
  if (b.mode === 'live' && getToken('live')) {
    try { return await b.me(); }
    catch (e) { if (!(e instanceof ApiError && e.status === 401)) throw e; setToken('live', null); }
  }
  return (await b.session()).user;
}
