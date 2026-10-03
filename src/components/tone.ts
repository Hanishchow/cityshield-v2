/** Colour "tones" for icon chips, keyed by service or semantic name. Full class strings so Tailwind can see them. */
export type ToneName = 'police' | 'ambulance' | 'fire' | 'civic' | 'crew' | 'amber' | 'primary' | 'blue' | 'gray' | 'sos' | 'success';

const SOFT: Record<ToneName, string> = {
  police: 'bg-police-soft text-police',
  ambulance: 'bg-ambulance-soft text-ambulance',
  fire: 'bg-fire-soft text-fire',
  civic: 'bg-civic-soft text-civic',
  crew: 'bg-crew-soft text-crew',
  amber: 'bg-warning-soft text-warning',
  primary: 'bg-primary-soft text-primary',
  blue: 'bg-primary-soft text-primary',
  gray: 'bg-surface-3 text-fg-2',
  sos: 'bg-sos-soft text-sos',
  success: 'bg-success-soft text-success',
};
const SOLID: Record<ToneName, string> = {
  police: 'bg-police text-white', ambulance: 'bg-ambulance text-white', fire: 'bg-fire text-white', civic: 'bg-civic text-white',
  crew: 'bg-crew text-white', amber: 'bg-warning text-white', primary: 'bg-primary text-white', blue: 'bg-primary text-white',
  gray: 'bg-fg-3 text-white', sos: 'bg-sos text-white', success: 'bg-success text-white',
};
export const toneClass = (t: string) => SOFT[(t as ToneName)] ?? SOFT.primary;
export const solidTone = (t: string) => SOLID[(t as ToneName)] ?? SOLID.primary;
/** CSS variable for a service colour, for SVG/3D use. */
export const toneVar = (t: string) => `var(--${t === 'amber' ? 'warning' : t === 'blue' ? 'primary' : t})`;
