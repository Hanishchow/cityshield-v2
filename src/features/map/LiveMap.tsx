/**
 * The live map used across the app. Default: the real street map (Leaflet +
 * OpenStreetMap + OSRM roads). Optional: the 3D city. The schematic SVG map
 * is the automatic fallback if the street map cannot start, and the 3D scene
 * is lazy-loaded so three.js never lands in the initial bundle.
 */
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Box, Map as MapIcon } from 'lucide-react';

import { CityMap2D, type MapProps } from './CityMap2D.tsx';
import { StreetMap } from './StreetMap.tsx';
import { useMap3D } from '@/features/three/support.ts';
import { useUI } from '@/store/ui.ts';
import { cn } from '@/lib/utils.ts';

const LiveMap3D = lazy(() => import('@/features/three/LiveMap3D.tsx'));

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export interface LiveMapProps extends MapProps {
  toggle?: boolean;
  /** ambulance destination hospital, drawn as the second leg on the street map */
  hospital?: { lat: number; lng: number; name: string } | null;
  locationLabel?: string;
}

export function LiveMap({ toggle = true, hospital, locationLabel, ...p }: LiveMapProps) {
  const { use3D, available } = useMap3D();
  const set = useUI((s) => s.set);
  const schematic = <CityMap2D {...p} className="absolute inset-0" height={undefined} />;
  const street = (
    <Fallback fallback={schematic}>
      <StreetMap className="absolute inset-0" assignments={p.assignments ?? []} dest={p.dest ?? undefined} issue={p.issue} hospital={hospital}
        locationLabel={locationLabel} aria={p.aria} fallback={schematic} />
    </Fallback>
  );
  return (
    <div className={cn('relative overflow-hidden', p.className)} style={p.height ? { height: p.height } : undefined}>
      {use3D ? (
        <Fallback fallback={street}>
          <Suspense fallback={schematic}>
            <div className="absolute inset-0" role="img" aria-label={(p.aria ?? 'Live map') + ' (3D)'}>
              <LiveMap3D {...p} />
            </div>
            <span className="pointer-events-none absolute right-2.5 bottom-2.5 z-[2] rounded-md bg-surface/90 px-2 py-0.5 text-[11.5px] font-semibold text-fg-3">Simulated · drag to orbit</span>
          </Suspense>
        </Fallback>
      ) : street}
      {toggle && available && (
        <div className={cn('absolute z-[1001] flex rounded-xl border border-line bg-surface/95 p-0.5 shadow-soft backdrop-blur', use3D ? 'top-3 right-3' : 'top-3 right-[58px]')} role="group" aria-label="Map view">
          {(['2d', '3d'] as const).map((m) => {
            const on = (m === '3d') === use3D;
            return (
              <button key={m} onClick={() => set({ mapMode: m })} aria-pressed={on}
                className={cn('inline-flex h-7 items-center gap-1 rounded-[9px] px-2.5 text-[12.5px] font-bold transition-colors', on ? 'bg-navy-900 text-white dark:bg-primary' : 'text-fg-2 hover:text-fg')}>
                {m === '3d' ? <Box className="size-3.5" /> : <MapIcon className="size-3.5" />}{m === '3d' ? '3D' : 'Map'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


