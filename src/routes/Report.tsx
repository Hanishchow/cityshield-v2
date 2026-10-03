import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, LocateFixed, MapPin, Send, ShieldCheck, X } from 'lucide-react';
import { CATEGORY_KEYS, type CategoryKey } from '@shared/contract.ts';
import { CATEGORIES, categoryOf } from '@shared/catalog.ts';
import { usePageMeta } from '@/app/pageMeta.ts';
import { useBackend, useComplaints, useCreateComplaint, useMe } from '@/lib/api/hooks.ts';
import { ApiError } from '@/lib/api/backend.ts';
import { LOCATE_MESSAGE, locate } from '@/lib/location.ts';
import { useUI, type Draft } from '@/store/ui.ts';
import { Card, CardHeader } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Field, Input, Textarea } from '@/components/ui/controls.tsx';
import { ComplaintRow, MobileHeader } from '@/components/common.tsx';
import { Icon } from '@/components/icons.tsx';
import { appToast } from '@/components/toast.tsx';
import { useIsDesktop } from '@/lib/useMedia.ts';
import { cn } from '@/lib/utils.ts';
import { useT } from '@/i18n/index.ts';

const PH: Record<CategoryKey, string> = {
  pothole: 'e.g. Pothole on 80 Feet Road', signal: 'e.g. Signal not working at Sony World Junction', water: 'e.g. Water logging on 1st Main Road',
  light: 'e.g. Street light out on 6th Cross', civic: 'e.g. Garbage not collected on 6th Cross', other: 'e.g. Fallen tree branch on footpath',
};

/** Downscale to ≤1280 px JPEG in the browser before upload (the server re-checks). */
async function shrink(file: File): Promise<{ blob: Blob; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('bad image')); img.src = url; });
    const M = 1280, sc = Math.min(1, M / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.82));
    return { blob, url: URL.createObjectURL(blob) };
  } finally { URL.revokeObjectURL(url); }
}

function ReportForm() {
  const { cat } = useParams();
  const me = useMe().data, nav = useNavigate(), backend = useBackend(), create = useCreateComplaint();
  const draft = useUI((s) => s.draft), set = useUI((s) => s.set);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [bad, setBad] = useState(false), [locBusy, setLocBusy] = useState(false);
  const locRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    const k = (CATEGORY_KEYS as readonly string[]).includes(cat ?? '') ? (cat as CategoryKey) : 'pothole';
    if (!me) return;
    if (!draft || (cat && draft.category !== k && !draft.title && !draft.description)) {
      set({ draft: { category: k, title: '', description: '', address: me.area.label, lat: me.area.lat, lng: me.area.lng, photo: null } });
    }
  }, [cat, me]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!draft || !me) return null;
  const d = draft, k = categoryOf(d.category);
  const patch = (p: Partial<Draft>) => set({ draft: { ...d, ...p } });

  const gps = async () => {
    setLocBusy(true);
    const r = await locate();
    if (r.ok && r.inArea) {
      const g = await backend.geoReverse(r.fix.lat, r.fix.lng).catch(() => null);
      patch({ address: g?.label ?? `${r.fix.lat.toFixed(5)}, ${r.fix.lng.toFixed(5)}`, lat: r.fix.lat, lng: r.fix.lng });
      appToast(`Location added from GPS (±${r.fix.accuracyM} m)`, 'locate', 'police');
    } else {
      /* keep what the user typed; only fill the area if the field is empty */
      if (!d.address.trim()) patch({ address: me.area.label, lat: me.area.lat, lng: me.area.lng });
      appToast(r.ok ? `You're about ${r.kmFromCity} km from Bengaluru — complaints are for the Bengaluru area.` : LOCATE_MESSAGE[r.reason], 'locate', 'amber');
    }
    setBad(false); setLocBusy(false);
  };
  const submit = () => {
    if (!d.address.trim()) { setBad(true); locRef.current?.focus(); appToast('Please add a location', 'alert', 'ambulance'); return; }
    create.mutate({
      input: { category: d.category, title: d.title, description: d.description, location: { lat: d.lat ?? me.area.lat, lng: d.lng ?? me.area.lng, address: d.address.trim(), source: d.lat ? 'manual' : 'default' } },
      photo: photo?.blob ?? null,
    }, {
      onSuccess: (c) => { set({ draft: null }); appToast(`Complaint ${c.id} submitted`, 'check', 'civic'); nav(`/complaints/${c.id}`, { replace: true }); },
      onError: (e) => appToast(e instanceof ApiError ? e.message : 'Could not submit — please try again', 'alert', 'sos'),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Field label="Category">
        <div role="radiogroup" aria-label="Category" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 desk:flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c.key} role="radio" aria-checked={c.key === d.category} onClick={() => patch({ category: c.key })}
              className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold transition-colors [&_svg]:size-4',
                c.key === d.category ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-fg-2 hover:text-fg')}>
              <Icon name={c.icon} />{c.title}
            </button>
          ))}
        </div>
      </Field>
      <Field label={<>Photo <span className="font-semibold text-fg-3">(optional)</span></>}>
        {photo ? (
          <div className="relative overflow-hidden rounded-card border border-line">
            <img src={photo.url} alt="Attached photo" className="max-h-[260px] w-full object-cover" />
            <button onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute top-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-navy-950/70 text-white"><X className="size-4" /></button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-card border-2 border-dashed border-line-strong bg-surface-2 px-4 py-7 text-center hover:border-primary hover:bg-primary-soft/40">
            <Camera className="size-7 text-primary" />
            <span className="text-[15px] font-bold">Add a photo of the issue</span>
            <span className="text-[13px] text-fg-3">Camera or gallery · helps the crew find it</span>
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              if (!f.type.startsWith('image/')) { appToast('Please choose an image file', 'alert', 'ambulance'); return; }
              try { setPhoto(await shrink(f)); } catch { appToast('Could not read that image', 'alert', 'ambulance'); }
            }} />
          </label>
        )}
      </Field>
      <Field label="Title" htmlFor="f-title"><Input id="f-title" maxLength={80} autoComplete="off" placeholder={PH[d.category]} value={d.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
      <Field label={t('location')} htmlFor="f-loc" hint={
        <button onClick={gps} disabled={locBusy} className="inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-primary"><LocateFixed className="size-4" />{locBusy ? 'Getting a GPS fix…' : 'Use my current location'}</button>
      }>
        <div className="relative"><MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-3" />
          <Input ref={locRef} id="f-loc" className="pl-11" invalid={bad} autoComplete="off" value={d.address} onChange={(e) => { setBad(false); patch({ address: e.target.value, lat: null, lng: null }); }} />
        </div>
      </Field>
      <Field label={<>Description <span className="font-semibold text-fg-3">(optional)</span></>} htmlFor="f-desc">
        <Textarea id="f-desc" maxLength={500} placeholder="What is the problem? Any landmark nearby?" value={d.description} onChange={(e) => patch({ description: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[14px] text-fg-2">
        <ShieldCheck className="size-4 shrink-0 text-success" /><span>Will be routed automatically to <b className="text-fg">{k.agency}</b></span>
      </div>
      <Button size="lg" onClick={submit} disabled={create.isPending}><Send />{create.isPending ? 'Submitting…' : t('submit')}</Button>
    </div>
  );
}

export default function Report() {
  const t = useT(), desk = useIsDesktop(), nav = useNavigate();
  const draft = useUI((s) => s.draft);
  const k = categoryOf(draft?.category ?? 'pothole');
  const recent = useComplaints('all').data ?? [];
  usePageMeta({ title: t('reportC'), sub: `${k.title} · ${k.sub}`, side: 'complaints' });
  if (!desk) return <div><MobileHeader title={t('reportC')} sub={`${k.title} · ${k.sub}`} /><div className="p-4"><ReportForm /></div></div>;
  const steps: [string, string][] = [['Submitted', 'You get a complaint ID instantly.'], ['Auto-routed', `Sent to ${k.agency} based on category and location.`], ['Crew assigned', 'Track the crew live on the map.'], ['Resolved', 'You are notified when it is closed.']];
  return (
    <div className="mx-auto grid max-w-[1320px] grid-cols-[1.2fr_1fr] items-start gap-5 p-6">
      <Card className="p-6"><ReportForm /></Card>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="What happens next" />
          <ol className="flex flex-col gap-4 px-5 pt-2 pb-5">
            {steps.map(([b, p], i) => <li key={b} className="flex gap-3.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[14px] font-extrabold text-primary">{i + 1}</span><div><b className="text-[15px]">{b}</b><p className="text-[14px] text-fg-2">{p}</p></div></li>)}
          </ol>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title={t('myC')} right={<Button variant="link" size="sm" onClick={() => nav('/complaints/mine')}>{t('viewAll')}</Button>} />
          {recent.slice(0, 3).map((c) => <ComplaintRow key={c.id} c={c} onClick={() => nav(`/complaints/${c.id}`)} />)}
        </Card>
      </div>
    </div>
  );
}
