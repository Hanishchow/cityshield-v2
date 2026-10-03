/**
 * Full-screen overlays: the SOS countdown → dispatch flow and the simulated
 * phone / video calls. Escape (or Cancel) during the countdown sends nothing.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, PhoneOff, Route, X } from 'lucide-react';
import { SERVICES } from '@shared/catalog.ts';
import { useOverlays } from './overlayStore.ts';
import { useIncidentActions, useIncidents, useMe, useBackend } from '@/lib/api/hooks.ts';
import { areaLocation, requestGps } from '@/lib/location.ts';
import { appToast } from '@/components/toast.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { Button } from '@/components/ui/button.tsx';
import { OfficerArt } from '@/components/art/Art.tsx';
import { Eta, Status } from '@/features/sim/live.tsx';
import { useDecor3D } from '@/features/three/support.ts';
import { cn, fmtTime2, initials, shortArea, vibrate } from '@/lib/utils.ts';
import { useT } from '@/i18n/index.ts';

const SosShockwave = lazy(() => import('@/features/three/SosScenes.tsx').then((m) => ({ default: m.SosShockwave })));
const DispatchScene = lazy(() => import('@/features/three/SosScenes.tsx').then((m) => ({ default: m.DispatchScene })));

const CALLEE = {
  police: { n: 'SI Ramesh Kumar', s: 'Karnataka Police · 98867 12345', av: 'officer' },
  ambulance: { n: 'Ambulance crew', s: 'AMB-14 · on the way', av: 'ambulance' },
  fire: { n: 'Jayanagar Fire Station', s: 'Fire & Emergency Services', av: 'fire' },
  civic: { n: 'GBA Ward Office', s: 'Zone 3 · Koramangala', av: 'bin' },
} as const;

export function Overlays() {
  const overlay = useOverlays((s) => s.overlay);
  return (
    <AnimatePresence>
      {overlay && (
        <motion.div key={overlay.kind} className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {overlay.kind === 'sos-countdown' && <SosCountdown />}
          {overlay.kind === 'sos-sent' && <SosSent incidentId={overlay.incidentId} />}
          {overlay.kind === 'call' && <CallScreen who={overlay.who} />}
          {overlay.kind === 'video' && <VideoScreen />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Shell({ children, tone = 'sos', label }: { children: React.ReactNode; tone?: 'sos' | 'calm'; label: string }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-label={label}
      className={cn('flex size-full flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center text-white',
        tone === 'sos' ? 'bg-[radial-gradient(120%_80%_at_50%_30%,#3A0D16_0%,#0A1330_60%,#050B1E_100%)]' : 'bg-[radial-gradient(120%_80%_at_50%_20%,#13285E_0%,#0A1533_55%,#050B1E_100%)]')}>
      {children}
    </div>
  );
}

function SosCountdown() {
  const { closeOverlay, openOverlay } = useOverlays();
  const me = useMe().data;
  const { sos } = useIncidentActions();
  const backend = useBackend();
  const t = useT();
  const deco = useDecor3D();
  const [n, setN] = useState(3);
  const fired = useRef(false);
  const key = useRef(crypto.randomUUID());

  const cancel = () => { if (fired.current) return; closeOverlay(); appToast('SOS cancelled — nothing was sent', 'x', 'police'); };

  useEffect(() => {
    vibrate(60);
    const iv = setInterval(() => setN((x) => x - 1), 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    document.addEventListener('keydown', onKey);
    return () => { clearInterval(iv); document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (n > 0 || fired.current || !me) return;
    fired.current = true;
    vibrate([120, 60, 120]);
    sos.mutate({ location: areaLocation(me), key: key.current }, {
      onSuccess: (inc) => {
        openOverlay({ kind: 'sos-sent', incidentId: inc.id });
        /* refine with GPS in the background — never delay the SOS for it */
        if (me.shareLive) void requestGps().then((f) => f && backend.ping(inc.id, { ...f, source: 'gps' }).catch(() => {}));
      },
      onError: () => { closeOverlay(); appToast('Could not send SOS. Call 112 now.', 'alert', 'sos'); },
    });
  }, [n, me, sos, openOverlay, closeOverlay, backend]);

  const C = 2 * Math.PI * 80;
  return (
    <Shell label="SOS countdown">
      <div className="relative grid size-[260px] place-items-center">
        {deco && <Suspense fallback={null}><div className="absolute -inset-24"><SosShockwave level={1} /></div></Suspense>}
        <svg viewBox="0 0 180 180" className="absolute inset-[30px] -rotate-90">
          <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
          <circle cx="90" cy="90" r="80" fill="none" stroke="#FF4D4F" strokeWidth="10" strokeLinecap="round" strokeDasharray={C.toFixed(1)}
            style={{ strokeDashoffset: 0, animation: 'cs-cd 3s linear forwards' }} />
          <style>{`@keyframes cs-cd{to{stroke-dashoffset:${C.toFixed(1)}}}`}</style>
        </svg>
        <b className="relative text-[64px] font-extrabold tabular" aria-live="assertive">{Math.max(n, 0) || <Check className="size-14" />}</b>
      </div>
      <h2 className="mt-6 text-[24px] font-extrabold">{n > 0 ? <>Sending SOS in {n}…</> : 'Sending…'}</h2>
      <p className="mt-2 max-w-[360px] text-[14px] text-white/75">
        Alerting the nearest {t('ambulance')} and {t('police')} with your live location — {me ? shortArea(me.area.label) : '…'}.
      </p>
      <Button variant="overlay" size="lg" className="mt-8 min-w-[200px]" onClick={cancel} disabled={n <= 0} autoFocus><X />Cancel</Button>
      <p className="mt-6 text-[11.5px] text-white/50">Prototype — no real emergency service is contacted. In a real emergency call 112.</p>
    </Shell>
  );
}

function SosSent({ incidentId }: { incidentId: string }) {
  const { closeOverlay } = useOverlays();
  const nav = useNavigate();
  const me = useMe().data;
  const inc = useIncidents(true).data?.find((i) => i.id === incidentId);
  const deco = useDecor3D();
  const track = (k: string) => { closeOverlay(); nav(`/service/${k}`); };
  const as = inc?.assignments ?? [];
  return (
    <Shell tone="calm" label="SOS sent">
      <div className="w-full max-w-[460px]">
        {deco && as.length ? (
          <Suspense fallback={<div className="h-[220px]" />}><DispatchScene assignments={as} /></Suspense>
        ) : (
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-success shadow-[0_0_0_10px_rgb(14_138_79/0.2)]"><Check className="size-10" strokeWidth={3} /></div>
        )}
        <h2 className="text-[26px] font-extrabold">Help is on the way</h2>
        <p className="mt-2 text-[14px] text-white/75">
          SOS sent at {fmtTime2(inc?.createdAt ?? Date.now())} · <span className="font-mono">{incidentId}</span>.{' '}
          {me?.shareLive ? 'Your live location is being shared with responders.' : `Your location (${shortArea(me?.area.label ?? '')}) was shared with responders.`}
        </p>
        <div className="mt-5 flex flex-col gap-2.5 text-left">
          {as.map((a) => (
            <div key={a.unitId} className="bevel flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
              <span className="grid size-10 place-items-center rounded-xl" style={{ background: SERVICES[a.kind].color }}><Icon name={SERVICE_ICON[a.kind]} className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-bold">{SERVICES[a.kind].vehicle} · <span className="font-mono">{a.callSign}</span></div>
                <Status a={a} className="text-[12.5px] text-white/65" />
              </div>
              <Eta a={a} className="text-[15px] font-extrabold tabular" />
            </div>
          ))}
          {!as.length && <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-[13px] text-white/75">Your request is queued with the control room. Call 112 if this is life-threatening.</div>}
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          {as.some((a) => a.kind === 'ambulance') && <Button size="lg" onClick={() => track('ambulance')}><Route />Track ambulance live</Button>}
          {as.some((a) => a.kind === 'police') && <Button variant="overlay" size="lg" onClick={() => track('police')}>Track police</Button>}
          <Button variant="overlay" size="lg" onClick={closeOverlay}>Close</Button>
        </div>
        <p className="mt-5 text-[11.5px] text-white/50">Prototype demo — no real emergency service was contacted. In a real emergency call 112.</p>
      </div>
    </Shell>
  );
}

function useCallClock() {
  const [s, setS] = useState(0);
  useEffect(() => { const iv = setInterval(() => setS((x) => x + 1), 1000); return () => clearInterval(iv); }, []);
  if (s < 2) return 'Calling…';
  const q = s - 2;
  return `Connected · ${String(Math.floor(q / 60)).padStart(2, '0')}:${String(q % 60).padStart(2, '0')}`;
}
function CallControls({ second }: { second: { icon: string; label: string } }) {
  const { closeOverlay } = useOverlays();
  const [mute, setMute] = useState(false), [alt, setAlt] = useState(false);
  const b = 'grid size-14 place-items-center rounded-full bg-white/12 text-white transition-colors aria-pressed:bg-white aria-pressed:text-navy-900';
  return (
    <div className="mt-10 flex items-center justify-center gap-6">
      <button className={b} aria-pressed={mute} aria-label="Mute" onClick={() => setMute(!mute)}><Icon name="micOff" className="size-6" /></button>
      <button className="grid size-16 place-items-center rounded-full bg-sos text-white shadow-[0_10px_24px_-6px_rgb(220_47_53/0.7)]" aria-label="End call" onClick={closeOverlay}><PhoneOff className="size-7" /></button>
      <button className={b} aria-pressed={alt} aria-label={second.label} onClick={() => setAlt(!alt)}><Icon name={second.icon} className="size-6" /></button>
    </div>
  );
}
function useEscClose() {
  const { closeOverlay } = useOverlays();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && closeOverlay(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [closeOverlay]);
}
function CallScreen({ who }: { who: keyof typeof CALLEE }) {
  const c = CALLEE[who];
  const st = useCallClock();
  useEscClose();
  return (
    <Shell tone="calm" label="Call">
      <div className="grid size-28 place-items-center overflow-hidden rounded-full bg-white/10 ring-4 ring-white/10">
        {c.av === 'officer' ? <OfficerArt className="size-full" slice /> : <Icon name={c.av} className="size-12" />}
      </div>
      <h2 className="mt-5 text-[24px] font-extrabold">{c.n}</h2>
      <p className="mt-1 text-[14px] text-white/75 tabular" aria-live="polite">{st}</p>
      <p className="mt-1 text-[12.5px] text-white/55">{c.s}</p>
      <CallControls second={{ icon: 'speaker', label: 'Speaker' }} />
      <p className="mt-8 text-[11.5px] text-white/50">Simulated call · prototype</p>
    </Shell>
  );
}
function VideoScreen() {
  const st = useCallClock();
  const me = useMe().data;
  useEscClose();
  return (
    <div role="dialog" aria-modal="true" aria-label="Video call" className="relative size-full overflow-hidden bg-navy-950 text-white desk:m-auto desk:mt-[8vh] desk:h-[min(660px,84vh)] desk:w-[min(980px,88vw)] desk:rounded-3xl desk:shadow-float">
      <OfficerArt className="absolute inset-0" slice />
      <div className="absolute inset-x-0 top-0 z-[1] h-40 bg-gradient-to-b from-navy-950/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-52 bg-gradient-to-t from-navy-950/80 to-transparent" />
      <div className="absolute top-5 right-5 left-5 z-[2] flex items-start justify-between">
        <div><b className="block text-[17px]">SI Ramesh Kumar</b><span className="text-[13px] text-white/75">{st === 'Calling…' ? 'Connecting video…' : st}</span></div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sos px-2.5 py-1 text-[10.5px] font-extrabold tracking-wider"><i className="size-1.5 animate-live rounded-full bg-white" />LIVE</span>
      </div>
      <div className="absolute right-5 bottom-32 z-[2] grid h-36 w-28 place-items-center rounded-2xl border border-white/20 bg-navy-800 text-[22px] font-extrabold desk:h-44 desk:w-32">{initials(me?.name ?? '')}</div>
      <div className="absolute inset-x-0 bottom-10 z-[2]"><CallControls second={{ icon: 'flip', label: 'Switch camera' }} /></div>
      <p className="absolute inset-x-0 bottom-3 z-[2] text-center text-[11px] text-white/55">Simulated video call · prototype</p>
    </div>
  );
}
