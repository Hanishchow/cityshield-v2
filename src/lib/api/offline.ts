/**
 * Offline demo mode: when the API is unreachable, the browser runs the very
 * same domain engine (shared/services.ts over shared/memory.ts). Data lives in
 * memory only and resets on reload, and the UI says so.
 */
import { MemoryRepo } from '@shared/memory.ts';
import { CityShield, HttpError } from '@shared/services.ts';
import { ComplaintIn, IncidentIn, MePatchIn, PlaceIn, SosIn, type GeoResult, type Health, type StreamEvent } from '@shared/contract.ts';
import { MLABELS } from '@shared/city.ts';
import { toLatLng, toSchematic } from '@shared/geo.ts';
import { ApiError, type Backend } from './backend.ts';
import { deviceId } from './identity.ts';

export function createOfflineBackend(): Backend {
  const repo = new MemoryRepo();
  const subs = new Set<(e: StreamEvent) => void>();
  const opsSubs = new Set<(e: StreamEvent) => void>();
  const svc = new CityShield(repo, {
    demo: true,
    emit: (userId, ev) => { (userId ? subs : opsSubs).forEach((s) => s(ev)); },
  });
  const started = Date.now();
  let userId: string | null = null;
  const ready = svc.seedPublic();
  const timer = setInterval(() => { void svc.tick(); }, 1000);
  const uploads = new Map<string, string>();

  const uid = async () => {
    await ready;
    if (!userId) userId = (await svc.deviceUser(deviceId())).id;
    return userId;
  };
  /** Mirror the API's error semantics so the UI handles both modes the same way. */
  const wrap = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try { return await fn(); }
    catch (e) {
      if (e instanceof HttpError) throw new ApiError(e.status, e.message);
      if (e && typeof e === 'object' && 'issues' in e) throw new ApiError(400, 'Invalid request', (e as { issues: unknown }).issues);
      throw e;
    }
  };
  const nearestLabel = (lat: number, lng: number): GeoResult => {
    const p = toSchematic({ lat, lng });
    const areas = MLABELS.filter((l) => !l.road && !l.water);
    const best = areas.reduce((b, l) => (Math.hypot(l.x - p[0], l.y - p[1]) < Math.hypot(b.x - p[0], b.y - p[1]) ? l : b), areas[0]);
    const name = best.t.charAt(0) + best.t.slice(1).toLowerCase().replace(/ (\w)/g, (_m, c: string) => ' ' + c.toUpperCase());
    return { label: `Near ${name}, Bengaluru`, lat, lng, provider: 'mock' };
  };

  return {
    mode: 'offline',
    async health(): Promise<Health> {
      return { ok: true, store: 'memory', demo: true, serverTime: Date.now(), uptimeSeconds: Math.round((Date.now() - started) / 1000), capabilities: { geocode: 'mock', dispatch: 'simulated', notify: 'mock', telephony: 'simulated' } };
    },
    session: () => wrap(async () => ({ token: 'offline', user: await svc.me(await uid()) })),
    me: () => wrap(async () => svc.me(await uid())),
    updateMe: (p) => wrap(async () => svc.updateMe(await uid(), MePatchIn.parse(p))),
    otpRequest: async () => ({ sent: true, devCode: '123456' }),
    otpVerify: (phone, code) => wrap(async () => {
      if (code !== '123456') throw new HttpError(400, 'That code is not right. In offline demo mode the code is 123456.');
      const u = await repo.updateUser(await uid(), { phone, phoneVerified: true });
      return { token: 'offline', user: u! };
    }),

    places: () => wrap(async () => svc.places(await uid())),
    addPlace: (p) => wrap(async () => svc.addPlace(await uid(), PlaceIn.parse(p))),
    updatePlace: (id, p) => wrap(async () => svc.updatePlace(await uid(), id, PlaceIn.partial().parse(p))),
    deletePlace: (id) => wrap(async () => svc.deletePlace(await uid(), id)),
    nearby: (kind, lat, lng) => wrap(() => svc.nearby(kind, { lat, lng })),
    geoReverse: async (lat, lng) => nearestLabel(lat, lng),
    geoSearch: async (q) => {
      const s = q.trim().toLowerCase();
      if (!s) return [];
      return MLABELS.filter((l) => !l.water && l.t.toLowerCase().includes(s)).slice(0, 5).map((l) => {
        const ll = toLatLng([l.x, l.y]);
        return { label: `${l.t.charAt(0)}${l.t.slice(1).toLowerCase()}, Bengaluru`, ...ll, provider: 'mock' as const };
      });
    },

    sos: (b) => wrap(async () => svc.raise(await uid(), 'sos', SosIn.parse(b).location)),
    raise: (b) => wrap(async () => { const x = IncidentIn.parse(b); return svc.raise(await uid(), x.kind, x.location); }),
    incidents: (active) => wrap(async () => svc.incidents(await uid(), active)),
    incident: (id) => wrap(async () => svc.incident(await uid(), id)),
    setHospital: (id, h) => wrap(async () => svc.setHospital(await uid(), id, h)),
    cancel: (id) => wrap(async () => svc.cancel(await uid(), id)),
    close: (id) => wrap(async () => svc.close(await uid(), id, 'resolved')),
    replay: (id) => wrap(async () => svc.replay(await uid(), id)),
    ping: (id, loc) => wrap(async () => svc.ping(await uid(), id, loc)),
    unit: (id) => wrap(() => svc.unit(id)),

    complaints: (status) => wrap(async () => svc.complaints(await uid(), status)),
    complaint: (id) => wrap(async () => svc.complaint(await uid(), id)),
    async upload(file) {
      const url = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file); });
      const id = 'up-' + Math.random().toString(36).slice(2, 10);
      uploads.set(id, url);
      return { id, url };
    },
    createComplaint: (b) => wrap(async () => {
      const x = ComplaintIn.parse(b);
      return svc.createComplaint(await uid(), x, x.photoId ? uploads.get(x.photoId) ?? null : null);
    }),

    notifications: () => wrap(async () => svc.notifications(await uid())),
    markRead: (ids) => wrap(async () => svc.markRead(await uid(), ids)),
    feedback: (m) => wrap(async () => repo.insertFeedback(await uid(), m, Date.now())),

    opsKpis: () => wrap(async () => { await ready; return svc.opsKpis(); }),
    opsIncidents: () => wrap(async () => { await ready; return svc.opsIncidents(); }),
    opsUnits: () => wrap(() => svc.opsUnits()),
    opsWards: () => wrap(async () => { await ready; return svc.wards(); }),
    opsSetComplaint: (id, s) => wrap(() => svc.opsSetComplaint(null, id, s)),
    opsSetIncident: (id, s) => wrap(() => svc.opsSetIncident(null, id, s)),

    subscribe(cb) { subs.add(cb); return () => subs.delete(cb); },
    subscribeOps(cb) { opsSubs.add(cb); return () => opsSubs.delete(cb); },
    dispose() { clearInterval(timer); subs.clear(); opsSubs.clear(); },
  };
}
