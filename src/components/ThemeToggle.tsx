/**
 * Light / dark / system theme switch. One tap flips light ↔ dark; the menu
 * also offers "Match system". The choice is saved on the device and synced to
 * the account so it follows the user to other devices.
 */
import { DropdownMenu } from 'radix-ui';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePref } from '@shared/contract.ts';
import { resolvedTheme, useUI } from '@/store/ui.ts';
import { useUpdateMe } from '@/lib/api/hooks.ts';
import { cn } from '@/lib/utils.ts';

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Match system', Icon: Monitor },
];

export function useSetTheme() {
  const set = useUI((s) => s.set), upd = useUpdateMe();
  return (t: ThemePref) => { set({ theme: t }); upd.mutate({ theme: t }); };
}

export function ThemeToggle({ variant = 'surface', className }: { variant?: 'surface' | 'glass'; className?: string }) {
  const theme = useUI((s) => s.theme);
  const setTheme = useSetTheme();
  const dark = resolvedTheme(theme) === 'dark';
  const btn = variant === 'glass'
    ? 'bg-white/10 text-white backdrop-blur-md hover:bg-white/15'
    : 'border border-line bg-surface-2 text-fg-2 hover:text-fg';
  return (
    <DropdownMenu.Root>
      <div className={cn('flex items-center', className)}>
        <button
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={dark ? 'Light theme' : 'Dark theme'}
          className={cn('relative grid size-10 place-items-center overflow-hidden rounded-l-xl rounded-r-none transition-colors', btn, variant === 'glass' && 'size-11 rounded-l-2xl')}
        >
          <Sun className={cn('absolute size-5 transition-all duration-300', dark ? 'scale-50 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100')} />
          <Moon className={cn('absolute size-5 transition-all duration-300', dark ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0')} />
        </button>
        <DropdownMenu.Trigger asChild>
          <button aria-label="Theme options" className={cn('grid h-10 w-6 place-items-center rounded-l-none rounded-r-xl border-l-0 transition-colors', btn, variant === 'glass' && 'h-11 rounded-r-2xl')}>
            <svg viewBox="0 0 10 6" className="size-2.5" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </DropdownMenu.Trigger>
      </div>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-[180px] rounded-2xl border border-line bg-surface p-1.5 text-fg shadow-float">
          <DropdownMenu.Label className="px-2.5 pt-1 pb-1.5 text-[12px] font-bold tracking-[0.1em] text-fg-3 uppercase">Appearance</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePref)}>
            {OPTIONS.map(({ value, label, Icon }) => (
              <DropdownMenu.RadioItem key={value} value={value}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14.5px] font-semibold outline-none data-[highlighted]:bg-surface-3">
                <Icon className="size-4 text-fg-2" />
                <span className="flex-1">{label}</span>
                <DropdownMenu.ItemIndicator><Check className="size-4 text-primary" /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
