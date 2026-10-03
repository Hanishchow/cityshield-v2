/**
 * The schematic city in 3D, built from the same grid as the 2D map
 * (shared/city.ts) so both views always show the same streets.
 * All buildings are ONE instanced mesh — a single draw call.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CITY_BOUNDS, LAKE_OUTLINE, RW, cityBlocks, rng, roadSegments } from '@shared/city.ts';
import { WS } from './support.ts';

export interface CityPalette { ground: string; block: string; blockTop: string; road: string; arterial: string; park: string; water: string; window: string }
export const DAY: CityPalette = { ground: '#E6EAF0', block: '#D7DEE8', blockTop: '#F2F5F9', road: '#FFFFFF', arterial: '#FFFFFF', park: '#BFE3C9', water: '#9FCBEF', window: '#FFE9A8' };
export const NIGHT: CityPalette = { ground: '#101C3E', block: '#2A3D68', blockTop: '#4A618F', road: '#2E4274', arterial: '#41588F', park: '#16443A', water: '#1A4C82', window: '#FFC966' };

export function City3D({ palette = DAY, heightScale = 1, windows = false }: { palette?: CityPalette; heightScale?: number; windows?: boolean }) {
  const { blocks, parks } = useMemo(() => cityBlocks(1), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lit = useRef<THREE.InstancedMesh>(null);

  /* per-building height: taller towards the Koramangala core and along arterials, seeded so it never changes */
  const heights = useMemo(() => blocks.map((b) => {
    const r = rng(b.seed)(), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const core = Math.exp(-(((cx - 650) / 520) ** 2 + ((cy - 350) / 460) ** 2));
    const base = 6 + r * 18 + core * 34 + (r > 0.93 ? 40 : 0);
    return base * heightScale;
  }), [blocks, heightScale]);

  useLayoutEffect(() => {
    const m = mesh.current; if (!m) return;
    const o = new THREE.Object3D(), c = new THREE.Color(), top = new THREE.Color(palette.blockTop), side = new THREE.Color(palette.block);
    blocks.forEach((b, i) => {
      const h = heights[i];
      o.position.set((b.x + b.w / 2) * WS, (h * WS) / 2, (b.y + b.h / 2) * WS);
      o.scale.set(b.w * WS, h * WS, b.h * WS);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      c.copy(side).lerp(top, Math.min(1, h / 90) * 0.55);
      m.setColorAt(i, c);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [blocks, heights, palette]);

  /* night: a band of lit windows on a random subset of buildings */
  const litIdx = useMemo(() => blocks.map((b, i) => [i, rng(b.seed + 9)()] as const).filter(([, r]) => r > 0.45).map(([i]) => i), [blocks]);
  useLayoutEffect(() => {
    const m = lit.current; if (!m || !windows) return;
    const o = new THREE.Object3D();
    litIdx.forEach((bi, i) => {
      const b = blocks[bi], h = heights[bi], r = rng(b.seed + 3);
      o.position.set((b.x + b.w / 2) * WS, (h * (0.35 + r() * 0.45)) * WS, (b.y + b.h / 2) * WS);
      o.scale.set(b.w * WS * 1.004, h * WS * 0.12, b.h * WS * 1.004);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [litIdx, blocks, heights, windows]);

  const roads = useMemo(() => {
    const segs = roadSegments(), out: { x: number; z: number; w: number; d: number; art: boolean }[] = [];
    (['m', 's', 'a'] as const).forEach((cls) => segs[cls].forEach(([x0, y0, x1, y1]) => {
      const vertical = x0 === x1, wdt = RW[cls];
      out.push(vertical
        ? { x: x0 * WS, z: ((y0 + y1) / 2) * WS, w: wdt * WS, d: (y1 - y0) * WS, art: cls === 'a' }
        : { x: ((x0 + x1) / 2) * WS, z: y0 * WS, w: (x1 - x0) * WS, d: wdt * WS, art: cls === 'a' });
    }));
    return out;
  }, []);

  const lake = useMemo(() => {
    const s = new THREE.Shape();
    LAKE_OUTLINE.forEach(([x, y], i) => (i ? s.lineTo(x * WS, y * WS) : s.moveTo(x * WS, y * WS)));
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);

  const W = (CITY_BOUNDS.x1 - CITY_BOUNDS.x0 + 400) * WS, D = (CITY_BOUNDS.y1 - CITY_BOUNDS.y0 + 400) * WS;
  const cx = ((CITY_BOUNDS.x0 + CITY_BOUNDS.x1) / 2) * WS, cz = ((CITY_BOUNDS.y0 + CITY_BOUNDS.y1) / 2) * WS;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[cx, -0.002, cz]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>
      {roads.map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[r.x, r.art ? 0.0016 : 0.001, r.z]}>
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial color={r.art ? palette.arterial : palette.road} roughness={0.95} />
        </mesh>
      ))}
      {parks.map((p, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[(p.x + p.w / 2) * WS, 0.003, (p.y + p.h / 2) * WS]}>
          <planeGeometry args={[p.w * WS, p.h * WS]} />
          <meshStandardMaterial color={palette.park} roughness={1} />
        </mesh>
      ))}
      <mesh geometry={lake} rotation-x={Math.PI / 2} position={[0, 0.004, 0]}>
        <meshStandardMaterial color={palette.water} roughness={0.25} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, blocks.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} metalness={0.02} />
      </instancedMesh>
      {windows && (
        <instancedMesh ref={lit} args={[undefined, undefined, litIdx.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={palette.window} transparent opacity={0.55} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

/** Schematic point → world position. */
export const w3 = (x: number, y: number, h = 0): [number, number, number] => [x * WS, h, y * WS];
