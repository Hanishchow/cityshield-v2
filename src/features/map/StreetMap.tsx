/**
 * Real street map — ported from the updated prototype's map engine:
 * Leaflet + OpenStreetMap tiles + OSRM road routing. No API key needed.
 *
 * Responders still follow the shared clock (shared/progress.ts), but on this
 * map they move along the REAL road geometry between their dispatch point and
 * the destination. If the public OSRM router is unreachable, the route falls
 * back to the schematic road path converted to real coordinates.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Assignment } from '@shared/contract.ts';
import { SERVICES } from '@shared/catalog.ts';
import type { SPoint } from '@shared/city.ts';
import { toLatLng } from '@shared/geo.ts';
import { progressOf } from '@shared/progress.ts';
import { serverNow } from '@/lib/api/connection.ts';
import { useLocateMe } from '@/lib/useLocateMe.ts';
import { ICONS } from '@/components/icons.tsx';
import { renderToStaticMarkup } from 'react-dom/server';
import { cn } from '@/lib/utils.ts';
import './street-map.css';

type LL = [number, number];
export interface RoadRoute { pts: LL[]; cum: number[]; L: number; approx: boolean }

/* ---------- geometry (from the prototype) ---------- */
export function hav(a: LL, b: LL) {
  const R = 6371000, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
export function brg(a: LL, b: LL) {
  const r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
  const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
export const compass = (b: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(b / 45) % 8];
function mkRoute(pts: LL[], approx: boolean): RoadRoute {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i]));
  return { pts, cum, L: cum[cum.length - 1] || 1, approx };
}
function atDist(r: RoadRoute, d: number): { ll: LL; i: number } {
  const c = r.cum, p = r.pts;
  if (d <= 0) return { ll: p[0], i: 0 };
  if (d >= r.L) return { ll: p[p.length - 1], i: p.length - 1 };
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
  const u = (d - c[lo]) / (c[hi] - c[lo] || 1);
  return { ll: [p[lo][0] + (p[hi][0] - p[lo][0]) * u, p[lo][1] + (p[hi][1] - p[lo][1]) * u], i: lo };
}

/* ---------- OSRM road routing, cached per endpoint pair ---------- */
const RCACHE = new Map<string, Promise<RoadRoute>>();
export function roadRoute(a: LL, b: LL, fallback: LL[]): Promise<RoadRoute> {
  const k = `${a[0].toFixed(5)},${a[1].toFixed(5)};${b[0].toFixed(5)},${b[1].toFixed(5)}`;
  let p = RCACHE.get(k);
  if (!p) {
    const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
    p = fetch(url, { signal: AbortSignal.timeout(9000) })
      .then((r) => r.json())
      .then((j: { code?: string; routes?: { geometry: { coordinates: [number, number][] } }[] }) => {
        if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error('no route');
        return mkRoute(j.routes[0].geometry.coordinates.map((c) => [c[1], c[0]] as LL), false);
      })
      .catch(() => { RCACHE.delete(k); return mkRoute(fallback, true); });
    RCACHE.set(k, p);
  }
  return p;
}
const sToLL = (p: SPoint): LL => { const l = toLatLng(p); return [l.lat, l.lng]; };

/* ---------- markers ---------- */
const svg = (name: string, size = 18) => { const C = ICONS[name] ?? ICONS.info; return renderToStaticMarkup(<C width={size} height={size} strokeWidth={2.2} />); };
const divIcon = (html: string, w: number, h: number, ax: number, ay: number) => L.divIcon({ className: 'lm-ic', html, iconSize: [w, h], iconAnchor: [ax, ay] });
const ORIGIN_ICON: Record<string, string> = { hospital: 'hospital', ambulance_base: 'hospital', police_station: 'police', fire_station: 'fire', ward_depot: 'bin', roads_depot: 'building' };
const VEH_ICON: Record<string, string> = { ambulance: 'ambulance', police: 'car', fire: 'truck', civic: 'truck', crew: 'truck' };

export function statusOf(a: Assignment | null, now: number): { txt: string; tone: 'idle' | 'go' | 'ok' } {
  if (!a) return { txt: 'STANDBY', tone: 'idle' };
  const done = progressOf(a, now).done;
  const name = { ambulance: 'AMBULANCE', police: 'POLICE', fire: 'FIRE TRUCK', civic: 'VAN', crew: 'CREW' }[a.kind];
  if (done) return { txt: a.kind === 'civic' ? 'ARRIVED AT YOUR AREA' : a.kind === 'crew' ? 'CREW ON SITE' : `${name} ARRIVED`, tone: 'ok' };
  return { txt: `${name} EN ROUTE`, tone: 'go' };
}

export interface StreetMapProps {
  assignments: Assignment[];
  /** where help is going (schematic point, converted to lat/lng) */
  dest?: SPoint;
  issue?: { pt: SPoint; state: 'open' | 'resolved' } | null;
  hospital?: { lat: number; lng: number; name: string } | null;
  locationLabel?: string;
  className?: string;
  aria?: string;
  /** rendered instead if Leaflet cannot start */
  fallback?: ReactNode;
}

export function StreetMap({ assignments, dest, issue, hospital, locationLabel, className, aria, fallback = null }: StreetMapProps) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const touched = useRef(false);
  const [routes, setRoutes] = useState<Record<string, RoadRoute>>({});
  const [hospRoute, setHospRoute] = useState<RoadRoute | null>(null);
  const [status, setStatus] = useState(() => statusOf(assignments[0] ?? null, serverNow()));
  const [failed, setFailed] = useState(false);
  const { locate, busy: locating } = useLocateMe();

  const destLL: LL = issue ? sToLL(issue.pt) : sToLL(dest ?? [650, 350]);
  const key = assignments.map((a) => `${a.unitId}:${a.dispatchedAt}`).join('|');

  /* create the map once */
  useEffect(() => {
    if (!box.current) return;
    try {
      const map = L.map(box.current, { zoomControl: false, zoomSnap: 0.5, attributionControl: true });
      map.setView(destLL, 15);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · routes OSRM',
      }).addTo(map);
      map.on('dragstart zoomstart', () => { touched.current = true; });
      mapRef.current = map;
      layer.current = L.layerGroup().addTo(map);
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(box.current);
      return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
    } catch { setFailed(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* fetch real road routes for every responder (and ambulance → hospital) */
  useEffect(() => {
    let live = true;
    for (const a of assignments) {
      const from = sToLL(a.route[0]), to = sToLL(a.route[a.route.length - 1]);
      void roadRoute(from, to, a.route.map(sToLL)).then((r) => { if (live) setRoutes((m) => ({ ...m, [a.unitId]: r })); });
    }
    const amb = assignments.find((a) => a.kind === 'ambulance');
    if (amb && hospital) {
      const from = sToLL(amb.route[amb.route.length - 1]), to: LL = [hospital.lat, hospital.lng];
      void roadRoute(from, to, [from, [from[0], to[1]], to]).then((r) => { if (live) setHospRoute(r); });
    } else setHospRoute(null);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hospital?.lat, hospital?.lng]);

  /* draw static layers + animate vehicles */
  useEffect(() => {
    const map = mapRef.current, g = layer.current;
    if (!map || !g) return;
    g.clearLayers();
    const me = L.marker(destLL, { icon: divIcon('<div class="lm-me"><i></i><b></b></div>', 20, 20, 10, 10), zIndexOffset: 300, keyboard: false }).addTo(g);
    if (!issue) me.bindTooltip(locationLabel ?? 'You are here', { permanent: true, direction: 'bottom', offset: [0, 10], className: 'lm-tip' });
    if (issue) {
      const c = issue.state === 'resolved' ? '#0E8A4F' : '#D97706';
      L.marker(destLL, { icon: divIcon(`<div class="lm-pin" style="--c:${c}"><span>${svg(issue.state === 'resolved' ? 'check' : 'alert', 16)}</span></div>`, 34, 34, 17, 41), zIndexOffset: 250 })
        .addTo(g).bindTooltip('Complaint location', { permanent: true, direction: 'top', offset: [0, -42], className: 'lm-tip' });
    }
    if (hospital) {
      L.marker([hospital.lat, hospital.lng], { icon: divIcon(`<div class="lm-node" style="--c:#2A56C6">${svg('hospital')}</div>`, 34, 34, 17, 17), zIndexOffset: 200 })
        .addTo(g).bindTooltip(hospital.name, { permanent: true, direction: 'top', offset: [0, -17], className: 'lm-tip' });
      if (hospRoute) {
        L.polyline(hospRoute.pts, { color: '#fff', weight: 9, opacity: 0.6, interactive: false }).addTo(g);
        L.polyline(hospRoute.pts, { color: '#2A56C6', weight: 5, opacity: 0.85, dashArray: '1 12', lineCap: 'round', interactive: false }).addTo(g);
      }
    }
    type Live = { a: Assignment; r: RoadRoute; veh: L.Marker; tr: L.Polyline; arr: HTMLElement | null };
    const lives: Live[] = [];
    const bounds = L.latLngBounds([destLL]);
    for (const a of assignments) {
      const r = routes[a.unitId]; if (!r) continue;
      const col = SERVICES[a.kind].color;
      L.polyline(r.pts, { color: '#fff', weight: 10, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
      L.polyline(r.pts, { color: col, weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
      const tr = L.polyline([], { color: '#8C99B0', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
      L.marker(r.pts[0], { icon: divIcon(`<div class="lm-node" style="--c:${col}">${svg(ORIGIN_ICON[a.originKind] ?? 'building')}</div>`, 34, 34, 17, 17), zIndexOffset: 200 })
        .addTo(g).bindTooltip(a.originName, { permanent: true, direction: 'top', offset: [0, -17], className: 'lm-tip' });
      const veh = L.marker(r.pts[0], { icon: divIcon(`<div class="lm-veh" style="--c:${col}"><div class="arr"></div><div class="bd">${svg(VEH_ICON[a.kind], 20)}</div></div>`, 42, 42, 21, 21), zIndexOffset: 1000, keyboard: false }).addTo(g);
      veh.bindTooltip(a.callSign, { permanent: true, direction: 'bottom', offset: [0, 22], className: 'lm-tip' });
      lives.push({ a, r, veh, tr, arr: null });
      r.pts.forEach((p) => bounds.extend(p));
    }
    if (hospRoute) hospRoute.pts.forEach((p) => bounds.extend(p));
    if (!touched.current && lives.length) map.fitBounds(bounds, { paddingTopLeft: [36, 80], paddingBottomRight: [36, 48], maxZoom: 17, animate: false });
    else if (!touched.current) map.setView(destLL, 15, { animate: false });

    let raf = 0, lastTrail = 0, lastStatus = '';
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const t = serverNow();
      for (const v of lives) {
        const pr = progressOf(v.a, t), d = pr.p * v.r.L, at = atDist(v.r, d);
        v.veh.setLatLng(at.ll);
        const b = d + 30 <= v.r.L ? brg(at.ll, atDist(v.r, d + 30).ll) : brg(atDist(v.r, Math.max(0, d - 30)).ll, at.ll);
        v.arr ??= v.veh.getElement()?.querySelector('.arr') as HTMLElement | null;
        if (v.arr) { v.arr.style.transform = `rotate(${b.toFixed(0)}deg)`; v.arr.style.opacity = pr.done ? '0' : '1'; }
        if (now - lastTrail > 150) v.tr.setLatLngs(v.r.pts.slice(0, at.i + 1).concat([at.ll]));
      }
      if (now - lastTrail > 150) {
        lastTrail = now;
        const s = statusOf(assignments[0] ?? null, t);
        if (s.txt !== lastStatus) { lastStatus = s.txt; setStatus(s); }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, hospRoute, key, destLL[0], destLL[1], issue?.state, hospital?.name, locationLabel]);

  const approx = assignments.some((a) => routes[a.unitId]?.approx);
  const fit = () => {
    const map = mapRef.current; if (!map) return;
    touched.current = false;
    const b = L.latLngBounds([destLL]);
    Object.values(routes).forEach((r) => r.pts.forEach((p) => b.extend(p)));
    hospRoute?.pts.forEach((p) => b.extend(p));
    map.fitBounds(b, { paddingTopLeft: [36, 80], paddingBottomRight: [36, 48], maxZoom: 17 });
  };
  const Fit = ICONS.grid, Locate = ICONS.locate;
  const pill = status;
  if (failed) return <>{fallback}</>;
  return (
    <div className={cn('lmap relative overflow-hidden', className)} role="region" aria-label={aria ?? 'Live street map'}>
      <div ref={box} className="lm-canvas" />
      <span className="lm-stx lm-pill" data-tone={pill.tone}><i /><b>{pill.txt}</b></span>
      <div className="lm-ctl">
        <button onClick={fit} aria-label="Fit route on screen" title="Fit route"><Fit className="size-4" /></button>
        <button onClick={() => { touched.current = false; void locate(); }} disabled={locating} aria-label="Use my current location" title={locating ? 'Locating…' : 'Use my location'}>
          <Locate className={cn('size-4', locating && 'animate-spin')} />
        </button>
      </div>
      <span className="lm-sim">{approx ? 'Approximate route · ' : ''}Vehicle movement simulated</span>
    </div>
  );
}
