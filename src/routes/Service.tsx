import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Clock, Lock, Phone, Video, Navigation, X, CheckCheck } from 'lucide-react';
import { SERVICE_KEYS, type Assignment, type Incident, type ServiceKey } from '@shared/contract.ts';
import { CIVIC, SERVICES, SERVICE_SUB, STATIONS } from '@shared/catalog.ts';
import { destPoint } from '@shared/services.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet, useOverlays } from '@/app/overlayStore.ts';
import { useActiveFor, useIncidentActions, useMe, useNearbyHospitals } from '@/lib/api/hooks.ts';
import { Card, CardHeader, SectionHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Chip, DemoTag } from '@/components/ui/chip.tsx';
import { HeaderAction, IconChip, MobileHeader, OkCard, Row, RowText } from '@/components/common.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { OfficerArt, StreetCamArt } from '@/components/art/Art.tsx';
import { appToast } from '@/components/toast.tsx';
import { LiveMap } from '@/features/map/LiveMap.tsx';
import { Arrival, Eta, Fill, Status } from '@/features/sim/live.tsx';
import { HospitalRow } from '@/app/Sheets.tsx';
import { useIsDesktop, useTicker } from '@/lib/useMedia.ts';
import { clockNow, shortArea } from '@/lib/utils.ts';
import { useT, type TKey } from '@/i18n/index.ts';

export default function Service() {
  const { key } = useParams();
  const k: ServiceKey = (SERVICE_KEYS as readonly string[]).includes(key ?? '') ? (key as ServiceKey) : 'ambulance';
  const t = useT(), desk = useIsDesktop(), me = useMe().data;
  const { incident, assignment } = useActiveFor(k);
  const title = t(`svc_${k}` as TKey);
  usePageMeta({ title, sub: `${t('liveTracking')} · ${me?.area.label ?? ''}`, side: k });

  const station = STATIONS.find((s) => s.kind === ({ police: 'police_station', ambulance: 'ambulance_base', fire: 'fire_station', civic: 'ward_depot' } as const)[k]);
  const dest = incident ? destPoint(incident) : me ? destPoint(me.area) : undefined;
  const map = (cls: string, h?: number) => (
    <LiveMap className={cls} height={h} assignments={assignment ? [assignment] : []} dest={dest}
      aria={`${SERVICES[k].vehicle} live location`} pad={desk ? { t: 70, r: 60, b: 50, l: 60 } : undefined} live={!!assignment} />
  );

  if (!desk) {
    return (
      <div>
        <MobileHeader title={title} sub={t('liveTracking')} action={incident ? <HeaderAction icon="clipboard" label="Trip details" onClick={() => openSheet({ kind: 'trip', svc: k, incidentId: incident.id })} /> : undefined} />
        {map('h-[300px]')}
        <div className="relative -mt-5 flex flex-col gap-3.5 rounded-t-[26px] bg-bg px-4 pt-4 pb-8">
          {incident && assignment ? <EtaCard k={k} a={assignment} incident={incident} /> : <RequestCard k={k} stationName={station?.name} />}
          <Details k={k} incident={incident} />
          {incident && <IncidentRecord incident={incident} />}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[1.35fr_1fr] items-start gap-5 p-6">
      <div className="sticky top-[96px]">{map('h-[calc(100dvh-120px)] min-h-[520px] rounded-[22px] border border-line shadow-card')}</div>
      <div className="flex flex-col gap-4">
        {incident && assignment ? (
          <>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <IconChip icon={SERVICE_ICON[k]} tone={k} />
                <div className="min-w-0 flex-1"><div className="text-[15.5px] font-extrabold">{SERVICES[k].vehicle} · <span className="font-mono">{assignment.callSign}</span></div><Status a={assignment} className="text-[12.5px] text-fg-2" /></div>
                <Button variant="outline" size="sm" onClick={() => openSheet({ kind: 'trip', svc: k, incidentId: incident.id })}>{t('details')}</Button>
              </div>
              <Fill a={assignment} className="mt-4" />
              <div className="mt-2 flex justify-between text-[11.5px] font-semibold text-fg-3"><span>{t('dispatched')}</span><span>{t('enRoute')}</span><span>{t('arrived')}</span></div>
            </Card>
            <EtaCard k={k} a={assignment} incident={incident} />
          </>
        ) : <RequestCard k={k} stationName={station?.name} />}
        <Details k={k} incident={incident} />
        {incident && <IncidentRecord incident={incident} />}
      </div>
    </div>
  );
}

function EtaCard({ k, a, incident }: { k: ServiceKey; a: Assignment; incident: Incident }) {
  const t = useT(), { cancel, close } = useIncidentActions();
  const arrived = a.arrivedAt != null;
  return (
    <Card className="overflow-hidden">
      <button onClick={() => openSheet({ kind: 'trip', svc: k, incidentId: incident.id })} aria-label="Trip details" className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-3 p-4 text-left hover:bg-surface-2">
        <div><div className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-2"><Clock className="size-3.5" />{t('eta')}</div><Eta a={a} className="text-[24px] font-extrabold tabular" /></div>
        <div><div className="text-[12px] font-semibold text-fg-2">{t('arriving')}</div><Arrival a={a} className="text-[24px] font-extrabold tabular" /></div>
        <ChevronRight className="size-5 text-fg-3" />
      </button>
      <div className="flex border-t border-line">
        {!arrived ? (
          <button onClick={() => cancel.mutate(incident.id, { onSuccess: () => appToast('Request cancelled — responders stood down', 'x', 'police') })} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold text-fg-2 hover:bg-surface-2 hover:text-sos"><X className="size-4" />{t('cancelRequest')}</button>
        ) : (
          <button onClick={() => close.mutate(incident.id, { onSuccess: () => appToast('Marked as resolved. Stay safe.', 'checkC', 'civic') })} className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12.5px] font-bold text-success hover:bg-surface-2"><CheckCheck className="size-4" />{t('endIncident')}</button>
        )}
      </div>
    </Card>
  );
}

function RequestCard({ k, stationName }: { k: ServiceKey; stationName?: string }) {
  const t = useT();
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <IconChip icon={SERVICE_ICON[k]} tone={k} size="lg" />
        <div className="min-w-0 flex-1"><div className="text-[15.5px] font-extrabold">{t('notActive')}</div><div className="text-[12.5px] text-fg-2">{stationName ? `Nearest: ${stationName}` : SERVICE_SUB[k]}</div></div>
      </div>
      <Button className="mt-4 w-full" size="lg" variant={k === 'civic' ? 'primary' : 'sos'} onClick={() => openSheet({ kind: 'request', svc: k })}>
        <Icon name={SERVICE_ICON[k]} />{t('requestService', { svc: SERVICES[k].vehicle.toLowerCase() })}
      </Button>
      <p className="mt-2.5 text-center text-[12px] text-fg-3">{k === 'civic' ? 'Garbage pickups and civic services are routed to your ward office.' : 'For life-threatening emergencies, press SOS or call 112.'}</p>
    </Card>
  );
}

function Details({ k, incident }: { k: ServiceKey; incident: Incident | null }) {
  const t = useT(), nav = useNavigate(), openOverlay = useOverlays((s) => s.openOverlay);
  useTicker(1000);
  const hospitals = useNearbyHospitals().data ?? [];
  const { setHospital } = useIncidentActions();
  const a = incident?.assignments.find((x) => x.kind === k) ?? null;
  if (k === 'ambulance') return (
    <>
      <SectionHeader title={t('nearestHosp')} right={<Button variant="link" size="sm" onClick={() => openSheet({ kind: 'hosp', incidentId: incident?.id ?? null })}>{t('viewAll')}</Button>} />
      <Card className="overflow-hidden">
        {hospitals.slice(0, 3).map((h) => <HospitalRow key={h.id} h={h} selected={incident?.destinationHospitalId === h.id}
          onSelect={() => incident ? setHospital.mutate({ id: incident.id, hospitalId: h.id }, { onSuccess: () => appToast(`${h.name} set as destination`, 'hospital', 'ambulance') }) : appToast('Request an ambulance first, then choose a hospital', 'hospital', 'ambulance')} />)}
      </Card>
      <Button variant="soft" size="lg" onClick={() => openOverlay({ kind: 'call', who: 'ambulance' })}><Phone />{t('callAmb')}</Button>
    </>
  );
  if (k === 'police') return (
    <>
      <SectionHeader title={t('officer')} />
      <Card className="flex items-center gap-3.5 p-4">
        <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-surface-3"><OfficerArt className="size-full" slice /></div>
        <div className="min-w-0 flex-1"><div className="text-[15px] font-extrabold">{a?.officer?.name ?? 'SI Ramesh Kumar'}</div><div className="text-[12.5px] text-fg-2">Karnataka Police · <span className="font-mono">{a?.callSign ?? 'Hoysala-22'}</span></div><div className="text-[12.5px] text-fg-2">Contact: {a?.officer?.phone ?? '98867 12345'}</div></div>
      </Card>
      <div className="grid grid-cols-3 gap-2.5">
        {[{ i: <Phone />, l: t('callOfficer'), f: () => openOverlay({ kind: 'call', who: 'police' }) }, { i: <Video />, l: t('videoCall'), f: () => openOverlay({ kind: 'video' }) },
          { i: <Navigation />, l: t('shareLoc'), f: () => appToast(`Live location shared with ${a?.officer?.name ?? 'SI Ramesh Kumar'}`, 'nav', 'police') }].map((b) => (
          <button key={b.l} onClick={b.f} className="flex flex-col items-center gap-2 rounded-card border border-line bg-surface px-2 py-3.5 text-center text-[12px] font-bold shadow-card hover:bg-surface-2 [&_svg]:size-5 [&_svg]:text-police">{b.i}{b.l}</button>
        ))}
      </div>
      <SectionHeader title={t('liveFeed')} right={<DemoTag>Sample footage</DemoTag>} />
      <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-navy-900">
        <StreetCamArt className="absolute inset-0" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10.5px] font-extrabold tracking-wider text-white"><i className="size-1.5 animate-live rounded-full bg-sos" />REC</span>
        <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2 py-1 font-mono text-[11px] text-white">CAM 14 · 80 Feet Rd · {clockNow()}</span>
      </div>
      <OkCard title="Route cleared" sub="Traffic police cleared the route." />
    </>
  );
  if (k === 'fire') return (
    <>
      <SectionHeader title={t('fireStation')} />
      <Card className="overflow-hidden"><Row as="div"><IconChip icon="building" tone="fire" /><RowText title="Jayanagar Fire Station" sub="4.5 km · 15 min" /><Chip tone="green">{t('available')}</Chip></Row></Card>
      <Button variant="soft" size="lg" className="justify-start" onClick={() => openOverlay({ kind: 'call', who: 'fire' })}><Phone /><span className="flex-1 text-left">{t('contactFire')}</span><ChevronRight /></Button>
    </>
  );
  return (
    <>
      <SectionHeader title={t('svcDetails')} />
      <Card className="divide-y divide-line overflow-hidden">
        <Row as="div"><IconChip icon="truck" tone="civic" /><RowText title="Garbage Collection" sub={`Zone 3 · Koramangala · ${CIVIC.short}`} /></Row>
        <Row as="div"><IconChip icon="pin" tone="civic" /><div className="min-w-0 flex-1"><div className="text-[14px] font-bold">Live Location</div><Status a={a} className="text-[12.5px] text-fg-2" /></div>
          <Button variant="outline" size="sm" onClick={() => openSheet({ kind: 'svcmap', svc: 'civic' })}>View on Map</Button></Row>
      </Card>
      {a && <OkCard title="Notification sent to your area" sub="Garbage van is on the way." />}
      <Button variant="ghost" onClick={() => nav('/complaints/new/civic')}><Icon name="clipboard" />Report a garbage issue instead</Button>
    </>
  );
}

function IncidentRecord({ incident }: { incident: Incident }) {
  const t = useT();
  return (
    <Card>
      <CardHeader title={t('incidentRecord')} right={<Chip><Lock />{t('sharedWithAgencies')}</Chip>} />
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 px-5 pt-1 pb-5 text-[13.5px]">
        <div><span className="block text-[12px] font-semibold text-fg-2">{t('reference')}</span><b className="font-mono">{incident.id}</b></div>
        <div><span className="block text-[12px] font-semibold text-fg-2">{t('reported')}</span><b>City Shield app</b></div>
        <div className="col-span-2"><span className="block text-[12px] font-semibold text-fg-2">{t('location')}</span><b>{shortArea(incident.address)}</b>{incident.accuracyM != null && <span className="text-fg-3"> · ±{incident.accuracyM} m</span>}</div>
        <div className="col-span-2"><span className="block text-[12px] font-semibold text-fg-2">{t('visibleTo')}</span><b>{incident.agencies.map((g) => g.agency).join(' · ')}</b></div>
      </div>
    </Card>
  );
}
