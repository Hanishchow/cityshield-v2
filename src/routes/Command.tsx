import { Component, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CheckCheck, Map as MapIcon } from 'lucide-react';
import type { Incident } from '@shared/contract.ts';
import { CIVIC } from '@shared/catalog.ts';
import { CITY_BOUNDS } from '@shared/city.ts';
import { destPoint } from '@shared/services.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { useBackend, useOps, useOpsLive } from '@/lib/api/hooks.ts';
import { useQueryClient } from '@tanstack/react-query';
import { useConn } from '@/lib/api/connection.ts';
import { useUI } from '@/store/ui.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Chip, LivePill } from '@/components/ui/chip.tsx';
import { Skeleton } from '@/components/ui/controls.tsx';
import { Kpi, MobileHeader, Notice } from '@/components/common.tsx';
import { Icon } from '@/components/icons.tsx';
import { appToast } from '@/components/toast.tsx';
import { CityMap2D, type OpsBeacon } from '@/features/map/CityMap2D.tsx';
import { useMap3D } from '@/features/three/support.ts';
import { useIsDesktop, useTicker } from '@/lib/useMedia.ts';
import { cn, fmtDuration, timeAgo } from '@/lib/utils.ts';

const CommandCity3D = lazy(() => import('@/features/three/CommandCity3D.tsx'));
class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const COLOR = { medical: '#E0284F', police: '#4F46E5', fire: '#EA580C', civic: '#059669', flood: '#2A56C6', done: '#8793A8' };
function incColor(i: Incident) {
  if (/water|flood/i.test(i.title)) return COLOR.flood;
  return { sos: COLOR.medical, ambulance: COLOR.medical, police: COLOR.police, fire: COLOR.fire, civic: COLOR.civic }[i.kind];
}
const STATUS: Record<Incident['status'], [string, 'green' | 'amber' | 'blue' | 'gray']> = {
  dispatched: ['Assigned', 'amber'], en_route: ['En route', 'blue'], on_scene: ['Responding', 'blue'], resolved: ['Resolved', 'green'], cancelled: ['Cancelled', 'gray'],
};

export default function Command() {
  const desk = useIsDesktop(), nav = useNavigate();
  const { kpis, incidents, units, wards } = useOps();
  useOpsLive();
  useTicker(15_000);
  const { use3D, available } = useMap3D();
  const set = useUI((s) => s.set);
  const backend = useBackend(), qc = useQueryClient(), mode = useConn((s) => s.mode);
  usePageMeta({ title: 'Command Centre', sub: 'Government view · all agencies · sample data', side: 'command' });

  const incs = incidents.data ?? [];
  const inBounds = (i: Incident) => { const p = destPoint(i, [-9999, -9999]); return p[0] > -9999; };
  const beacons: OpsBeacon[] = incs.filter(inBounds).map((i) => ({ id: i.id, pt: destPoint(i), color: incColor(i), done: i.status === 'resolved', label: `${i.title} · ${i.address}` }));
  const patrols = (units.data ?? []).filter((u) => u.patrol);
  const trips = incs.filter((i) => i.status !== 'resolved').flatMap((i) => i.assignments.filter((a) => a.arrivedAt == null));
  const k = kpis.data;
  const resolve = async (i: Incident) => {
    try { await backend.opsSetIncident(i.id, 'resolved'); qc.invalidateQueries({ queryKey: [mode, 'ops'] }); appToast(`${i.id} marked resolved`, 'checkC', 'civic'); }
    catch { appToast('Only operators can change incidents', 'lock', 'amber'); }
  };

  const bbox: [number, number, number, number] = [CITY_BOUNDS.x0 + 90, CITY_BOUNDS.y0 + 30, CITY_BOUNDS.x1 - 80, CITY_BOUNDS.y1 + 40];
  const flat = <CityMap2D className="size-full" beacons={beacons} patrols={patrols} assignments={trips} pill={false} bbox={bbox} pad={{ t: 50, r: 16, b: 30, l: 16 }} aria="City incident map" />;
  const map = (
    <Card className="overflow-hidden">
      <div className={cn('relative', desk ? 'h-[540px]' : 'h-[340px]')}>
        {use3D ? (
          <Fallback fallback={flat}><Suspense fallback={flat}><CommandCity3D beacons={beacons} patrols={patrols} assignments={trips} /></Suspense></Fallback>
        ) : flat}
        {available && (
          <div className="absolute top-3 right-3 z-[3] flex rounded-xl border border-line bg-surface/95 p-0.5 shadow-soft" role="group" aria-label="Map view">
            {(['2d', '3d'] as const).map((m) => (
              <button key={m} onClick={() => set({ mapMode: m })} aria-pressed={(m === '3d') === use3D}
                className={cn('inline-flex h-7 items-center gap-1 rounded-[9px] px-2.5 text-[12.5px] font-bold', (m === '3d') === use3D ? 'bg-navy-900 text-white dark:bg-primary' : 'text-fg-2')}>
                {m === '3d' ? <Box className="size-3.5" /> : <MapIcon className="size-3.5" />}{m.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {use3D && <span className="pointer-events-none absolute bottom-2.5 left-3 z-[2] rounded-md bg-black/40 px-2 py-0.5 text-[11.5px] font-semibold text-white/80">Hover a beacon for details · drag to orbit</span>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] font-semibold text-fg-2">
        {([['Medical', COLOR.medical], ['Police', COLOR.police], ['Fire', COLOR.fire], [`${CIVIC.short} civic`, COLOR.civic], ['Flooding', COLOR.flood], ['Resolved', COLOR.done]] as const).map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </Card>
  );

  const feed = (
    <Card className="overflow-hidden">
      <CardHeader title="Incident feed" right={<LivePill />} />
      {incidents.isLoading ? <Skeleton className="m-4 h-40" /> : incs.map((i) => {
        const [st, tone] = STATUS[i.status];
        return (
          <div key={i.id} className="flex items-start gap-3 border-t border-line px-4 py-3 first-of-type:border-t-0 sm:px-5">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full" style={{ background: incColor(i) + '1F', color: incColor(i) }}><Icon name="alert" className="size-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">{i.title}</div>
              <div className="text-[13.5px] text-fg-2">{i.address} · <span className="font-mono">{i.id}</span></div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {i.agencies.slice(0, 2).map((g) => <Chip key={g.agency}>{g.agency.replace(/ \(108\)$/, '')}</Chip>)}
                <Chip tone={tone}>{st}</Chip>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[12.5px] text-fg-3">{timeAgo(i.createdAt)}</span>
              {i.status !== 'resolved' && i.status !== 'cancelled' && (
                <button onClick={() => resolve(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-bold text-success hover:bg-success-soft"><CheckCheck className="size-3.5" />Resolve</button>
              )}
            </div>
          </div>
        );
      })}
    </Card>
  );
  const W = wards.data ?? [], max = Math.max(1, ...W.map((w) => w.count));
  const wardCard = (
    <Card className="pb-3">
      <CardHeader title="Complaints this week by area" />
      {W.map((w) => (
        <div key={w.area} className="grid grid-cols-[110px_1fr_44px] items-center gap-3 px-5 py-1.5 text-[14px]">
          <span className="truncate font-semibold text-fg-2">{w.area}</span>
          <div className="h-2 overflow-hidden rounded-full bg-surface-3"><i className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.round((w.count / max) * 100)}%` }} /></div>
          <b className="text-right tabular">{w.count}</b>
        </div>
      ))}
    </Card>
  );
  const prevDelta = k?.avgResponseSec != null && k.avgResponsePrevSec ? Math.round((1 - k.avgResponseSec / k.avgResponsePrevSec) * 100) : null;
  const kpiGrid = (
    <div className={cn('grid gap-3', desk ? 'grid-cols-4' : 'grid-cols-2')}>
      <Kpi icon="alert" label="Active incidents" value={k?.activeIncidents ?? '—'} delta="Live across Koramangala zone" />
      <Kpi icon="timer" label="Avg. emergency response" value={fmtDuration(k?.avgResponseSec ?? null)} delta={prevDelta != null ? `${Math.abs(prevDelta)}% ${prevDelta >= 0 ? 'faster' : 'slower'} than last month` : undefined} up={(prevDelta ?? 0) >= 0} />
      <Kpi icon="checkC" label="Complaints resolved today" value={k?.complaintsResolvedToday ?? '—'} delta={k ? `of ${k.complaintsReceivedToday} received` : undefined} up />
      <Kpi icon="users" label="Units on duty" value={k?.unitsOnDuty ?? '—'} delta={`Police · Ambulance · Fire · ${CIVIC.short}`} />
    </div>
  );
  const note = <Notice><b>Sample data.</b> This view shows how agencies would share one live picture of the city. Figures and incidents are illustrative; citizen requests from this app appear here live.</Notice>;
  if (!desk) return <div><MobileHeader title="Command Centre" sub="Government view · sample data" /><div className="flex flex-col gap-3.5 p-4">{note}{kpiGrid}{map}{feed}{wardCard}</div></div>;
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-6">
      {note}{kpiGrid}
      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-5">
        <div className="flex flex-col gap-5">{map}{wardCard}</div>
        <div className="flex flex-col gap-5">{feed}<button onClick={() => nav('/')} className="sr-only">Back to citizen view</button></div>
      </div>
    </div>
  );
}
