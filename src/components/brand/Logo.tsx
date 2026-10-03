/**
 * City Shield brand mark, vectorised from brand/source/logo.webp:
 * a navy-to-cobalt enamel shield, a silver rim, sky-blue flowing S-ribbon line
 * work and a four-point star spark at the top right.
 *
 * The ribbon "cut-out" strokes reuse the body gradient in user space, so the
 * inner lines read as engraved channels rather than painted-on stripes.
 */
import { useId } from 'react';
import { cn } from '@/lib/utils.ts';

export const SHIELD_PATH = 'M12 19C29 19 45 13 60 4C75 13 91 19 108 19C108 66 92 102 60 127C28 102 12 66 12 19Z';
const S_RIBBON = 'M86 36C66 30 40 34 40 50C40 66 80 62 80 80C80 97 58 102 38 96';
const SWOOSH = 'M33 112C56 98 80 76 95 36';
export const STAR_PATH = 'M97 9L99.6 18.4L109 21L99.6 23.6L97 33L94.4 23.6L85 21L94.4 18.4Z';

export function ShieldMark({ className, title, glow = false }: { className?: string; title?: string; glow?: boolean }) {
  const id = useId().replace(/:/g, '');
  const body = `b${id}`, rim = `r${id}`, line = `l${id}`, clip = `c${id}`, shine = `s${id}`;
  return (
    <svg viewBox="0 0 120 132" className={cn('shrink-0', className)} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={body} x1="18" y1="10" x2="104" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3460BE" />
          <stop offset="0.45" stopColor="#1C3577" />
          <stop offset="1" stopColor="#0B1638" />
        </linearGradient>
        <linearGradient id={rim} x1="10" y1="4" x2="110" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F4F6FA" />
          <stop offset="0.35" stopColor="#B9C2CF" />
          <stop offset="0.6" stopColor="#EEF1F6" />
          <stop offset="1" stopColor="#8E99AB" />
        </linearGradient>
        <linearGradient id={line} x1="30" y1="110" x2="100" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F86DA" />
          <stop offset="1" stopColor="#9CC6F7" />
        </linearGradient>
        <radialGradient id={shine} cx="40" cy="30" r="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}><path d={SHIELD_PATH} /></clipPath>
      </defs>
      {glow && <path d={SHIELD_PATH} fill="#5B9BEA" opacity="0.35" transform="translate(60 66) scale(1.08) translate(-60 -66)" style={{ filter: 'blur(6px)' }} />}
      <path d={SHIELD_PATH} fill={`url(#${body})`} />
      <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {[SWOOSH, S_RIBBON].map((d) => (
          <g key={d}>
            <path d={d} stroke={`url(#${line})`} strokeWidth="19" />
            <path d={d} stroke={`url(#${body})`} strokeWidth="14.5" />
            <path d={d} stroke={`url(#${line})`} strokeWidth="9" />
            <path d={d} stroke={`url(#${body})`} strokeWidth="4.6" />
          </g>
        ))}
        <path d={SHIELD_PATH} fill={`url(#${shine})`} stroke="none" />
      </g>
      <path d={SHIELD_PATH} fill="none" stroke={`url(#${rim})`} strokeWidth="4.2" strokeLinejoin="round" />
      <path d={STAR_PATH} fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <span className={cn('font-extrabold tracking-[0.08em] uppercase leading-none', tone === 'light' ? 'text-white' : 'bg-gradient-to-b from-[#2C4C9A] to-[#14234F] bg-clip-text text-transparent dark:from-white dark:to-silver', className)}>
      City<span className="tracking-[0.08em]">Shield</span>
    </span>
  );
}

export function Logo({ tone = 'light', tagline, className }: { tone?: 'light' | 'dark'; tagline?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <ShieldMark className="h-11 w-10" />
      <div className="min-w-0">
        <Wordmark tone={tone} className="text-[17px]" />
        {tagline && <div className={cn('mt-1 truncate text-[11px] font-medium', tone === 'light' ? 'text-white/65' : 'text-fg-2')}>{tagline}</div>}
      </div>
    </div>
  );
}
