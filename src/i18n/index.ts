import { useCallback } from 'react';
import { BASE, LANGS } from './base.ts';
import { useUI } from '@/store/ui.ts';
import type { Lang } from '@shared/contract.ts';

export { LANGS };

/** Strings added for the full app. Untranslated keys fall back to English, as in the prototype. */
const EXTRA_EN = {
  request: 'Request',
  requestService: 'Request {svc}',
  requestConfirm: 'Send {svc} to {area}?',
  cancelRequest: 'Cancel request',
  endIncident: 'Mark as resolved',
  notActive: 'Not active',
  allClear: 'All clear — no responders on the way.',
  offlineDemo: 'Offline demo data — the live server is unreachable. 112 still works.',
  liveData: 'Live',
  view3d: '3D',
  view2d: '2D',
  map: 'Map',
  incidentRecord: 'Incident record',
  sharedWithAgencies: 'Shared with agencies',
  reference: 'Reference',
  reported: 'Reported',
  visibleTo: 'Visible to',
  details: 'Details',
  dispatched: 'Dispatched',
  enRoute: 'En route',
  arrived: 'Arrived',
  commandCentre: 'Command Centre',
  verifyPhone: 'Verify mobile number',
  submit: 'Submit Complaint',
} as const;

type BaseKey = keyof (typeof BASE)['en'];
export type TKey = BaseKey | keyof typeof EXTRA_EN;

export function translate(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  const L = BASE[lang] as Record<string, string>;
  const en = BASE.en as Record<string, string>;
  let s = L[key] ?? en[key] ?? (EXTRA_EN as Record<string, string>)[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useUI((s) => s.lang);
  return useCallback((key: TKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

export function greetingKey(h = new Date().getHours()): TKey {
  return h < 12 ? 'gm' : h < 17 ? 'ga' : 'ge';
}
