/**
 * The schematic city.
 *
 * Ported from prototype/src/map.js. One grid feeds three consumers that must
 * agree with each other: the 2D SVG map, the 3D city and the server's route
 * generator. Coordinates are "schematic units"; shared/geo.ts converts them to
 * real latitude/longitude (≈3 m per unit, anchored on Koramangala 5th Block).
 */

export type SPoint = [number, number];

export const MX = [-290, -160, -10, 120, 250, 380, 520, 650, 780, 900, 1030, 1160, 1300];
export const MY = [-210, -120, 0, 90, 180, 270, 350, 450, 540, 630, 720, 810, 900];
export const ART_X = [-160, 520, 1160];
export const ART_Y = [180, 720];
export const SEC_X = [250, 780, -10];
export const SEC_Y = [350, 540, -120];
/** Road widths in units for arterial / secondary / minor roads. */
export const RW = { a: 10, s: 7, m: 4.5 } as const;
export const PARKS: [number, number, number, number][] = [
  [380, 270, 520, 350], [-10, 450, 120, 540], [250, 540, 380, 630],
  [780, 90, 900, 180], [1160, 810, 1300, 900], [-290, -120, -160, 0],
];
export const LAKE = { cx: 1035, cy: 447, rx: 118, ry: 80 };
export const CITY_BOUNDS = { x0: MX[0], y0: MY[0], x1: MX[MX.length - 1], y1: MY[MY.length - 1] };

export interface MapLabel { t: string; x: number; y: number; water?: boolean; road?: 0 | 1 }
export const MLABELS: MapLabel[] = [
  { t: 'KORAMANGALA', x: 715, y: 405 }, { t: 'EJIPURA', x: 715, y: 135 }, { t: 'ADUGODI', x: 185, y: 135 },
  { t: 'JAKKASANDRA', x: 840, y: 495 }, { t: 'HSR LAYOUT', x: 965, y: 675 }, { t: 'MADIWALA', x: 185, y: 765 },
  { t: 'Agara Lake', x: 1035, y: 452, water: true },
  { t: '80 Feet Rd', x: 520, y: 610, road: 1 }, { t: 'Inner Ring Rd', x: 1160, y: 420, road: 1 }, { t: 'Sarjapur Rd', x: 1095, y: 540, road: 0 },
];

/** "You are here": Koramangala 5th Block. */
export const USER_PT: SPoint = [650, 350];
/** Default complaint location used by the seeded pothole. */
export const ISSUE_PT: SPoint = [520, 300];

export type RoadClass = 'a' | 's' | 'm';
export function roadClass(v: number, axis: 'x' | 'y'): RoadClass {
  const A = axis === 'x' ? ART_X : ART_Y;
  const B = axis === 'x' ? SEC_X : SEC_Y;
  return A.includes(v) ? 'a' : B.includes(v) ? 's' : 'm';
}

/* ---------- seeded random + shapes ---------- */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let q = s;
    q = Math.imul(q ^ (q >>> 15), q | 1);
    q ^= q + Math.imul(q ^ (q >>> 7), q | 61);
    return ((q ^ (q >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (n: number) => Math.round(n * 10) / 10;

/** Smooth closed blob through jittered ellipse points (Catmull-Rom → cubic Bézier), as an SVG path. */
export function blobPath(cx: number, cy: number, rx: number, ry: number, n: number, jit: number, seed: number): string {
  const P = jitterRing(cx, cy, rx, ry, n, jit, seed);
  let d = 'M' + f1(P[0][0]) + ' ' + f1(P[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += 'C' + f1(c1[0]) + ' ' + f1(c1[1]) + ' ' + f1(c2[0]) + ' ' + f1(c2[1]) + ' ' + f1(p2[0]) + ' ' + f1(p2[1]);
  }
  return d + 'Z';
}
function jitterRing(cx: number, cy: number, rx: number, ry: number, n: number, jit: number, seed: number): SPoint[] {
  const r = rng(seed);
  const P: SPoint[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, j = 1 + (r() * 2 - 1) * jit;
    P.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
  }
  return P;
}
/** Densely sampled outline of the same blob, for 3D shapes. */
export function blobPoints(cx: number, cy: number, rx: number, ry: number, n: number, jit: number, seed: number, samples = 6): SPoint[] {
  const P = jitterRing(cx, cy, rx, ry, n, jit, seed);
  const out: SPoint[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}
export const LAKE_PATH = blobPath(LAKE.cx, LAKE.cy, LAKE.rx, LAKE.ry, 9, 0.1, 21);
export const LAKE_OUTLINE = blobPoints(LAKE.cx, LAKE.cy, LAKE.rx, LAKE.ry, 9, 0.1, 21);

/* ---------- city blocks (shared by 2D and 3D) ---------- */
export interface Rect { x: number; y: number; w: number; h: number; seed: number }
export interface Tree { x: number; y: number; r: number }
const isPark = (x0: number, y0: number) => PARKS.some((p) => p[0] === x0 && p[1] === y0);

/**
 * Splits every grid cell into building blocks. `k` is units-per-pixel for the
 * 2D map (gaps and road widths scale with zoom); the 3D city passes k=1.
 */
export function cityBlocks(k: number, view?: { x: number; y: number; w: number; h: number }) {
  const blocks: Rect[] = [], parks: Rect[] = [], trees: Tree[] = [];
  const gap = 2.2 * k;
  for (let i = 0; i < MX.length - 1; i++) {
    const xa = MX[i], xb = MX[i + 1];
    if (view && (xb < view.x - 20 || xa > view.x + view.w + 20)) continue;
    for (let j = 0; j < MY.length - 1; j++) {
      const ya = MY[j], yb = MY[j + 1];
      if (view && (yb < view.y - 20 || ya > view.y + view.h + 20)) continue;
      const L = xa + (RW[roadClass(xa, 'x')] / 2) * k + gap, R = xb - (RW[roadClass(xb, 'x')] / 2) * k - gap;
      const T = ya + (RW[roadClass(ya, 'y')] / 2) * k + gap, B = yb - (RW[roadClass(yb, 'y')] / 2) * k - gap;
      if (R - L < 4 || B - T < 4) continue;
      if (isPark(xa, ya)) {
        parks.push({ x: L, y: T, w: R - L, h: B - T, seed: i * 131 + j * 17 + 5 });
        const r = rng(i * 131 + j * 17 + 5);
        for (let q = 0; q < 7; q++) {
          trees.push({ x: L + 10 * k + r() * (R - L - 20 * k), y: T + 10 * k + r() * (B - T - 20 * k), r: (4 + r() * 4) * k });
        }
        continue;
      }
      const seed = i * 977 + j * 131 + 3, r = rng(seed), q = r();
      const W = R - L, H = B - T, ag = 2.6 * k;
      const push = (x: number, y: number, w: number, h: number, n: number) => { if (w >= 2 && h >= 2) blocks.push({ x, y, w, h, seed: seed * 7 + n }); };
      if (q < 0.38) push(L, T, W, H, 0);
      else if (q < 0.78) {
        if (W >= H) { const c = L + W * (0.35 + r() * 0.3); push(L, T, c - L - ag / 2, H, 1); push(c + ag / 2, T, R - c - ag / 2, H, 2); }
        else { const c = T + H * (0.35 + r() * 0.3); push(L, T, W, c - T - ag / 2, 1); push(L, c + ag / 2, W, B - c - ag / 2, 2); }
      } else {
        const cx = L + W * (0.4 + r() * 0.2), cy = T + H * (0.4 + r() * 0.2);
        push(L, T, cx - L - ag / 2, cy - T - ag / 2, 1); push(cx + ag / 2, T, R - cx - ag / 2, cy - T - ag / 2, 2);
        push(L, cy + ag / 2, cx - L - ag / 2, B - cy - ag / 2, 3); push(cx + ag / 2, cy + ag / 2, R - cx - ag / 2, B - cy - ag / 2, 4);
      }
    }
  }
  return { blocks, parks, trees };
}

/** Road centre-lines grouped by class, as segments [x0,y0,x1,y1]. */
export function roadSegments(): Record<RoadClass, [number, number, number, number][]> {
  const out: Record<RoadClass, [number, number, number, number][]> = { a: [], s: [], m: [] };
  const X0 = MX[0] - 110, X1 = MX[MX.length - 1] + 100, Y0 = MY[0] - 90, Y1 = MY[MY.length - 1] + 100;
  MX.forEach((x) => out[roadClass(x, 'x')].push([x, Y0, x, Y1]));
  MY.forEach((y) => out[roadClass(y, 'y')].push([X0, y, X1, y]));
  return out;
}

/* ---------- polylines ---------- */
export interface PolyInfo { pts: SPoint[]; cum: number[]; L: number }
export function polyInfo(pts: SPoint[]): PolyInfo {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export function pointAt(pi: PolyInfo, d: number): SPoint {
  const c = pi.cum, P = pi.pts;
  if (d <= 0) return [P[0][0], P[0][1]];
  if (d >= pi.L) return [P[P.length - 1][0], P[P.length - 1][1]];
  for (let i = 1; i < c.length; i++) {
    if (d <= c[i]) {
      const u = (d - c[i - 1]) / (c[i] - c[i - 1] || 1);
      return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u];
    }
  }
  return [P[P.length - 1][0], P[P.length - 1][1]];
}
/** Heading in radians at distance d along the polyline (0 = +x). */
export function headingAt(pi: PolyInfo, d: number): number {
  const c = pi.cum, P = pi.pts;
  for (let i = 1; i < c.length; i++) if (d <= c[i] || i === c.length - 1) return Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
  return 0;
}

const nearest = (arr: number[], v: number) => arr.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) ? x : b), arr[0]);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A plausible road route between two schematic points: snap both ends onto the
 * grid, then run along roads with at most three legs, preferring an arterial
 * for the middle leg the way a driver would.
 */
export function gridRoute(from: SPoint, to: SPoint): SPoint[] {
  const fx = clamp(from[0], CITY_BOUNDS.x0, CITY_BOUNDS.x1), fy = clamp(from[1], CITY_BOUNDS.y0, CITY_BOUNDS.y1);
  const sx = nearest(MX, fx), sy = nearest(MY, fy);
  const tx = nearest(MX, to[0]), ty = nearest(MY, to[1]);
  const lo = Math.min(sy, ty), hi = Math.max(sy, ty);
  const between = MY.filter((y) => y >= lo && y <= hi);
  const mid = between.find((y) => roadClass(y, 'y') === 'a') ?? between.find((y) => roadClass(y, 'y') === 's') ?? sy;
  const pts: SPoint[] = [[fx, fy], [sx, sy], [sx, mid], [tx, mid], [tx, ty], [to[0], to[1]]];
  const out: SPoint[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 0.5 && Math.abs(last[1] - p[1]) < 0.5) continue;
    out.push(p);
  }
  /* drop collinear middle points */
  return out.filter((p, i) => {
    if (i === 0 || i === out.length - 1) return true;
    const a = out[i - 1], b = out[i + 1];
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
  });
}
