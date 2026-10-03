import { useNavigate } from 'react-router-dom';
import { SERVICE_KEYS } from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import { destPoint } from '@shared/services.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { useComplaints, useIncidents, useMe } from '@/lib/api/hooks.ts';
import { Card, CardHeader, SectionHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { DemoTag } from '@/components/ui/chip.tsx';
import { ComplaintRow, Empty, IconChip, MobileHeader, Row } from '@/components/common.tsx';
import { SERVICE_ICON } from '@/components/icons.tsx';
import { LiveMap } from '@/features/map/LiveMap.tsx';
import { Eta, Fill, Status } from '@/features/sim/live.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { useT } from '@/i18n/index.ts';

export default function Track() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate(), me = useMe().data;
  usePageMeta({ title: t('liveTracking'), sub: 'Every responder and request, in one place', side: 'track', tab: 'track' });
  const incs = useIncidents(true).data ?? [];
  const all = incs.flatMap((i) => i.assignments);
  const active = all.filter((a) => a.arrivedAt == null);
  const open = (useComplaints('open').data ?? []);
  const crews = open.map((c) => c.crew).filter((c): c is NonNullable<typeof c> => !!c && c.arrivedAt == null);
  const dest = incs[0] ? destPoint(incs[0]) : me ? destPoint(me.area) : undefined;

  const body = (
    <>
      <Card className="divide-y divide-line overflow-hidden">
        {SERVICE_KEYS.map((k) => {
          const a = all.find((x) => x.kind === k) ?? null;
          return (
            <Row key={k} chevron onClick={() => nav(`/service/${k}`)}>
              <IconChip icon={SERVICE_ICON[k]} tone={k} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{SERVICES[k].vehicle}</div>
                <Status a={a} className="text-[12.5px] text-fg-2" />
                <Fill a={a} className="mt-2" />
              </div>
              <Eta a={a} className="text-[13.5px] font-extrabold tabular" />
            </Row>
          );
        })}
      </Card>
      <SectionHeader title="Complaints in progress" right={<Button variant="link" size="sm" onClick={() => nav('/complaints/mine')}>{t('viewAll')}</Button>} />
      <Card className="overflow-hidden">
        {open.length ? open.map((c) => <ComplaintRow key={c.id} c={c} onClick={() => nav(`/complaints/${c.id}`)} />) : <Empty icon="checkC">No open complaints.</Empty>}
      </Card>
    </>
  );
  const map = (cls: string, h?: number) => (
    <LiveMap className={cls} height={h} assignments={[...active, ...crews]} pill={active.length + crews.length === 1} dest={dest} aria="Your active responders" pad={{ t: 58, r: 32, b: 30, l: 32 }} />
  );
  if (!desk) return (
    <div>
      <MobileHeader title={t('liveTracking')} sub="Responders and requests near you" />
      {map('h-[280px]')}
      <div className="flex flex-col gap-3.5 p-4">{body}</div>
    </div>
  );
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[1.35fr_1fr] items-start gap-5 p-6">
      <Card className="overflow-hidden">
        <CardHeader title="Your responders" right={<DemoTag>{active.length ? `${active.length} active` : 'None active'}</DemoTag>} />
        {map('h-[560px]')}
      </Card>
      <div className="flex flex-col gap-4">{body}</div>
    </div>
  );
}
