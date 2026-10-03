import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Bell, ChevronRight, Clock, MapPin } from 'lucide-react';
import { SERVICE_KEYS, type ServiceKey } from '@shared/contract.ts';
import { CIVIC, SERVICES, SERVICE_SUB, stationById } from '@shared/catalog.ts';
import { destPoint } from '@shared/services.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet, startSos } from '@/app/overlayStore.ts';
import { useComplaints, useIncidents, useMarkRead, useMe, useNotifications, useUnread } from '@/lib/api/hooks.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Chip, LivePill } from '@/components/ui/chip.tsx';
import { ComplaintRow, IconChip, NotificationRow, Row } from '@/components/common.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { Logo, ShieldMark } from '@/components/brand/Logo.tsx';
import { HeroArt2D } from '@/components/art/Art.tsx';
import { Skeleton } from '@/components/ui/controls.tsx';
import { LiveMap } from '@/features/map/LiveMap.tsx';
import { Arrival, Eta, Fill, Status } from '@/features/sim/live.tsx';
import { useDecor3D } from '@/features/three/support.ts';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { firstName } from '@/lib/utils.ts';
import { greetingKey, useT, type TKey } from '@/i18n/index.ts';
import { openNotification } from './Notifications.tsx';
import { ThemeToggle } from '@/components/ThemeToggle.tsx';

const HeroSkyline = lazy(() => import('@/features/three/HeroSkyline.tsx'));

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rise = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] as const } } };

function Hero3D({ fallback, compact }: { fallback: React.ReactNode; compact?: boolean }) {
  const deco = useDecor3D();
  if (!deco) return <>{fallback}</>;
  return <Suspense fallback={fallback}><HeroSkyline compact={compact} /></Suspense>;
}

export default function Home() {
  const desk = useIsDesktop(), t = useT(), me = useMe().data;
  usePageMeta({ title: t('home'), sub: me ? `${me.city} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}` : undefined, side: 'home', tab: 'home' });
  return desk ? <HomeDesktop /> : <HomeMobile />;
}

function HomeMobile() {
  const t = useT(), me = useMe().data, nav = useNavigate(), unread = useUnread();
  const active = (useIncidents(true).data ?? []).flatMap((i) => i.assignments.filter((a) => a.arrivedAt == null || Date.now() - a.arrivedAt < 60_000).map((a) => ({ i, a })));
  return (
    <div className="min-h-full bg-navy-900">
      <section className="relative h-[400px] overflow-hidden text-white">
        <Hero3D compact fallback={<HeroArt2D className="absolute inset-0" />} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(24_48_110/0.6)_0%,rgb(24_48_110/0)_38%,rgb(24_48_110/0.2)_68%,var(--navy-900)_100%)]" />
        <div className="absolute top-4 left-4"><Logo tagline={t('tagline')} /></div>
        <div className="absolute top-5 right-4 flex items-center gap-2">
          <ThemeToggle variant="glass" />
          <button onClick={() => nav('/notifications')} aria-label={t('notifications')} className="relative grid size-11 place-items-center rounded-2xl bg-white/10 backdrop-blur-md">
            <Bell className="size-5" />
            {unread > 0 && <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sos px-1 text-[11.5px] font-bold">{unread}</span>}
          </button>
        </div>
        <div className="absolute bottom-6 left-5">
          <div className="text-[15px] text-white/75">{t(greetingKey())}</div>
          <h1 className="text-[38px] leading-tight font-extrabold tracking-[-0.025em]">{me ? firstName(me.name) : <Skeleton className="h-9 w-40 bg-white/10" />}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[14px] text-white/80"><MapPin className="size-4" />{me?.city}</div>
        </div>
      </section>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3.5 rounded-t-[26px] bg-bg px-4 pt-5 pb-6">
        <motion.button variants={rise} onClick={startSos} className="flex items-center gap-3.5 rounded-card bg-gradient-to-br from-[#EE4248] to-sos-deep p-4 text-left text-white shadow-[0_14px_30px_-12px_rgb(220_47_53/0.7)] active:scale-[0.99]">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/15"><Icon name="siren" className="size-6" /></span>
          <div className="flex-1"><div className="text-[17.5px] font-extrabold">{t('oneTap')}</div><div className="text-[13.5px] text-white/80">{t('police')} · {t('ambulance')} · {t('fire')} · {t('civic')}</div></div>
          <ChevronRight className="size-5" />
        </motion.button>
        <motion.div variants={rise}>
          <Card className="grid grid-cols-4 gap-1 p-3">
            {SERVICE_KEYS.map((k) => (
              <button key={k} onClick={() => nav(`/service/${k}`)} className="flex flex-col items-center gap-2 rounded-2xl py-2 text-[13px] font-bold hover:bg-surface-2">
                <IconChip icon={SERVICE_ICON[k]} tone={k} size="lg" />{t(k as TKey)}
              </button>
            ))}
          </Card>
        </motion.div>
        {active.length > 0 && (
          <motion.div variants={rise}>
            <Card className="overflow-hidden">
              <CardHeader title={t('liveTracking')} right={<LivePill />} />
              {active.map(({ a }) => (
                <Row key={a.unitId} chevron onClick={() => nav(`/service/${a.kind === 'crew' ? 'civic' : a.kind}`)}>
                  <IconChip icon={SERVICE_ICON[a.kind]} tone={a.kind} />
                  <div className="min-w-0 flex-1"><div className="text-[15px] font-bold">{SERVICES[a.kind].vehicle}</div><Status a={a} className="text-[13.5px] text-fg-2" /></div>
                  <Eta a={a} className="text-[14.5px] font-extrabold tabular" />
                </Row>
              ))}
            </Card>
          </motion.div>
        )}
        <motion.div variants={rise}><RecentComplaints /></motion.div>
      </motion.div>
    </div>
  );
}

function HomeDesktop() {
  const t = useT(), me = useMe().data, nav = useNavigate();
  const incs = useIncidents(true).data;
  const amb = incs?.find((i) => i.assignments.some((a) => a.kind === 'ambulance'));
  const a = amb?.assignments.find((x) => x.kind === 'ambulance') ?? null;
  const hosp = amb?.destinationHospitalId ? stationById(amb.destinationHospitalId) : null;
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto flex max-w-[1320px] flex-col gap-5 p-6">
      <motion.section variants={rise} className="relative h-[380px] overflow-hidden rounded-[24px] bg-navy-900 text-white shadow-float">
        <div className="absolute inset-y-0 right-0 w-[70%]"><Hero3D fallback={<HeroArt2D className="absolute inset-0" slice />} /></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--navy-900)_30%,rgb(24_48_110/0.65)_46%,rgb(24_48_110/0)_66%)]" />
        <div className="pointer-events-none absolute top-1/2 right-10 hidden -translate-y-1/2 wide:block"><ShieldMark className="h-[230px] animate-[float_6s_ease-in-out_infinite] drop-shadow-[0_24px_40px_rgb(5_15_45/0.55)]" title="City Shield" /></div>
        <div className="relative flex h-full max-w-[470px] flex-col justify-center px-9">
          <div className="text-[15px] text-white/75">{t(greetingKey())}</div>
          <h1 className="text-[40px] leading-tight font-extrabold tracking-[-0.025em]">{me ? firstName(me.name) : '…'}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[14px] text-white/75"><MapPin className="size-4" />{me?.city}</div>
          <p className="mt-3.5 max-w-[430px] text-[15.5px] leading-relaxed text-white/80">{t('police')}, {t('ambulance')}, {t('fire')} and {CIVIC.short} services — one tap away, tracked live.</p>
          <div className="mt-5 flex gap-3">
            <Button variant="sos" size="lg" onClick={startSos}><Icon name="siren" />{t('sosTitle')}</Button>
            <Button variant="glass" size="lg" onClick={() => nav('/complaints')}><Icon name="clipboard" />{t('reportC')}</Button>
          </div>
        </div>
      </motion.section>

      <motion.div variants={rise} className="grid grid-cols-4 gap-4">
        {SERVICE_KEYS.map((k: ServiceKey) => (
          <button key={k} onClick={() => nav(`/service/${k}`)} className="group flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-float">
            <IconChip icon={SERVICE_ICON[k]} tone={k} size="lg" />
            <div><div className="text-[16px] font-extrabold">{t(`svc_${k}` as TKey)}</div><div className="mt-0.5 text-[13.5px] text-fg-2">{SERVICE_SUB[k]}</div></div>
            <span className="mt-auto inline-flex items-center gap-1 text-[13.5px] font-bold text-primary">{t('liveTracking')}<ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        ))}
      </motion.div>

      <motion.div variants={rise} className="grid grid-cols-[1.25fr_1fr] gap-5">
        <Card className="flex min-h-[460px] flex-col overflow-hidden">
          {incs === undefined ? <Skeleton className="m-4 h-[400px]" /> : a && amb ? (
            <>
              <LiveMap className="h-[300px]" assignments={[a]} dest={destPoint(amb)} aria="Ambulance live location" pad={{ t: 66, r: 20, b: 24, l: 20 }} />
              <div className="flex flex-1 flex-col gap-3.5 p-5">
                <div className="flex items-center gap-3">
                  <IconChip icon="ambulance" tone="ambulance" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[16.5px] font-extrabold">{SERVICES.ambulance.vehicle} <Chip className="ml-1 font-mono">{a.callSign}</Chip></div>
                    <Status a={a} className="text-[13.5px] text-fg-2" />
                  </div>
                </div>
                <Fill a={a} />
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2 p-3.5">
                  <div><div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-2"><Clock className="size-3.5" />{t('eta')}</div><Eta a={a} className="text-[24px] font-extrabold tabular" /></div>
                  <div><div className="text-[13px] font-semibold text-fg-2">{t('arriving')}</div><Arrival a={a} className="text-[24px] font-extrabold tabular" /></div>
                </div>
                {hosp && <div className="text-[13.5px] text-fg-2">Then to <b className="text-fg">{hosp.name}</b></div>}
                <Button className="mt-auto" onClick={() => nav('/service/ambulance')}>Open live tracking<ChevronRight /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <ShieldMark className="h-16" />
              <div className="text-[17px] font-extrabold">All clear</div>
              <p className="max-w-[320px] text-[14.5px] text-fg-2">No responders are on their way to you. Request any service in one tap, or press SOS in an emergency.</p>
              <Button variant="soft" onClick={() => nav('/track')}>Open live tracking</Button>
            </div>
          )}
        </Card>
        <div className="flex flex-col gap-5">
          <RecentComplaints />
          <RecentNotifications />
        </div>
      </motion.div>
      <motion.div variants={rise}><FeatureStrip /></motion.div>
    </motion.div>
  );
}

function RecentComplaints() {
  const t = useT(), nav = useNavigate(), q = useComplaints('all');
  return (
    <Card className="overflow-hidden">
      <CardHeader title={t('myC')} right={<Button variant="link" size="sm" onClick={() => nav('/complaints/mine')}>{t('viewAll')}</Button>} />
      {q.isLoading ? <div className="flex flex-col gap-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        : (q.data ?? []).slice(0, 3).map((c) => <ComplaintRow key={c.id} c={c} onClick={() => nav(`/complaints/${c.id}`)} />)}
    </Card>
  );
}
function RecentNotifications() {
  const t = useT(), nav = useNavigate(), list = useNotifications().data ?? [], read = useMarkRead();
  return (
    <Card className="overflow-hidden">
      <CardHeader title={t('notifications')} right={<Button variant="link" size="sm" onClick={() => nav('/notifications')}>{t('viewAll')}</Button>} />
      {list.slice(0, 3).map((n) => <NotificationRow key={n.id} n={n} onClick={() => openNotification(n, nav, read.mutate)} />)}
    </Card>
  );
}
function FeatureStrip() {
  const t = useT();
  const F: [string, string][] = [['timer', 'Faster Response'], ['pin', 'Live Tracking'], ['clock', 'Real-Time Updates'], ['clipboard', 'Easy Reporting'], ['users', 'Connected Services']];
  return (
    <section className="flex items-center gap-8 rounded-[22px] bg-[linear-gradient(110deg,var(--navy-900),var(--navy-800))] px-7 py-5 text-white">
      <Logo tagline={t('tagline')} />
      <div className="flex flex-1 flex-wrap justify-center gap-x-7 gap-y-2">
        {F.map(([i, l]) => <div key={l} className="flex items-center gap-2 text-[14px] font-semibold text-white/85"><Icon name={i} className="size-[18px] text-sky" />{l}</div>)}
      </div>
      <button onClick={() => openSheet({ kind: 'dial', num: '112' })} className="text-right text-[13.5px] text-white/70 hover:text-white">A safer Bengaluru<br />is in your hands.</button>
    </section>
  );
}
