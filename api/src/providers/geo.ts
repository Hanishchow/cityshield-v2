/**
 * Geocoding chain: Mappls (MapmyIndia) → Ola Maps → labelled stand-in.
 * Keys live on the server only. Every provider failure falls through to the
 * next one, and the stand-in never fails, so a location lookup can never
 * block an emergency flow.
 */
import type { GeoResult } from '../../../shared/contract.ts';
import { MLABELS } from '../../../shared/city.ts';
import { toLatLng, toSchematic } from '../../../shared/geo.ts';
import { config, geocoder } from '../config.ts';

const TIMEOUT = 4000;
async function getJson(url: string, headers: Record<string, string> = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { headers, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status}`);
    return (await r.json()) as Record<string, unknown>;
  } finally { clearTimeout(t); }
}

/* ---------- Mappls: OAuth client-credentials token, cached until expiry ---------- */
let mapplsToken: { v: string; exp: number } | null = null;
async function mapplsAuth() {
  if (mapplsToken && mapplsToken.exp > Date.now() + 60_000) return mapplsToken.v;
  const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: config.mapplsClientId!, client_secret: config.mapplsClientSecret! });
  const r = await fetch('https://outpost.mappls.com/api/security/oauth/token', { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`mappls auth ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  mapplsToken = { v: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return mapplsToken.v;
}
async function mapplsReverse(lat: number, lng: number): Promise<GeoResult> {
  const tok = await mapplsAuth();
  const j = await getJson(`https://search.mappls.com/search/address/rev-geocode?lat=${lat}&lng=${lng}`, { authorization: `bearer ${tok}` });
  const r = (j.results as { formatted_address?: string }[] | undefined)?.[0];
  if (!r?.formatted_address) throw new Error('mappls: no result');
  return { label: r.formatted_address, lat, lng, provider: 'mappls' };
}
async function mapplsSearch(q: string): Promise<GeoResult[]> {
  const tok = await mapplsAuth();
  const j = await getJson(`https://search.mappls.com/search/places/autosuggest/json?query=${encodeURIComponent(q)}&location=12.9716,77.5946`, { authorization: `bearer ${tok}` });
  const l = (j.suggestedLocations as { placeName: string; placeAddress: string; latitude?: number; longitude?: number }[] | undefined) ?? [];
  return l.filter((x) => x.latitude != null).slice(0, 6).map((x) => ({ label: `${x.placeName}, ${x.placeAddress}`, lat: x.latitude!, lng: x.longitude!, provider: 'mappls' as const }));
}

/* ---------- Ola Maps ---------- */
async function olaReverse(lat: number, lng: number): Promise<GeoResult> {
  const j = await getJson(`https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${config.olaKey}`);
  const r = (j.results as { formatted_address?: string }[] | undefined)?.[0];
  if (!r?.formatted_address) throw new Error('ola: no result');
  return { label: r.formatted_address, lat, lng, provider: 'ola' };
}
async function olaSearch(q: string): Promise<GeoResult[]> {
  const j = await getJson(`https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(q)}&location=12.9716,77.5946&api_key=${config.olaKey}`);
  const l = (j.predictions as { description: string; geometry?: { location: { lat: number; lng: number } } }[] | undefined) ?? [];
  return l.filter((x) => x.geometry).slice(0, 6).map((x) => ({ label: x.description, lat: x.geometry!.location.lat, lng: x.geometry!.location.lng, provider: 'ola' as const }));
}

/* ---------- stand-in: nearest neighbourhood on the schematic map ---------- */
const AREAS = MLABELS.filter((l) => !l.road && !l.water);
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
function mockReverse(lat: number, lng: number): GeoResult {
  const p = toSchematic({ lat, lng });
  const best = AREAS.reduce((b, l) => (Math.hypot(l.x - p[0], l.y - p[1]) < Math.hypot(b.x - p[0], b.y - p[1]) ? l : b), AREAS[0]);
  return { label: `Near ${title(best.t)}, Bengaluru`, lat, lng, provider: 'mock' };
}
function mockSearch(q: string): GeoResult[] {
  const s = q.trim().toLowerCase();
  return MLABELS.filter((l) => !l.water && l.t.toLowerCase().includes(s)).slice(0, 6).map((l) => ({ label: `${title(l.t)}, Bengaluru`, ...toLatLng([l.x, l.y]), provider: 'mock' as const }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const p = geocoder();
  try { if (p === 'mappls') return await mapplsReverse(lat, lng); } catch { /* fall through */ }
  try { if (config.olaKey) return await olaReverse(lat, lng); } catch { /* fall through */ }
  return mockReverse(lat, lng);
}
export async function searchPlaces(q: string): Promise<GeoResult[]> {
  if (!q.trim()) return [];
  const p = geocoder();
  try { if (p === 'mappls') return await mapplsSearch(q); } catch { /* fall through */ }
  try { if (config.olaKey) return await olaSearch(q); } catch { /* fall through */ }
  return mockSearch(q);
}
