/**
 * When to use 3D. Every 3D scene has a 2D fallback, chosen when WebGL is
 * missing, the user prefers reduced motion, or the device looks low-powered
 * (Save-Data on, or ≤4 CPU cores). An emergency screen must never stall
 * because a GPU is busy.
 */
import { useMemo } from 'react';
import { useIsDesktop, useReducedMotion } from '@/lib/useMedia.ts';
import { useUI } from '@/store/ui.ts';

let webgl: boolean | null = null;
export function hasWebGL(): boolean {
  if (webgl != null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webgl = false;
  }
  return webgl;
}
export function lowPower(): boolean {
  const n = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (n.connection?.saveData) return true;
  if ((n.hardwareConcurrency ?? 8) <= 4) return true;
  if (n.deviceMemory != null && n.deviceMemory <= 2) return true;
  return false;
}

/** Decorative 3D (hero, SOS shockwave, emblem): on unless reduced motion / no WebGL / low power. */
export function useDecor3D(): boolean {
  const reduced = useReducedMotion();
  return useMemo(() => !reduced && hasWebGL() && !lowPower(), [reduced]);
}

/** Live maps: the user's 2D/3D choice; "auto" = 3D on capable desktops, 2D on phones. */
export function useMap3D(): { use3D: boolean; available: boolean } {
  const mode = useUI((s) => s.mapMode);
  const desk = useIsDesktop();
  const reduced = useReducedMotion();
  const available = hasWebGL();
  if (!available) return { use3D: false, available };
  if (mode === '3d') return { use3D: true, available };
  if (mode === '2d') return { use3D: false, available };
  return { use3D: desk && !reduced && !lowPower(), available };
}

/** Schematic units → world units for every 3D scene. */
export const WS = 0.01;
