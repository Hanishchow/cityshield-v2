/** Global overlays (SOS flow, calls) and sheets that can open from anywhere. */
import { create } from 'zustand';
import type { ServiceKey } from '@shared/contract.ts';

export type Overlay =
  | { kind: 'sos-countdown' }
  | { kind: 'sos-sent'; incidentId: string }
  | { kind: 'call'; who: 'police' | 'ambulance' | 'fire' | 'civic' }
  | { kind: 'video' }
  | null;

export type SheetState =
  | { kind: 'loc' }
  | { kind: 'dial'; num: string }
  | { kind: 'trip'; svc: ServiceKey | 'crew'; incidentId: string }
  | { kind: 'hosp'; incidentId: string | null }
  | { kind: 'svcmap'; svc: ServiceKey }
  | { kind: 'cmpmap'; id: string }
  | { kind: 'locaccess' }
  | { kind: 'addplace' }
  | { kind: 'place'; id: string }
  | { kind: 'profile' }
  | { kind: 'request'; svc: ServiceKey }
  | null;

interface S {
  overlay: Overlay;
  sheet: SheetState;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
}
export const useOverlays = create<S>((set) => ({
  overlay: null, sheet: null,
  openOverlay: (o) => set({ overlay: o, sheet: null }),
  closeOverlay: () => set({ overlay: null }),
  openSheet: (s) => set({ sheet: s }),
  closeSheet: () => set({ sheet: null }),
}));
export const openSheet = (s: SheetState) => useOverlays.getState().openSheet(s);
export const startSos = () => useOverlays.getState().openOverlay({ kind: 'sos-countdown' });
