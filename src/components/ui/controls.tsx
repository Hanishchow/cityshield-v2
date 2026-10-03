import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Switch as RSwitch, ToggleGroup, Accordion as RAccordion } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils.ts';

export function Switch({ checked, onCheckedChange, label, className }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; className?: string }) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn('relative h-[26px] w-[44px] shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-primary', className)}
    >
      <RSwitch.Thumb className="block size-[22px] translate-x-[2px] rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-200 data-[state=checked]:translate-x-[20px]" />
    </RSwitch.Root>
  );
}

/** Segmented control (single choice), e.g. complaint/notification filters and theme. */
export function Segmented<T extends string>({ value, onChange, options, className, label, tone = 'primary' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string; label: string; tone?: 'primary' | 'navy';
}) {
  return (
    <ToggleGroup.Root
      type="single" value={value} aria-label={label}
      onValueChange={(v) => v && onChange(v as T)}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value} value={o.value}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[14px] font-semibold text-fg-2 transition-colors hover:text-fg [&_svg]:size-4',
            tone === 'primary' ? 'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-white' : 'data-[state=on]:border-navy-900 data-[state=on]:bg-navy-900 data-[state=on]:text-white dark:data-[state=on]:border-navy-700 dark:data-[state=on]:bg-navy-700',
          )}
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(({ className, invalid, ...p }, ref) => (
  <input
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn('h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15.5px] text-fg outline-none transition-[border,box-shadow] placeholder:text-fg-3 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)] aria-[invalid]:border-sos', className)}
    {...p}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea
    ref={ref}
    className={cn('min-h-[104px] w-full resize-y rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-[15.5px] text-fg outline-none transition-[border,box-shadow] placeholder:text-fg-3 focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_20%,transparent)]', className)}
    {...p}
  />
));
Textarea.displayName = 'Textarea';

export function Field({ label, htmlFor, children, hint }: { label: ReactNode; htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {htmlFor ? <label htmlFor={htmlFor} className="text-[14px] font-bold">{label}</label> : <span className="text-[14px] font-bold">{label}</span>}
      {children}
      {hint}
    </div>
  );
}

export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <RAccordion.Root type="single" collapsible className="divide-y divide-line">
      {items.map((it, i) => (
        <RAccordion.Item key={i} value={String(i)}>
          <RAccordion.Header>
            <RAccordion.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold sm:px-5">
              {it.q}
              <ChevronDown className="size-4 shrink-0 text-fg-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </RAccordion.Trigger>
          </RAccordion.Header>
          <RAccordion.Content className="overflow-hidden px-4 pb-4 text-[14.5px] text-fg-2 data-[state=closed]:hidden sm:px-5">{it.a}</RAccordion.Content>
        </RAccordion.Item>
      ))}
    </RAccordion.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-shimmer rounded-xl bg-[linear-gradient(90deg,var(--surface-3),var(--surface-2),var(--surface-3))] bg-[length:200%_100%]', className)} />;
}

export function ProgressBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
      <i className="block h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}
