/**
 * Where is a unit right now?
 *
 * A pure function of the assignment and the clock, so the server, the 2D map
 * and the 3D map all agree without streaming 60 position updates a second.
 * The easing is the prototype's (map.js simState): a gentle start and stop.
 */
import type { Assignment, Unit } from './contract.ts';
import { headingAt, pointAt, polyInfo, type PolyInfo, type SPoint } from './city.ts';
import { unitsToKm } from './geo.ts';
import { SERVICES } from './catalog.ts';

export interface Progress {
  /** linear time fraction 0..1 */ t: number;
  /** eased distance fraction 0..1 */ p: number;
  km: number; etaMin: number; done: boolean; pos: SPoint; heading: number; arrivalAt: number;
}

const piCache = new WeakMap<SPoint[], PolyInfo>();
export function routeInfo(route: SPoint[]): PolyInfo {
  let pi = piCache.get(route);
  if (!pi) { pi = polyInfo(route); piCache.set(route, pi); }
  return pi;
}
export const ease = (t: number) => 0.3 * t + 0.7 * t * t * (3 - 2 * t);

export function progressOf(a: Assignment, now: number): Progress {
  const pi = routeInfo(a.route);
  const t = a.arrivedAt != null ? 1 : Math.max(0, Math.min(1, (now - a.dispatchedAt) / a.durationMs));
  const p = ease(t), d = p * pi.L;
  return {
    t, p, done: t >= 1,
    km: Math.max(0, Math.round(a.km * (1 - p) * 10) / 10),
    etaMin: Math.max(1, Math.ceil(a.etaMin * (1 - t))),
    pos: pointAt(pi, d), heading: headingAt(pi, d),
    arrivalAt: a.dispatchedAt + a.etaMin * 60_000,
  };
}

/** Patrol loop position for command-centre units. */
export function patrolOf(u: Unit, now: number): { pos: SPoint; heading: number } | null {
  if (!u.patrol) return null;
  const pi = routeInfo(u.patrol.route);
  const t = (now % u.patrol.periodMs) / u.patrol.periodMs;
  return { pos: pointAt(pi, t * pi.L), heading: headingAt(pi, t * pi.L) };
}

export function routeKm(route: SPoint[]): number {
  return Math.round(unitsToKm(routeInfo(route).L) * 10) / 10;
}

/** Live label for a vehicle pill ("Ambulance 1.2 km away" / "Ambulance has arrived"). */
export function vehicleLabel(a: Assignment, pr: Progress): string {
  const s = SERVICES[a.kind];
  return pr.done ? s.arrived : s.label(pr.km);
}
