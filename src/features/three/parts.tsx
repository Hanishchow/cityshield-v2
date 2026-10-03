/** Reusable 3D pieces: vehicles, routes, pins and incident beacons. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Assignment, Unit } from '@shared/contract.ts';
import type { SPoint } from '@shared/city.ts';
import { SERVICES } from '@shared/catalog.ts';
import { patrolOf, progressOf, routeInfo, vehicleLabel } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { WS } from './support.ts';

const V = 1.35; // vehicle scale relative to the city

/** A responder vehicle. Siren bar flashes for police / ambulance / fire. */
export function VehicleBody({ color, kind }: { color: string; kind: string }) {
  const barL = useRef<THREE.MeshStandardMaterial>(null), barR = useRef<THREE.MeshStandardMaterial>(null);
  const siren = kind === 'police' || kind === 'ambulance' || kind === 'fire';
  useFrame(({ clock }) => {
    if (!siren || !barL.current || !barR.current) return;
    const on = Math.floor(clock.elapsedTime * 5) % 2 === 0;
    barL.current.emissiveIntensity = on ? 3 : 0.2;
    barR.current.emissiveIntensity = on ? 0.2 : 3;
  });
  const long = kind === 'fire' || kind === 'civic' || kind === 'crew' ? 1.25 : 1;
  return (
    <group scale={V}>
      <mesh position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[0.2 * long, 0.07, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[0.03 * long, 0.095, 0]}>
        <boxGeometry args={[0.1 * long, 0.04, 0.088]} />
        <meshStandardMaterial color="#F4F7FB" roughness={0.3} />
      </mesh>
      {siren && (
        <>
          <mesh position={[0.03 * long, 0.122, -0.022]}><boxGeometry args={[0.03, 0.014, 0.04]} /><meshStandardMaterial ref={barL} color="#ff3b3b" emissive="#ff2a2a" /></mesh>
          <mesh position={[0.03 * long, 0.122, 0.022]}><boxGeometry args={[0.03, 0.014, 0.04]} /><meshStandardMaterial ref={barR} color="#3b6bff" emissive="#2f5bff" /></mesh>
        </>
      )}
    </group>
  );
}

export function RouteLine({ a, width = 5 }: { a: Assignment; width?: number }) {
  const pts = useMemo(() => a.route.map(([x, y]) => new THREE.Vector3(x * WS, 0.02, y * WS)), [a.route]);
  const L = routeInfo(a.route).L * WS;
  const rem = useRef<{ material: { dashOffset: number } } | null>(null);
  const color = SERVICES[a.kind].color;
  useFrame(() => {
    if (!rem.current) return;
    const pr = progressOf(a, serverNow());
    rem.current.material.dashOffset = -pr.p * L;
  });
  return (
    <group>
      <Line points={pts} color="#ffffff" lineWidth={width + 4} transparent opacity={0.85} />
      <Line points={pts} color={color} lineWidth={width} transparent opacity={0.28} />
      <Line ref={rem as never} points={pts} color={color} lineWidth={width} dashed dashSize={L} gapSize={L} dashOffset={0} />
    </group>
  );
}

export function MovingVehicle({ a, label = true, onPos }: { a: Assignment; label?: boolean; onPos?: (v: THREE.Vector3) => void }) {
  const g = useRef<THREE.Group>(null), txt = useRef<HTMLSpanElement>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!g.current) return;
    const pr = progressOf(a, serverNow());
    g.current.position.set(pr.pos[0] * WS, 0, pr.pos[1] * WS);
    g.current.rotation.y = -pr.heading;
    if (txt.current) {
      const l = vehicleLabel(a, pr);
      if (txt.current.textContent !== l) { txt.current.textContent = l; txt.current.parentElement!.style.background = pr.done ? '#0E8A4F' : SERVICES[a.kind].pill; }
    }
    if (onPos) onPos(tmp.copy(g.current.position));
  });
  return (
    <group ref={g}>
      <VehicleBody color={SERVICES[a.kind].color} kind={a.kind} />
      {label && (
        <Html position={[0, 0.42, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold text-white shadow-float" style={{ background: SERVICES[a.kind].pill }}>
            <span ref={txt} />
          </div>
        </Html>
      )}
    </group>
  );
}

export function PatrolVehicle({ u }: { u: Unit }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const st = patrolOf(u, serverNow());
    if (!g.current || !st) return;
    g.current.position.set(st.pos[0] * WS, 0, st.pos[1] * WS);
    g.current.rotation.y = -st.heading;
  });
  return <group ref={g}><VehicleBody color={u.patrol?.color ?? '#888'} kind={u.kind} /></group>;
}

/** Pulsing ground ring. */
export function PulseRing({ color, radius = 0.22, speed = 1 }: { color: string; radius?: number; speed?: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!m.current) return;
    const t = (clock.elapsedTime * 0.45 * speed) % 1;
    m.current.scale.setScalar(0.4 + t * 1.6);
    (m.current.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
  });
  return (
    <mesh ref={m} rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
      <ringGeometry args={[radius * 0.82, radius, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
    </mesh>
  );
}

/** "You are here" / complaint location pin. */
export function Pin({ pt, color = '#2A56C6', head = '#0F1C40', pulse = true }: { pt: SPoint; color?: string; head?: string; pulse?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (g.current) g.current.position.y = 0.05 + Math.sin(clock.elapsedTime * 2) * 0.02; });
  return (
    <group position={[pt[0] * WS, 0, pt[1] * WS]}>
      {pulse && <PulseRing color={color} radius={0.3} />}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.013, 0]}><circleGeometry args={[0.06, 32]} /><meshBasicMaterial color={color} /></mesh>
      <group ref={g}>
        <mesh position={[0, 0.34, 0]} castShadow><sphereGeometry args={[0.1, 32, 16]} /><meshStandardMaterial color={head} roughness={0.35} metalness={0.2} /></mesh>
        <mesh position={[0, 0.2, 0]} rotation-x={Math.PI}><coneGeometry args={[0.07, 0.2, 24]} /><meshStandardMaterial color={head} roughness={0.35} /></mesh>
        <mesh position={[0, 0.34, 0.075]}><sphereGeometry args={[0.035, 16, 8]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    </group>
  );
}

/** Command-centre incident: a light column with a pulsing base, hoverable. */
export function Beacon({ pt, color, done, hovered, onHover, children }: {
  pt: SPoint; color: string; done: boolean; hovered: boolean; onHover: (on: boolean) => void; children?: React.ReactNode;
}) {
  const col = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => { if (col.current && !done) col.current.opacity = 0.35 + Math.sin(clock.elapsedTime * 3 + pt[0]) * 0.12 + (hovered ? 0.25 : 0); });
  const h = done ? 0.25 : 1.6;
  return (
    <group position={[pt[0] * WS, 0, pt[1] * WS]}>
      {!done && <PulseRing color={color} radius={0.34} />}
      <mesh position={[0, h / 2, 0]} onPointerOver={(e) => { e.stopPropagation(); onHover(true); }} onPointerOut={() => onHover(false)}>
        <cylinderGeometry args={[0.05, 0.11, h, 20, 1, true]} />
        <meshBasicMaterial ref={col} color={done ? '#8793A8' : color} transparent opacity={0.45} blending={done ? THREE.NormalBlending : THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, h + 0.04, 0]}>
        <sphereGeometry args={[0.07, 20, 12]} />
        <meshBasicMaterial color={done ? '#8793A8' : color} toneMapped={false} />
      </mesh>
      {hovered && children && <Html position={[0, h + 0.3, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>{children}</Html>}
    </group>
  );
}
