import { lazy, Suspense } from 'react';
import { ChevronRight, Phone } from 'lucide-react';
import { HELPLINES } from '@shared/catalog.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { openSheet, startSos } from '@/app/overlayStore.ts';
import { useMe, useUpdateMe } from '@/lib/api/hooks.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { DemoTag } from '@/components/ui/chip.tsx';
import { Switch } from '@/components/ui/controls.tsx';
import { Row } from '@/components/common.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { useDecor3D } from '@/features/three/support.ts';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { useT, type TKey } from '@/i18n/index.ts';

const SosShockwave = lazy(() => import('@/features/three/SosScenes.tsx').then((m) => ({ default: m.SosShockwave })));

export function Helplines({ extra = false }: { extra?: boolean }) {
  return (
    <>
      {HELPLINES.filter((h) => extra || h.num.length === 3).map((h) => (
        <Row key={h.num} onClick={() => openSheet({ kind: 'dial', num: h.num })}>
          <span className="grid h-10 min-w-12 place-items-center rounded-xl bg-sos-soft px-2 font-mono text-[15px] font-extrabold text-sos">{h.num}</span>
          <div className="min-w-0 flex-1"><div className="text-[14px] font-bold">{h.name}</div>{h.sub && <div className="text-[12.5px] text-fg-2">{h.sub}</div>}</div>
          <Phone className="size-[18px] text-fg-3" />
        </Row>
      ))}
    </>
  );
}

function SosPanel() {
  const t = useT(), me = useMe().data, upd = useUpdateMe(), deco = useDecor3D();
  return (
    <div className="relative flex flex-col items-center overflow-hidden rounded-none bg-[radial-gradient(120%_70%_at_50%_30%,#2A0D1C_0%,#0A1330_55%,#060C1F_100%)] px-5 pt-8 pb-8 text-center text-white desk:rounded-[22px]">
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em]">{t('sosTitle')}</h1>
      <p className="mt-1 text-[14px] text-white/70">{t('tapCall')}</p>
      <div className="relative my-7 grid size-[250px] place-items-center">
        {deco ? <Suspense fallback={null}><div className="absolute -inset-20"><SosShockwave level={0} /></div></Suspense>
          : <><span className="absolute inset-6 animate-pulse-ring rounded-full bg-sos/30" /><span className="absolute inset-6 animate-pulse-ring rounded-full bg-sos/25 [animation-delay:1.2s]" /></>}
        <button onClick={startSos} aria-label="Send SOS"
          className="relative grid size-[176px] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#FF6B70,#DC2F35_45%,#9E1219)] shadow-[0_0_0_10px_rgb(220_47_53/0.18),0_24px_60px_-10px_rgb(220_47_53/0.8),inset_0_2px_0_rgb(255_255_255/0.25)] transition active:scale-95">
          <span className="flex flex-col items-center gap-1"><Phone className="size-9" /><b className="text-[30px] font-extrabold tracking-[0.06em]">SOS</b></span>
        </button>
      </div>
      <div className="grid w-full max-w-[420px] grid-cols-3 gap-2.5">
        {(['police', 'ambulance', 'fire'] as const).map((k) => (
          <button key={k} onClick={() => openSheet({ kind: 'request', svc: k })} className="bevel flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] py-3.5 text-[12.5px] font-bold hover:bg-white/[0.1]">
            <span className="grid size-10 place-items-center rounded-full bg-white/10" style={{ color: k === 'police' ? '#A5A0FF' : '#FF7A90' }}><Icon name={SERVICE_ICON[k]} className="size-5" /></span>
            {t(k as TKey)}
          </button>
        ))}
      </div>
      <div className="mt-4 flex w-full max-w-[420px] flex-col gap-2.5 text-left">
        <button onClick={() => openSheet({ kind: 'loc' })} className="bevel flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 hover:bg-white/[0.1]">
          <span className="grid size-9 place-items-center rounded-xl bg-white/10"><Icon name="pin" className="size-[18px]" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{t('yourLoc')}</div><div className="truncate text-[12.5px] text-white/65">{me?.area.label}</div></div>
          <ChevronRight className="size-5 text-white/50" />
        </button>
        <div className="bevel flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-white/10"><Icon name="nav" className="size-[18px]" /></span>
          <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{t('shareLive')}</div><div className="text-[12.5px] text-white/65">{t('shareLiveSub')}</div></div>
          <Switch checked={!!me?.shareLive} label={t('shareLive')} onCheckedChange={(v) => upd.mutate({ shareLive: v })} />
        </div>
      </div>
      <p className="mt-5 max-w-[380px] text-[12px] text-white/55">Prototype — no real services are contacted. In a real emergency <button className="font-bold text-white underline" onClick={() => openSheet({ kind: 'dial', num: '112' })}>call 112</button>.</p>
    </div>
  );
}

export default function Sos() {
  const t = useT(), desk = useIsDesktop();
  usePageMeta({ title: t('sosTitle'), sub: t('tapCall'), side: 'sos', tab: 'home', dark: true });
  if (!desk) return <div className="min-h-full bg-[#0A1330]"><SosPanel /></div>;
  const steps: [string, string][] = [['3-second safety window', 'Cancel accidental presses before anything is sent.'], ['Nearest units dispatched', 'Police and ambulance are alerted with your exact location.'], ['Live location shared', 'Responders see you move until they reach you.'], ['Tracked end to end', 'Follow each responder live, with ETA and officer details.']];
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(420px,1fr)_1fr] gap-5 p-6">
      <SosPanel />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="What happens when you press SOS" />
          <ol className="flex flex-col gap-4 px-5 pt-2 pb-5">
            {steps.map(([b, p], i) => (
              <li key={b} className="flex gap-3.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-extrabold text-primary">{i + 1}</span><div><b className="text-[14px]">{b}</b><p className="text-[13px] text-fg-2">{p}</p></div></li>
            ))}
          </ol>
        </Card>
        <Card className="overflow-hidden"><CardHeader title="Emergency helplines" right={<DemoTag>Opens your phone dialer</DemoTag>} /><Helplines /></Card>
      </div>
    </div>
  );
}
