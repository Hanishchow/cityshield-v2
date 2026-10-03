/**
 * Command Centre city twin: every incident as a light column coloured by type
 * (hover for details), live responder trips, patrol loops, a slow orbit until
 * the operator takes control, and bloom on the beacons.
 */
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import type { Assignment, Unit } from '@shared/contract.ts';
import { City3D, NIGHT } from './City3D.tsx';
import { Beacon, MovingVehicle, PatrolVehicle, RouteLine } from './parts.tsx';
import type { OpsBeacon } from '../map/CityMap2D.tsx';
import { useInView } from '@/lib/useInView.ts';

export default function CommandCity3D({ beacons, patrols, assignments }: { beacons: OpsBeacon[]; patrols: Unit[]; assignments: Assignment[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="absolute inset-0">
      <Canvas dpr={[1, 1.5]} frameloop={inView ? 'always' : 'never'} camera={{ fov: 40, near: 0.1, far: 120, position: [12, 11, 17] }} gl={{ antialias: true }}>
        <color attach="background" args={['#060C1F']} />
        <fog attach="fog" args={['#060C1F', 16, 38]} />
        <hemisphereLight args={['#8EA3E0', '#14224A', 1.0]} />
        <directionalLight position={[6, 12, 4]} intensity={1.0} />
        <City3D palette={NIGHT} windows heightScale={1.1} />
        {beacons.map((b) => (
          <Beacon key={b.id} pt={b.pt} color={b.color} done={b.done} hovered={hover === b.id} onHover={(on) => setHover((h) => (on ? b.id : h === b.id ? null : h))}>
            <div className="w-56 rounded-xl border border-white/10 bg-navy-900/95 px-3 py-2 text-[13px] text-white shadow-float">
              <div className="font-bold">{b.label}</div>
              <div className="mt-0.5 font-mono text-[12px] text-white/60">{b.id}</div>
            </div>
          </Beacon>
        ))}
        {assignments.map((a) => <RouteLine key={'r' + a.unitId} a={a} width={3} />)}
        {assignments.map((a) => <MovingVehicle key={'v' + a.unitId} a={a} label={false} />)}
        {patrols.map((u) => <PatrolVehicle key={u.id} u={u} />)}
        <OrbitControls makeDefault target={[5.2, 0, 3.4]} enablePan={false} enableDamping minDistance={6} maxDistance={30} maxPolarAngle={1.2}
          autoRotate={auto} autoRotateSpeed={0.35} onStart={() => setAuto(false)} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
