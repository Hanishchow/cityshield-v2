import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...p }, ref) => (
  <div ref={ref} className={cn('rounded-card border border-line bg-surface shadow-card', className)} {...p} />
));
Card.displayName = 'Card';

export function CardHeader({ title, right, className }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 sm:px-5', className)}>
      <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">{title}</h2>
      {right}
    </div>
  );
}

export function SectionHeader({ title, right, className }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-0.5 mt-1.5 flex items-center justify-between', className)}>
      <h2 className="text-[16px] font-extrabold tracking-[-0.01em]">{title}</h2>
      {right}
    </div>
  );
}
