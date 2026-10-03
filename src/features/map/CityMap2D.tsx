/**
 * 2D live map — a React port of prototype/src/map.js.
 *
 * The city (blocks, parks, roads, lake, labels) is rendered once per size and
 * memoised. Vehicles are moved every animation frame through refs, from the
 * pure progress function in shared/progress.ts, so React does not re-render
 * 60 times a second.
 */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Assignment, Unit } from '@shared/contract.ts';
import { LAKE_PATH, MLABELS, USER_PT, cityBlocks, roadSegments, RW, type SPoint } from '@shared/city.ts';
import { SERVICES } from '@shared/catalog.ts';
import { patrolOf, progressOf, routeInfo, vehicleLabel } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { ICONS } from '@/components/icons.tsx';
import { cn } from '@/lib/utils.ts';

export interface OpsBeacon { id: string; pt: SPoint; color: string; done: boolean; label?: string }
export interface MapProps {
  assignments?: Assignment[];
  dest?: SPoint | null;
  issue?: { pt: SPoint; state: 'open' | 'resolved' } | null;
  beacons?: OpsBeacon[];
  patrols?: Unit[];
  bbox?: [number, number, number, number];
  pad?: Partial<{ t: number; r: number; b: number; l: number }>;
  pill?: boolean;
  live?: boolean;
  height?: number;
  className?: string;
  aria?: string;
  children?: ReactNode;
}

const f2 = (n: number) => Math.round(n * 100) / 100;
const ORIGIN_ICON: Record<string, string> = { hospital: 'hospital', ambulance_base: 'hospital', police_station: 'police', fire_station: 'fire', ward_depot: 'bin', roads_depot: 'building' };
const VEH_ICON: Record<string, string> = { ambulance: 'ambulance', police: 'car', fire: 'truck', civic: 'truck', crew: 'truck' };

function SvgIcon({ name, size, color, sw = 2.2 }: { name: string; size: number; color: string; sw?: number }) {
  const C = ICONS[name] ?? ICONS.info;
  return <C x={-size / 2} y={-size / 2} width={size} height={size} color={color} strokeWidth={sw} aria-hidden="true" />;
}

function computeView(w: number, h: number, p: MapProps) {
  const hasPill = p.pill !== false && (p.assignments?.length ?? 0) > 0 && !p.beacons;
  let bb = p.bbox;
  if (!bb) {
    const pts: SPoint[] = [];
    for (const a of p.assignments ?? []) pts.push(...a.route);
    if (p.dest) pts.push(p.dest);
    if (p.issue) pts.push(p.issue.pt);
    if (!pts.length) { const c = p.dest ?? USER_PT; pts.push([c[0] - 160, c[1] - 120], [c[0] + 160, c[1] + 120]); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    bb = [x0 - 30, y0 - 30, x1 + 30, y1 + 30];
  }
  const pad = { t: hasPill ? 66 : 34, r: 22, b: 26, l: 22, ...(p.pad ?? {}) };
  const bw = Math.max(bb[2] - bb[0], 80), bh = Math.max(bb[3] - bb[1], 80);
  const aw = Math.max(40, w - pad.l - pad.r), ah = Math.max(40, h - pad.t - pad.b);
  const s = Math.min(aw / bw, ah / bh, 1.5);
  const k = 1 / s;
  const vb = { x: bb[0] - pad.l * k - (aw * k - bw) / 2, y: bb[1] - pad.t * k - (ah * k - bh) / 2, w: w * k, h: h * k };
  return { k, vb };
}

/* ---------- static city layer (memoised) ---------- */
const CityBase = memo(function CityBase({ k, vb, avoid }: { k: number; vb: { x: number; y: number; w: number; h: number }; avoid: SPoint[] }) {
  const { blocks, parks, trees } = useMemo(() => cityBlocks(k, vb), [k, vb]);
  const roads = useMemo(() => roadSegments(), []);
  const d = (cls: 'a' | 's' | 'm') => roads[cls].map(([x0, y0, x1, y1]) => `M${x0} ${y0}${x0 === x1 ? `V${y1}` : `H${x1}`}`).join('');
  const rx = f2(2.4 * k);
  return (
    <g>
      <rect className="m-land" x={vb.x - 5} y={vb.y - 5} width={vb.w + 10} height={vb.h + 10} />
      {parks.map((p, i) => <rect key={'p' + i} className="m-park" x={f2(p.x)} y={f2(p.y)} width={f2(p.w)} height={f2(p.h)} rx={f2(5 * k)} />)}
      {trees.map((t, i) => <circle key={'t' + i} className="m-tree" cx={f2(t.x)} cy={f2(t.y)} r={f2(t.r)} />)}
      <g className="m-blk">{blocks.map((b, i) => <rect key={i} x={f2(b.x)} y={f2(b.y)} width={f2(b.w)} height={f2(b.h)} rx={rx} />)}</g>
      <path className="m-road" strokeWidth={f2(RW.m * k)} d={d('m')} />
      <path className="m-cas" strokeWidth={f2((RW.s + 2) * k)} d={d('s')} />
      <path className="m-road" strokeWidth={f2(RW.s * k)} d={d('s')} />
      <path className="m-water" d={LAKE_PATH} />
      <path className="m-cas" strokeWidth={f2((RW.a + 2.4) * k)} d={d('a')} />
      <path className="m-road" strokeWidth={f2(RW.a * k)} d={d('a')} />
      {MLABELS.map((l) => {
        const fp = l.water ? 11 : l.road != null ? 9.5 : 10, fs = f2(fp * k);
        const tw = l.t.length * fp * (l.water || l.road != null ? 0.6 : 0.74) * k, th = fp * 1.2 * k;
        const hw = (l.road === 1 ? th : tw) / 2, hh = (l.road === 1 ? tw : th) / 2, m = 6 * k;
        if (l.x - hw < vb.x + m || l.x + hw > vb.x + vb.w - m || l.y - hh < vb.y + m || l.y + hh > vb.y + vb.h - m) return null;
        if (avoid.some((a) => l.x + hw > a[0] - 26 * k && l.x - hw < a[0] + 26 * k && l.y + hh > a[1] - 46 * k && l.y - hh < a[1] + 14 * k)) return null;
        return (
          <text key={l.t} className={cn('m-lbl', l.water && 'm-wl', l.road != null && 'm-rl')} x={l.x} y={l.y} fontSize={fs} strokeWidth={f2(3 * k)}
            textAnchor="middle" dominantBaseline="middle" transform={l.road === 1 ? `rotate(-90 ${l.x} ${l.y})` : undefined}>{l.t}</text>
        );
      })}
    </g>
  );
});

export function CityMap2D(p: MapProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setSize((s) => (Math.abs(s.w - el.clientWidth) < 2 && Math.abs(s.h - el.clientHeight) < 2 ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    let to: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => { clearTimeout(to); to = setTimeout(measure, 80); });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(to); };
  }, []);

  const assignments = p.assignments ?? [];
  const routeKey = assignments.map((a) => a.unitId + a.dispatchedAt + a.route.length).join('|');
  const view = useMemo(() => (size.w < 24 || size.h < 24 ? null : computeView(size.w, size.h, p)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.w, size.h, routeKey, p.dest?.[0], p.dest?.[1], p.issue?.pt[0], p.issue?.pt[1], p.bbox?.join(), !!p.beacons]);
  const avoid = useMemo<SPoint[]>(() => (p.issue ? [p.issue.pt] : p.beacons ? [] : [p.dest ?? USER_PT]), [p.issue, p.beacons, p.dest]);

  /* ---- per-frame vehicle animation ---- */
  const vehRefs = useRef(new Map<string, { veh: SVGGElement | null; rem: SVGPathElement | null; pill: SVGGElement | null; label: string; pw: number }>());
  const patrolRefs = useRef(new Map<string, SVGGElement | null>());
  const live = useRef({ assignments, patrols: p.patrols });
  live.current = { assignments, patrols: p.patrols };
  useEffect(() => {
    if (!view) return;
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const now = serverNow();
      const { assignments, patrols } = live.current;
      for (const a of assignments) {
        const r = vehRefs.current.get(a.unitId); if (!r?.veh) continue;
        const pr = progressOf(a, now), pi = routeInfo(a.route), dist = pr.p * pi.L;
        r.veh.setAttribute('transform', `translate(${f2(pr.pos[0])} ${f2(pr.pos[1])})`);
        r.rem?.setAttribute('stroke-dasharray', `0 ${f2(dist)} ${f2(pi.L + 1)}`);
        if (r.pill) {
          const rect = r.pill.firstElementChild as SVGRectElement, text = r.pill.lastElementChild as SVGTextElement;
          const lab = vehicleLabel(a, pr);
          if (lab !== r.label) {
            r.label = lab; text.textContent = lab;
            rect.setAttribute('fill', pr.done ? '#0E8A4F' : SERVICES[a.kind].pill);
            let tw = 0; try { tw = text.getComputedTextLength(); } catch { /* not laid out */ }
            r.pw = (tw || lab.length * 6.6 * view.k) + 22 * view.k;
            rect.setAttribute('width', String(f2(r.pw)));
          }
          const k = view.k, vb = view.vb, ph = 26 * k;
          let px = pr.pos[0] - r.pw / 2, py = pr.pos[1] - 24 * k - ph;
          if (py < vb.y + 36 * k) py = pr.pos[1] + 24 * k;
          px = Math.max(vb.x + 8 * k, Math.min(vb.x + vb.w - 8 * k - r.pw, px));
          rect.setAttribute('x', String(f2(px))); rect.setAttribute('y', String(f2(py)));
          text.setAttribute('x', String(f2(px + 11 * k))); text.setAttribute('y', String(f2(py + ph / 2)));
        }
      }
      for (const u of patrols ?? []) {
        const g = patrolRefs.current.get(u.id), st = patrolOf(u, now);
        if (g && st) g.setAttribute('transform', `translate(${f2(st.pos[0])} ${f2(st.pos[1])})`);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [view]);
  /* labels must be re-measured after a re-layout */
  useEffect(() => { vehRefs.current.forEach((r) => { r.label = ''; }); }, [view]);

  const thin = !!p.beacons;
  return (
    <div ref={box} role="img" aria-label={p.aria ?? 'Live map'} className={cn('relative overflow-hidden bg-[var(--map-land)]', p.className)} style={p.height ? { height: p.height } : undefined}>
      {view && (() => {
        const { k, vb } = view, P = (v: number) => f2(v * k);
        return (
          <svg className="absolute inset-0 block size-full" viewBox={`${f2(vb.x)} ${f2(vb.y)} ${f2(vb.w)} ${f2(vb.h)}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <filter id="cs-sh" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy={P(1.6)} stdDeviation={P(2.4)} floodColor="#0A1A3F" floodOpacity=".32" /></filter>
            </defs>
            <CityBase k={k} vb={vb} avoid={avoid} />
            {p.beacons?.map((b) => (
              <g key={b.id} transform={`translate(${b.pt[0]} ${b.pt[1]})`}>
                {!b.done && <circle className="m-pulse" r={P(12)} fill={b.color} opacity=".4" />}
                <circle r={P(8)} fill={b.done ? '#8793A8' : b.color} stroke="#fff" strokeWidth={P(2.5)} filter="url(#cs-sh)" />
              </g>
            ))}
            {assignments.map((a) => {
              const s = SERVICES[a.kind], dp = 'M' + a.route.map((q) => q[0] + ' ' + q[1]).join('L'), L = routeInfo(a.route).L;
              const o0 = a.route[0];
              return (
                <g key={'r' + a.unitId}>
                  <path d={dp} fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth={P(thin ? 6 : 9)} strokeLinejoin="round" strokeLinecap="round" />
                  <path d={dp} fill="none" stroke={s.color} strokeOpacity=".28" strokeWidth={P(thin ? 3.5 : 5)} strokeLinejoin="round" strokeLinecap="round" />
                  <path ref={(el) => { const r = vehRefs.current.get(a.unitId) ?? { veh: null, rem: null, pill: null, label: '', pw: 0 }; r.rem = el; vehRefs.current.set(a.unitId, r); }}
                    d={dp} fill="none" stroke={s.color} strokeWidth={P(thin ? 3.5 : 5)} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`0 0 ${f2(L)}`} />
                  {!thin && (
                    <g transform={`translate(${o0[0]} ${o0[1]})`}>
                      <rect x={P(-13)} y={P(-13)} width={P(26)} height={P(26)} rx={P(8)} fill="#fff" stroke={s.color} strokeWidth={P(1.5)} filter="url(#cs-sh)" />
                      <SvgIcon name={ORIGIN_ICON[a.originKind] ?? 'building'} size={P(15)} color={s.color} />
                    </g>
                  )}
                </g>
              );
            })}
            {p.issue ? (
              <g transform={`translate(${p.issue.pt[0]} ${p.issue.pt[1]})`}>
                {p.issue.state !== 'resolved' && <circle className="m-pulse" r={P(14)} fill="#DC2F35" opacity=".35" />}
                <path d={`M0 0C${P(-2)} ${P(-6)} ${P(-12)} ${P(-11)} ${P(-12)} ${P(-21)}A${P(12)} ${P(12)} 0 1 1 ${P(12)} ${P(-21)}C${P(12)} ${P(-11)} ${P(2)} ${P(-6)} 0 0Z`}
                  fill={p.issue.state === 'resolved' ? '#0E8A4F' : '#DC2F35'} stroke="#fff" strokeWidth={P(2)} filter="url(#cs-sh)" />
                <g transform={`translate(0 ${P(-21)})`}><SvgIcon name={p.issue.state === 'resolved' ? 'check' : 'alert'} size={P(13)} color="#fff" sw={2.6} /></g>
              </g>
            ) : !thin && (
              <g transform={`translate(${(p.dest ?? USER_PT)[0]} ${(p.dest ?? USER_PT)[1]})`}>
                <circle className="m-pulse" r={P(14)} fill="#2A56C6" opacity=".35" />
                <circle r={P(5)} fill="#2A56C6" stroke="#fff" strokeWidth={P(2)} />
                <path d={`M0 ${P(-6)}C${P(-2)} ${P(-11)} ${P(-12)} ${P(-16)} ${P(-12)} ${P(-26)}A${P(12)} ${P(12)} 0 1 1 ${P(12)} ${P(-26)}C${P(12)} ${P(-16)} ${P(2)} ${P(-11)} 0 ${P(-6)}Z`}
                  fill="#0F1C40" stroke="#fff" strokeWidth={P(2)} filter="url(#cs-sh)" />
                <circle cy={P(-26)} r={P(4.4)} fill="#fff" />
              </g>
            )}
            {p.patrols?.map((u) => u.patrol && (
              <g key={u.id} ref={(el) => { patrolRefs.current.set(u.id, el); }}>
                <circle r={P(12)} fill={u.patrol.color} stroke="#fff" strokeWidth={P(2.5)} filter="url(#cs-sh)" />
                <SvgIcon name={VEH_ICON[u.kind] ?? 'truck'} size={P(14)} color="#fff" sw={2} />
              </g>
            ))}
            {assignments.map((a) => {
              const s = SERVICES[a.kind], R = thin ? 12 : 17;
              const set = (patch: { veh?: SVGGElement | null; pill?: SVGGElement | null }) => {
                const r = vehRefs.current.get(a.unitId) ?? { veh: null, rem: null, pill: null, label: '', pw: 0 };
                vehRefs.current.set(a.unitId, { ...r, ...patch });
              };
              return (
                <g key={'v' + a.unitId}>
                  <g ref={(el) => set({ veh: el })} transform={`translate(${a.route[0][0]} ${a.route[0][1]})`}>
                    <circle r={P(R)} fill={s.color} stroke="#fff" strokeWidth={P(thin ? 2.5 : 3)} filter="url(#cs-sh)" />
                    <SvgIcon name={VEH_ICON[a.kind]} size={P(thin ? 14 : 19)} color="#fff" sw={2} />
                  </g>
                  {p.pill !== false && !thin && (
                    <g ref={(el) => set({ pill: el })}>
                      <rect rx={P(13)} height={P(26)} fill={s.pill} filter="url(#cs-sh)" />
                      <text fontSize={P(12)} fontWeight={700} fill="#fff" dominantBaseline="central" style={{ fontFamily: 'var(--font-sans)' }} />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        );
      })()}
      {p.live !== false && (
        <span className="absolute top-3 left-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[10.5px] font-extrabold tracking-[0.08em] text-sos shadow-soft">
          <i className="size-1.5 animate-live rounded-full bg-sos" />LIVE
        </span>
      )}
      <span className="absolute right-2.5 bottom-2.5 z-[2] rounded-md bg-surface/90 px-2 py-0.5 text-[10.5px] font-semibold text-fg-3">Simulated</span>
      {p.children}
    </div>
  );
}
