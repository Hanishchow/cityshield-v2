/**
 * Postgres + PostGIS schema (Drizzle).
 *
 * Every located row stores plain lat/lng plus a GENERATED geography(Point)
 * column with a GiST index: reads stay simple numbers, while nearest-unit and
 * nearest-hospital queries use PostGIS KNN (`<->`) on the index.
 * Run `npm run db:generate -w api` after editing to emit a new migration.
 */
import { sql } from 'drizzle-orm';
import {
  bigserial, boolean, customType, doublePrecision, index, integer, jsonb, pgSequence, pgTable, primaryKey, real, serial, text, timestamp, uuid,
} from 'drizzle-orm/pg-core';
import type { Officer, Prefs } from '../../../shared/contract.ts';
import type { SPoint } from '../../../shared/city.ts';

const geography = customType<{ data: string }>({ dataType: () => 'geography(Point,4326)' });
const geographyLine = customType<{ data: string }>({ dataType: () => 'geography(LineString,4326)' });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const point = (lat: string, lng: string) => sql.raw(`ST_SetSRID(ST_MakePoint("${lng}", "${lat}"), 4326)::geography`);

export const incidentSeq = pgSequence('incident_seq', { startWith: 3188 });
export const complaintSeq = pgSequence('complaint_seq', { startWith: 2042 });

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  city: text('city').notNull(),
  role: text('role').notNull().default('citizen'),
  lang: text('lang').notNull().default('en'),
  theme: text('theme').notNull().default('system'),
  prefs: jsonb('prefs').$type<Prefs>().notNull(),
  shareLive: boolean('share_live').notNull().default(true),
  areaLabel: text('area_label').notNull(),
  areaLat: doublePrecision('area_lat').notNull(),
  areaLng: doublePrecision('area_lng').notNull(),
  areaAccuracyM: integer('area_accuracy_m'),
  areaSource: text('area_source').notNull().default('default'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('users_phone_idx').on(t.phone)]);

export const devices = pgTable('devices', {
  deviceId: text('device_id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const otpChallenges = pgTable('otp_challenges', {
  phone: text('phone').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: ts('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
});

export const places = pgTable('places', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  type: text('type').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  loc: geography('loc').generatedAlwaysAs(point('lat', 'lng')),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('places_user_idx').on(t.userId)]);

export const stations = pgTable('stations', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone'),
  beds: text('beds'),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  loc: geography('loc').generatedAlwaysAs(point('lat', 'lng')),
}, (t) => [index('stations_loc_gist').using('gist', t.loc), index('stations_kind_idx').on(t.kind)]);

export const units = pgTable('units', {
  id: text('id').primaryKey(),
  callSign: text('call_sign').notNull().unique(),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('available'),
  stationId: text('station_id').references(() => stations.id),
  officer: jsonb('officer').$type<Officer | null>(),
  patrol: jsonb('patrol').$type<{ route: SPoint[]; periodMs: number; color: string } | null>(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  loc: geography('loc').generatedAlwaysAs(point('lat', 'lng')),
}, (t) => [index('units_loc_gist').using('gist', t.loc), index('units_kind_status_idx').on(t.kind, t.status)]);

export const incidents = pgTable('incidents', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  address: text('address').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  loc: geography('loc').generatedAlwaysAs(point('lat', 'lng')),
  accuracyM: integer('accuracy_m'),
  source: text('source').notNull(),
  destinationHospitalId: text('destination_hospital_id').references(() => stations.id),
  createdAt: ts('created_at').notNull(),
  closedAt: ts('closed_at'),
}, (t) => [index('incidents_user_idx').on(t.userId, t.createdAt), index('incidents_status_idx').on(t.status), index('incidents_loc_gist').using('gist', t.loc)]);

/** "Every agency shares one record": the agencies attached to an incident. */
export const incidentAgencies = pgTable('incident_agencies', {
  incidentId: text('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  agency: text('agency').notNull(),
  role: text('role').notNull(),
  position: integer('position').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.incidentId, t.agency] })]);

export const complaints = pgTable('complaints', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  category: text('category').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  address: text('address').notNull(),
  area: text('area').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  loc: geography('loc').generatedAlwaysAs(point('lat', 'lng')),
  status: text('status').notNull(),
  agency: text('agency').notNull(),
  photoUrl: text('photo_url'),
  art: text('art'),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
}, (t) => [index('complaints_user_idx').on(t.userId, t.createdAt), index('complaints_status_idx').on(t.status), index('complaints_area_idx').on(t.area, t.createdAt)]);

export const complaintEvents = pgTable('complaint_events', {
  id: serial('id').primaryKey(),
  complaintId: text('complaint_id').notNull().references(() => complaints.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  label: text('label').notNull(),
  at: ts('at'),
  note: text('note'),
  state: text('state').notNull(),
}, (t) => [index('complaint_events_c_idx').on(t.complaintId, t.position)]);

/** A unit sent to an incident or to a complaint (repair crew). */
export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  incidentId: text('incident_id').references(() => incidents.id, { onDelete: 'cascade' }),
  complaintId: text('complaint_id').references(() => complaints.id, { onDelete: 'cascade' }),
  unitId: text('unit_id').notNull(),
  callSign: text('call_sign').notNull(),
  kind: text('kind').notNull(),
  originName: text('origin_name').notNull(),
  originKind: text('origin_kind').notNull(),
  /** schematic route (what clients animate along) */
  route: jsonb('route').$type<SPoint[]>().notNull(),
  /** the same route in real coordinates, for GIS tooling */
  routeGeom: geographyLine('route_geom'),
  dispatchedAt: ts('dispatched_at').notNull(),
  durationMs: integer('duration_ms').notNull(),
  etaMin: integer('eta_min').notNull(),
  km: real('km').notNull(),
  arrivedAt: ts('arrived_at'),
  officer: jsonb('officer').$type<Officer | null>(),
}, (t) => [index('assignments_incident_idx').on(t.incidentId), index('assignments_complaint_idx').on(t.complaintId)]);

/** Live-location pings while an incident is active. Pruned by the retention sweeper. */
export const locationPings = pgTable('location_pings', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  incidentId: text('incident_id').notNull().references(() => incidents.id, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  at: ts('at').notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  accuracyM: integer('accuracy_m'),
}, (t) => [index('pings_at_idx').on(t.at)]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  tone: text('tone').notNull(),
  icon: text('icon').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  refType: text('ref_type'),
  refId: text('ref_id'),
  createdAt: ts('created_at').notNull(),
  readAt: ts('read_at'),
}, (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]);

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id'),
  message: text('message').notNull(),
  at: ts('at').notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  at: ts('at').notNull(),
  actor: text('actor'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  data: jsonb('data'),
}, (t) => [index('audit_entity_idx').on(t.entity)]);
