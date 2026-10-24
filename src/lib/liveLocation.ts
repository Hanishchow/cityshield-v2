/**
 * The device's live position, for the whole app: one watchPosition.
 *  - It never asks for permission by itself. It starts when the user pressed a
 *    "use my location" control, or on load if permission was already granted.
 *  - It stops while the tab is hidden and resumes when shown (battery).
 *  - It publishes a new fix only after a real move (>= 8 m, or a quarter of the
 *    accuracy circle) or every 15 s, so maps and sharing are not flooded.
 */
import { create } from 'zustand';
import { haversineKm, inBengaluru } from '@shared/geo.ts';

export interface LiveFix {
  lat: number; lng: number; accuracyM: number;
  heading: number | null; speedMps: number | null;
  at: number; inArea: boolean;
}
type Status = 'off' | 'watching' | 'denied' | 'unavailable';
export const useLive = create<{ fix: LiveFix | null; status: Status }>(() => ({ fix: null, status: 'off' }));

let watchId: number | null = null;
let wanted = false;
let precise = true; // drops to Wi-Fi/cell if GPS never answers

const supported = () => typeof navigator !== 'undefined' && 'geolocation' in navigator && typeof window !== 'undefined' && window.isSecureContext;

function start() {
  if (watchId != null || !wanted || document.hidden || !supported()) return;
  watchId = navigator.geolocation.watchPosition(
    (p) => {
      const prev = useLive.getState().fix;
      const fix: LiveFix = {
        lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy || 0),
        heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
        speedMps: Number.isFinite(p.coords.speed) ? p.coords.speed : null,
        at: p.timestamp || Date.now(), inArea: false,
      };
      fix.inArea = inBengaluru(fix);
      if (prev) {
        const movedM = haversineKm(prev, fix) * 1000;
        if (movedM < Math.max(8, fix.accuracyM / 4) && fix.at - prev.at < 15_000) return;
      }
      useLive.setState({ fix, status: 'watching' });
    },
    (e) => {
      if (e.code === 1) { wanted = false; stop(); useLive.setState({ status: 'denied' }); }
      else {
        useLive.setState({ status: 'unavailable' });
        if (precise && !useLive.getState().fix) { precise = false; stop(); start(); }
      }
    },
    { enableHighAccuracy: precise, maximumAge: precise ? 5000 : 60_000, timeout: 15_000 },
  );
  useLive.setState({ status: 'watching' });
}

function stop() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : (precise = true, start())));
}

/** Begin following the device. Call from a user gesture, or when permission is already granted. */
export function startLiveLocation() { wanted = true; start(); }
export function stopLiveLocation() { wanted = false; stop(); useLive.setState({ status: 'off' }); }

/** The live fix if it is recent enough to act on (e.g. for an SOS). */
export function freshFix(maxAgeMs = 60_000): LiveFix | null {
  const f = useLive.getState().fix;
  return f && f.inArea && Date.now() - f.at < maxAgeMs ? f : null;
}
