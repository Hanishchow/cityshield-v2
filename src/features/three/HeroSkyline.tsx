/**
 * Home hero: a low-poly Bengaluru skyline at the current time of day — a
 * Vidhana Soudha-style dome flanked by towers, lit windows and stars after
 * dusk — with soft pointer parallax and the 3D City Shield emblem floating
 * above it. Rendering pauses when the hero scrolls out of view.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { rng } from '@shared/city.ts';
import { Emblem } from './Emblem3D.tsx';
import { useInView } from '@/lib/useInView.ts';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
export function dayPart(h = new Date().getHours()): DayPart {
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 20 ? 'evening' : 'night';
}
const SKY: Record<DayPart, { top: string; horizon: string; sun: string; sunI: number; amb: number; windows: number; stars: boolean; sunPos: [number, number, number] }> = {
  morning: { top: '#0B1A44', horizon: '#E9A981', sun: '#FFD7A8', sunI: 1.5, amb: 0.65, windows: 0.15, stars: false, sunPos: [-6, 3, 4] },
  afternoon: { top: '#0C1E52', horizon: '#6FA3E6', sun: '#FFFFFF', sunI: 1.9, amb: 0.8, windows: 0.05, stars: false, sunPos: [2, 8, 5] },
  evening: { top: '#0A1538', horizon: '#C9714E', sun: '#FFB27A', sunI: 1.1, amb: 0.5, windows: 0.75, stars: true, sunPos: [6, 2, 3] },
  night: { top: '#050B1E', horizon: '#1B2F66', sun: '#8FA8FF', sunI: 0.45, amb: 0.35, windows: 1, stars: true, sunPos: [3, 6, 4] },
};

function SkyDome({ top, horizon }: { top: string; horizon: string }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(horizon, top, pow(h,0.55)),1.0); }',
  }), [top, horizon]);
  return <mesh material={mat}><sphereGeometry args={[60, 32, 16]} /></mesh>;
}

/** Vidhana Soudha-inspired legislature: plinth, colonnade, drum, dome and finial. */
function Legislature({ windows }: { windows: number }) {
  const stone = '#E9E1D2', shade = '#CFC6B5';
  const cols = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < 12; i++) { o.position.set(-1.1 + i * 0.2, 0.62, 0.62); o.updateMatrix(); cols.current?.setMatrixAt(i, o.matrix); }
    if (cols.current) cols.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={[-0.6, 0, -0.4]}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow><boxGeometry args={[4.2, 0.3, 1.5]} /><meshStandardMaterial color={shade} /></mesh>
      <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[3.8, 0.85, 1.15]} /><meshStandardMaterial color={stone} roughness={0.8} /></mesh>
      <instancedMesh ref={cols} args={[undefined, undefined, 12]} castShadow><cylinderGeometry args={[0.045, 0.05, 0.62, 10]} /><meshStandardMaterial color="#F6F1E7" /></instancedMesh>
      <mesh position={[0, 1.08, 0.62]}><boxGeometry args={[2.6, 0.14, 0.2]} /><meshStandardMaterial color={stone} /></mesh>
      <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[1.5, 0.5, 0.9]} /><meshStandardMaterial color={stone} /></mesh>
      <mesh position={[0, 1.78, 0]} castShadow><cylinderGeometry args={[0.42, 0.46, 0.4, 24]} /><meshStandardMaterial color={stone} /></mesh>
      <mesh position={[0, 1.98, 0]} castShadow><sphereGeometry args={[0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#F3ECDD" roughness={0.6} /></mesh>
      <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.02, 0.05, 0.18, 8]} /><meshStandardMaterial color="#C9A64B" metalness={0.8} roughness={0.3} /></mesh>
      {[-1.65, 1.65].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.5, 0.3, 0.5]} /><meshStandardMaterial color={stone} /></mesh>
          <mesh position={[0, 1.4, 0]}><sphereGeometry args={[0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#F3ECDD" /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.72, 0.58]}><planeGeometry args={[3.4, 0.5]} /><meshBasicMaterial color="#FFD48A" transparent opacity={windows * 0.35} toneMapped={false} /></mesh>
    </group>
  );
}

function Towers({ windows }: { windows: number }) {
  const n = 46;
  const body = useRef<THREE.InstancedMesh>(null), lit = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const r = rng(2026), out: { x: number; z: number; w: number; d: number; h: number }[] = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, x = side * (2.0 + r() * 6.5), z = -1.2 - r() * 4.5;
      out.push({ x, z, w: 0.35 + r() * 0.6, d: 0.35 + r() * 0.6, h: 0.6 + r() * (Math.abs(x) > 4 ? 2.2 : 3.6) + (r() > 0.9 ? 1.6 : 0) });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color();
    data.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z); o.scale.set(b.w, b.h, b.d); o.updateMatrix();
      body.current?.setMatrixAt(i, o.matrix);
      body.current?.setColorAt(i, c.setHSL(0.62, 0.32, 0.18 + (b.z + 6) * 0.035));
      o.position.set(b.x, b.h * 0.55, b.z + b.d / 2 + 0.003); o.scale.set(b.w * 0.8, b.h * 0.8, 1); o.updateMatrix();
      lit.current?.setMatrixAt(i, o.matrix);
    });
    if (body.current) { body.current.instanceMatrix.needsUpdate = true; if (body.current.instanceColor) body.current.instanceColor.needsUpdate = true; }
    if (lit.current) lit.current.instanceMatrix.needsUpdate = true;
  }, [data]);
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, n]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial roughness={0.7} metalness={0.15} /></instancedMesh>
      <instancedMesh ref={lit} args={[undefined, undefined, n]}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={windowTexture()} transparent opacity={windows} toneMapped={false} depthWrite={false} /></instancedMesh>
    </group>
  );
}
let _win: THREE.Texture | null = null;
function windowTexture() {
  if (_win) return _win;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const x = c.getContext('2d')!, r = rng(5);
  for (let yy = 4; yy < 124; yy += 10) for (let xx = 4; xx < 60; xx += 9) if (r() > 0.42) { x.fillStyle = `rgba(255,${200 + Math.floor(r() * 40)},${120 + Math.floor(r() * 60)},${0.55 + r() * 0.45})`; x.fillRect(xx, yy, 5, 6); }
  _win = new THREE.CanvasTexture(c);
  return _win;
}

function Parallax() {
  useFrame(({ camera, pointer }, dt) => {
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (2.1 + pointer.y * 0.25 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(0, 1.4, -1);
  });
  return null;
}

export default function HeroSkyline({ part = dayPart(), emblem = true, compact = false }: { part?: DayPart; emblem?: boolean; compact?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const s = SKY[part];
  return (
    <div ref={ref} className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} frameloop={inView ? 'always' : 'never'} shadows camera={{ fov: compact ? 50 : 42, position: [0, 2.1, 7.4] }} gl={{ antialias: true, stencil: true, alpha: false }}>
        <SkyDome top={s.top} horizon={s.horizon} />
        {s.stars && <Stars radius={40} depth={10} count={900} factor={2.4} saturation={0} fade speed={0.4} />}
        <hemisphereLight args={[s.horizon, '#0B1533', s.amb]} />
        <directionalLight position={s.sunPos} intensity={s.sunI} color={s.sun} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[3.2, 3.4, 2]} intensity={6} distance={6} color="#6FA8FF" />
        <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[60, 30]} /><meshStandardMaterial color="#0A1433" roughness={1} /></mesh>
        <Legislature windows={s.windows} />
        <Towers windows={s.windows} />
        {/* Local studio lighting for the emblem's metal and enamel — no HDR download. */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2.2} position={[0, 4, 4]} scale={[8, 2, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[-5, 1, 3]} scale={[3, 6, 1]} color="#9CC6F7" />
          <Lightformer intensity={0.8} position={[5, -1, 2]} scale={[3, 4, 1]} color={s.horizon} />
        </Environment>
        {emblem && <group position={compact ? [1.15, 3.35, 1.6] : [3.25, 2.55, 0.8]}><Emblem scale={compact ? 0.0105 : 0.016} /></group>}
        <fog attach="fog" args={[s.top, 9, 22]} />
        <Parallax />
      </Canvas>
    </div>
  );
}
