import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export function useMedia(q: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const m = matchMedia(q);
    m.addEventListener('change', cb);
    return () => m.removeEventListener('change', cb);
  }, [q]);
  return useSyncExternalStore(subscribe, () => matchMedia(q).matches, () => false);
}
/** The prototype's layout breakpoint: sidebar + topbar at 960 px and up. */
export const useIsDesktop = () => useMedia('(min-width: 960px)');
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

/** Re-render on an interval (for countdowns and live text). */
export function useTicker(ms = 1000): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}
