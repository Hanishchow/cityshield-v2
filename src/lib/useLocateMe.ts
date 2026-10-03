/**
 * One "use my current location" action shared by every button that offers it
 * (location sheet, street map, report form) plus a quiet auto-locate on load.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBackend, useMe, useUpdateMe } from '@/lib/api/hooks.ts';
import { appToast } from '@/components/toast.tsx';
import { LOCATE_MESSAGE, locate, locationPermission, type Fix } from './location.ts';

export function useLocateMe() {
  const backend = useBackend(), upd = useUpdateMe();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (opts: { silent?: boolean } = {}): Promise<{ fix: Fix; label: string } | null> => {
    setBusy(true);
    try {
      const r = await locate();
      if (!r.ok) { if (!opts.silent) appToast(LOCATE_MESSAGE[r.reason], 'locate', 'amber'); return null; }
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
    void locationPermission().then((s) => { if (s === 'granted') void run({ silent: true }); });
  }, [me, run]);
}
