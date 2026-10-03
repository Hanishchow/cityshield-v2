/**
 * UI-only state (per device). Server state lives in TanStack Query; this is
 * the stuff that should survive a reload but never needs to reach the API.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CategoryKey, Lang, ThemePref } from '@shared/contract.ts';

export type MapMode = 'auto' | '2d' | '3d';
export interface Draft { category: CategoryKey; title: string; address: string; description: string; lat: number | null; lng: number | null; photo: string | null }

interface UIState {
  lang: Lang;
  theme: ThemePref;
  mapMode: MapMode;
  ntfFilter: 'all' | 'emergency' | 'service' | 'complaint';
  cFilter: 'all' | 'open' | 'resolved';
  placeTab: 'home' | 'work' | 'frequent';
  selectedComplaint: string | null;
  draft: Draft | null;
  set: (p: Partial<Omit<UIState, 'set'>>) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      lang: 'en', theme: 'system', mapMode: 'auto', ntfFilter: 'all', cFilter: 'all', placeTab: 'home',
      selectedComplaint: null, draft: null,
      set: (p) => set(p),
    }),
    {
      name: 'cs-ui',
      /* The draft photo can be megabytes; keep it in memory only. */
      partialize: (s) => ({ lang: s.lang, theme: s.theme, mapMode: s.mapMode, ntfFilter: s.ntfFilter, cFilter: s.cFilter, placeTab: s.placeTab }),
    },
  ),
);

export function resolvedTheme(t: ThemePref): 'light' | 'dark' {
  if (t !== 'system') return t;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
