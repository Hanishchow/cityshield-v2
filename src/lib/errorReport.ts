/**
 * Client error logging: uncaught errors, unhandled promise rejections and
 * screen crashes (RouteBoundary) are sent to POST /v1/client-errors, where the
 * API logs them and records them in the audit log. Deduplicated and capped so
 * a render loop can never flood the server. No personal data is sent beyond
 * the page path and browser user-agent.
 */
import { getToken } from './api/identity.ts';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';
const RELEASE = (import.meta.env.VITE_RELEASE as string | undefined) ?? import.meta.env.MODE;
const seen = new Set<string>();
let sent = 0;

export function reportError(source: 'error' | 'unhandledrejection' | 'boundary', err: unknown) {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err) ?? 'Unknown error');
  const key = `${source}:${e.message}`;
  if (seen.has(key) || sent >= 10) return;
  seen.add(key); sent++;
  if (import.meta.env.DEV) console.warn('[client-error]', source, e);
  const tok = getToken('live');
  const body = JSON.stringify({
    source, message: e.message.slice(0, 500), stack: e.stack?.slice(0, 4000), release: RELEASE,
    url: location.pathname.slice(0, 500), ua: navigator.userAgent.slice(0, 300),
  });
  void fetch(`${BASE}/v1/client-errors`, {
    method: 'POST', keepalive: true, body,
    headers: { 'content-type': 'application/json', 'ngrok-skip-browser-warning': '1', ...(tok ? { authorization: `Bearer ${tok}` } : {}) },
  }).catch(() => { /* offline: nothing to do */ });
}

export function installErrorReporting() {
  window.addEventListener('error', (ev) => reportError('error', ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => reportError('unhandledrejection', ev.reason));
}
