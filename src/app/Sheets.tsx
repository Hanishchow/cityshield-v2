/** Every bottom sheet / dialog in the app, opened through useOverlays().openSheet(). */
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, RefreshCw, Check, Send, LocateFixed, Trash2 } from 'lucide-react';
import type { PlaceType, ServiceKey } from '@shared/contract.ts';
import { HELPLINES, SERVICES, stationById, SERVICE_SUB } from '@shared/catalog.ts';
import { ISSUE_PT } from '@shared/city.ts';
import { destPoint } from '@shared/services.ts';
import { useOverlays, type SheetState } from './overlayStore.ts';
import {
  useActiveFor, useBackend, useComplaint, useIncidentActions, useIncidents, useMe, useNearbyHospitals, usePlaceMutations, usePlaces, useUpdateMe,
} from '@/lib/api/hooks.ts';
import { ApiError } from '@/lib/api/backend.ts';
import { areaLocation, requestGps } from '@/lib/location.ts';
import { Sheet } from '@/components/ui/sheet.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, Input, Segmented } from '@/components/ui/controls.tsx';
import { Chip } from '@/components/ui/chip.tsx';
import { Card, SectionHeader } from '@/components/ui/card.tsx';
import { IconChip, OkCard, Row, RowText, StatusChip } from '@/components/common.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { appToast } from '@/components/toast.tsx';
import { LiveMap } from '@/features/map/LiveMap.tsx';
import { Arrival, Eta, Fill, Km, Label } from '@/features/sim/live.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { shortArea } from '@/lib/utils.ts';
import { useT } from '@/i18n/index.ts';

export function Sheets() {
  const sheet = useOverlays((s) => s.sheet);
  const close = useOverlays((s) => s.closeSheet);
  const [last, setLast] = useState<SheetState>(null);
  if (sheet && sheet !== last) setLast(sheet);
  const s = sheet ?? last; // keep content mounted during the close animation
  const open = !!sheet;
  const onOpenChange = (o: boolean) => { if (!o) close(); };
  if (!s) return null;
  const wrap = (title: string, body: ReactNode, wide?: boolean) => <Sheet open={open} onOpenChange={onOpenChange} title={title} wide={wide}>{body}</Sheet>;
  switch (s.kind) {
    case 'loc': return wrap('Your Location', <LocationBody />);
    case 'dial': return wrap(`Call ${s.num}?`, <DialBody num={s.num} />);
    case 'trip': return <TripSheet open={open} onOpenChange={onOpenChange} svc={s.svc} incidentId={s.incidentId} />;
    case 'hosp': return wrap('Nearest Hospitals', <HospitalBody incidentId={s.incidentId} />);
    case 'svcmap': return <ServiceMapSheet open={open} onOpenChange={onOpenChange} svc={s.svc} />;
    case 'cmpmap': return <ComplaintMapSheet open={open} onOpenChange={onOpenChange} id={s.id} />;
    case 'locaccess': return wrap('Location Access', <LocAccessBody />);
    case 'addplace': return wrap('Add New Location', <AddPlaceBody />);
    case 'place': return <PlaceSheet open={open} onOpenChange={onOpenChange} id={s.id} />;
    case 'profile': return wrap('Edit profile', <ProfileBody />);
    case 'request': return wrap(`${SERVICES[s.svc].vehicle} request`, <RequestBody svc={s.svc} />);
  }
}

/* ---------- location ---------- */
function LocationBody() {
  const me = useMe().data, places = usePlaces().data ?? [];
  const upd = useUpdateMe(), close = useOverlays((x) => x.closeSheet), backend = useBackend();
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const useGps = async () => {
    setBusy(true);
    const f = await requestGps();
    if (!f) { setBusy(false); appToast('GPS unavailable here — using your saved area', 'locate', 'amber'); return; }
    const g = await backend.geoReverse(f.lat, f.lng).catch(() => null);
    upd.mutate({ area: { label: g?.label ?? `${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}`, lat: f.lat, lng: f.lng, accuracyM: f.accuracyM, source: 'gps' } });
    setBusy(false); close(); appToast(`Location updated (±${f.accuracyM} m)`, 'locate', 'police');
  };
  return (
    <div className="flex flex-col gap-4">
      <LiveMap className="h-[200px] rounded-2xl" live={false} toggle={false} dest={destPoint(me.area)} aria="Your location" pad={{ t: 40, r: 20, b: 20, l: 20 }} />
      <div className="flex items-start gap-3">
        <Icon name="pin" className="mt-0.5 size-5 text-primary" />
        <div>
          <div className="text-[15px] font-bold">{me.area.label}</div>
          <div className="mt-0.5 text-[13.5px] text-fg-2">
            {me.area.accuracyM != null ? `Accuracy ±${me.area.accuracyM} m · ` : ''}{{ gps: 'GPS fix', network: 'Network', manual: 'Set manually', saved_place: 'Saved place', default: 'Default area' }[me.area.source]}
          </div>
        </div>
      </div>
      <Button variant="soft" onClick={useGps} disabled={busy}><LocateFixed />{busy ? 'Getting a GPS fix…' : 'Use my current location'}</Button>
      <SectionHeader title="Use a saved place" />
      <Card className="overflow-hidden">
        {places.map((x) => {
          const on = me.area.label === x.address;
          return (
            <Row key={x.id} onClick={() => { upd.mutate({ area: { label: x.address, lat: x.lat, lng: x.lng, source: 'saved_place', accuracyM: null } }); close(); appToast(`Location set to ${x.name}`, 'pin', 'police'); }}>
              <IconChip icon={{ home: 'home', work: 'brief', frequent: 'pin' }[x.type]} tone="blue" />
              <RowText title={x.name} sub={x.address} />
              {on && <Chip tone="green">Current</Chip>}
            </Row>
          );
        })}
      </Card>
    </div>
  );
}

/* ---------- dial ---------- */
function DialBody({ num }: { num: string }) {
  const close = useOverlays((x) => x.closeSheet);
  const h = HELPLINES.find((x) => x.num === num);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-fg-2">{h ? `${h.name}${h.sub ? ` (${h.sub})` : ''}` : 'Helpline'}. This will place a <b className="text-fg">real phone call</b> from your device.</p>
      <div className="flex flex-col gap-2.5 desk:flex-row [&>*]:flex-1">
        <Button variant="danger" size="lg" asChild><a href={`tel:${num}`} onClick={() => setTimeout(close, 300)}><Phone />Call {num}</a></Button>
        <Button variant="ghost" size="lg" onClick={close}>Cancel</Button>
      </div>
    </div>
  );
}

/* ---------- trip ---------- */
function TripSheet({ open, onOpenChange, svc, incidentId }: { open: boolean; onOpenChange: (o: boolean) => void; svc: ServiceKey | 'crew'; incidentId: string }) {
  const inc = useIncidents(true).data?.find((i) => i.id === incidentId);
  const a = inc?.assignments.find((x) => x.kind === svc) ?? null;
  const { replay } = useIncidentActions(), openOverlay = useOverlays((x) => x.openOverlay), close = useOverlays((x) => x.closeSheet);
  const t = useT();
  const d = SERVICES[svc];
  const hosp = inc?.destinationHospitalId ? stationById(inc.destinationHospitalId) : null;
  const rows: [string, ReactNode][] = a ? [
    ['Unit', <span className="font-mono">{a.callSign}</span>], ['Dispatched from', a.originName], ['Destination', inc!.address],
    ...(svc === 'ambulance' && hosp ? [['Hospital', hosp.name] as [string, ReactNode]] : []),
    ['Distance left', <Km a={a} />], [t('eta'), <Eta a={a} />], [t('arriving'), <Arrival a={a} />],
  ] : [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${d.vehicle} · ${t('liveTracking')}`}>
      {!a ? <p className="text-[15px] text-fg-2">This trip has ended.</p> : (
        <>
          <Card className="divide-y divide-line overflow-hidden">
            {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 px-4 py-3 text-[14.5px]"><span className="text-fg-2">{k}</span><b className="min-w-0 truncate text-right">{v}</b></div>)}
          </Card>
          <Fill a={a} className="mx-0.5 mt-4" />
          <div className="mt-4 flex flex-col gap-2.5 desk:flex-row [&>*]:flex-1">
            {svc !== 'crew' && <Button variant="soft" onClick={() => openOverlay({ kind: 'call', who: svc })}><Phone />Call</Button>}
            <Button variant="ghost" onClick={() => replay.mutate(incidentId, { onSuccess: () => { close(); appToast('Demo replayed', 'refresh', 'police'); } })}><RefreshCw />Replay demo</Button>
          </div>
          <p className="mt-3 text-[13px] text-fg-3">Simulated trip · runs at demo speed.</p>
        </>
      )}
    </Sheet>
  );
}

/* ---------- hospitals ---------- */
export function HospitalRow({ h, selected, onSelect }: { h: { id: string; name: string; km: number; minutes: number; beds: string | null }; selected: boolean; onSelect: () => void }) {
  const t = useT();
  const ok = h.beds === 'available';
  return (
    <Row onClick={onSelect} selected={selected}>
      <IconChip icon="hospital" tone="blue" />
      <RowText title={h.name} sub={`${h.km} km · ${h.minutes} min`} />
      <Chip tone={ok ? 'green' : 'amber'}>{ok ? t('available') : h.beds === 'limited' ? 'Limited beds' : 'Full'}</Chip>
    </Row>
  );
}
function HospitalBody({ incidentId }: { incidentId: string | null }) {
  const list = useNearbyHospitals().data ?? [];
  const inc = useIncidents(true).data?.find((i) => i.id === incidentId);
  const { setHospital } = useIncidentActions();
  return (
    <div>
      <p className="-mt-1 mb-3 text-[14px] text-fg-2">Choose where the ambulance should take the patient.</p>
      <Card className="overflow-hidden">
        {list.map((h) => (
          <HospitalRow key={h.id} h={h} selected={inc?.destinationHospitalId === h.id} onSelect={() => {
            if (!incidentId) { appToast('Request an ambulance first, then choose a hospital', 'hospital', 'ambulance'); return; }
            setHospital.mutate({ id: incidentId, hospitalId: h.id }, { onSuccess: () => appToast(`${h.name} set as destination`, 'hospital', 'ambulance') });
          }} />
        ))}
      </Card>
      <p className="mt-2.5 text-[13px] text-fg-3">Bed availability shown is sample data.</p>
    </div>
  );
}

/* ---------- maps ---------- */
function ServiceMapSheet({ open, onOpenChange, svc }: { open: boolean; onOpenChange: (o: boolean) => void; svc: ServiceKey }) {
  const { assignment, incident } = useActiveFor(svc);
  const desk = useIsDesktop(), t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={`${SERVICES[svc].vehicle} · ${t('liveTracking')}`} wide>
      <LiveMap className="rounded-2xl" height={desk ? 420 : 320} assignments={assignment ? [assignment] : []} dest={incident ? destPoint(incident) : undefined} aria={`${SERVICES[svc].vehicle} live location`} />
      {assignment && <div className="mt-3.5 flex items-start gap-3"><Icon name="pin" className="mt-0.5 size-5 text-primary" /><div><Label a={assignment} className="text-[15px] font-bold" /><div className="text-[13.5px] text-fg-2">{t('arriving')} <Arrival a={assignment} /></div></div></div>}
    </Sheet>
  );
}
function ComplaintMapSheet({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string }) {
  const c = useComplaint(id).data;
  const desk = useIsDesktop();
  if (!c) return null;
  const res = c.status === 'resolved';
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={c.title} wide>
      <LiveMap className="rounded-2xl" height={desk ? 420 : 320} assignments={c.crew && !res ? [c.crew] : []} issue={{ pt: destPoint(c, ISSUE_PT), state: res ? 'resolved' : 'open' }} live={!res} aria="Complaint location" pad={{ t: 60, r: 30, b: 30, l: 30 }} />
      <div className="mt-3.5 flex items-start gap-3"><Icon name="pin" className="mt-0.5 size-5 text-primary" /><div><div className="text-[15px] font-bold">{c.address}</div><div className="mt-1"><StatusChip status={c.status} /></div></div></div>
    </Sheet>
  );
}

/* ---------- location access ---------- */
function LocAccessBody() {
  const close = useOverlays((x) => x.closeSheet);
  const [state, setState] = useState<string>('unknown');
  if (state === 'unknown' && 'permissions' in navigator) navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((p) => setState(p.state)).catch(() => setState('prompt'));
  return (
    <div className="flex flex-col gap-4">
      {state === 'granted' ? <OkCard title="Allowed while using the app" sub="Precise location is on" />
        : <div className="rounded-2xl border border-warning/25 bg-warning-soft px-4 py-3 text-[14px]"><b>{state === 'denied' ? 'Location is blocked' : 'Location not yet allowed'}</b><div className="text-fg-2">{state === 'denied' ? 'Allow it in your browser settings for faster help.' : 'You will be asked the first time it is needed.'}</div></div>}
      <p className="text-[14.5px] text-fg-2">City Shield uses your location only to send responders to you, show nearby hospitals and tag complaints. Live location pings are kept for 30 days, then deleted. It is never shared with anyone else.</p>
      <Button onClick={close}>Done</Button>
    </div>
  );
}

/* ---------- places ---------- */
function AddPlaceBody() {
  const { add } = usePlaceMutations(), close = useOverlays((x) => x.closeSheet);
  const [name, setName] = useState(''), [addr, setAddr] = useState(''), [type, setType] = useState<PlaceType>('frequent'), [err, setErr] = useState('');
  const save = () => {
    if (!name.trim() || !addr.trim()) { setErr('Please enter a name and an address.'); return; }
    add.mutate({ name: name.trim(), address: addr.trim(), type }, { onSuccess: () => { close(); appToast(`${name.trim()} saved`, 'check', 'civic'); }, onError: (e) => setErr(e.message) });
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Name" htmlFor="p-name"><Input id="p-name" maxLength={40} placeholder="e.g. Office, Gym, College" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
      <Field label="Address" htmlFor="p-addr"><Input id="p-addr" maxLength={120} placeholder="e.g. HSR Layout Sector 2, Bengaluru" value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
      <Field label="Type"><Segmented label="Place type" value={type} onChange={setType} options={[{ value: 'home', label: 'Home' }, { value: 'work', label: 'Work' }, { value: 'frequent', label: 'Frequent' }]} /></Field>
      {err && <p className="text-[13.5px] font-semibold text-sos" role="alert">{err}</p>}
      <Button variant="navy" size="lg" onClick={save} disabled={add.isPending}><Check />Save location</Button>
    </div>
  );
}
function PlaceSheet({ open, onOpenChange, id }: { open: boolean; onOpenChange: (o: boolean) => void; id: string }) {
  const x = usePlaces().data?.find((p) => p.id === id);
  const { remove } = usePlaceMutations(), upd = useUpdateMe(), close = useOverlays((s) => s.closeSheet);
  if (!x) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={x.name}>
      <div className="mb-4 flex items-start gap-3"><Icon name="pin" className="mt-0.5 size-5 text-primary" /><div><div className="text-[15px] font-bold">{x.address}</div><div className="text-[13.5px] text-fg-2">{{ home: 'Home', work: 'Work', frequent: 'Frequent place' }[x.type]}</div></div></div>
      <Card className="divide-y divide-line overflow-hidden">
        <Row chevron onClick={() => { upd.mutate({ area: { label: x.address, lat: x.lat, lng: x.lng, source: 'saved_place', accuracyM: null } }); close(); appToast(`Location set to ${x.name}`, 'pin', 'police'); }}><Icon name="locate" className="size-5 text-fg-2" /><RowText title="Use as my current location" /></Row>
        <Row chevron onClick={async () => {
          const text = `${x.name}: ${x.address}`;
          const canShare = 'share' in navigator;
          try { if (canShare) await navigator.share({ title: x.name, text }); else await navigator.clipboard.writeText(text); appToast(canShare ? `${x.name} shared` : 'Address copied', 'send', 'police'); } catch { /* dismissed */ }
          close();
        }}><Send className="size-5 text-fg-2" /><RowText title="Share this place" /></Row>
        <Row onClick={() => remove.mutate(x.id, { onSuccess: () => { close(); appToast('Place removed', 'bin', 'police'); } })} className="text-sos"><Trash2 className="size-5" /><RowText title="Remove" /></Row>
      </Card>
    </Sheet>
  );
}

/* ---------- profile + phone verification ---------- */
function ProfileBody() {
  const me = useMe().data, upd = useUpdateMe(), backend = useBackend(), close = useOverlays((s) => s.closeSheet);
  const [name, setName] = useState(me?.name ?? ''), [phone, setPhone] = useState(me?.phone ?? ''), [err, setErr] = useState('');
  const [otp, setOtp] = useState<{ sent: boolean; code: string; dev?: string }>({ sent: false, code: '' });
  if (!me) return null;
  const save = () => {
    if (name.trim().length < 2) { setErr('Please enter your name.'); return; }
    if (!/^[+\d][\d\s-]{7,}$/.test(phone.trim())) { setErr('Please enter a valid mobile number.'); return; }
    upd.mutate({ name: name.trim(), phone: phone.trim() }, { onSuccess: () => { close(); appToast('Profile updated', 'check', 'civic'); }, onError: (e) => setErr(e.message) });
  };
  const send = async () => {
    setErr('');
    try { const r = await backend.otpRequest(phone.trim()); setOtp({ sent: true, code: '', dev: r.devCode }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send the code'); }
  };
  const verify = async () => {
    try { await backend.otpVerify(phone.trim(), otp.code); upd.reset(); close(); appToast('Mobile number verified', 'shieldCheck', 'civic'); location.reload(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Verification failed'); }
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="u-name"><Input id="u-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Mobile number" htmlFor="u-phone" hint={me.phoneVerified ? <span className="text-[13px] font-semibold text-success">Verified</span> : <span className="text-[13px] text-fg-3">Not verified yet — verify to keep your history across devices.</span>}>
        <Input id="u-phone" inputMode="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      {!me.phoneVerified && (
        <div className="rounded-2xl border border-line bg-surface-2 p-3.5">
          {!otp.sent ? <Button variant="soft" size="sm" onClick={send}>Send verification code</Button> : (
            <div className="flex flex-col gap-2.5">
              <Field label="6-digit code" htmlFor="u-otp"><Input id="u-otp" inputMode="numeric" maxLength={6} value={otp.code} onChange={(e) => setOtp({ ...otp, code: e.target.value.replace(/\D/g, '') })} /></Field>
              {otp.dev && <p className="text-[13px] text-fg-3">Development mode: no SMS is sent. Your code is <b className="font-mono text-fg">{otp.dev}</b>.</p>}
              <Button size="sm" onClick={verify} disabled={otp.code.length !== 6}>Verify</Button>
            </div>
          )}
        </div>
      )}
      {err && <p className="text-[13.5px] font-semibold text-sos" role="alert">{err}</p>}
      <Button size="lg" onClick={save} disabled={upd.isPending}><Check />Save</Button>
    </div>
  );
}

/* ---------- request a service ---------- */
function RequestBody({ svc }: { svc: ServiceKey }) {
  const me = useMe().data, { raise } = useIncidentActions(), close = useOverlays((s) => s.closeSheet), nav = useNavigate();
  const t = useT();
  if (!me) return null;
  const d = SERVICES[svc];
  const go = () => raise.mutate({ kind: svc, location: areaLocation(me) }, {
    onSuccess: () => { close(); appToast(`${d.vehicle} dispatched to your location`, SERVICE_ICON[svc], svc); nav(`/service/${svc}`); },
    onError: () => appToast('Could not reach the control room. Call 112.', 'alert', 'sos'),
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3"><IconChip icon={SERVICE_ICON[svc]} tone={svc} size="lg" /><div><div className="text-[16px] font-bold">{t(`svc_${svc}` as never)}</div><div className="text-[13.5px] text-fg-2">{SERVICE_SUB[svc]}</div></div></div>
      <p className="text-[15px] text-fg-2">Send the nearest {d.vehicle.toLowerCase()} to <b className="text-fg">{shortArea(me.area.label)}</b>? Your location is shared with the responding unit.</p>
      <div className="flex flex-col gap-2.5 desk:flex-row [&>*]:flex-1">
        <Button variant={svc === 'civic' ? 'primary' : 'sos'} size="lg" onClick={go} disabled={raise.isPending}><Icon name={SERVICE_ICON[svc]} />{raise.isPending ? 'Dispatching…' : `Request ${d.vehicle.toLowerCase()}`}</Button>
        <Button variant="ghost" size="lg" onClick={close}>Cancel</Button>
      </div>
      {svc !== 'civic' && <p className="text-[13px] text-fg-3">Prototype — responders are simulated. In a real emergency call 112.</p>}
    </div>
  );
}

