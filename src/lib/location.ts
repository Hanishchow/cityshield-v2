import type { LocationIn, User } from '@shared/contract.ts';
import { ANCHOR, haversineKm, inBengaluru } from '@shared/geo.ts';

/** The user's current area as an API location. Never waits on GPS. */
export function areaLocation(u: User): LocationIn {
  return { lat: u.area.lat, lng: u.area.lng, accuracyM: u.area.accuracyM, source: u.area.source, address: u.area.label };
}

export interface Fix { lat: number; lng: number; accuracyM: number }
export type LocateFail = 'insecure' | 'unsupported' | 'denied' | 'timeout' | 'unavailable';
export type LocateResult =
  | { ok: true; fix: Fix; inArea: boolean; kmFromCity: number }
  | { ok: false; reason: LocateFail };

const once = (opts: PositionOptions) => new Promise<GeolocationPosition>((res, rej) => {
  /* some browsers never call back at all; enforce the timeout ourselves */
  const guard = setTimeout(() => rej({ code: 3 }), (opts.timeout ?? 10_000) + 1500);
  navigator.geolocation.getCurrentPosition((p) => { clearTimeout(guard); res(p); }, (e) => { clearTimeout(guard); rej(e); }, opts);
});

/**
 * Best-effort location fix with honest failure reasons.
 * 1. a quick high-accuracy attempt (GPS), then
 * 2. a low-accuracy attempt (Wi-Fi / cell, recent cache allowed) if that times out.
 * A fix outside Bengaluru is still returned (inArea=false) — callers decide.
 */
export async function locate(): Promise<LocateResult> {
  if (typeof window !== 'undefined' && !window.isSecureContext) return { ok: false, reason: 'insecure' };
  if (!('geolocation' in navigator)) return { ok: false, reason: 'unsupported' };
  const toResult = (p: GeolocationPosition): LocateResult => {
    const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy || 0) };
    return { ok: true, fix, inArea: inBengaluru(fix), kmFromCity: Math.round(haversineKm(fix, ANCHOR)) };
  };
  /* GPS and Wi-Fi/cell in parallel: the first answer wins (the live watch refines it after) */
  const tries = [
    once({ enableHighAccuracy: true, timeout: 10_000, maximumAge: 15_000 }),
    once({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }),
  ];
  try {
    return toResult(await Promise.any(tries));
  } catch (e) {
    const codes = ((e as AggregateError).errors ?? []).map((x) => (x as GeolocationPositionError).code);
    return { ok: false, reason: codes.includes(1) ? 'denied' : codes.includes(3) ? 'timeout' : 'unavailable' };
  }
}

/* where to switch location on, for the device the page is running on */
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const OS_HINT = /Android/.test(ua) ? ' Turn on Location in your phone settings.'
  : /iPhone|iPad/.test(ua) ? ' Turn on Settings → Privacy & Security → Location Services.'
  : /Windows/.test(ua) ? ' On Windows, turn on Settings → Privacy & security → Location.'
  : /Mac OS X/.test(ua) ? ' On a Mac, allow your browser in System Settings → Privacy & Security → Location Services.' : '';

export const LOCATE_MESSAGE: Record<LocateFail, string> = {
  insecure: 'Location needs a secure (https) page — open the app over https.',
  unsupported: 'This browser cannot share location — set your area manually.',
  denied: 'Location permission is blocked — allow it in your browser settings.',
  timeout: `Your device did not report a location.${OS_HINT} Or search for your area.`,
  unavailable: `Location is switched off on this device.${OS_HINT} Or search for your area.`,
};

/** Current permission state without prompting ('granted' | 'denied' | 'prompt' | 'unknown'). */
export async function locationPermission(): Promise<PermissionState | 'unknown'> {
  try { return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state; }
  catch { return 'unknown'; }
}

/** Fix inside Bengaluru, or null. Used for background refinements (e.g. after SOS). */
export async function requestGps(): Promise<Fix | null> {
  const r = await locate();
  return r.ok && r.inArea ? r.fix : null;
}
