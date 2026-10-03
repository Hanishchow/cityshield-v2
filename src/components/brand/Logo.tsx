/**
 * City Shield brand — the supplied logo itself, as flat 2D artwork.
 *
 * public/brand/*.png are cut straight from brand/source/logo.webp by
 * scripts/brand-cutout.py (no redrawing), so the shield is exactly the logo:
 * the enamel shield, silver rim, flowing line work and star.
 *
 * On light surfaces the full lockup image is used as-is. On dark surfaces the
 * navy wordmark would disappear, so the shield image is paired with the
 * wordmark set in Montserrat ExtraBold — the same geometric letterforms.
 */
import { cn } from '@/lib/utils.ts';

const BASE = import.meta.env.BASE_URL;
export const BRAND = {
  shield: `${BASE}brand/shield.png`,
  wordmark: `${BASE}brand/wordmark.png`,
  full: `${BASE}brand/logo-full.png`,
};

/** The shield mark. Width follows from height (aspect 301:359). */
export function ShieldMark({ className, title, glow = false }: { className?: string; title?: string; glow?: boolean }) {
  return (
    <img
      src={BRAND.shield}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      draggable={false}
      className={cn('h-11 w-auto shrink-0 select-none object-contain', glow && 'drop-shadow-[0_0_22px_rgb(107_166_242/0.55)]', className)}
    />
  );
}

/** "CITYSHIELD" — image on light surfaces, matching type on dark ones. */
export function Wordmark({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  if (tone === 'dark') {
    return <img src={BRAND.wordmark} alt="City Shield" draggable={false} className={cn('h-[18px] w-auto select-none dark:hidden', className)} />;
  }
  return (
    <span className={cn('font-display font-extrabold uppercase leading-none tracking-[0.06em] text-white', className)}>
      City<span className="text-[#BFD8FF]">Shield</span>
    </span>
  );
}

/** Shield + wordmark (+ optional tagline). `tone="light"` = on a dark/blue background. */
export function Logo({ tone = 'light', tagline, className, size = 'md' }: { tone?: 'light' | 'dark'; tagline?: string; className?: string; size?: 'md' | 'lg' }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ShieldMark className={size === 'lg' ? 'h-16' : 'h-12'} />
      <div className="min-w-0">
        {tone === 'light'
          ? <Wordmark tone="light" className={size === 'lg' ? 'text-[26px]' : 'text-[21px]'} />
          : <>
              <Wordmark tone="dark" className={size === 'lg' ? 'h-6' : 'h-[19px]'} />
              <span className="hidden font-display text-[21px] font-extrabold uppercase tracking-[0.06em] text-fg dark:inline">CityShield</span>
            </>}
        {tagline && <div className={cn('mt-1.5 truncate text-[13px] font-medium', tone === 'light' ? 'text-white/75' : 'text-fg-2')}>{tagline}</div>}
      </div>
    </div>
  );
}

/** The complete original lockup (shield above wordmark), for light surfaces. */
export function LogoLockup({ className }: { className?: string }) {
  return <img src={BRAND.full} alt="City Shield" draggable={false} className={cn('h-40 w-auto select-none object-contain', className)} />;
}
