import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils.ts';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg shadow-[0_6px_16px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] hover:bg-primary-hover',
        sos: 'bg-gradient-to-b from-[#EE4248] to-sos-deep text-white shadow-[0_10px_24px_-8px_rgb(220_47_53/0.7)] hover:brightness-110',
        soft: 'bg-primary-soft text-primary hover:bg-[color-mix(in_oklab,var(--primary-soft)_80%,var(--primary)_20%)]',
        outline: 'border border-line-strong bg-surface text-fg hover:bg-surface-2',
        ghost: 'text-fg-2 hover:bg-surface-3 hover:text-fg',
        navy: 'bg-navy-900 text-white hover:bg-navy-800 dark:bg-navy-700 dark:hover:bg-navy-800',
        glass: 'border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/18',
        overlay: 'border border-white/15 bg-white/8 text-white hover:bg-white/14',
        danger: 'bg-sos text-white hover:brightness-110',
        link: 'h-auto rounded-md px-0.5 py-0.5 text-primary hover:underline',
      },
      size: {
        sm: 'h-9 px-3.5 text-[14px]',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-12 px-5 text-[16px]',
        icon: 'size-10 rounded-xl p-0',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0.5' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild, type, ...props }, ref) => {
  const C = asChild ? Slot.Root : 'button';
  return <C ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = 'Button';
