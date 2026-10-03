import type { ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';

const TONES = {
  green: 'bg-success-soft text-success',
  blue: 'bg-primary-soft text-primary',
  amber: 'bg-warning-soft text-warning',
  gray: 'bg-surface-3 text-fg-2',
  red: 'bg-sos-soft text-sos',
} as const;

export function Chip({ tone = 'gray', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-bold [&_svg]:size-3', TONES[tone], className)}>
      {children}
    </span>
  );
}

/** The "LIVE" pill used on maps and live cards. */
export function LivePill({ className, label = 'LIVE' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-sos-soft px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.08em] text-sos', className)}>
      <i className="size-1.5 animate-live rounded-full bg-sos" />
      {label}
    </span>
  );
}

export function DemoTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-[12.5px] font-semibold text-fg-3', className)}>{children}</span>;
}
