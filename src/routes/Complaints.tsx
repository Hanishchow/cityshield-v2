import { useNavigate, useParams } from 'react-router-dom';
import { Building2, Clock, ExternalLink, MapPin, Activity, Plus } from 'lucide-react';
import type { Complaint } from '@shared/contract.ts';
import { CATEGORIES, categoryOf } from '@shared/catalog.ts';
import { ISSUE_PT } from '@shared/city.ts';
import { destPoint } from '@shared/services.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet } from '@/app/overlayStore.ts';
import { useComplaint, useComplaints } from '@/lib/api/hooks.ts';
import { useUI } from '@/store/ui.ts';
import { Card, CardHeader, SectionHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Chip, DemoTag } from '@/components/ui/chip.tsx';
import { Segmented, Skeleton } from '@/components/ui/controls.tsx';
import { ComplaintRow, Empty, IconChip, MobileHeader, StatusChip, Timeline } from '@/components/common.tsx';
import { PotholeArt, StreetCamArt } from '@/components/art/Art.tsx';
import { LiveMap } from '@/features/map/LiveMap.tsx';
import { Label } from '@/features/sim/live.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { fmtWhen } from '@/lib/utils.ts';
import { useT } from '@/i18n/index.ts';

export function CategoryGrid() {
  const nav = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {CATEGORIES.map((k) => (
        <button key={k.key} onClick={() => nav(`/complaints/new/${k.key}`)} className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface px-2 py-4 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
          <IconChip icon={k.icon} tone={k.tone} size="lg" />
          <span className="text-[14px] font-bold leading-tight">{k.title}</span>
          <span className="-mt-1 text-[12.5px] text-fg-2">{k.sub}</span>
        </button>
      ))}
    </div>
  );
}

function Filter() {
  const t = useT(), f = useUI((s) => s.cFilter), set = useUI((s) => s.set);
  return <Segmented label="Filter complaints" value={f} onChange={(v) => set({ cFilter: v })} options={[{ value: 'all', label: 'All' }, { value: 'open', label: t('inProgress') }, { value: 'resolved', label: t('resolved') }]} />;
}

export function Photo({ c, className }: { c: Complaint; className?: string }) {
  const k = categoryOf(c.category);
  return (
    <div className={'relative overflow-hidden bg-surface-3 ' + (className ?? 'aspect-[16/10] rounded-card')}>
      {c.photoUrl ? <img src={c.photoUrl} alt={`Photo attached to complaint ${c.id}`} className="absolute inset-0 size-full object-cover" />
        : c.art === 'pothole' || c.category === 'pothole' ? <PotholeArt className="absolute inset-0" />
        : c.art === 'street' || c.category === 'signal' ? <StreetCamArt className="absolute inset-0" />
        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-[14px] font-semibold text-fg-2"><IconChip icon={k.icon} tone={k.tone} size="lg" round />No photo attached</div>}
    </div>
  );
}

function Kv({ icon, k, children }: { icon: React.ReactNode; k: string; children: React.ReactNode }) {
  return <div className="flex gap-3 [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-fg-3">{icon}<div className="min-w-0"><div className="text-[13px] font-semibold text-fg-2">{k}</div><div className="text-[15px] font-bold">{children}</div></div></div>;
}

export function ComplaintBody({ c }: { c: Complaint }) {
  const t = useT(), k = categoryOf(c.category);
  return (
    <div className="flex flex-col gap-4">
      <Photo c={c} />
      <div><div className="font-mono text-[13px] font-bold text-fg-3">{c.id} · {k.title}</div><h2 className="mt-0.5 text-[21px] leading-tight font-extrabold">{c.title}</h2></div>
      <Kv icon={<MapPin />} k={t('location')}>{c.address}</Kv>
      <Kv icon={<Activity />} k={t('status')}><span className="mt-1 inline-block"><StatusChip status={c.status} /></span></Kv>
      <Kv icon={<Building2 />} k="Routed to">{c.agency}</Kv>
      {c.description && <p className="text-[14.5px] text-fg-2">{c.description}</p>}
      <Card className="p-4"><Timeline items={c.timeline} /></Card>
      <Button variant="outline" size="lg" onClick={() => openSheet({ kind: 'cmpmap', id: c.id })}><ExternalLink />{t('trackMap')}</Button>
    </div>
  );
}

export default function Complaints() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate();
  const f = useUI((s) => s.cFilter), sel = useUI((s) => s.selectedComplaint), set = useUI((s) => s.set);
  const all = useComplaints('all');
  usePageMeta({ title: t('complaints'), sub: 'Report civic issues and follow them to resolution', side: 'complaints', tab: 'complaints' });
  const list = (all.data ?? []).filter((c) => f === 'all' || (f === 'resolved' ? c.status === 'resolved' : c.status !== 'resolved'));
  if (!desk) return (
    <div>
      <MobileHeader title={t('reportC')} />
      <div className="flex flex-col gap-3.5 p-4">
        <CategoryGrid />
        <SectionHeader title={t('myC')} right={<Button variant="link" size="sm" onClick={() => nav('/complaints/mine')}>{t('viewAll')}</Button>} />
        <Card className="overflow-hidden">{all.isLoading ? <Skeleton className="m-4 h-24" /> : (all.data ?? []).slice(0, 3).map((c) => <ComplaintRow key={c.id} c={c} onClick={() => nav(`/complaints/${c.id}`)} />)}</Card>
      </div>
    </div>
  );
  const cur = (all.data ?? []).find((c) => c.id === sel) ?? all.data?.[0];
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[1fr_1fr] items-start gap-5 p-6">
      <div className="flex flex-col gap-5">
        <Card><CardHeader title={t('reportC')} right={<DemoTag>Auto-routed to the right agency</DemoTag>} /><div className="px-5 pt-1 pb-5"><CategoryGrid /></div></Card>
        <Card className="overflow-hidden">
          <CardHeader title={t('myC')} right={<DemoTag>{all.data?.length ?? 0} total</DemoTag>} />
          <div className="px-5 pb-2"><Filter /></div>
          {list.length ? list.map((c) => <ComplaintRow key={c.id} c={c} selected={c.id === cur?.id} onClick={() => set({ selectedComplaint: c.id })} />) : <Empty>Nothing here yet.</Empty>}
        </Card>
      </div>
      <div className="sticky top-[96px]">
        {cur && <Card><CardHeader title={t('cDetails')} right={<Button variant="link" size="sm" onClick={() => nav(`/complaints/${cur.id}`)}>Open</Button>} /><div className="px-5 pb-5"><ComplaintBody c={cur} /></div></Card>}
      </div>
    </div>
  );
}

export function ComplaintDetail() {
  const { id } = useParams(), t = useT(), desk = useIsDesktop();
  const q = useComplaint(id);
  const c = q.data;
  usePageMeta({ title: t('cDetails'), sub: c ? `${c.id} · ${c.address}` : undefined, side: 'complaints' });
  if (q.isLoading) return <div className="p-6"><Skeleton className="h-72" /></div>;
  if (!c) return <div><MobileHeader title={t('cDetails')} /><Empty icon="alert">That complaint could not be found.</Empty></div>;
  if (!desk) return <div><MobileHeader title={t('cDetails')} /><div className="p-4"><ComplaintBody c={c} /></div></div>;
  const res = c.status === 'resolved', k = categoryOf(c.category);
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[1.3fr_1fr] items-start gap-5 p-6">
      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden">
          <Photo c={c} className="h-[300px]" />
          <div className="flex flex-col gap-2 p-5"><div className="font-mono text-[13px] font-bold text-fg-3">{c.id} · {k.title}</div><h2 className="text-[22px] font-extrabold">{c.title}</h2>{c.description && <p className="text-[14.5px] text-fg-2">{c.description}</p>}</div>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={t('trackMap')} right={res ? <Chip tone="green">{t('resolved')}</Chip> : c.crew ? <Chip tone="blue"><Label a={c.crew} /></Chip> : <Chip tone="amber">Awaiting assignment</Chip>} />
          <LiveMap className="h-[360px]" assignments={c.crew && !res ? [c.crew] : []} issue={{ pt: destPoint(c, ISSUE_PT), state: res ? 'resolved' : 'open' }} live={!res} aria="Complaint location" pad={{ t: 60, r: 40, b: 40, l: 40 }} />
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4 p-5">
          <Kv icon={<MapPin />} k={t('location')}>{c.address}</Kv>
          <Kv icon={<Activity />} k={t('status')}><span className="mt-1 inline-block"><StatusChip status={c.status} /></span></Kv>
          <Kv icon={<Building2 />} k="Routed to">{c.agency}</Kv>
          <Kv icon={<Clock />} k={t('reported')}>{fmtWhen(c.createdAt)}</Kv>
        </Card>
        <Card className="p-5"><h2 className="mb-4 text-[16px] font-extrabold">Progress</h2><Timeline items={c.timeline} /></Card>
      </div>
    </div>
  );
}

export function MyComplaints() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate(), f = useUI((s) => s.cFilter);
  const all = useComplaints('all').data ?? [];
  const list = all.filter((c) => f === 'all' || (f === 'resolved' ? c.status === 'resolved' : c.status !== 'resolved'));
  usePageMeta({ title: t('myC'), sub: `${all.length} complaints filed from this account`, side: 'complaints' });
  const body = (
    <div className="flex flex-col gap-3.5">
      <Filter />
      <Card className="overflow-hidden">{list.length ? list.map((c) => <ComplaintRow key={c.id} c={c} onClick={() => nav(`/complaints/${c.id}`)} />) : <Empty>Nothing here yet.</Empty>}</Card>
      <Button size="lg" onClick={() => nav('/complaints')}><Plus />{t('reportC')}</Button>
    </div>
  );
  if (!desk) return <div><MobileHeader title={t('myC')} sub={`${all.length} complaints`} /><div className="p-4">{body}</div></div>;
  return <div className="mx-auto max-w-[720px] p-6">{body}</div>;
}
