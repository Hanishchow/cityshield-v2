import { useLayoutEffect } from 'react';
import { create } from 'zustand';

export type Side = 'home' | 'sos' | 'police' | 'ambulance' | 'fire' | 'civic' | 'complaints' | 'track' | 'notifications' | 'places' | 'profile' | 'prefs' | 'command' | null;
export interface PageMeta {
  title: string;
  sub?: string;
  side: Side;
  /** bottom tab to highlight on phones; omitted = no bottom nav on this page */
  tab?: 'home' | 'complaints' | 'track' | 'more';
  /** dark mobile chrome (SOS page) */
  dark?: boolean;
}
export const usePageMetaStore = create<{ meta: PageMeta }>(() => ({ meta: { title: '', side: null } }));

/** Pages declare their topbar title, sidebar highlight and tab. */
export function usePageMeta(m: PageMeta) {
  useLayoutEffect(() => {
    usePageMetaStore.setState({ meta: m });
    document.title = m.side === 'home' ? 'City Shield · Safer Cities. Stronger Communities.' : `${m.title} · City Shield`;
  }, [m.title, m.sub, m.side, m.tab, m.dark]); // eslint-disable-line react-hooks/exhaustive-deps
}
