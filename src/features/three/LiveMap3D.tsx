/**
 * Live tracking as a tilted 3D city. Vehicles drive their routes on the shared
 * clock; with a single responder the camera follows it until the user grabs
 * the view.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { USER_PT } from '@shared/city.ts';
import { progressOf } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { useUI, resolvedTheme } from '@/store/ui.ts';
import { City3D, DAY, NIGHT } from './City3D.tsx';
import { MovingVehicle, Pin, RouteLine } from './parts.tsx';
import { WS } from './support.ts';
import type { MapProps } from '../map/CityMap2D.tsx';

function Rig({ p }: { p: MapProps }) {
  const controls = useRef<OrbitImpl>(null);
  const { camera } = useThree();
  const grabbed = useRef(false);
  const assignments = p.assignments ?? [];
  const center = useMemo(() => {
    const pts = assignments.flatMap((a) => a.route);
    const d = p.issue?.pt ?? p.dest ?? USER_PT;
    pts.push(d);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    const span = Math.max(x1 - x0, y1 - y0, 360) * WS;
    return { c: new THREE.Vector3(((x0 + x1) / 2) * WS, 0, ((y0 + y1) / 2) * WS), span };
  }, [assignments, p.dest, p.issue]);

  const placed = useRef(false);
  const follow = assignments.length === 1 ? assignments[0] : null;
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame((_s, dt) => {
    const c = controls.current; if (!c) return;
    if (!placed.current) {
      placed.current = true;
      c.target.copy(center.c);
      camera.position.set(center.c.x + center.span * 0.35, center.span * 1.05, center.c.z + center.span * 1.05);
      c.update();
    }
    if (follow && !grabbed.current) {
      const pr = progressOf(follow, serverNow());
      tmp.set(pr.pos[0] * WS, 0, pr.pos[1] * WS).lerp(center.c, 0.45);
      const delta = tmp.sub(c.target).multiplyScalar(Math.min(1, dt * 1.5));
      c.target.add(delta); camera.position.add(delta); c.update();
    }
  });
  return (
    <OrbitControls ref={controls as never} makeDefault enablePan={false} enableDamping minDistance={2.2} maxDistance={16}
      minPolarAngle={0.35} maxPolarAngle={1.18} onStart={() => { grabbed.current = true; }} />
  );
}

export default function LiveMap3D(p: MapProps) {
  const theme = useUI((s) => s.theme);
  const dark = resolvedTheme(theme) === 'dark';
  const pal = dark ? NIGHT : DAY;
  return (
    <Canvas dpr={[1, 1.5]} camera={{ fov: 38, near: 0.05, far: 80, position: [6, 6, 10] }} shadows gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <color attach="background" args={[pal.ground]} />
      <fog attach="fog" args={[pal.ground, 9, 24]} />
      <hemisphereLight args={[dark ? '#8EA3E0' : '#ffffff', dark ? '#14224A' : '#c7cfdb', dark ? 1.15 : 1.05]} />
      <directionalLight position={[4, 9, 3]} intensity={dark ? 1.1 : 1.7} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
      <City3D palette={pal} windows={dark} />
      {(p.assignments ?? []).map((a) => <RouteLine key={'r' + a.unitId} a={a} />)}
      {(p.assignments ?? []).map((a) => <MovingVehicle key={'v' + a.unitId} a={a} label={p.pill !== false} />)}
      {p.issue
        ? <Pin pt={p.issue.pt} head={p.issue.state === 'resolved' ? '#0E8A4F' : '#DC2F35'} color={p.issue.state === 'resolved' ? '#0E8A4F' : '#DC2F35'} pulse={p.issue.state !== 'resolved'} />
        : <Pin pt={p.dest ?? USER_PT} />}
      <Rig p={p} />
    </Canvas>
  );
}
