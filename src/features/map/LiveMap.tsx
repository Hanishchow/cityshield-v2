/**
 * The live map used across the app: 2D SVG by default on phones, 3D city on
 * capable desktops, with a toggle. The 3D scene is lazy-loaded, so three.js
 * never lands in the initial bundle, and it falls back to 2D if it fails.
 */
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Box, Map as MapIcon } from 'lucide-react';
import { CityMap2D, type MapProps } from './CityMap2D.tsx';
import { useMap3D } from '@/features/three/support.ts';
import { useUI } from '@/store/ui.ts';
import { cn } from '@/lib/utils.ts';

const LiveMap3D = lazy(() => import('@/features/three/LiveMap3D.tsx'));

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function LiveMap({ toggle = true, ...p }: MapProps & { toggle?: boolean }) {
  const { use3D, available } = useMap3D();
  const set = useUI((s) => s.set);
  const flat = <CityMap2D {...p} className="size-full" height={undefined} />;
  return (
    <div className={cn('relative overflow-hidden', p.className)} style={p.height ? { height: p.height } : undefined}>
      {use3D ? (
        <Fallback fallback={<CityMap2D {...p} className="absolute inset-0" height={undefined} />}>
          <Suspense fallback={<CityMap2D {...p} className="absolute inset-0" height={undefined} />}>
            <div className="absolute inset-0" role="img" aria-label={(p.aria ?? 'Live map') + ' (3D)'}>
              <LiveMap3D {...p} />
            </div>
            <span className="pointer-events-none absolute top-3 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.08em] text-sos shadow-soft">
              <i className="size-1.5 animate-live rounded-full bg-sos" />LIVE
            </span>
            <span className="pointer-events-none absolute right-2.5 bottom-2.5 z-[2] rounded-md bg-surface/90 px-2 py-0.5 text-[11.5px] font-semibold text-fg-3">Simulated · drag to orbit</span>
          </Suspense>
        </Fallback>
      ) : (
        <div className="absolute inset-0">{flat}</div>
      )}
      {toggle && available && (
        <div className="absolute top-3 right-3 z-[3] flex rounded-xl border border-line bg-surface/95 p-0.5 shadow-soft backdrop-blur" role="group" aria-label="Map view">
          {(['2d', '3d'] as const).map((m) => {
            const on = (m === '3d') === use3D;
            return (
              <button key={m} onClick={() => set({ mapMode: m })} aria-pressed={on}
                className={cn('inline-flex h-7 items-center gap-1 rounded-[9px] px-2.5 text-[12.5px] font-bold transition-colors', on ? 'bg-navy-900 text-white dark:bg-primary' : 'text-fg-2 hover:text-fg')}>
                {m === '3d' ? <Box className="size-3.5" /> : <MapIcon className="size-3.5" />}{m.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
