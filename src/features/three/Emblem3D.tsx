/**
 * The City Shield logo as a 3D object: an extruded enamel shield with a
 * polished silver rim, sky-blue ribbon channels (stencil-masked to the shield
 * face, like the engraved logo) and the four-point star with a glint.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mask, Sparkles, useMask } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { SHIELD_PATH, STAR_PATH } from '@/components/brand/Logo.tsx';

const S_RIBBON = 'M86 36C66 30 40 34 40 50C40 66 80 62 80 80C80 97 58 102 38 96';
const SWOOSH = 'M33 112C56 98 80 76 95 36';
const CX = 60, CY = 66;

function parse(d: string) {
  return new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths[0];
}
/* Centre on the shield. SVG is y-down: the group below mirrors y with a negative
   scale, which three.js handles (it flips the front face for mirrored objects),
   unlike mirroring the geometry itself, which would leave every face inside-out. */
function centred(geo: THREE.BufferGeometry) {
  geo.translate(-CX, -CY, 0);
  return geo;
}
function strokeGeo(d: string, width: number) {
  const sub = parse(d).subPaths[0];
  const style = SVGLoader.getStrokeStyle(width, '#fff', 'round', 'round');
  const g = SVGLoader.pointsToStroke(sub.getPoints(96), style);
  return g ? centred(g) : new THREE.BufferGeometry();
}

export function Emblem({ spin = true, scale = 0.018 }: { spin?: boolean; scale?: number }) {
  const g = useRef<THREE.Group>(null), glint = useRef<THREE.Mesh>(null);
  const shield = useMemo(() => SVGLoader.createShapes(parse(SHIELD_PATH))[0], []);
  const geos = useMemo(() => {
    const enamel = centred(new THREE.ExtrudeGeometry(shield, { depth: 7, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 4, curveSegments: 32 }));
    /* silver rim = shield outline minus a slightly smaller shield */
    const pts = shield.getPoints(96);
    const rimShape = new THREE.Shape(pts.map((p) => new THREE.Vector2((p.x - CX) * 1.06 + CX, (p.y - CY) * 1.05 + CY)));
    rimShape.holes.push(new THREE.Path(pts.map((p) => new THREE.Vector2((p.x - CX) * 0.97 + CX, (p.y - CY) * 0.97 + CY)).reverse()));
    const rim = centred(new THREE.ExtrudeGeometry(rimShape, { depth: 9, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.8, bevelSegments: 3, curveSegments: 32 }));
    const face = centred(new THREE.ShapeGeometry(shield, 48));
    const star = centred(new THREE.ExtrudeGeometry(SVGLoader.createShapes(parse(STAR_PATH))[0], { depth: 3, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.5, bevelSegments: 2 }));
    const ribbons = [SWOOSH, S_RIBBON].map((d) => ({ outer: strokeGeo(d, 19), cut1: strokeGeo(d, 14.5), mid: strokeGeo(d, 9), cut2: strokeGeo(d, 4.6) }));
    return { enamel, rim, face, star, ribbons };
  }, [shield]);
  const mask = useMask(7);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current && spin) { g.current.rotation.y = Math.sin(t * 0.5) * 0.38; g.current.position.y = Math.sin(t * 1.1) * 0.06; }
    if (glint.current) { const s = 0.6 + Math.max(0, Math.sin(t * 1.7)) * 1.1; glint.current.scale.setScalar(s); glint.current.rotation.z = t * 0.6; }
  });

  const enamelMat = <meshPhysicalMaterial color="#2A4FA8" roughness={0.3} metalness={0.15} clearcoat={1} clearcoatRoughness={0.1} envMapIntensity={1.2} />;
  const sky = <meshStandardMaterial color="#86B8F2" emissive="#4F86DA" emissiveIntensity={0.55} roughness={0.35} metalness={0.4} {...mask} />;
  const cut = <meshStandardMaterial color="#17306D" roughness={0.45} metalness={0.2} {...mask} />;

  return (
    <group ref={g} scale={[scale, -scale, scale]}>
      <mesh geometry={geos.rim} position-z={-1}><meshStandardMaterial color="#E4E8EE" metalness={1} roughness={0.2} envMapIntensity={1.4} /></mesh>
      <mesh geometry={geos.enamel}>{enamelMat}</mesh>
      <Mask id={7} geometry={geos.face} position-z={8.7} />
      {geos.ribbons.map((r, i) => (
        <group key={i} position-z={8.8}>
          <mesh geometry={r.outer} position-z={0}>{sky}</mesh>
          <mesh geometry={r.cut1} position-z={0.05}>{cut}</mesh>
          <mesh geometry={r.mid} position-z={0.1}>{sky}</mesh>
          <mesh geometry={r.cut2} position-z={0.15}>{cut}</mesh>
        </group>
      ))}
      <mesh geometry={geos.star} position-z={9}><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.6} toneMapped={false} /></mesh>
      <mesh ref={glint} position={[97 - CX, 21 - CY, 13]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} map={glintTexture()} toneMapped={false} />
      </mesh>
      <Sparkles count={14} scale={[140, 150, 40]} size={3} speed={0.35} color="#BFDBFF" opacity={0.7} />
    </group>
  );
}

let _glint: THREE.Texture | null = null;
/** Soft four-point star flare, drawn once on a canvas. */
function glintTexture() {
  if (_glint) return _glint;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(200,225,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,0.9)';
  x.beginPath(); x.moveTo(64, 0); x.lineTo(68, 60); x.lineTo(128, 64); x.lineTo(68, 68); x.lineTo(64, 128); x.lineTo(60, 68); x.lineTo(0, 64); x.lineTo(60, 60); x.closePath(); x.fill();
  _glint = new THREE.CanvasTexture(c);
  return _glint;
}
