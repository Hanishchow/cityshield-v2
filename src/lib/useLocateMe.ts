/**
 * One "use my current location" action shared by every button that offers it
 * (location sheet, street map, report form) plus a quiet auto-locate on load.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineKm } from '@shared/geo.ts';
import { useBackend, useIncidents, useMe, useUpdateMe } from '@/lib/api/hooks.ts';
import { appToast } from '@/components/toast.tsx';
import { LOCATE_MESSAGE, locate, locationPermission, type Fix } from './location.ts';
import { startLiveLocation, useLive } from './liveLocation.ts';

export function useLocateMe() {
  const backend = useBackend(), upd = useUpdateMe();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (opts: { silent?: boolean } = {}): Promise<{ fix: Fix; label: string } | null> => {
    setBusy(true);
    try {
      const r = await locate();
      if (!r.ok) { if (!opts.silent) appToast(LOCATE_MESSAGE[r.reason], 'locate', 'amber'); return null; }
      startLiveLocation(); // permission is granted now: keep following the device from here on
      if (!r.inArea) {
        if (!opts.silent) appToast(`You're about ${r.kmFromCity} km from Bengaluru, outside the service area — keeping your saved area.`, 'locate', 'amber');
        return null;
      }
      const g = await backend.geoReverse(r.fix.lat, r.fix.lng).catch(() => null);
      const label = g?.label ?? `${r.fix.lat.toFixed(4)}, ${r.fix.lng.toFixed(4)}`;
      await upd.mutateAsync({ area: { label, lat: r.fix.lat, lng: r.fix.lng, accuracyM: r.fix.accuracyM, source: 'gps' } });
      if (!opts.silent) appToast(`Location updated · accuracy ±${r.fix.accuracyM} m`, 'locate', 'police');
      return { fix: r.fix, label };
    } catch {
      if (!opts.silent) appToast('Could not update your location — try again.', 'alert', 'amber');
      return null;
    } finally {
      setBusy(false);
    }
  }, [backend, upd]);
  return { locate: run, busy };
}

/**
 * On app start: if location permission is ALREADY granted, refresh the area
 * from GPS quietly. Never prompts — the first prompt only comes from a button
 * the user pressed.
 */
export function useAutoLocate() {
  const me = useMe().data;
  const { locate: run } = useLocateMe();
  const done = useRef(false);
  useEffect(() => {
    if (!me || done.current) return;
    done.current = true;
    void locationPermission().then((s) => { if (s === 'granted') { startLiveLocation(); void run({ silent: true }); } });
  }, [me, run]);
}

/**
 * Keeps the account in step with the live position:
 *  - the saved area follows the user once they have really moved (> 250 m),
 *    at most every 2 minutes (each update reverse-geocodes through the API);
 *  - while they have an open incident and "Share live location" is on, each real
 *    move (>= 15 m, at most every 8 s) is sent as a ping, which moves the incident
 *    on the server so responders and the control room see where they are now.
 */
export function useLiveSync() {
  const me = useMe().data, backend = useBackend(), upd = useUpdateMe();
  const active = useIncidents(true).data;
  const fix = useLive((s) => s.fix);
  const lastArea = useRef(0);
  const lastPing = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!fix?.inArea || !me) return;
    if (haversineKm(fix, me.area) * 1000 < 250 || Date.now() - lastArea.current < 120_000) return;
    lastArea.current = Date.now();
    void (async () => {
      const g = await backend.geoReverse(fix.lat, fix.lng).catch(() => null);
      upd.mutate({ area: { label: g?.label ?? `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}`, lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, source: 'gps' } });
    })();
  }, [fix, me, backend, upd]);

  useEffect(() => {
    if (!fix?.inArea || !me?.shareLive || !active?.length) return;
    const lp = lastPing.current, now = Date.now();
    if (lp && (now - lp.at < 8000 || haversineKm(lp, fix) * 1000 < 15)) return;
    lastPing.current = { at: now, lat: fix.lat, lng: fix.lng };
    for (const inc of active) void backend.ping(inc.id, { lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, source: 'gps' }).catch(() => {});
  }, [fix, me, active, backend]);
}
