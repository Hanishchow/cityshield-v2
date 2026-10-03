import type { StreamEvent } from '@shared/contract.ts';
import { ApiError, type Backend } from './backend.ts';
import { deviceId, getToken, setToken } from './identity.ts';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

type Json = Record<string, unknown> | unknown[] | undefined;

async function call<T>(method: string, path: string, body?: Json | FormData, headers: Record<string, string> = {}): Promise<T> {
  const h: Record<string, string> = { ...headers };
  const tok = getToken('live');
  if (tok) h.authorization = `Bearer ${tok}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + path, { method, headers: h, body: payload });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText, (data as { issues?: unknown }).issues);
  return data as T;
}
const get = <T,>(p: string) => call<T>('GET', p);
const items = async <T,>(p: string) => (await get<{ items: T[] }>(p)).items;

/** One EventSource per stream, shared by every subscriber, reconnecting with backoff. */
function stream(path: string) {
  const subs = new Set<(e: StreamEvent) => void>();
  let es: EventSource | null = null, retry = 0, timer: ReturnType<typeof setTimeout> | null = null;
  const open = () => {
    const tok = getToken('live');
    es = new EventSource(`${BASE}${path}${tok ? `?token=${encodeURIComponent(tok)}` : ''}`);
    es.onmessage = (m) => { retry = 0; try { const ev = JSON.parse(m.data) as StreamEvent; subs.forEach((s) => s(ev)); } catch { /* ignore */ } };
    es.onerror = () => {
      es?.close(); es = null;
      if (!subs.size) return;
      timer = setTimeout(open, Math.min(15_000, 1000 * 2 ** retry++));
    };
  };
  return (cb: (e: StreamEvent) => void) => {
    subs.add(cb);
    if (!es && !timer) open();
    return () => {
      subs.delete(cb);
      if (!subs.size) { es?.close(); es = null; if (timer) clearTimeout(timer); timer = null; }
    };
  };
}

export function createHttpBackend(): Backend {
  const userStream = stream('/v1/stream');
  const opsStream = stream('/v1/ops/stream');
  const q = (o: Record<string, string | number>) => '?' + new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
  return {
    mode: 'live',
    health: () => get('/health'),
    async session() {
      const s = await call<import('@shared/contract.ts').Session>('POST', '/v1/auth/device', { deviceId: deviceId() });
      setToken('live', s.token);
      return s;
    },
    me: () => get('/v1/me'),
    updateMe: (p) => call('PATCH', '/v1/me', p),
    otpRequest: (phone) => call('POST', '/v1/auth/otp/request', { phone }),
    async otpVerify(phone, code) {
      const s = await call<import('@shared/contract.ts').Session>('POST', '/v1/auth/otp/verify', { phone, code, deviceId: deviceId() });
      setToken('live', s.token);
      return s;
    },
    places: () => items('/v1/places'),
    addPlace: (p) => call('POST', '/v1/places', p),
    updatePlace: (id, p) => call('PATCH', `/v1/places/${encodeURIComponent(id)}`, p),
    deletePlace: (id) => call('DELETE', `/v1/places/${encodeURIComponent(id)}`),
    nearby: (kind, lat, lng) => items(kind === 'hospital' ? `/v1/nearby/hospitals${q({ lat, lng })}` : `/v1/nearby/stations${q({ kind, lat, lng })}`),
    geoReverse: (lat, lng) => get(`/v1/geo/reverse${q({ lat, lng })}`),
    geoSearch: (s) => items(`/v1/geo/search${q({ q: s })}`),

    sos: (b, key) => call('POST', '/v1/sos', b, { 'idempotency-key': key }),
    raise: (b) => call('POST', '/v1/incidents', b),
    incidents: (active) => items(`/v1/incidents${active ? '?active=1' : ''}`),
    incident: (id) => get(`/v1/incidents/${encodeURIComponent(id)}`),
    setHospital: (id, hospitalId) => call('PATCH', `/v1/incidents/${encodeURIComponent(id)}`, { destinationHospitalId: hospitalId }),
    cancel: (id) => call('POST', `/v1/incidents/${encodeURIComponent(id)}/cancel`, {}),
    close: (id) => call('POST', `/v1/incidents/${encodeURIComponent(id)}/close`, {}),
    replay: (id) => call('POST', `/v1/incidents/${encodeURIComponent(id)}/replay`, {}),
    ping: (id, loc) => call('POST', `/v1/incidents/${encodeURIComponent(id)}/location`, loc),
    unit: (id) => get(`/v1/units/${encodeURIComponent(id)}`),

    complaints: (status) => items(`/v1/complaints?status=${status}`),
    complaint: (id) => get(`/v1/complaints/${encodeURIComponent(id)}`),
    upload(file) { const fd = new FormData(); fd.append('file', file, 'photo.jpg'); return call('POST', '/v1/uploads', fd); },
    createComplaint: (b) => call('POST', '/v1/complaints', b),

    notifications: () => items('/v1/notifications'),
    markRead: (ids) => call('POST', '/v1/notifications/read', ids ? { ids } : { all: true }),
    feedback: (message) => call('POST', '/v1/feedback', { message }),

    opsKpis: () => get('/v1/ops/kpis'),
    opsIncidents: () => items('/v1/ops/incidents'),
    opsUnits: () => items('/v1/ops/units'),
    opsWards: () => items('/v1/ops/wards'),
    opsSetComplaint: (id, status) => call('PATCH', `/v1/ops/complaints/${encodeURIComponent(id)}`, { status }),
    opsSetIncident: (id, status) => call('PATCH', `/v1/ops/incidents/${encodeURIComponent(id)}`, { status }),

    subscribe: userStream,
    subscribeOps: opsStream,
    dispose() { /* streams close when their last subscriber leaves */ },
  };
}
