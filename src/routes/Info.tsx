import { Send } from 'lucide-react';
import { useState } from 'react';
import { CIVIC } from '@shared/catalog.ts';
import { SERVICE_KEYS } from '@shared/contract.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { useBackend } from '@/lib/api/hooks.ts';
import { Card, SectionHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { DemoTag } from '@/components/ui/chip.tsx';
import { Accordion, Textarea } from '@/components/ui/controls.tsx';
import { IconChip, MobileHeader, Notice, Row, RowText } from '@/components/common.tsx';
import { Icon, SERVICE_ICON } from '@/components/icons.tsx';
import { Logo } from '@/components/brand/Logo.tsx';
import { appToast } from '@/components/toast.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { useT } from '@/i18n/index.ts';
import { Helplines } from './Sos.tsx';

const FAQ = [
  { q: 'What happens when I press SOS?', a: 'You get a 3-second window to cancel. After that, your location is shared and the nearest ambulance and police unit are alerted. You can track both live.' },
  { q: 'Does City Shield replace 112?', a: 'No. City Shield works alongside 112 and the existing control rooms. 112 is always one tap away in the app.' },
  { q: 'Who handles my complaint?', a: `Each category is routed to the responsible agency — for example potholes and garbage go to ${CIVIC.long} (${CIVIC.short}), traffic signals to Bengaluru Traffic Police.` },
  { q: 'Is my location shared all the time?', a: 'Only while an emergency or a tracked request is active, and only if Share Live Location is on. Location pings are deleted after 30 days.' },
  { q: 'Why do I see "Simulated" on maps?', a: 'This is a prototype. Responder positions and timings are simulated for demonstration.' },
];

function Page({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const desk = useIsDesktop();
  if (!desk) return <div><MobileHeader title={title} /><div className="flex flex-col gap-3.5 p-4">{children}</div></div>;
  return <div className="mx-auto flex max-w-[720px] flex-col gap-3.5 p-6" aria-label={sub}>{children}</div>;
}

export function Help() {
  const t = useT(), backend = useBackend();
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  usePageMeta({ title: t('help'), sub: 'Helplines and answers', side: 'profile' });
  return (
    <Page title={t('help')} sub="Helplines and answers">
      <SectionHeader title="Emergency helplines" right={<DemoTag>Opens your dialer</DemoTag>} />
      <Card className="divide-y divide-line overflow-hidden"><Helplines extra /></Card>
      <SectionHeader title="Frequently asked" />
      <Card className="overflow-hidden"><Accordion items={FAQ} /></Card>
      <SectionHeader title="Send feedback" />
      <Card className="flex flex-col gap-3 p-4">
        <Textarea placeholder="Tell us what to improve" value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={2000} aria-label="Feedback" />
        <Button disabled={msg.trim().length < 2 || busy} onClick={async () => {
          setBusy(true);
          try { await backend.feedback(msg.trim()); setMsg(''); appToast('Thanks! Your feedback was sent.', 'send', 'police'); }
          catch { appToast('Could not send feedback right now', 'alert', 'amber'); }
          setBusy(false);
        }}><Send />Send feedback</Button>
      </Card>
    </Page>
  );
}

export function About() {
  const t = useT();
  usePageMeta({ title: t('about'), sub: t('tagline'), side: 'profile' });
  const AG: [string, string, string][] = [['police', 'Karnataka State Police', 'Law & order, Hoysala patrols, traffic'], ['ambulance', 'Emergency ambulance (108)', 'Ambulance dispatch & hospitals'],
    ['fire', 'Karnataka State Fire & Emergency Services', 'Fire and rescue'], ['civic', `${CIVIC.long} (${CIVIC.short})`, 'Roads, garbage, drains, street lights']];
  const F: [string, string, string][] = [['timer', 'Faster response', 'One tap alerts the nearest units.'], ['pin', 'Live tracking', 'See responders move towards you.'], ['clock', 'Real-time updates', 'Every step is notified.'],
    ['clipboard', 'Easy reporting', 'Photo + location, routed automatically.'], ['nodes', 'Connected services', 'One incident record shared by every agency.']];
  return (
    <Page title={t('about')} sub={t('tagline')}>
      <div className="rounded-[22px] bg-[linear-gradient(120deg,var(--navy-900),var(--navy-700))] p-5"><Logo tagline={t('tagline')} /></div>
      <Card className="p-4 sm:p-5">
        <p className="text-[15px] text-fg-2">City Shield brings emergency response and civic complaints for Bengaluru into one app — so citizens get help faster and agencies share one live picture of the city.</p>
        <ul className="mt-4 flex flex-col gap-3.5">
          {F.map(([i, b, p]) => <li key={b} className="flex gap-3"><IconChip icon={i} tone="blue" round size="sm" /><div><b className="text-[15px]">{b}</b><p className="text-[14px] text-fg-2">{p}</p></div></li>)}
        </ul>
      </Card>
      <SectionHeader title="Built to connect" />
      <Card className="divide-y divide-line overflow-hidden">
        {AG.map(([k, n, s]) => <Row as="div" key={k}><IconChip icon={SERVICE_ICON[k]} tone={(SERVICE_KEYS as readonly string[]).includes(k) ? k : 'blue'} /><RowText title={n} sub={s} /></Row>)}
      </Card>
      <Notice><b>Prototype.</b> Responder positions, officer details, camera feed and command-centre figures are simulated for demonstration. Integrations with agency systems are proposed, not live.</Notice>
      <p className="text-center text-[13px] text-fg-3"><Icon name="shieldCheck" className="mr-1 inline size-3.5" />Version 1.0 · October 2026</p>
    </Page>
  );
}
