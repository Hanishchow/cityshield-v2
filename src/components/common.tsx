/**
 * Shared building blocks for the screens: list rows, icon chips, status chips,
 * timelines, ETA cards, KPI tiles, notices and page headers.
 */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Info } from 'lucide-react';
import type { Complaint, ComplaintStatus, Notification, TimelineItem } from '@shared/contract.ts';
import { categoryOf } from '@shared/catalog.ts';
import { Icon } from './icons.tsx';
import { Chip } from './ui/chip.tsx';
import { toneClass } from './tone.ts';
import { cn, fmtWhen } from '@/lib/utils.ts';
import { useT } from '@/i18n/index.ts';

export function IconChip({ icon, tone, round, size = 'md', className }: { icon: string; tone: string; round?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = size === 'sm' ? 'size-8 [&_svg]:size-4' : size === 'lg' ? 'size-12 [&_svg]:size-6' : 'size-10 [&_svg]:size-5';
  return <span className={cn('grid shrink-0 place-items-center', round ? 'rounded-full' : 'rounded-xl', s, toneClass(tone), className)}><Icon name={icon} /></span>;
}

export function Row({ children, onClick, selected, className, as = 'button', unread, chevron }: {
  children: ReactNode; onClick?: () => void; selected?: boolean; className?: string; as?: 'button' | 'div'; unread?: boolean; chevron?: boolean;
}) {
  const C = as;
  return (
    <C
      onClick={onClick}
      {...(as === 'button' ? { type: 'button' as const } : {})}
      aria-pressed={as === 'button' && selected !== undefined ? selected : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5',
        as === 'button' && 'hover:bg-surface-2 active:bg-surface-3',
        selected && 'bg-primary-soft/70 hover:bg-primary-soft',
        unread && 'before:absolute before:top-1/2 before:left-1.5 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-primary',
        className,
      )}
    >
      {children}
      {chevron && <ChevronRight className="size-[18px] shrink-0 text-fg-3" />}
    </C>
  );
}
export const RowText = ({ title, sub, className }: { title: ReactNode; sub?: ReactNode; className?: string }) => (
  <div className={cn('min-w-0 flex-1', className)}>
    <div className="truncate text-[14px] font-bold">{title}</div>
    {sub != null && <div className="mt-0.5 text-[12.5px] text-fg-2">{sub}</div>}
  </div>
);

export function StatusChip({ status }: { status: ComplaintStatus }) {
  const t = useT();
  if (status === 'resolved') return <Chip tone="green">{t('resolved')}</Chip>;
  if (status === 'progress') return <Chip tone="blue">{t('inProgress')}</Chip>;
  if (status === 'assigned') return <Chip tone="blue">Assigned</Chip>;
  return <Chip tone="amber">Submitted</Chip>;
}

export function ComplaintRow({ c, onClick, selected }: { c: Complaint; onClick: () => void; selected?: boolean }) {
  const k = categoryOf(c.category);
  return (
    <Row onClick={onClick} selected={selected} chevron>
      <IconChip icon={k.icon} tone={k.tone} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{c.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusChip status={c.status} />
          <span className="text-[12px] text-fg-3">{fmtWhen(c.createdAt)}</span>
          <span className="font-mono text-[11px] text-fg-3">{c.id}</span>
        </div>
      </div>
    </Row>
  );
}

export function NotificationRow({ n, onClick }: { n: Notification; onClick: () => void }) {
  return (
    <Row onClick={onClick} unread={n.readAt == null} className="items-start">
      <IconChip icon={n.icon} tone={n.tone} round size="md" />
      <div className="min-w-0 flex-1">
        <div className={cn('text-[14px]', n.readAt == null ? 'font-extrabold' : 'font-semibold')}>{n.title}</div>
        <div className="mt-0.5 text-[12.5px] text-fg-2">{n.body}</div>
      </div>
      <span className="shrink-0 pt-0.5 text-[11.5px] text-fg-3 tabular">{new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
    </Row>
  );
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative flex flex-col gap-4">
      {items.map((x, i) => (
        <li key={i} className="relative flex gap-3">
          {i < items.length - 1 && <span className={cn('absolute top-6 left-[11px] h-[calc(100%-4px)] w-0.5', x.state === 'done' ? 'bg-success/45' : 'bg-line')} />}
          <span className={cn('relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2',
            x.state === 'done' ? 'border-success bg-success text-white' : x.state === 'cur' ? 'border-primary bg-surface shadow-[0_0_0_4px_var(--primary-soft)]' : 'border-line-strong bg-surface')}>
            {x.state === 'done' ? <Icon name="check" className="size-3" strokeWidth={3.2} /> : x.state === 'cur' ? <i className="size-2 rounded-full bg-primary" /> : null}
          </span>
          <div className="min-w-0">
            <div className={cn('text-[14px] font-bold', x.state === 'todo' && 'text-fg-3')}>{x.label}</div>
            <div className="text-[12.5px] text-fg-2">{x.at != null ? fmtWhen(x.at) + (x.note ? ' · ' + x.note : '') : x.note}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Kpi({ icon, label, value, delta, up }: { icon: string; label: string; value: ReactNode; delta?: ReactNode; up?: boolean }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-fg-2"><Icon name={icon} className="size-4" />{label}</div>
      <div className="mt-2 text-[26px] font-extrabold tracking-[-0.02em] tabular sm:text-[30px]">{value}</div>
      {delta && <div className={cn('mt-1 text-[12px] font-semibold', up ? 'text-success' : 'text-fg-3')}>{delta}</div>}
    </div>
  );
}

export function Notice({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'blue' }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-[12.5px] leading-relaxed',
      tone === 'amber' ? 'border-warning/25 bg-warning-soft text-fg-2 [&_svg]:text-warning' : 'border-primary/20 bg-primary-soft text-fg-2 [&_svg]:text-primary')}>
      <Info className="mt-0.5 size-4 shrink-0" />
      <span className="[&_b]:text-fg">{children}</span>
    </div>
  );
}

export function OkCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success-soft px-4 py-3">
      <span className="grid size-7 place-items-center rounded-full bg-success text-white"><Icon name="check" className="size-4" strokeWidth={3} /></span>
      <div><div className="text-[13.5px] font-bold">{title}</div><div className="text-[12.5px] text-fg-2">{sub}</div></div>
    </div>
  );
}

export function Empty({ icon = 'info', children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-[13.5px] text-fg-2">
      <IconChip icon={icon} tone="gray" round />
      {children}
    </div>
  );
}

/** Mobile page header (navy bar with back). Desktop uses the shell's topbar instead. */
export function MobileHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-2.5 bg-navy-900 px-3.5 py-3 text-white desk:hidden">
      <button onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} aria-label="Back" className="-ml-1 grid size-10 place-items-center rounded-full hover:bg-white/10"><ArrowLeft className="size-5" /></button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold leading-tight">{title}</h1>
        {sub && <p className="mt-0.5 truncate text-[12.5px] text-white/65">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
export function HeaderAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/15">
      <Icon name={icon} className="size-5" />
    </button>
  );
}
