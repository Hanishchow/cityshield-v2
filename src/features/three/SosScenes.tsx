/**
 * SOS visuals.
 *  - SosShockwave: concentric shader ripples and an inward-drifting particle
 *    field behind the SOS button. `level` 0 = idle, 1 = countdown (faster,
 *    brighter), and `calm` settles everything to blue once help is dispatched.
 *  - DispatchScene: the user beacon with each responder travelling an arc
 *    towards it, driven by the real assignment progress.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Assignment } from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import { progressOf } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { useInView } from '@/lib/useInView.ts';
import { PulseRing, VehicleBody } from './parts.tsx';

function Ripples({ level, calm }: { level: number; calm: boolean }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, level: { value: 0 }, col: { value: new THREE.Color('#ff3b40') } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float t; uniform float level; uniform vec3 col; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5; float d = length(p) * 2.0;
        float speed = mix(0.35, 1.1, level);
        float w = fract(d * 2.2 - t * speed);
        float ring = smoothstep(0.0, 0.06, w) * (1.0 - smoothstep(0.06, 0.22, w));
        float fade = (1.0 - smoothstep(0.25, 1.0, d)) * smoothstep(0.18, 0.3, d);
        float core = (1.0 - smoothstep(0.0, 0.42, d)) * 0.35;
        float a = (ring * fade * mix(0.45, 1.0, level) + core * mix(0.4, 0.9, level));
        gl_FragColor = vec4(col * a, a);
      }`,
  }), []);
  const target = useMemo(() => new THREE.Color(), []);
  useFrame((_s, dt) => {
    mat.uniforms.t.value += dt;
    mat.uniforms.level.value += ((calm ? 0.2 : level) - mat.uniforms.level.value) * Math.min(1, dt * 3);
    (mat.uniforms.col.value as THREE.Color).lerp(target.set(calm ? '#5B9BEA' : '#ff3b40'), Math.min(1, dt * 2));
  });
  return <mesh material={mat}><planeGeometry args={[10, 10]} /></mesh>;
}

function Particles({ level, calm }: { level: number; calm: boolean }) {
  const N = 380;
  const pts = useRef<THREE.Points>(null);
  const { pos, seed } = useMemo(() => {
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed[i] = Math.random(); const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 3.6; pos.set([Math.cos(a) * r, Math.sin(a) * r, 0], i * 3); }
    return { pos, seed };
  }, []);
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((_s, dt) => {
    const p = pts.current; if (!p) return;
    const a = p.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array;
    const sp = (calm ? 0.15 : 0.35 + level * 1.6) * dt;
    for (let i = 0; i < N; i++) {
      const x = arr[i * 3], y = arr[i * 3 + 1], r = Math.hypot(x, y);
      let nr = r - sp * (0.6 + seed[i]);
      const ang = Math.atan2(y, x) + dt * (0.15 + seed[i] * 0.3) * (calm ? 0.4 : 1);
      if (nr < 0.75) nr = 3.2 + seed[i] * 1.6;
      arr[i * 3] = Math.cos(ang) * nr; arr[i * 3 + 1] = Math.sin(ang) * nr;
    }
    a.needsUpdate = true;
    (p.material as THREE.PointsMaterial).color.lerp(col.set(calm ? '#9CC6F7' : '#ff8a8d'), Math.min(1, dt * 2));
  });
  return (
    <points ref={pts}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial size={0.045} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} color="#ff8a8d" />
    </points>
  );
}

export function SosShockwave({ level = 0, calm = false }: { level?: number; calm?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} frameloop={inView ? 'always' : 'never'} orthographic camera={{ zoom: 62, position: [0, 0, 10] }} gl={{ alpha: true, antialias: true }}>
        <Ripples level={level} calm={calm} />
        <Particles level={level} calm={calm} />
      </Canvas>
    </div>
  );
}

/* ---------- dispatch scene ---------- */
function Responder({ a, i, n }: { a: Assignment; i: number; n: number }) {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 + 0.7;
  const curve = useMemo(() => {
    const start = new THREE.Vector3(Math.cos(ang) * 3.1, 0, Math.sin(ang) * 3.1);
    const mid = start.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 1.4, 0));
    return new THREE.QuadraticBezierCurve3(start, mid, new THREE.Vector3(0, 0.05, 0));
  }, [ang]);
  const pts = useMemo(() => curve.getPoints(48), [curve]);
  const g = useRef<THREE.Group>(null);
  const tan = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (!g.current) return;
    const p = Math.min(0.96, progressOf(a, serverNow()).p);
    g.current.position.copy(curve.getPoint(p));
    curve.getTangent(p, tan);
    g.current.rotation.y = Math.atan2(-tan.z, tan.x);
  });
  const color = SERVICES[a.kind].color;
  return (
    <group>
      <Line points={pts} color={color} lineWidth={2.5} dashed dashSize={0.12} gapSize={0.08} transparent opacity={0.85} />
      <mesh position={pts[0]}><cylinderGeometry args={[0.16, 0.16, 0.05, 24]} /><meshStandardMaterial color={color} /></mesh>
      <group ref={g} scale={2.2}><VehicleBody color={color} kind={a.kind} /></group>
    </group>
  );
}

function Spin({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_s, dt) => { if (g.current) g.current.rotation.y += dt * 0.12; });
  return <group ref={g}>{children}</group>;
}

export function DispatchScene({ assignments }: { assignments: Assignment[] }) {
  return (
    <div className="relative h-[220px] w-full" aria-hidden="true">
      <Canvas dpr={[1, 1.5]} camera={{ fov: 40, position: [0, 4.2, 6.2] }} gl={{ alpha: true, antialias: true }} onCreated={({ camera }) => camera.lookAt(0, 0.3, 0)}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 6, 4]} intensity={1.6} />
        <Spin>
          <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[3.6, 64]} /><meshBasicMaterial color="#5B9BEA" transparent opacity={0.07} /></mesh>
          <PulseRing color="#5B9BEA" radius={0.9} speed={1.4} />
          <mesh position={[0, 0.35, 0]}><sphereGeometry args={[0.22, 32, 16]} /><meshStandardMaterial color="#2A56C6" emissive="#2A56C6" emissiveIntensity={0.6} /></mesh>
          <mesh position={[0, 0.12, 0]} rotation-x={Math.PI}><coneGeometry args={[0.15, 0.3, 24]} /><meshStandardMaterial color="#2A56C6" /></mesh>
          {assignments.map((a, i) => <Responder key={a.unitId} a={a} i={i} n={assignments.length} />)}
        </Spin>
      </Canvas>
    </div>
  );
}
