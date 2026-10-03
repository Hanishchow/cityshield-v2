/**
 * The API contract, shared by the web app and the API.
 *
 * Every request body is a zod schema (the API validates with it and generates
 * OpenAPI from it); every response is a plain TypeScript type. Timestamps are
 * epoch milliseconds.
 */
import { z } from 'zod';
import type { SPoint } from './city.ts';

/* ---------- enums ---------- */
export const SERVICE_KEYS = ['police', 'ambulance', 'fire', 'civic'] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];
export const LANG_CODES = ['en', 'kn', 'hi', 'ta', 'te'] as const;
export type Lang = (typeof LANG_CODES)[number];
export const THEMES = ['light', 'dark', 'system'] as const;
export type ThemePref = (typeof THEMES)[number];
export const CATEGORY_KEYS = ['pothole', 'signal', 'water', 'light', 'civic', 'other'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];
export type UnitKind = ServiceKey | 'crew';
export type IncidentKind = 'sos' | ServiceKey;
export type IncidentStatus = 'dispatched' | 'en_route' | 'on_scene' | 'resolved' | 'cancelled';
export type ComplaintStatus = 'submitted' | 'assigned' | 'progress' | 'resolved';
export type NotificationKind = 'emergency' | 'service' | 'complaint';
export type Tone = ServiceKey | 'amber';
export type Role = 'citizen' | 'operator' | 'admin';
export type LocationSource = 'gps' | 'network' | 'manual' | 'saved_place' | 'default';
export type PlaceType = 'home' | 'work' | 'frequent';

/* ---------- entities ---------- */
export interface Prefs { emergency: boolean; service: boolean; complaint: boolean }
export interface Area { label: string; lat: number; lng: number; accuracyM: number | null; source: LocationSource }
export interface User {
  id: string; name: string; phone: string | null; phoneVerified: boolean; city: string; role: Role;
  lang: Lang; theme: ThemePref; prefs: Prefs; shareLive: boolean; area: Area; createdAt: number;
}
export interface Place { id: string; name: string; address: string; type: PlaceType; lat: number; lng: number; createdAt: number }
export type StationKind = 'hospital' | 'police_station' | 'fire_station' | 'ward_depot' | 'roads_depot' | 'ambulance_base';
export interface Station {
  id: string; kind: StationKind; name: string; address: string; phone: string | null; lat: number; lng: number;
  beds: 'available' | 'limited' | 'full' | null;
}
export interface NearbyStation extends Station { km: number; minutes: number }
export interface Officer { name: string; rank: string; phone: string }
export interface Unit {
  id: string; callSign: string; kind: UnitKind; status: 'available' | 'dispatched' | 'on_scene' | 'off_duty';
  stationId: string | null; officer: Officer | null; lat: number; lng: number;
  /** Command-centre patrols loop this schematic route; null for normal units. */
  patrol: { route: SPoint[]; periodMs: number; color: string } | null;
}
/**
 * A unit on its way. Position is a pure function of (route, dispatchedAt,
 * durationMs, now) — see shared/progress.ts — so clients animate smoothly at
 * 60 fps and the server only has to announce state changes.
 */
export interface Assignment {
  unitId: string; callSign: string; kind: UnitKind; originName: string; originKind: StationKind;
  route: SPoint[]; dispatchedAt: number; durationMs: number; etaMin: number; km: number; arrivedAt: number | null;
  officer: Officer | null;
}
export interface IncidentAgency { agency: string; role: 'primary' | 'secondary' }
export interface Incident {
  id: string; kind: IncidentKind; status: IncidentStatus; userId: string | null; title: string;
  address: string; lat: number; lng: number; accuracyM: number | null; source: LocationSource;
  agencies: IncidentAgency[]; assignments: Assignment[]; destinationHospitalId: string | null;
  createdAt: number; closedAt: number | null;
}
export interface TimelineItem { label: string; at: number | null; note: string | null; state: 'done' | 'cur' | 'todo' }
export interface Complaint {
  id: string; userId: string | null; category: CategoryKey; title: string; description: string;
  address: string; area: string; lat: number; lng: number; status: ComplaintStatus; agency: string;
  photoUrl: string | null; art: 'pothole' | 'street' | null; createdAt: number; updatedAt: number;
  timeline: TimelineItem[]; crew: Assignment | null;
}
export interface Notification {
  id: string; userId: string; kind: NotificationKind; tone: Tone; icon: string; title: string; body: string;
  refType: 'incident' | 'complaint' | null; refId: string | null; createdAt: number; readAt: number | null;
}

/* ---------- responses ---------- */
export interface Health {
  ok: true; store: 'memory' | 'postgres'; demo: boolean; serverTime: number; uptimeSeconds: number;
  capabilities: { geocode: 'mappls' | 'ola' | 'mock'; dispatch: 'simulated'; notify: 'mock'; telephony: 'simulated' };
}
export interface Session { token: string; user: User; devCode?: string }
export interface GeoResult { label: string; lat: number; lng: number; provider: 'mappls' | 'ola' | 'mock' }
export interface OpsKpis {
  activeIncidents: number; avgResponseSec: number | null; avgResponsePrevSec: number | null;
  complaintsResolvedToday: number; complaintsReceivedToday: number; unitsOnDuty: number;
  unitsByKind: Record<UnitKind, number>;
}
export interface WardCount { area: string; count: number }
export interface List<T> { items: T[]; serverTime: number }

/* ---------- live events (SSE) ---------- */
export type StreamEvent =
  | { type: 'hello'; serverTime: number }
  | { type: 'notification'; notification: Notification }
  | { type: 'incident'; incident: Incident }
  | { type: 'complaint'; complaint: Complaint }
  | { type: 'arrived'; incidentId: string; unitId: string; callSign: string; kind: UnitKind; ref: 'incident' | 'complaint' };

/* ---------- request bodies ---------- */
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
export const LocationIn = z.object({
  lat, lng,
  accuracyM: z.number().min(0).max(50_000).nullable().optional(),
  source: z.enum(['gps', 'network', 'manual', 'saved_place', 'default']).optional(),
  address: z.string().trim().max(200).optional(),
});
export type LocationIn = z.infer<typeof LocationIn>;

export const PhoneIn = z.string().trim().regex(/^[+\d][\d\s-]{7,19}$/, 'Enter a valid mobile number');
export const DeviceSessionIn = z.object({ deviceId: z.string().min(8).max(100) });
export const OtpRequestIn = z.object({ phone: PhoneIn });
export const OtpVerifyIn = z.object({ phone: PhoneIn, code: z.string().regex(/^\d{6}$/) });
export const MePatchIn = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  phone: PhoneIn.optional(),
  city: z.string().trim().max(60).optional(),
  lang: z.enum(LANG_CODES).optional(),
  theme: z.enum(THEMES).optional(),
  prefs: z.object({ emergency: z.boolean(), service: z.boolean(), complaint: z.boolean() }).partial().optional(),
  shareLive: z.boolean().optional(),
  area: LocationIn.extend({ label: z.string().trim().min(1).max(200) }).optional(),
});
export type MePatchIn = z.infer<typeof MePatchIn>;

export const PlaceIn = z.object({
  name: z.string().trim().min(1).max(40),
  address: z.string().trim().min(1).max(120),
  type: z.enum(['home', 'work', 'frequent']),
  lat: lat.optional(), lng: lng.optional(),
});
export type PlaceIn = z.infer<typeof PlaceIn>;

export const SosIn = z.object({ location: LocationIn, shareLive: z.boolean().optional() });
export type SosIn = z.infer<typeof SosIn>;
export const IncidentIn = z.object({ kind: z.enum(SERVICE_KEYS), location: LocationIn, note: z.string().max(300).optional() });
export type IncidentIn = z.infer<typeof IncidentIn>;
export const IncidentPatchIn = z.object({ destinationHospitalId: z.string().min(1).max(40).nullable() });
export const PingIn = LocationIn;

export const ComplaintIn = z.object({
  category: z.enum(CATEGORY_KEYS),
  title: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  location: LocationIn.extend({ address: z.string().trim().min(1, 'Please add a location').max(200) }),
  photoId: z.string().max(80).nullable().optional(),
});
export type ComplaintIn = z.infer<typeof ComplaintIn>;
export const OpsComplaintPatchIn = z.object({ status: z.enum(['assigned', 'progress', 'resolved']) });
export const OpsIncidentPatchIn = z.object({ status: z.enum(['en_route', 'on_scene', 'resolved', 'cancelled']) });
export const ReadIn = z.object({ ids: z.array(z.string()).max(500).optional(), all: z.boolean().optional() });
export const FeedbackIn = z.object({ message: z.string().trim().min(2).max(2000) });
