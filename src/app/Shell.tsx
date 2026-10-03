/**
 * App shell. Phones (<960 px): a single column with page headers and a bottom
 * tab bar. Desktop: the prototype's navy sidebar plus a topbar. 112 is one tap
 * away in both, including in offline mode.
 */
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Bell, WifiOff } from 'lucide-react';
import { SERVICE_KEYS } from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import { usePageMetaStore, type Side } from './pageMeta.ts';
import { openSheet, startSos } from './overlayStore.ts';
import { useIncidents, useMe, useMode, useUnread } from '@/lib/api/hooks.ts';
import { Logo } from '@/components/brand/Logo.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { cn, initials, shortArea } from '@/lib/utils.ts';
import { useT, type TKey } from '@/i18n/index.ts';
import { useReducedMotion } from '@/lib/useMedia.ts';

function NavItem({ side, to, icon, label, cur, extra }: { side: Side; to: string; icon: string; label: string; cur: Side; extra?: React.ReactNode }) {
  const nav = useNavigate();
  const on = cur === side;
  return (
    <button onClick={() => nav(to)} aria-current={on ? 'page' : undefined}
      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors', on ? 'bevel bg-white/[0.09] text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white')}>
      <Icon name={icon} className="size-[19px]" />
      <span className="flex-1 text-left">{label}</span>
      {extra}
    </button>
  );
}
const Group = ({ children }: { children: React.ReactNode }) => <div className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-white/40 uppercase">{children}</div>;

function Sidebar() {
  const t = useT(), cur = usePageMetaStore((s) => s.meta.side), unread = useUnread();
  const active = useIncidents(true).data ?? [];
  const live = (k: string) => active.some((i) => i.assignments.some((a) => a.kind === k && a.arrivedAt == null));
  return (
    <aside className="sticky top-0 hidden h-dvh w-[268px] shrink-0 flex-col overflow-y-auto bg-[linear-gradient(180deg,var(--navy-900),var(--navy-950))] px-3 py-5 text-white desk:flex" aria-label="Main navigation">
      <Logo className="px-2 pb-5" tagline={t('tagline')} />
      <button onClick={startSos} className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#EE4248] to-sos-deep px-3.5 py-3 text-left shadow-[0_12px_28px_-10px_rgb(220_47_53/0.75)] transition hover:brightness-110">
        <Icon name="siren" className="size-6" />
        <span><b className="block text-[14.5px]">{t('sosTitle')}</b><small className="text-[11.5px] text-white/80">{t('police')} · {t('ambulance')} · {t('fire')}</small></span>
      </button>
      <NavItem side="home" to="/" icon="home" label={t('home')} cur={cur} />
      <Group>Services</Group>
      {SERVICE_KEYS.map((k) => (
        <NavItem key={k} side={k} to={`/service/${k}`} icon={SERVICE_ICON[k]} label={t(`svc_${k}` as TKey)} cur={cur}
          extra={live(k) ? <span className="size-2 animate-live rounded-full" style={{ background: SERVICES[k].color }} title="Live" /> : undefined} />
      ))}
      <Group>Civic</Group>
      <NavItem side="complaints" to="/complaints" icon="clipboard" label={t('complaints')} cur={cur} />
      <NavItem side="track" to="/track" icon="track" label={t('liveTracking')} cur={cur} />
      <NavItem side="notifications" to="/notifications" icon="bell" label={t('notifications')} cur={cur}
        extra={unread ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sos px-1.5 text-[11px] font-bold">{unread > 9 ? '9+' : unread}</span> : undefined} />
      <Group>Account</Group>
      <NavItem side="places" to="/places" icon="pin" label={t('saved')} cur={cur} />
      <NavItem side="profile" to="/profile" icon="user" label={t('profile')} cur={cur} />
      <NavItem side="prefs" to="/settings" icon="globe" label="Preferences" cur={cur} />
      <Group>Government</Group>
      <NavItem side="command" to="/command" icon="grid" label="Command Centre" cur={cur} />
      <div className="mt-auto pt-5">
        <button onClick={() => openSheet({ kind: 'dial', num: '112' })} className="bevel flex w-full items-center gap-3 rounded-2xl bg-white/[0.05] px-3 py-3 text-left hover:bg-white/[0.08]">
          <span className="grid size-10 place-items-center rounded-xl bg-sos/20 text-[#FF6B6E]"><Icon name="phone" className="size-5" /></span>
          <span><b className="block text-[15px]">112</b><span className="text-[11.5px] text-white/60">All emergencies · opens your phone dialer</span></span>
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  const meta = usePageMetaStore((s) => s.meta), me = useMe().data, unread = useUnread(), nav = useNavigate(), loc = useLocation();
  const canBack = loc.pathname !== '/' && history.length > 1;
  return (
    <header className="sticky top-0 z-30 hidden h-[72px] items-center gap-3 border-b border-line bg-surface/85 px-6 backdrop-blur-xl desk:flex">
      {canBack && <button onClick={() => nav(-1)} aria-label="Back" className="grid size-10 place-items-center rounded-xl text-fg-2 hover:bg-surface-3 hover:text-fg"><ArrowLeft className="size-5" /></button>}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-extrabold tracking-[-0.015em]">{meta.title}</h1>
        {meta.sub && <p className="truncate text-[12.5px] text-fg-2">{meta.sub}</p>}
      </div>
      <button onClick={() => openSheet({ kind: 'loc' })} className="flex max-w-[260px] items-center gap-1.5 truncate rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] font-semibold text-fg-2 hover:text-fg">
        <Icon name="pin" className="size-4 shrink-0 text-primary" /><span className="truncate">{me ? shortArea(me.area.label) : '…'}</span>
      </button>
      <button onClick={() => nav('/notifications')} aria-label="Notifications" className="relative grid size-10 place-items-center rounded-xl border border-line bg-surface-2 text-fg-2 hover:text-fg">
        <Bell className="size-5" />
        {unread > 0 && <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sos px-1 text-[10.5px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      <button onClick={() => nav('/profile')} className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 hover:bg-surface-3">
        <i className="grid size-9 place-items-center rounded-xl bg-navy-900 text-[12.5px] font-extrabold text-white not-italic dark:bg-primary">{initials(me?.name ?? '')}</i>
        <span className="hidden text-left wide:block"><b className="block text-[13px] leading-tight">{me?.name}</b><span className="text-[11.5px] text-fg-3">{me?.role === 'citizen' ? 'Citizen' : 'Operator'}</span></span>
      </button>
    </header>
  );
}

function BottomNav() {
  const meta = usePageMetaStore((s) => s.meta), nav = useNavigate(), t = useT();
  if (!meta.tab) return null;
  const TABS: [string, string, string, TKey][] = [['home', '/', 'home', 'home'], ['complaints', '/complaints', 'clipboard', 'complaints'], ['track', '/track', 'track', 'track'], ['more', '/profile', 'more', 'more']];
  return (
    <nav aria-label="Tabs" className={cn('fixed bottom-0 left-1/2 z-30 flex w-full max-w-[560px] -translate-x-1/2 border-t px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] desk:hidden',
      meta.dark ? 'border-white/[0.07] bg-[#0B1734]' : 'border-line bg-surface/95 backdrop-blur-xl')}>
      {TABS.map(([k, to, icon, label]) => {
        const on = meta.tab === k;
        return (
          <button key={k} onClick={() => nav(to)} aria-current={on ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold', on ? (meta.dark ? 'text-white' : 'text-primary') : meta.dark ? 'text-white/50' : 'text-fg-3')}>
            <Icon name={icon} className="size-[22px]" />{t(label)}
          </button>
        );
      })}
    </nav>
  );
}

function OfflineBanner() {
  const mode = useMode(), t = useT();
  if (mode !== 'offline') return null;
  return (
    <div role="status" className="flex items-center gap-2 bg-warning-soft px-4 py-2 text-[12.5px] font-semibold text-warning">
      <WifiOff className="size-4 shrink-0" />
      <span className="flex-1">{t('offlineDemo')}</span>
      <button onClick={() => openSheet({ kind: 'dial', num: '112' })} className="rounded-lg bg-sos px-2.5 py-1 text-[12px] font-bold text-white">112</button>
    </div>
  );
}

export function Shell() {
  const outlet = useOutlet(), loc = useLocation();
  const meta = usePageMetaStore((s) => s.meta);
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-dvh bg-navy-900 desk:bg-bg">
      <Sidebar />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[560px] min-w-0 flex-col bg-bg desk:mx-0 desk:max-w-none desk:flex-1">
        <Topbar />
        <OfflineBanner />
        <motion.main key={loc.pathname} id="main" className={cn('flex-1', meta.tab && 'pb-[calc(72px+env(safe-area-inset-bottom,0px))] desk:pb-0')}
          initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
          {outlet}
        </motion.main>
        <BottomNav />
      </div>
    </div>
  );
}
