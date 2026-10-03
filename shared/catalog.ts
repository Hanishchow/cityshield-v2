/**
 * Static catalogue: services, complaint categories, routing policy, stations
 * and the responder fleet. Ported from prototype/src/core.js + pages_a.js and
 * given real coordinates through shared/geo.ts.
 */
import type { CategoryKey, IncidentKind, ServiceKey, Station, StationKind, Unit, UnitKind } from './contract.ts';
import { ISSUE_PT, rng, type SPoint } from './city.ts';
import { toLatLng } from './geo.ts';

/** BBMP was replaced by the Greater Bengaluru Authority on 2 Sept 2025. */
export const CIVIC = { short: 'GBA', long: 'Greater Bengaluru Authority' } as const;

/**
 * Simulation speed. Real ETAs are computed at city driving speed; in demo mode
 * every "minute" of ETA plays back in `secondsPerMinute` seconds so a whole trip
 * fits in a demo. Real mode uses 60.
 */
export const DEMO_SECONDS_PER_MINUTE = 12;
export const CITY_SPEED_KMH = 18;
export const COMPLAINT_ASSIGN_DELAY_MS = 5_000;

export interface ServiceDef {
  key: UnitKind; vehicle: string; color: string; pill: string; icon: string;
  arrived: string; label: (km: number) => string;
}
export const SERVICES: Record<UnitKind, ServiceDef> = {
  ambulance: { key: 'ambulance', vehicle: 'Ambulance', color: '#E0284F', pill: '#0F1C40', icon: 'ambulance', arrived: 'Ambulance has arrived', label: (km) => `Ambulance ${km} km away` },
  police: { key: 'police', vehicle: 'Police', color: '#4F46E5', pill: '#4F46E5', icon: 'car', arrived: 'Police has arrived', label: (km) => `Police is ${km} km away` },
  fire: { key: 'fire', vehicle: 'Fire Truck', color: '#EA580C', pill: '#C2410C', icon: 'truck', arrived: 'Fire truck has arrived', label: (km) => `Fire Truck ${km} km away` },
  civic: { key: 'civic', vehicle: 'Garbage Van', color: '#059669', pill: '#047857', icon: 'truck', arrived: 'Garbage van has reached your area', label: (km) => `Garbage Van ${km} km away` },
  crew: { key: 'crew', vehicle: 'Repair crew', color: '#D97706', pill: '#B45309', icon: 'truck', arrived: 'Repair crew is on site', label: (km) => `Repair crew ${km} km away` },
};
export const SERVICE_SUB: Record<ServiceKey, string> = {
  police: 'Karnataka State Police', ambulance: 'Nearest hospitals & ambulances',
  fire: 'Fire & Emergency Services', civic: 'Garbage, roads & streetlights',
};

/* ---------- routing policy: the citizen never picks a department ---------- */
export interface Policy { units: UnitKind[]; agencies: { agency: string; role: 'primary' | 'secondary' }[]; title: string }
export const AGENCY = {
  police: 'Karnataka State Police', ambulance: 'Emergency Ambulance (108)', fire: 'Karnataka State Fire & Emergency Services',
  civic: `${CIVIC.short} Solid Waste`, traffic: 'Bengaluru Traffic Police', erss: '112 ERSS',
} as const;
export const POLICY: Record<IncidentKind, Policy> = {
  sos: { units: ['ambulance', 'police'], title: 'SOS emergency', agencies: [{ agency: AGENCY.erss, role: 'primary' }, { agency: AGENCY.ambulance, role: 'secondary' }, { agency: AGENCY.police, role: 'secondary' }] },
  ambulance: { units: ['ambulance'], title: 'Medical emergency', agencies: [{ agency: AGENCY.ambulance, role: 'primary' }, { agency: AGENCY.erss, role: 'secondary' }] },
  police: { units: ['police'], title: 'Police assistance', agencies: [{ agency: AGENCY.police, role: 'primary' }, { agency: AGENCY.erss, role: 'secondary' }] },
  fire: { units: ['fire'], title: 'Fire emergency', agencies: [{ agency: AGENCY.fire, role: 'primary' }, { agency: AGENCY.police, role: 'secondary' }] },
  civic: { units: ['civic'], title: 'Garbage pickup', agencies: [{ agency: `${CIVIC.short} ward office`, role: 'primary' }] },
};

/* ---------- complaint categories ---------- */
export interface CategoryDef { key: CategoryKey; icon: string; title: string; sub: string; tone: 'blue' | 'amber' | 'gray' | 'civic'; agency: string }
export const CATEGORIES: CategoryDef[] = [
  { key: 'pothole', icon: 'car', title: 'Pothole', sub: 'Road Issue', tone: 'blue', agency: `${CIVIC.short} Roads` },
  { key: 'signal', icon: 'signal', title: 'Traffic Signal', sub: 'Not Working', tone: 'amber', agency: AGENCY.traffic },
  { key: 'water', icon: 'drop', title: 'Water Logging', sub: 'Flooding', tone: 'blue', agency: `${CIVIC.short} Storm Water Drains` },
  { key: 'light', icon: 'bulb', title: 'Street Light', sub: 'Not Working', tone: 'gray', agency: `${CIVIC.short} Electrical` },
  { key: 'civic', icon: 'bin', title: `${CIVIC.short} Issue`, sub: 'Garbage / Cleanliness', tone: 'civic', agency: `${CIVIC.short} Solid Waste` },
  { key: 'other', icon: 'dots', title: 'Other', sub: 'General', tone: 'gray', agency: 'City Shield Desk' },
];
export const categoryOf = (k: string): CategoryDef => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[5];

export const HELPLINES = [
  { num: '112', name: 'National emergency', sub: 'Police · Fire · Ambulance (ERSS)' },
  { num: '100', name: 'Police', sub: '' },
  { num: '101', name: 'Fire', sub: '' },
  { num: '108', name: 'Ambulance', sub: '' },
  { num: '1098', name: 'Child helpline', sub: 'Children in distress' },
  { num: '1930', name: 'Cyber crime helpline', sub: 'Online fraud and cyber crime' },
] as const;

/* ---------- stations (placed on the schematic, real lat/lng derived) ---------- */
function station(id: string, kind: StationKind, name: string, address: string, pt: SPoint, phone: string | null, beds: Station['beds'] = null): Station & { pt: SPoint } {
  return { id, kind, name, address, phone, beds, pt, ...toLatLng(pt) };
}
export const STATIONS = [
  station('manipal', 'hospital', 'Manipal Hospital', 'Old Airport Road, Bengaluru', [300, 180], '080 2502 4444', 'available'),
  station('fortis', 'hospital', 'Fortis Hospital', 'Bannerghatta Road, Bengaluru', [-500, 1000], '080 6621 4444', 'available'),
  station('columbia', 'hospital', 'Columbia Asia', 'Sarjapur Road, Bengaluru', [2300, 1200], '080 3989 8969', 'available'),
  station('stjohns', 'hospital', "St. John's Medical College Hospital", 'Sarjapur Road, Koramangala', [100, -900], '080 2206 5000', 'limited'),
  station('sakra', 'hospital', 'Sakra World Hospital', 'Bellandur, Bengaluru', [2650, -600], '080 4969 4969', 'available'),
  station('amb-base', 'ambulance_base', 'Ambulance base · Adugodi', 'Adugodi Main Road', [120, 90], '108'),
  station('kps-koramangala', 'police_station', 'Koramangala Police Station', '80 Feet Road, Koramangala', [900, 90], '080 2294 2575'),
  station('fs-jayanagar', 'fire_station', 'Jayanagar Fire Station', '9th Block, Jayanagar', [120, 630], '101'),
  station('gba-ward', 'ward_depot', `${CIVIC.short} Ward Depot · Zone 3`, 'HSR Layout Sector 1', [900, 540], null),
  station('gba-roads', 'roads_depot', `${CIVIC.short} Roads depot`, 'Madiwala', [250, 630], null),
];
export const stationById = (id: string | null) => STATIONS.find((s) => s.id === id) ?? null;

/**
 * Hand-drawn routes for the named units (from the prototype), used when the
 * unit is dispatched to the default location. Anything else gets gridRoute().
 */
export const CANNED_ROUTES: Record<string, SPoint[]> = {
  'AMB-14': [[120, 90], [250, 90], [250, 180], [520, 180], [520, 350], [650, 350]],
  'Hoysala-22': [[900, 90], [900, 270], [780, 270], [780, 350], [650, 350]],
  'FT-07': [[120, 630], [250, 630], [250, 450], [520, 450], [520, 350], [650, 350]],
  'GV-31': [[900, 540], [780, 540], [780, 450], [650, 450], [650, 350]],
  'RC-5': [[250, 630], [250, 450], [380, 450], [380, 350], [520, 350], ISSUE_PT],
};

type SeedUnit = Unit & { pt: SPoint };
function unit(id: string, callSign: string, kind: UnitKind, stationId: string | null, pt: SPoint, officer: Unit['officer'] = null, patrol: Unit['patrol'] = null): SeedUnit {
  return { id, callSign, kind, status: 'available', stationId, officer, patrol, pt, ...toLatLng(pt) };
}

/** Named units first (nearest to the demo location), then a generated city-wide fleet. */
export function seedUnits(): SeedUnit[] {
  const named: SeedUnit[] = [
    unit('u-amb-14', 'AMB-14', 'ambulance', 'amb-base', [120, 90], { name: 'Paramedic team', rank: 'EMT crew', phone: '108' }),
    unit('u-hoy-22', 'Hoysala-22', 'police', 'kps-koramangala', [900, 90], { name: 'SI Ramesh Kumar', rank: 'Sub-Inspector', phone: '98867 12345' }),
    unit('u-ft-07', 'FT-07', 'fire', 'fs-jayanagar', [120, 630], { name: 'Station Officer K. Nagaraj', rank: 'Station Officer', phone: '101' }),
    unit('u-gv-31', 'GV-31', 'civic', 'gba-ward', [900, 540], { name: 'Ward supervisor Lakshmi', rank: 'Supervisor', phone: '080 2297 5595' }),
    unit('u-rc-5', 'RC-5', 'crew', 'gba-roads', [250, 630], { name: 'Roads crew lead Imran', rank: 'Crew lead', phone: '080 2297 5500' }),
    /* command-centre patrol loops (always moving, sample data) */
    unit('u-cc1', 'AMB-21', 'ambulance', null, [-160, -210], null, { route: [[-160, -210], [-160, 180], [520, 180]], periodMs: 46_000, color: SERVICES.ambulance.color }),
    unit('u-cc2', 'Hoysala-31', 'police', null, [1160, 90], null, { route: [[1160, 90], [1160, 630], [900, 630]], periodMs: 38_000, color: SERVICES.police.color }),
    unit('u-cc3', 'FT-12', 'fire', null, [520, 900], null, { route: [[520, 900], [520, 720], [900, 720], [900, 630]], periodMs: 52_000, color: SERVICES.fire.color }),
    unit('u-cc4', 'GV-44', 'civic', null, [-160, 900], null, { route: [[-160, 900], [-160, 540], [250, 540], [250, 270]], periodMs: 60_000, color: SERVICES.civic.color }),
  ];
  /* The rest of the on-duty fleet sits beyond the mapped area (city-wide), so the
     named units stay nearest for the demo while KPIs reflect a realistic fleet. */
  const fleet: SeedUnit[] = [];
  const r = rng(4242);
  const counts: [UnitKind, string, number][] = [['police', 'Hoysala', 116], ['ambulance', 'AMB', 60], ['fire', 'FT', 34], ['civic', 'GV', 70], ['crew', 'RC', 23]];
  for (const [kind, prefix, n] of counts) {
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = 2600 + r() * 5200;
      const pt: SPoint = [650 + Math.cos(a) * d, 350 + Math.sin(a) * d];
      const u = unit(`u-${kind}-${i + 100}`, `${prefix}-${i + 100}`, kind, null, pt);
      if (r() < 0.06) u.status = 'off_duty';
      fleet.push(u);
    }
  }
  return [...named, ...fleet];
}

/** Command-centre ward names used for complaint statistics. */
export const WARDS = ['Koramangala', 'HSR Layout', 'BTM Layout', 'Ejipura', 'Jakkasandra', 'Adugodi'] as const;
