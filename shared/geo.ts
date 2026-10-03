/**
 * Schematic ↔ real-world coordinates.
 *
 * The database stores real latitude/longitude (PostGIS, SRID 4326). The maps
 * draw a schematic city. This is the one place that converts between them:
 * USER_PT [650,350] is Koramangala 5th Block, and one schematic unit is ~3 m
 * (calibrated so the prototype's ambulance route measures ~2.4 km).
 */
import { USER_PT, type SPoint } from './city.ts';

export const ANCHOR = { lat: 12.9352, lng: 77.6245 };
export const M_PER_UNIT = 3;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((ANCHOR.lat * Math.PI) / 180);

export interface LatLng { lat: number; lng: number }

export function toLatLng(p: SPoint): LatLng {
  return {
    lat: round6(ANCHOR.lat - ((p[1] - USER_PT[1]) * M_PER_UNIT) / M_PER_DEG_LAT),
    lng: round6(ANCHOR.lng + ((p[0] - USER_PT[0]) * M_PER_UNIT) / M_PER_DEG_LNG),
  };
}
export function toSchematic(ll: LatLng): SPoint {
  return [
    USER_PT[0] + ((ll.lng - ANCHOR.lng) * M_PER_DEG_LNG) / M_PER_UNIT,
    USER_PT[1] - ((ll.lat - ANCHOR.lat) * M_PER_DEG_LAT) / M_PER_UNIT,
  ];
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough Bengaluru urban bounding box; outside it we fall back to the anchor. */
export const BENGALURU_BBOX = { minLat: 12.7, maxLat: 13.25, minLng: 77.35, maxLng: 77.85 };
export function inBengaluru(ll: LatLng): boolean {
  const b = BENGALURU_BBOX;
  return ll.lat >= b.minLat && ll.lat <= b.maxLat && ll.lng >= b.minLng && ll.lng <= b.maxLng;
}

export const unitsToKm = (u: number) => (u * M_PER_UNIT) / 1000;
