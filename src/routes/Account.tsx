import { useNavigate } from 'react-router-dom';
import { Moon, Pencil, Plus, Settings2, Sun } from 'lucide-react';
import type { Lang, ThemePref } from '@shared/contract.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet } from '@/app/overlayStore.ts';
import { useComplaints, useMe, usePlaces, useUpdateMe } from '@/lib/api/hooks.ts';
import { useConn } from '@/lib/api/connection.ts';
import { useUI } from '@/store/ui.ts';
import { Card, SectionHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Chip } from '@/components/ui/chip.tsx';
import { Segmented, Switch } from '@/components/ui/controls.tsx';
import { Empty, IconChip, Kpi, MobileHeader, Row, RowText } from '@/components/common.tsx';
import { Icon } from '@/components/icons.tsx';
import { appToast } from '@/components/toast.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { cn, initials } from '@/lib/utils.ts';
import { LANGS, useT } from '@/i18n/index.ts';

function MenuRow({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick: () => void }) {
  return <Row chevron onClick={onClick}><Icon name={icon} className="size-5 text-fg-2" /><RowText title={<span className="font-semibold">{label}</span>} sub={sub} /></Row>;
}

function ProfileCard() {
  const me = useMe().data;
  if (!me) return null;
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cobalt to-navy-900 text-[22px] font-extrabold text-white">{initials(me.name)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[18px] font-extrabold">{me.name}</div>
        <div className="text-[13px] text-fg-2">{me.phone ?? 'No mobile number yet'} {me.phoneVerified && <Chip tone="green" className="ml-1">Verified</Chip>}</div>
        <div className="text-[13px] text-fg-2">{me.city}</div>
      </div>
      <button onClick={() => openSheet({ kind: 'profile' })} aria-label="Edit profile" className="grid size-10 place-items-center rounded-xl bg-surface-3 text-fg-2 hover:text-fg"><Pencil className="size-[18px]" /></button>
    </Card>
  );
}

export function Profile() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate(), me = useMe().data;
  const complaints = useComplaints('all').data ?? [], places = usePlaces().data ?? [];
  usePageMeta({ title: t('profile'), sub: me ? `${me.name} · ${me.phone ?? ''}` : undefined, side: 'profile', tab: 'more' });
  const menu = (
    <Card className="divide-y divide-line overflow-hidden">
      <MenuRow icon="clipboard" label={t('myC')} onClick={() => nav('/complaints/mine')} />
      <MenuRow icon="pin" label={t('saved')} onClick={() => nav('/places')} />
      <MenuRow icon="help" label={t('help')} onClick={() => nav('/help')} />
      <MenuRow icon="info" label={t('about')} onClick={() => nav('/about')} />
      <MenuRow icon="settings" label={t('settings')} onClick={() => nav('/settings')} />
    </Card>
  );
  const govt = <Card className="overflow-hidden"><MenuRow icon="grid" label="Command Centre" sub="Government view · sample data" onClick={() => nav('/command')} /></Card>;
  if (!desk) return <div><MobileHeader title={t('profile')} /><div className="flex flex-col gap-3.5 p-4"><ProfileCard />{menu}{govt}</div></div>;
  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-2 items-start gap-5 p-6">
      <div className="flex flex-col gap-5"><ProfileCard />{govt}</div>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <Kpi icon="clipboard" label="Complaints filed" value={complaints.length} />
          <Kpi icon="checkC" label="Resolved" value={complaints.filter((c) => c.status === 'resolved').length} />
          <Kpi icon="pin" label="Saved places" value={places.length} />
        </div>
        {menu}
      </div>
    </div>
  );
}

export function Settings() {
  const t = useT(), desk = useIsDesktop(), me = useMe().data, upd = useUpdateMe();
  const ui = useUI(), mode = useConn((s) => s.mode), health = useConn((s) => s.health);
  usePageMeta({ title: t('langPrefs'), sub: 'Language, alerts, appearance and location', side: 'prefs' });
  const setLang = (l: Lang) => { ui.set({ lang: l }); upd.mutate({ lang: l }); appToast(l === 'en' ? 'Language: English' : 'Language changed', 'globe', 'police'); };
  const setTheme = (th: ThemePref) => { ui.set({ theme: th }); upd.mutate({ theme: th }); };
  const P: ['emergency' | 'service' | 'complaint', string, string][] = [['emergency', 'siren', t('emAlerts')], ['service', 'bell', t('svcUpdates')], ['complaint', 'clipboard', t('cUpdates')]];
  const body = (
    <div className="flex flex-col gap-3.5">
      <SectionHeader title={t('appLang')} />
      <Card role="radiogroup" aria-label={t('appLang')} className="divide-y divide-line overflow-hidden">
        {LANGS.map((L) => {
          const on = ui.lang === L.code;
          return (
            <button key={L.code} role="radio" aria-checked={on} onClick={() => setLang(L.code as Lang)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2 sm:px-5">
              <span className={cn('grid size-5 place-items-center rounded-full border-2', on ? 'border-primary' : 'border-line-strong')}>{on && <i className="size-2.5 rounded-full bg-primary" />}</span>
              <span lang={L.code} className="text-[14px] font-semibold">{L.code === 'en' ? 'English' : `${L.native} (${L.name})`}</span>
            </button>
          );
        })}
      </Card>
      <SectionHeader title={t('notifications')} />
      <Card className="divide-y divide-line overflow-hidden">
        {P.map(([k, icon, label]) => (
          <Row as="div" key={k}><IconChip icon={icon} tone="blue" round size="sm" /><RowText title={<span className="font-semibold">{label}</span>} />
            <Switch label={label} checked={!!me?.prefs[k]} onCheckedChange={(v) => upd.mutate({ prefs: { [k]: v } })} /></Row>
        ))}
      </Card>
      <SectionHeader title="Appearance" />
      <Card className="flex flex-col gap-3 p-4 sm:px-5">
        <Segmented label="Theme" value={ui.theme} onChange={setTheme} options={[{ value: 'light', label: <><Sun />Light</> }, { value: 'dark', label: <><Moon />Dark</> }, { value: 'system', label: <><Settings2 />System</> }]} />
        <div className="flex items-center justify-between gap-3 pt-1">
          <div><div className="text-[14px] font-semibold">Live map view</div><div className="text-[12.5px] text-fg-2">Auto uses 3D on capable desktops, 2D on phones.</div></div>
          <Segmented label="Map view" value={ui.mapMode} onChange={(v) => ui.set({ mapMode: v })} options={[{ value: 'auto', label: 'Auto' }, { value: '2d', label: '2D' }, { value: '3d', label: '3D' }]} />
        </div>
      </Card>
      <SectionHeader title={t('settings')} />
      <Card className="divide-y divide-line overflow-hidden">
        <MenuRow icon="locate" label={t('locAccess')} sub="Required for live tracking and nearby services" onClick={() => openSheet({ kind: 'locaccess' })} />
        <Row as="div">
          <Icon name="activity" className="size-5 text-fg-2" />
          <RowText title={<span className="font-semibold">Connection</span>} sub={mode === 'live' ? `Live server · ${health?.store === 'postgres' ? 'Postgres + PostGIS' : 'in-memory store'}` : 'Offline demo data (resets on reload)'} />
          <Chip tone={mode === 'live' ? 'green' : 'amber'}>{mode === 'live' ? 'Live' : 'Offline'}</Chip>
        </Row>
      </Card>
    </div>
  );
  if (!desk) return <div><MobileHeader title={t('langPrefs')} /><div className="p-4">{body}</div></div>;
  return <div className="mx-auto max-w-[720px] p-6">{body}</div>;
}

export function Places() {
  const t = useT(), desk = useIsDesktop(), me = useMe().data, places = usePlaces().data ?? [];
  const tab = useUI((s) => s.placeTab), set = useUI((s) => s.set);
  usePageMeta({ title: t('saved'), sub: 'Used to share your location instantly in an emergency', side: 'places' });
  const list = places.filter((x) => tab === 'home' || x.type === tab);
  const body = (
    <div className="flex flex-col gap-3.5">
      <Card className="p-2.5"><Segmented tone="navy" label="Place type" value={tab} onChange={(v) => set({ placeTab: v })} options={[{ value: 'home', label: t('home') }, { value: 'work', label: 'Work' }, { value: 'frequent', label: 'Frequent Places' }]} /></Card>
      <Card className="divide-y divide-line overflow-hidden">
        {list.length ? list.map((x) => (
          <Row key={x.id} chevron onClick={() => openSheet({ kind: 'place', id: x.id })}>
            <IconChip icon={{ home: 'home', work: 'brief', frequent: x.name === 'Gym' ? 'gym' : x.name.startsWith('Parents') ? 'heartHome' : 'pin' }[x.type]} tone="blue" />
            <RowText title={<>{x.name}{me?.area.label === x.address && <Chip tone="green" className="ml-2 align-middle">Current</Chip>}</>} sub={x.address} />
          </Row>
        )) : <Empty icon="pin">No places in this list yet.</Empty>}
      </Card>
      <Button variant="navy" size="lg" onClick={() => openSheet({ kind: 'addplace' })}><Plus />{t('addLoc')}</Button>
    </div>
  );
  if (!desk) return <div><MobileHeader title={t('saved')} /><div className="p-4">{body}</div></div>;
  return <div className="mx-auto max-w-[720px] p-6">{body}</div>;
}
