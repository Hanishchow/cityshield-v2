import type { LocationIn, User } from '@shared/contract.ts';
import { inBengaluru } from '@shared/geo.ts';

/** The user's current area as an API location. Never waits on GPS. */
export function areaLocation(u: User): LocationIn {
  return { lat: u.area.lat, lng: u.area.lng, accuracyM: u.area.accuracyM, source: u.area.source, address: u.area.label };
}

export interface Fix { lat: number; lng: number; accuracyM: number }
/** Best-effort GPS fix. Resolves null on denial, timeout, or a fix outside Bengaluru (the demo city). */
export function requestGps(timeout = 6000): Promise<Fix | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    const t = setTimeout(() => resolve(null), timeout + 500);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        const f = { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) };
        resolve(inBengaluru(f) ? f : null);
      },
      () => { clearTimeout(t); resolve(null); },
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 },
    );
  });
}
