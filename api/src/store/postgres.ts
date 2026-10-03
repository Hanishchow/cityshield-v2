/**
 * PostGIS-backed Repo. Same contract as shared/memory.ts; the services layer
 * cannot tell them apart. Spatial lookups use the GiST-indexed generated
 * geography columns with KNN ordering (`<->`).
 */
import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import type {
  Assignment, Complaint, Incident, Notification, NotificationKind, Place, Station, StationKind, TimelineItem, Unit, UnitKind, User, WardCount,
} from '../../../shared/contract.ts';
import type { AuditEntry, ComplaintFilter, IncidentFilter, OtpRecord, Repo } from '../../../shared/repo.ts';
import { ACTIVE_STATUSES } from '../../../shared/repo.ts';
import { normPhone } from '../../../shared/memory.ts';
import { toLatLng } from '../../../shared/geo.ts';
import type { LatLng } from '../../../shared/geo.ts';
import type { Db } from '../db/client.ts';
import * as t from '../db/schema.ts';

const ms = (d: Date | null | undefined) => (d ? d.getTime() : null);
const dt = (n: number | null | undefined) => (n == null ? null : new Date(n));
const pt = (ll: LatLng) => sql`ST_SetSRID(ST_MakePoint(${ll.lng}, ${ll.lat}), 4326)::geography`;
const lineWkt = (route: Assignment['route']) => `SRID=4326;LINESTRING(${route.map((p) => { const l = toLatLng(p); return `${l.lng} ${l.lat}`; }).join(',')})`;

type UserRow = typeof t.users.$inferSelect;
const toUser = (r: UserRow): User => ({
  id: r.id, name: r.name, phone: r.phone, phoneVerified: r.phoneVerified, city: r.city, role: r.role as User['role'],
  lang: r.lang as User['lang'], theme: r.theme as User['theme'], prefs: r.prefs, shareLive: r.shareLive,
  area: { label: r.areaLabel, lat: r.areaLat, lng: r.areaLng, accuracyM: r.areaAccuracyM, source: r.areaSource as User['area']['source'] },
  createdAt: r.createdAt.getTime(),
});
const fromUser = (u: Partial<User>) => {
  const o: Partial<typeof t.users.$inferInsert> = {};
  if (u.name !== undefined) o.name = u.name;
  if (u.phone !== undefined) o.phone = u.phone;
  if (u.phoneVerified !== undefined) o.phoneVerified = u.phoneVerified;
  if (u.city !== undefined) o.city = u.city;
  if (u.role !== undefined) o.role = u.role;
  if (u.lang !== undefined) o.lang = u.lang;
  if (u.theme !== undefined) o.theme = u.theme;
  if (u.prefs !== undefined) o.prefs = u.prefs;
  if (u.shareLive !== undefined) o.shareLive = u.shareLive;
  if (u.area !== undefined) { o.areaLabel = u.area.label; o.areaLat = u.area.lat; o.areaLng = u.area.lng; o.areaAccuracyM = u.area.accuracyM; o.areaSource = u.area.source; }
  return o;
};
type AssignRow = typeof t.assignments.$inferSelect;
const toAssignment = (r: AssignRow): Assignment => ({
  unitId: r.unitId, callSign: r.callSign, kind: r.kind as UnitKind, originName: r.originName, originKind: r.originKind as StationKind,
  route: r.route, dispatchedAt: r.dispatchedAt.getTime(), durationMs: r.durationMs, etaMin: r.etaMin, km: r.km, arrivedAt: ms(r.arrivedAt), officer: r.officer ?? null,
});
const assignValues = (a: Assignment, ref: { incidentId?: string; complaintId?: string }) => ({
  incidentId: ref.incidentId ?? null, complaintId: ref.complaintId ?? null, unitId: a.unitId, callSign: a.callSign, kind: a.kind, originName: a.originName,
  originKind: a.originKind, route: a.route, routeGeom: a.route.length > 1 ? sql`ST_GeogFromText(${lineWkt(a.route)})` as unknown as string : null,
  dispatchedAt: new Date(a.dispatchedAt), durationMs: a.durationMs, etaMin: a.etaMin, km: a.km, arrivedAt: dt(a.arrivedAt), officer: a.officer,
});
const stationCols = { id: t.stations.id, kind: t.stations.kind, name: t.stations.name, address: t.stations.address, phone: t.stations.phone, beds: t.stations.beds, lat: t.stations.lat, lng: t.stations.lng };
const unitCols = { id: t.units.id, callSign: t.units.callSign, kind: t.units.kind, status: t.units.status, stationId: t.units.stationId, officer: t.units.officer, patrol: t.units.patrol, lat: t.units.lat, lng: t.units.lng };
const toUnit = (r: { id: string; callSign: string; kind: string; status: string; stationId: string | null; officer: Unit['officer']; patrol: Unit['patrol']; lat: number; lng: number }): Unit =>
  ({ ...r, kind: r.kind as UnitKind, status: r.status as Unit['status'], officer: r.officer ?? null, patrol: r.patrol ?? null });
const toStation = (r: { id: string; kind: string; name: string; address: string; phone: string | null; beds: string | null; lat: number; lng: number }): Station =>
  ({ ...r, kind: r.kind as StationKind, beds: r.beds as Station['beds'] });

export class PostgresRepo implements Repo {
  readonly kind = 'postgres' as const;
  private db: Db;
  constructor(db: Db) { this.db = db; }

  /* ---------- users ---------- */
  async userById(id: string) { const [r] = await this.db.select().from(t.users).where(eq(t.users.id, id)); return r ? toUser(r) : null; }
  async userByPhone(phone: string) {
    const rows = await this.db.select().from(t.users).where(and(eq(t.users.phoneVerified, true)));
    const n = normPhone(phone);
    const r = rows.find((x) => x.phone && normPhone(x.phone) === n);
    return r ? toUser(r) : null;
  }
  async userByDevice(deviceId: string) {
    const [r] = await this.db.select({ u: t.users }).from(t.devices).innerJoin(t.users, eq(t.devices.userId, t.users.id)).where(eq(t.devices.deviceId, deviceId));
    return r ? toUser(r.u) : null;
  }
  async insertUser(u: User, deviceId: string | null) {
    await this.db.transaction(async (tx) => {
      await tx.insert(t.users).values({ id: u.id, createdAt: new Date(u.createdAt), ...(fromUser(u) as Required<ReturnType<typeof fromUser>>) });
      if (deviceId) await tx.insert(t.devices).values({ deviceId, userId: u.id }).onConflictDoUpdate({ target: t.devices.deviceId, set: { userId: u.id } });
    });
    return u;
  }
  async updateUser(id: string, patch: Partial<User>) {
    const v = fromUser(patch);
    if (Object.keys(v).length) await this.db.update(t.users).set(v).where(eq(t.users.id, id));
    return this.userById(id);
  }
  async linkDevice(deviceId: string, userId: string) {
    await this.db.insert(t.devices).values({ deviceId, userId }).onConflictDoUpdate({ target: t.devices.deviceId, set: { userId } });
  }

  /* ---------- otp ---------- */
  async putOtp(phone: string, rec: OtpRecord) {
    const p = normPhone(phone);
    await this.db.insert(t.otpChallenges).values({ phone: p, codeHash: rec.codeHash, expiresAt: new Date(rec.expiresAt), attempts: rec.attempts })
      .onConflictDoUpdate({ target: t.otpChallenges.phone, set: { codeHash: rec.codeHash, expiresAt: new Date(rec.expiresAt), attempts: rec.attempts } });
  }
  async getOtp(phone: string) {
    const [r] = await this.db.select().from(t.otpChallenges).where(eq(t.otpChallenges.phone, normPhone(phone)));
    return r ? { codeHash: r.codeHash, expiresAt: r.expiresAt.getTime(), attempts: r.attempts } : null;
  }
  async deleteOtp(phone: string) { await this.db.delete(t.otpChallenges).where(eq(t.otpChallenges.phone, normPhone(phone))); }

  /* ---------- places ---------- */
  private placeCols = { id: t.places.id, name: t.places.name, address: t.places.address, type: t.places.type, lat: t.places.lat, lng: t.places.lng, createdAt: t.places.createdAt };
  private toPlace = (r: { id: string; name: string; address: string; type: string; lat: number; lng: number; createdAt: Date }): Place => ({ ...r, type: r.type as Place['type'], createdAt: r.createdAt.getTime() });
  async places(userId: string) { return (await this.db.select(this.placeCols).from(t.places).where(eq(t.places.userId, userId)).orderBy(asc(t.places.createdAt))).map(this.toPlace); }
  async insertPlace(userId: string, p: Place) {
    await this.db.insert(t.places).values({ id: p.id, userId, name: p.name, address: p.address, type: p.type, lat: p.lat, lng: p.lng, createdAt: new Date(p.createdAt) });
    return p;
  }
  async updatePlace(userId: string, id: string, patch: Partial<Place>) {
    const { createdAt: _c, id: _i, ...rest } = patch;
    if (Object.keys(rest).length) await this.db.update(t.places).set(rest).where(and(eq(t.places.userId, userId), eq(t.places.id, id)));
    const [r] = await this.db.select(this.placeCols).from(t.places).where(and(eq(t.places.userId, userId), eq(t.places.id, id)));
    return r ? this.toPlace(r) : null;
  }
  async deletePlace(userId: string, id: string) {
    const r = await this.db.delete(t.places).where(and(eq(t.places.userId, userId), eq(t.places.id, id))).returning({ id: t.places.id });
    return r.length > 0;
  }

  /* ---------- stations & units ---------- */
  async stations(kind?: StationKind) {
    const q = this.db.select(stationCols).from(t.stations);
    return (await (kind ? q.where(eq(t.stations.kind, kind)) : q)).map(toStation);
  }
  async nearestStations(kind: StationKind, at: LatLng, limit: number) {
    const rows = await this.db.select({ ...stationCols, d: sql<number>`ST_Distance(${t.stations.loc}, ${pt(at)})` }).from(t.stations)
      .where(eq(t.stations.kind, kind)).orderBy(sql`${t.stations.loc} <-> ${pt(at)}`).limit(limit);
    return rows.map(({ d, ...s }) => ({ ...toStation(s), distKm: Number(d) / 1000 }));
  }
  async units() { return (await this.db.select(unitCols).from(t.units)).map(toUnit); }
  async unitById(id: string) { const [r] = await this.db.select(unitCols).from(t.units).where(eq(t.units.id, id)); return r ? toUnit(r) : null; }
  async nearestAvailableUnit(kind: UnitKind, at: LatLng) {
    const [r] = await this.db.select(unitCols).from(t.units)
      .where(and(eq(t.units.kind, kind), eq(t.units.status, 'available'), isNull(t.units.patrol)))
      .orderBy(sql`${t.units.loc} <-> ${pt(at)}`).limit(1);
    return r ? toUnit(r) : null;
  }
  async updateUnit(id: string, patch: Partial<Pick<Unit, 'status' | 'lat' | 'lng'>>) {
    if (Object.keys(patch).length) await this.db.update(t.units).set(patch).where(eq(t.units.id, id));
  }

  /* ---------- incidents ---------- */
  async nextId(seq: 'incident' | 'complaint') {
    const name = seq === 'incident' ? 'incident_seq' : 'complaint_seq';
    const r = await this.db.execute<{ n: string }>(sql`select nextval(${name}) as n`);
    return Number((r as unknown as { n: string }[])[0].n);
  }
  private async hydrateIncidents(rows: (typeof t.incidents.$inferSelect)[]): Promise<Incident[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [as, ags] = await Promise.all([
      this.db.select().from(t.assignments).where(inArray(t.assignments.incidentId, ids)).orderBy(asc(t.assignments.id)),
      this.db.select().from(t.incidentAgencies).where(inArray(t.incidentAgencies.incidentId, ids)).orderBy(asc(t.incidentAgencies.position)),
    ]);
    return rows.map((r) => ({
      id: r.id, kind: r.kind as Incident['kind'], status: r.status as Incident['status'], userId: r.userId, title: r.title, address: r.address,
      lat: r.lat, lng: r.lng, accuracyM: r.accuracyM, source: r.source as Incident['source'],
      agencies: ags.filter((g) => g.incidentId === r.id).map((g) => ({ agency: g.agency, role: g.role as 'primary' | 'secondary' })),
      assignments: as.filter((a) => a.incidentId === r.id).map(toAssignment),
      destinationHospitalId: r.destinationHospitalId, createdAt: r.createdAt.getTime(), closedAt: ms(r.closedAt),
    }));
  }
  async insertIncident(i: Incident) {
    await this.db.transaction(async (tx) => {
      await tx.insert(t.incidents).values({
        id: i.id, kind: i.kind, status: i.status, userId: i.userId, title: i.title, address: i.address, lat: i.lat, lng: i.lng, accuracyM: i.accuracyM,
        source: i.source, destinationHospitalId: i.destinationHospitalId, createdAt: new Date(i.createdAt), closedAt: dt(i.closedAt),
      });
      if (i.agencies.length) await tx.insert(t.incidentAgencies).values(i.agencies.map((g, n) => ({ incidentId: i.id, agency: g.agency, role: g.role, position: n })));
      if (i.assignments.length) await tx.insert(t.assignments).values(i.assignments.map((a) => assignValues(a, { incidentId: i.id })));
    });
    return i;
  }
  async updateIncident(id: string, patch: Partial<Incident>) {
    await this.db.transaction(async (tx) => {
      const v: Partial<typeof t.incidents.$inferInsert> = {};
      if (patch.status !== undefined) v.status = patch.status;
      if (patch.destinationHospitalId !== undefined) v.destinationHospitalId = patch.destinationHospitalId;
      if (patch.closedAt !== undefined) v.closedAt = dt(patch.closedAt);
      if (patch.title !== undefined) v.title = patch.title;
      if (Object.keys(v).length) await tx.update(t.incidents).set(v).where(eq(t.incidents.id, id));
      if (patch.assignments) {
        await tx.delete(t.assignments).where(eq(t.assignments.incidentId, id));
        if (patch.assignments.length) await tx.insert(t.assignments).values(patch.assignments.map((a) => assignValues(a, { incidentId: id })));
      }
    });
    return this.incidentById(id);
  }
  async incidentById(id: string) {
    const rows = await this.db.select().from(t.incidents).where(eq(t.incidents.id, id));
    return (await this.hydrateIncidents(rows))[0] ?? null;
  }
  async incidents(f: IncidentFilter) {
    const w = [];
    if (f.userId) w.push(eq(t.incidents.userId, f.userId));
    if (f.publicOnly) w.push(isNull(t.incidents.userId));
    if (f.active) w.push(inArray(t.incidents.status, ACTIVE_STATUSES));
    if (f.since != null) w.push(gte(t.incidents.createdAt, new Date(f.since)));
    let q = this.db.select().from(t.incidents).where(w.length ? and(...w) : undefined).orderBy(desc(t.incidents.createdAt)).$dynamic();
    if (f.limit) q = q.limit(f.limit);
    return this.hydrateIncidents(await q);
  }
  async insertPing(incidentId: string, userId: string, at: number, loc: LatLng & { accuracyM: number | null }) {
    await this.db.insert(t.locationPings).values({ incidentId, userId, at: new Date(at), lat: loc.lat, lng: loc.lng, accuracyM: loc.accuracyM });
  }

  /* ---------- complaints ---------- */
  private async hydrateComplaints(rows: (typeof t.complaints.$inferSelect)[]): Promise<Complaint[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [evs, crews] = await Promise.all([
      this.db.select().from(t.complaintEvents).where(inArray(t.complaintEvents.complaintId, ids)).orderBy(asc(t.complaintEvents.position)),
      this.db.select().from(t.assignments).where(inArray(t.assignments.complaintId, ids)),
    ]);
    return rows.map((r) => {
      const crew = crews.find((a) => a.complaintId === r.id);
      return {
        id: r.id, userId: r.userId, category: r.category as Complaint['category'], title: r.title, description: r.description, address: r.address, area: r.area,
        lat: r.lat, lng: r.lng, status: r.status as Complaint['status'], agency: r.agency, photoUrl: r.photoUrl, art: r.art as Complaint['art'],
        createdAt: r.createdAt.getTime(), updatedAt: r.updatedAt.getTime(),
        timeline: evs.filter((e) => e.complaintId === r.id).map((e): TimelineItem => ({ label: e.label, at: ms(e.at), note: e.note, state: e.state as TimelineItem['state'] })),
        crew: crew ? toAssignment(crew) : null,
      };
    });
  }
  async insertComplaint(c: Complaint) {
    await this.db.transaction(async (tx) => {
      await tx.insert(t.complaints).values({
        id: c.id, userId: c.userId, category: c.category, title: c.title, description: c.description, address: c.address, area: c.area, lat: c.lat, lng: c.lng,
        status: c.status, agency: c.agency, photoUrl: c.photoUrl, art: c.art, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt),
      });
      if (c.timeline.length) await tx.insert(t.complaintEvents).values(c.timeline.map((e, n) => ({ complaintId: c.id, position: n, label: e.label, at: dt(e.at), note: e.note, state: e.state })));
      if (c.crew) await tx.insert(t.assignments).values(assignValues(c.crew, { complaintId: c.id }));
    });
    return c;
  }
  /** Bulk insert for seeding (thousands of rows in a few statements). */
  async insertComplaintsBulk(cs: Complaint[]) {
    for (let i = 0; i < cs.length; i += 500) {
      const chunk = cs.slice(i, i + 500);
      await this.db.insert(t.complaints).values(chunk.map((c) => ({
        id: c.id, userId: c.userId, category: c.category, title: c.title, description: c.description, address: c.address, area: c.area, lat: c.lat, lng: c.lng,
        status: c.status, agency: c.agency, photoUrl: c.photoUrl, art: c.art, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt),
      })));
    }
  }
  async updateComplaint(id: string, patch: Partial<Complaint>) {
    await this.db.transaction(async (tx) => {
      const v: Partial<typeof t.complaints.$inferInsert> = {};
      if (patch.status !== undefined) v.status = patch.status;
      if (patch.updatedAt !== undefined) v.updatedAt = new Date(patch.updatedAt);
      if (patch.photoUrl !== undefined) v.photoUrl = patch.photoUrl;
      if (Object.keys(v).length) await tx.update(t.complaints).set(v).where(eq(t.complaints.id, id));
      if (patch.timeline) {
        await tx.delete(t.complaintEvents).where(eq(t.complaintEvents.complaintId, id));
        if (patch.timeline.length) await tx.insert(t.complaintEvents).values(patch.timeline.map((e, n) => ({ complaintId: id, position: n, label: e.label, at: dt(e.at), note: e.note, state: e.state })));
      }
      if (patch.crew !== undefined) {
        await tx.delete(t.assignments).where(eq(t.assignments.complaintId, id));
        if (patch.crew) await tx.insert(t.assignments).values(assignValues(patch.crew, { complaintId: id }));
      }
    });
    return this.complaintById(id);
  }
  async complaintById(id: string) {
    return (await this.hydrateComplaints(await this.db.select().from(t.complaints).where(eq(t.complaints.id, id))))[0] ?? null;
  }
  async complaints(f: ComplaintFilter) {
    const w = [];
    if (f.userId) w.push(eq(t.complaints.userId, f.userId));
    if (f.status === 'open') w.push(sql`${t.complaints.status} <> 'resolved'`);
    if (f.status === 'resolved') w.push(eq(t.complaints.status, 'resolved'));
    if (f.pending) {
      w.push(or(
        eq(t.complaints.status, 'submitted'),
        sql`exists (select 1 from ${t.assignments} a where a.complaint_id = ${t.complaints.id} and a.arrived_at is null)`,
      )!);
    }
    let q = this.db.select().from(t.complaints).where(w.length ? and(...w) : undefined).orderBy(desc(t.complaints.createdAt)).$dynamic();
    if (f.limit) q = q.limit(f.limit);
    return this.hydrateComplaints(await q);
  }
  async complaintStats(dayStart: number, weekStart: number) {
    const day = new Date(dayStart), week = new Date(weekStart);
    const [c] = await this.db.select({
      received: sql<number>`count(*) filter (where ${t.complaints.createdAt} >= ${day})`,
      resolved: sql<number>`count(*) filter (where ${t.complaints.status} = 'resolved' and ${t.complaints.updatedAt} >= ${day})`,
    }).from(t.complaints);
    const areas = await this.db.select({ area: t.complaints.area, count: sql<number>`count(*)` }).from(t.complaints)
      .where(gte(t.complaints.createdAt, week)).groupBy(t.complaints.area).orderBy(desc(sql`count(*)`));
    return { receivedToday: Number(c.received), resolvedToday: Number(c.resolved), byArea: areas.map((a): WardCount => ({ area: a.area, count: Number(a.count) })) };
  }
  async responseTimes(since: number, until: number) {
    const rows = await this.db.select({ s: sql<number>`extract(epoch from (min(${t.assignments.arrivedAt}) - ${t.incidents.createdAt}))` })
      .from(t.incidents).innerJoin(t.assignments, eq(t.assignments.incidentId, t.incidents.id))
      .where(and(gte(t.incidents.createdAt, new Date(since)), lt(t.incidents.createdAt, new Date(until))))
      .groupBy(t.incidents.id, t.incidents.createdAt)
      .having(sql`min(${t.assignments.arrivedAt}) is not null`);
    return rows.map((r) => Number(r.s));
  }

  /* ---------- notifications ---------- */
  private toNtf = (r: typeof t.notifications.$inferSelect): Notification => ({
    id: r.id, userId: r.userId, kind: r.kind as Notification['kind'], tone: r.tone as Notification['tone'], icon: r.icon, title: r.title, body: r.body,
    refType: r.refType as Notification['refType'], refId: r.refId, createdAt: r.createdAt.getTime(), readAt: ms(r.readAt),
  });
  async insertNotification(n: Notification) {
    await this.db.insert(t.notifications).values({ ...n, createdAt: new Date(n.createdAt), readAt: dt(n.readAt) });
    return n;
  }
  async notifications(userId: string, kind?: NotificationKind) {
    const w = [eq(t.notifications.userId, userId)];
    if (kind) w.push(eq(t.notifications.kind, kind));
    return (await this.db.select().from(t.notifications).where(and(...w)).orderBy(desc(t.notifications.createdAt)).limit(200)).map(this.toNtf);
  }
  async markRead(userId: string, ids: string[] | null, at: number) {
    const w = [eq(t.notifications.userId, userId), isNull(t.notifications.readAt)];
    if (ids) { if (!ids.length) return; w.push(inArray(t.notifications.id, ids)); }
    await this.db.update(t.notifications).set({ readAt: new Date(at) }).where(and(...w));
  }

  async insertFeedback(userId: string | null, message: string, at: number) { await this.db.insert(t.feedback).values({ userId, message, at: new Date(at) }); }
  async audit(e: AuditEntry) { await this.db.insert(t.auditLog).values({ at: new Date(e.at), actor: e.actor, action: e.action, entity: e.entity, data: e.data ?? null }); }
  async prunePings(before: number) {
    const r = await this.db.delete(t.locationPings).where(lt(t.locationPings.at, new Date(before))).returning({ id: t.locationPings.id });
    return r.length;
  }

  /* ---------- seeding helpers ---------- */
  async isSeeded() { const [r] = await this.db.select({ n: sql<number>`count(*)` }).from(t.stations); return Number(r.n) > 0; }
  async seedCatalog(stations: Station[], units: Unit[]) {
    await this.db.insert(t.stations).values(stations.map((s) => ({ id: s.id, kind: s.kind, name: s.name, address: s.address, phone: s.phone, beds: s.beds, lat: s.lat, lng: s.lng }))).onConflictDoNothing();
    for (let i = 0; i < units.length; i += 200) {
      await this.db.insert(t.units).values(units.slice(i, i + 200).map((u) => ({
        id: u.id, callSign: u.callSign, kind: u.kind, status: u.status, stationId: u.stationId, officer: u.officer, patrol: u.patrol, lat: u.lat, lng: u.lng,
      }))).onConflictDoNothing();
    }
  }
}
