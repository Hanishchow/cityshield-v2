import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type {
  Complaint, ComplaintIn, Incident, LocationIn, MePatchIn, Notification, PlaceIn, ServiceKey, StreamEvent, User,
} from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import { ensureUser, useConn } from './connection.ts';
import type { Backend } from './backend.ts';
import { appToast } from '@/components/toast.tsx';

export function useBackend(): Backend {
  const b = useConn((s) => s.backend);
  if (!b) throw new Error('Backend not ready');
  return b;
}
export const useMode = () => useConn((s) => s.mode);
const useKey = () => useConn((s) => s.mode);

/* ---------- session ---------- */
export function useMe() {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'me'], queryFn: () => ensureUser(b), staleTime: 60_000 });
}
export function useUpdateMe() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  return useMutation({
    mutationFn: (p: MePatchIn) => b.updateMe(p),
    onMutate: async (p) => {
      const prev = qc.getQueryData<User>([m, 'me']);
      if (prev) qc.setQueryData<User>([m, 'me'], { ...prev, ...p, prefs: { ...prev.prefs, ...(p.prefs ?? {}) }, area: p.area ? { ...prev.area, ...p.area, accuracyM: p.area.accuracyM ?? null, source: p.area.source ?? 'manual' } : prev.area } as User);
      return { prev };
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData([m, 'me'], ctx.prev); },
    onSuccess: (u) => qc.setQueryData([m, 'me'], u),
  });
}

/* ---------- places & nearby ---------- */
export function usePlaces() {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'places'], queryFn: () => b.places() });
}
export function usePlaceMutations() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: [m, 'places'] });
  return {
    add: useMutation({ mutationFn: (p: PlaceIn) => b.addPlace(p), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => b.deletePlace(id), onSuccess: done }),
  };
}
export function useNearbyHospitals() {
  const b = useBackend(), m = useKey(), me = useMe().data;
  return useQuery({
    queryKey: [m, 'nearby', 'hospital', me?.area.lat, me?.area.lng],
    queryFn: () => b.nearby('hospital', me!.area.lat, me!.area.lng),
    enabled: !!me, staleTime: 5 * 60_000,
  });
}

/* ---------- incidents ---------- */
export function useIncidents(active = true) {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'incidents', active], queryFn: () => b.incidents(active), refetchInterval: 30_000 });
}
/** The live incident (if any) that has a unit of this service on it. */
export function useActiveFor(kind: ServiceKey) {
  const { data } = useIncidents(true);
  const inc = data?.find((i) => i.assignments.some((a) => a.kind === kind));
  return { incident: inc ?? null, assignment: inc?.assignments.find((a) => a.kind === kind) ?? null };
}
function upsertIncident(qc: QueryClient, m: string, inc: Incident) {
  qc.setQueryData([m, 'incident', inc.id], inc);
  for (const active of [true, false]) {
    qc.setQueryData<Incident[]>([m, 'incidents', active], (l) => {
      if (!l) return l;
      const keep = !active || ['dispatched', 'en_route', 'on_scene'].includes(inc.status);
      const rest = l.filter((x) => x.id !== inc.id);
      return keep ? [inc, ...rest].sort((a, b) => b.createdAt - a.createdAt) : rest;
    });
  }
}
export function useIncidentActions() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  const onSuccess = (inc: Incident) => { upsertIncident(qc, m, inc); qc.invalidateQueries({ queryKey: [m, 'notifications'] }); };
  return {
    sos: useMutation({ mutationFn: ({ location, key }: { location: LocationIn; key: string }) => b.sos({ location, shareLive: true }, key), onSuccess }),
    raise: useMutation({ mutationFn: ({ kind, location }: { kind: ServiceKey; location: LocationIn }) => b.raise({ kind, location }), onSuccess }),
    cancel: useMutation({ mutationFn: (id: string) => b.cancel(id), onSuccess }),
    close: useMutation({ mutationFn: (id: string) => b.close(id), onSuccess }),
    replay: useMutation({ mutationFn: (id: string) => b.replay(id), onSuccess }),
    setHospital: useMutation({ mutationFn: ({ id, hospitalId }: { id: string; hospitalId: string }) => b.setHospital(id, hospitalId), onSuccess }),
  };
}

/* ---------- complaints ---------- */
export function useComplaints(status: 'all' | 'open' | 'resolved' = 'all') {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'complaints', status], queryFn: () => b.complaints(status) });
}
export function useComplaint(id: string | null | undefined) {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'complaint', id], queryFn: () => b.complaint(id!), enabled: !!id });
}
export function useCreateComplaint() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, photo }: { input: ComplaintIn; photo: Blob | null }) => {
      const photoId = photo ? (await b.upload(photo)).id : null;
      return b.createComplaint({ ...input, photoId });
    },
    onSuccess: (c) => { upsertComplaint(qc, m, c); qc.invalidateQueries({ queryKey: [m, 'notifications'] }); },
  });
}
function upsertComplaint(qc: QueryClient, m: string, c: Complaint) {
  qc.setQueryData([m, 'complaint', c.id], c);
  qc.setQueriesData<Complaint[]>({ queryKey: [m, 'complaints'] }, (l) => (l ? [c, ...l.filter((x) => x.id !== c.id)].sort((a, b) => b.createdAt - a.createdAt) : l));
  qc.invalidateQueries({ queryKey: [m, 'complaints'] });
}

/* ---------- notifications ---------- */
export function useNotifications() {
  const b = useBackend(), m = useKey();
  return useQuery({ queryKey: [m, 'notifications'], queryFn: () => b.notifications() });
}
export function useUnread() {
  return (useNotifications().data ?? []).filter((n) => n.readAt == null).length;
}
export function useMarkRead() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | null) => b.markRead(ids),
    onMutate: (ids) => {
      qc.setQueryData<Notification[]>([m, 'notifications'], (l) => l?.map((n) => (!ids || ids.includes(n.id) ? { ...n, readAt: n.readAt ?? Date.now() } : n)));
    },
  });
}

/* ---------- command centre ---------- */
export function useOps() {
  const b = useBackend(), m = useKey();
  return {
    kpis: useQuery({ queryKey: [m, 'ops', 'kpis'], queryFn: () => b.opsKpis(), refetchInterval: 15_000 }),
    incidents: useQuery({ queryKey: [m, 'ops', 'incidents'], queryFn: () => b.opsIncidents(), refetchInterval: 20_000 }),
    units: useQuery({ queryKey: [m, 'ops', 'units'], queryFn: () => b.opsUnits(), staleTime: 60_000 }),
    wards: useQuery({ queryKey: [m, 'ops', 'wards'], queryFn: () => b.opsWards(), refetchInterval: 60_000 }),
  };
}
export function useOpsLive() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  useEffect(() => b.subscribeOps(() => {
    qc.invalidateQueries({ queryKey: [m, 'ops', 'incidents'] });
    qc.invalidateQueries({ queryKey: [m, 'ops', 'kpis'] });
  }), [b, m, qc]);
}

/* ---------- live bridge: SSE → cache + toasts ---------- */
export function useLiveBridge() {
  const b = useBackend(), m = useKey(), qc = useQueryClient();
  useEffect(() => b.subscribe((e: StreamEvent) => {
    const me = qc.getQueryData<User>([m, 'me']);
    switch (e.type) {
      case 'incident': upsertIncident(qc, m, e.incident); break;
      case 'complaint': upsertComplaint(qc, m, e.complaint); break;
      case 'notification': {
        qc.setQueryData<Notification[]>([m, 'notifications'], (l) => (l ? [e.notification, ...l.filter((n) => n.id !== e.notification.id)] : l));
        const n = e.notification;
        if (n.kind === 'complaint' && n.title === 'Complaint Update' && me?.prefs.complaint) appToast(n.body, 'clipboard', 'amber');
        if (n.title === 'Complaint resolved' && me?.prefs.complaint) appToast(n.body, 'checkC', 'civic');
        break;
      }
      case 'arrived': {
        if (e.ref !== 'incident') break;
        const want = e.kind === 'civic' ? me?.prefs.service : me?.prefs.emergency;
        if (want) appToast(SERVICES[e.kind].arrived, e.kind === 'police' ? 'police' : e.kind === 'civic' ? 'bin' : e.kind, e.kind === 'crew' ? 'amber' : e.kind);
        break;
      }
    }
  }), [b, m, qc]);
}
