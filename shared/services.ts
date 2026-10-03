/**
 * City Shield domain logic: dispatch, complaints, notifications, lifecycle.
 *
 * Runs unchanged in two places: the API (over MemoryRepo or PostgresRepo) and
 * the browser's offline demo mode (over MemoryRepo). `tick()` advances
 * everything time-based; the caller runs it on an interval.
 */
import type {
  Assignment, CategoryKey, Complaint, ComplaintIn, Incident, IncidentKind, LocationIn, MePatchIn, Notification,
  NearbyStation, OpsKpis, Place, PlaceIn, ServiceKey, StationKind, StreamEvent, TimelineItem, Unit, UnitKind, User, WardCount,
} from './contract.ts';
import { CITY_BOUNDS, ISSUE_PT, USER_PT, gridRoute, rng, type SPoint } from './city.ts';
import { ANCHOR, inBengaluru, toLatLng, toSchematic, type LatLng } from './geo.ts';
import {
  AGENCY, CANNED_ROUTES, CITY_SPEED_KMH, CIVIC, COMPLAINT_ASSIGN_DELAY_MS, DEMO_SECONDS_PER_MINUTE, POLICY, SERVICES, WARDS,
  categoryOf, stationById,
} from './catalog.ts';
import { routeKm } from './progress.ts';
import { ACTIVE_STATUSES, type Repo } from './repo.ts';

export type Emit = (userId: string | null, ev: StreamEvent) => void;
export interface ServiceOptions {
  now?: () => number;
  /** Seconds of playback per minute of ETA; 60 = real time. */
  secondsPerMinute?: number;
  /** Demo mode: new accounts get starter data and ops endpoints are open. */
  demo?: boolean;
  emit?: Emit;
  id?: () => string;
}
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const DEFAULT_AREA_LABEL = 'Koramangala 5th Block, Bengaluru';
export const WARD_POINTS: Record<(typeof WARDS)[number], SPoint> = {
  Koramangala: [715, 405], 'HSR Layout': [965, 675], 'BTM Layout': [185, 765], Ejipura: [715, 135], Jakkasandra: [840, 495], Adugodi: [185, 135],
};
const AUTO_CLOSE_MS = 10 * 60_000;

export class CityShield {
  readonly now: () => number;
  readonly spm: number;
  readonly demo: boolean;
  private emit: Emit;
  private newId: () => string;

  readonly repo: Repo;

  constructor(repo: Repo, o: ServiceOptions = {}) {
    this.repo = repo;
    this.now = o.now ?? Date.now;
    this.spm = o.secondsPerMinute ?? DEMO_SECONDS_PER_MINUTE;
    this.demo = o.demo ?? true;
    this.emit = o.emit ?? (() => {});
    this.newId = o.id ?? (() => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)));
  }
  setEmitter(e: Emit) { this.emit = e; }

  /* ================= users ================= */
  async deviceUser(deviceId: string): Promise<User> {
    const found = await this.repo.userByDevice(deviceId);
    if (found) return found;
    const now = this.now();
    const user: User = {
      id: this.newId(), name: this.demo ? 'Shreyas Jayanna' : 'Citizen', phone: this.demo ? '+91 90087 76208' : null, phoneVerified: false,
      city: 'Bengaluru, Karnataka', role: 'citizen', lang: 'en', theme: 'system',
      prefs: { emergency: true, service: true, complaint: true }, shareLive: true,
      area: { label: DEFAULT_AREA_LABEL, ...ANCHOR, accuracyM: null, source: 'default' }, createdAt: now,
    };
    await this.repo.insertUser(user, deviceId);
    if (this.demo) await this.starterData(user);
    await this.repo.audit({ at: now, actor: user.id, action: 'user.create', entity: user.id });
    return user;
  }
  async me(userId: string): Promise<User> {
    const u = await this.repo.userById(userId);
    if (!u) throw new HttpError(401, 'Session expired');
    return u;
  }
  async updateMe(userId: string, p: MePatchIn): Promise<User> {
    const u = await this.me(userId);
    const patch: Partial<User> = {};
    if (p.name) patch.name = p.name;
    if (p.phone && p.phone !== u.phone) { patch.phone = p.phone; patch.phoneVerified = false; }
    if (p.city) patch.city = p.city;
    if (p.lang) patch.lang = p.lang;
    if (p.theme) patch.theme = p.theme;
    if (p.prefs) patch.prefs = { ...u.prefs, ...p.prefs };
    if (p.shareLive != null) patch.shareLive = p.shareLive;
    if (p.area) patch.area = { label: p.area.label, lat: p.area.lat, lng: p.area.lng, accuracyM: p.area.accuracyM ?? null, source: p.area.source ?? 'manual' };
    return (await this.repo.updateUser(userId, patch))!;
  }

  /* ================= places ================= */
  places(userId: string) { return this.repo.places(userId); }
  async addPlace(userId: string, p: PlaceIn): Promise<Place> {
    const ll = p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : guessLatLng(p.address);
    return this.repo.insertPlace(userId, { id: this.newId(), name: p.name, address: p.address, type: p.type, ...ll, createdAt: this.now() });
  }
  async updatePlace(userId: string, id: string, p: Partial<PlaceIn>) {
    const r = await this.repo.updatePlace(userId, id, p);
    if (!r) throw new HttpError(404, 'Place not found');
    return r;
  }
  async deletePlace(userId: string, id: string) {
    if (!(await this.repo.deletePlace(userId, id))) throw new HttpError(404, 'Place not found');
  }

  /* ================= nearby ================= */
  async nearby(kind: StationKind, at: LatLng, limit = 5): Promise<NearbyStation[]> {
    const l = await this.repo.nearestStations(kind, at, limit);
    return l.map(({ distKm, ...s }) => ({ ...s, km: Math.round(distKm * 10) / 10, minutes: Math.round(distKm * 2.4 + 9) }));
  }

  /* ================= incidents ================= */
  async raise(userId: string, kind: IncidentKind, loc: LocationIn, title?: string): Promise<Incident> {
    const user = await this.me(userId);
    const now = this.now();
    const policy = POLICY[kind];
    const at = { lat: loc.lat, lng: loc.lng };
    const dest = destPoint(at);
    const id = 'INC-' + (await this.repo.nextId('incident'));
    const assignments: Assignment[] = [];
    for (const uk of policy.units) {
      const a = await this.assign(uk, at, dest, now);
      if (a) assignments.push(a);
    }
    const inc: Incident = {
      id, kind, status: assignments.length ? 'en_route' : 'dispatched', userId, title: title ?? policy.title,
      address: loc.address || user.area.label, lat: at.lat, lng: at.lng, accuracyM: loc.accuracyM ?? null, source: loc.source ?? 'default',
      agencies: policy.agencies, assignments, destinationHospitalId: policy.units.includes('ambulance') ? (await this.nearby('hospital', at, 1))[0]?.id ?? null : null,
      createdAt: now, closedAt: null,
    };
    await this.repo.insertIncident(inc);
    await this.repo.audit({ at: now, actor: userId, action: `incident.${kind}`, entity: id, data: { units: assignments.map((a) => a.callSign) } });
    const area = shortArea(inc.address);
    if (kind === 'sos') {
      await this.notify(userId, { kind: 'emergency', tone: 'police', icon: 'siren', title: 'SOS sent', body: user.shareLive ? 'Your live location was shared with nearby responders.' : 'Your location was shared with nearby responders.', refType: 'incident', refId: id });
      for (const a of assignments) {
        await this.notify(userId, a.kind === 'ambulance'
          ? { kind: 'emergency', tone: 'ambulance', icon: 'ambulance', title: 'Ambulance Assigned', body: `${a.callSign} is on the way to your location.`, refType: 'incident', refId: id }
          : { kind: 'emergency', tone: 'police', icon: 'police', title: 'Police Dispatched', body: `${a.callSign} is on the way.`, refType: 'incident', refId: id });
      }
    } else {
      for (const a of assignments) {
        const s = SERVICES[a.kind];
        await this.notify(userId, { kind: kind === 'civic' ? 'service' : 'emergency', tone: kind as ServiceKey, icon: s.icon === 'car' ? 'police' : kind === 'civic' ? 'bin' : kind, title: `${s.vehicle} Dispatched`, body: `${a.callSign} is on the way to ${area}.`, refType: 'incident', refId: id });
      }
    }
    if (!assignments.length) {
      await this.notify(userId, { kind: 'emergency', tone: 'amber', icon: 'alert', title: 'All units busy', body: 'Your request is queued with the control room. Call 112 if this is life-threatening.', refType: 'incident', refId: id });
    }
    this.publishIncident(inc);
    return inc;
  }

  private async assign(kind: UnitKind, at: LatLng, dest: SPoint, now: number): Promise<Assignment | null> {
    const unit = await this.repo.nearestAvailableUnit(kind, at);
    if (!unit) return null;
    await this.repo.updateUnit(unit.id, { status: 'dispatched' });
    return this.buildAssignment(unit, dest, now);
  }
  private buildAssignment(unit: Unit, dest: SPoint, now: number): Assignment {
    const from = toSchematic(unit);
    const canned = CANNED_ROUTES[unit.callSign];
    const useCanned = canned && near(canned[canned.length - 1], dest) && near(canned[0], from);
    const route = useCanned ? canned.map((p) => [p[0], p[1]] as SPoint) : gridRoute(from, dest);
    const km = Math.max(0.2, routeKm(route));
    const etaMin = Math.max(1, Math.round((km / CITY_SPEED_KMH) * 60));
    const origin = stationById(unit.stationId);
    return {
      unitId: unit.id, callSign: unit.callSign, kind: unit.kind, originName: origin?.name ?? `${unit.callSign} (on patrol)`,
      originKind: origin?.kind ?? 'ambulance_base', route, dispatchedAt: now, durationMs: etaMin * this.spm * 1000, etaMin, km, arrivedAt: null,
      officer: unit.officer,
    };
  }

  async incident(userId: string | null, id: string): Promise<Incident> {
    const i = await this.repo.incidentById(id);
    if (!i || (userId && i.userId !== userId && !(await this.isOps(userId)))) throw new HttpError(404, 'Incident not found');
    return i;
  }
  incidents(userId: string, active: boolean) { return this.repo.incidents({ userId, active, limit: 50 }); }

  async setHospital(userId: string, id: string, hospitalId: string | null) {
    const i = await this.incident(userId, id);
    if (hospitalId && !stationById(hospitalId)) throw new HttpError(400, 'Unknown hospital');
    const next = (await this.repo.updateIncident(i.id, { destinationHospitalId: hospitalId }))!;
    this.publishIncident(next);
    return next;
  }
  async cancel(userId: string, id: string) { return this.close(userId, id, 'cancelled'); }
  async close(actor: string | null, id: string, status: 'resolved' | 'cancelled') {
    const i = await this.incident(actor, id);
    if (!ACTIVE_STATUSES.includes(i.status)) return i;
    const now = this.now();
    await this.releaseUnits(i.assignments);
    const next = (await this.repo.updateIncident(i.id, { status, closedAt: now }))!;
    await this.repo.audit({ at: now, actor, action: `incident.${status}`, entity: id });
    if (i.userId && status === 'cancelled') await this.notify(i.userId, { kind: 'emergency', tone: 'police', icon: 'x', title: 'Request cancelled', body: `${id} was cancelled. Responders have been stood down.`, refType: 'incident', refId: id });
    this.publishIncident(next);
    return next;
  }
  /** Demo only: run the same trip again from the start. */
  async replay(userId: string, id: string) {
    if (!this.demo) throw new HttpError(403, 'Replay is only available in demo mode');
    const i = await this.incident(userId, id);
    const now = this.now();
    const assignments = i.assignments.map((a) => ({ ...a, dispatchedAt: now, arrivedAt: null }));
    for (const a of assignments) await this.repo.updateUnit(a.unitId, { status: 'dispatched' });
    const next = (await this.repo.updateIncident(i.id, { assignments, status: 'en_route', closedAt: null }))!;
    this.publishIncident(next);
    return next;
  }
  async ping(userId: string, id: string, loc: LocationIn) {
    const i = await this.incident(userId, id);
    await this.repo.insertPing(i.id, userId, this.now(), { lat: loc.lat, lng: loc.lng, accuracyM: loc.accuracyM ?? null });
  }
  async unit(id: string) {
    const u = await this.repo.unitById(id);
    if (!u) throw new HttpError(404, 'Unit not found');
    return u;
  }

  /* ================= complaints ================= */
  complaints(userId: string, status: 'all' | 'open' | 'resolved') { return this.repo.complaints({ userId, status }); }
  async complaint(userId: string | null, id: string) {
    const c = await this.repo.complaintById(id);
    if (!c || (userId && c.userId !== userId && !(await this.isOps(userId)))) throw new HttpError(404, 'Complaint not found');
    return c;
  }
  async createComplaint(userId: string, input: ComplaintIn, photoUrl: string | null): Promise<Complaint> {
    const user = await this.me(userId);
    const now = this.now();
    const cat = categoryOf(input.category);
    const id = 'CS-' + (await this.repo.nextId('complaint'));
    const address = input.location.address.trim();
    const title = input.title?.trim() || `${cat.title} – ${address.split(',')[0]}`;
    const c: Complaint = {
      id, userId, category: cat.key, title, description: input.description?.trim() ?? '', address, area: wardOf({ lat: input.location.lat, lng: input.location.lng }),
      lat: input.location.lat, lng: input.location.lng, status: 'submitted', agency: cat.agency, photoUrl, art: null, createdAt: now, updatedAt: now,
      timeline: [
        { label: 'Complaint Submitted', at: now, note: null, state: 'done' },
        { label: `Assigned to ${cat.agency}`, at: null, note: 'Usually within 1 hour', state: 'cur' },
        { label: 'Work in Progress', at: null, note: 'Pending', state: 'todo' },
      ],
      crew: null,
    };
    await this.repo.insertComplaint(c);
    await this.repo.audit({ at: now, actor: userId, action: 'complaint.create', entity: id, data: { category: cat.key } });
    if (user.prefs.complaint) await this.notify(userId, { kind: 'complaint', tone: 'amber', icon: 'clipboard', title: 'Complaint Submitted', body: `${id} · ${title}`, refType: 'complaint', refId: id });
    this.publishComplaint(c);
    return c;
  }
  async opsSetComplaint(actor: string | null, id: string, status: 'assigned' | 'progress' | 'resolved') {
    const c = await this.complaint(null, id);
    const now = this.now();
    let next: Complaint | null = c;
    if (status === 'resolved' && c.status !== 'resolved') {
      if (c.crew) await this.releaseUnits([c.crew]);
      const timeline: TimelineItem[] = c.timeline.map((t) => ({ ...t, state: 'done' as const, at: t.at ?? now, note: t.state === 'todo' ? null : t.note }));
      timeline.push({ label: 'Resolved', at: now, note: 'Closed by ' + c.agency, state: 'done' });
      next = await this.repo.updateComplaint(id, { status: 'resolved', timeline, updatedAt: now, crew: c.crew ? { ...c.crew, arrivedAt: c.crew.arrivedAt ?? now } : null });
      if (c.userId) await this.notify(c.userId, { kind: 'complaint', tone: 'civic', icon: 'checkC', title: 'Complaint resolved', body: `${id} · ${c.title} was resolved by ${c.agency}.`, refType: 'complaint', refId: id }, 'complaint');
    } else if (c.status === 'submitted') {
      next = await this.assignComplaint(c, now);
    }
    await this.repo.audit({ at: now, actor, action: `complaint.${status}`, entity: id });
    if (next) this.publishComplaint(next);
    return next!;
  }
  private async assignComplaint(c: Complaint, now: number): Promise<Complaint | null> {
    const pt = destPoint(c, ISSUE_PT);
    const crewUnit = await this.repo.nearestAvailableUnit('crew', c);
    let crew: Assignment | null = null;
    if (crewUnit) { await this.repo.updateUnit(crewUnit.id, { status: 'dispatched' }); crew = this.buildAssignment(crewUnit, pt, now); }
    const timeline: TimelineItem[] = [
      { label: 'Complaint Submitted', at: c.createdAt, note: null, state: 'done' },
      { label: `Assigned to ${c.agency}`, at: now, note: null, state: 'done' },
      { label: 'Work in Progress', at: null, note: crew ? 'Crew on the way · expected by Tomorrow, 10:00 AM' : 'Crew to be scheduled', state: 'cur' },
    ];
    const next = await this.repo.updateComplaint(c.id, { status: 'progress', timeline, crew, updatedAt: now });
    if (c.userId) await this.notify(c.userId, { kind: 'complaint', tone: 'amber', icon: 'clipboard', title: 'Complaint Update', body: `${c.id} assigned to ${c.agency}.${crew ? ' A crew is on the way.' : ''}`, refType: 'complaint', refId: c.id }, 'complaint');
    return next;
  }

  /* ================= notifications ================= */
  notifications(userId: string, kind?: Notification['kind']) { return this.repo.notifications(userId, kind); }
  markRead(userId: string, ids: string[] | null) { return this.repo.markRead(userId, ids, this.now()); }
  private async notify(userId: string, n: Omit<Notification, 'id' | 'userId' | 'createdAt' | 'readAt'>, pref?: 'complaint') {
    if (pref) { const u = await this.repo.userById(userId); if (u && !u.prefs[pref]) return; }
    const full: Notification = { ...n, id: this.newId(), userId, createdAt: this.now(), readAt: null };
    await this.repo.insertNotification(full);
    this.emit(userId, { type: 'notification', notification: full });
  }

  /* ================= lifecycle ================= */
  /** Advance time-based state: arrivals, auto-assignment, auto-close. Idempotent. */
  async tick(): Promise<void> {
    const now = this.now();
    for (const inc of await this.repo.incidents({ active: true })) {
      let changed = false;
      const assignments = inc.assignments.map((a) => ({ ...a }));
      for (const a of assignments) {
        if (a.arrivedAt == null && now - a.dispatchedAt >= a.durationMs) {
          a.arrivedAt = a.dispatchedAt + a.durationMs; changed = true;
          await this.repo.updateUnit(a.unitId, { status: 'on_scene' });
          this.emit(inc.userId, { type: 'arrived', incidentId: inc.id, unitId: a.unitId, callSign: a.callSign, kind: a.kind, ref: 'incident' });
          if (inc.userId) await this.notify(inc.userId, { kind: a.kind === 'civic' ? 'service' : 'emergency', tone: a.kind === 'crew' ? 'amber' : a.kind, icon: SERVICES[a.kind].icon === 'car' ? 'police' : a.kind === 'civic' ? 'bin' : a.kind === 'crew' ? 'truck' : a.kind, title: SERVICES[a.kind].arrived, body: `${a.callSign} reached ${shortArea(inc.address)}.`, refType: 'incident', refId: inc.id });
        }
      }
      const allIn = assignments.length > 0 && assignments.every((a) => a.arrivedAt != null);
      let status = inc.status;
      if (allIn && status !== 'on_scene') { status = 'on_scene'; changed = true; }
      if (allIn && this.demo && inc.userId) {
        const last = Math.max(...assignments.map((a) => a.arrivedAt!));
        if (now - last > AUTO_CLOSE_MS) { await this.close(null, inc.id, 'resolved'); continue; }
      }
      if (changed) this.publishIncident((await this.repo.updateIncident(inc.id, { assignments, status }))!);
    }
    for (const c of await this.repo.complaints({ pending: true })) {
      if (c.status === 'submitted' && c.userId && now - c.createdAt >= COMPLAINT_ASSIGN_DELAY_MS) {
        const next = await this.assignComplaint(c, now);
        if (next) this.publishComplaint(next);
      } else if (c.crew && c.crew.arrivedAt == null && now - c.crew.dispatchedAt >= c.crew.durationMs) {
        const crew = { ...c.crew, arrivedAt: c.crew.dispatchedAt + c.crew.durationMs };
        await this.repo.updateUnit(crew.unitId, { status: 'on_scene' });
        const timeline = c.timeline.map((t) => (t.state === 'cur' ? { ...t, note: 'Crew on site · work under way' } : t));
        const next = await this.repo.updateComplaint(c.id, { crew, timeline, updatedAt: now });
        this.emit(c.userId, { type: 'arrived', incidentId: c.id, unitId: crew.unitId, callSign: crew.callSign, kind: 'crew', ref: 'complaint' });
        if (next) this.publishComplaint(next);
      }
    }
  }
  private async releaseUnits(as: Assignment[]) {
    for (const a of as) {
      const u = await this.repo.unitById(a.unitId);
      const home = stationById(u?.stationId ?? null);
      await this.repo.updateUnit(a.unitId, home ? { status: 'available', lat: home.lat, lng: home.lng } : { status: 'available' });
    }
  }
  private publishIncident(i: Incident) { this.emit(i.userId, { type: 'incident', incident: i }); if (i.userId) this.emit(null, { type: 'incident', incident: i }); }
  private publishComplaint(c: Complaint) { this.emit(c.userId, { type: 'complaint', complaint: c }); if (c.userId) this.emit(null, { type: 'complaint', complaint: c }); }

  /* ================= command centre ================= */
  async isOps(userId: string | null) {
    if (!userId) return false;
    const u = await this.repo.userById(userId);
    return !!u && (u.role === 'operator' || u.role === 'admin');
  }
  async opsKpis(): Promise<OpsKpis> {
    const now = this.now();
    const day = startOfDay(now), month = 30 * 86_400_000;
    const active = await this.repo.incidents({ active: true });
    const cur = await this.repo.responseTimes(now - month, now + 1);
    const prev = await this.repo.responseTimes(now - 2 * month, now - month);
    const stats = await this.repo.complaintStats(day, now - 7 * 86_400_000);
    const units = (await this.repo.units()).filter((u) => u.status !== 'off_duty');
    const byKind = { police: 0, ambulance: 0, fire: 0, civic: 0, crew: 0 } as Record<UnitKind, number>;
    for (const u of units) byKind[u.kind]++;
    return {
      activeIncidents: active.length, avgResponseSec: avg(cur), avgResponsePrevSec: avg(prev),
      complaintsResolvedToday: stats.resolvedToday, complaintsReceivedToday: stats.receivedToday, unitsOnDuty: units.length, unitsByKind: byKind,
    };
  }
  async opsIncidents(): Promise<Incident[]> {
    const day = this.now() - 86_400_000;
    const recent = await this.repo.incidents({ since: day, limit: 40 });
    return recent.filter((i) => i.status !== 'cancelled').slice(0, 14);
  }
  async opsUnits(): Promise<Unit[]> {
    return (await this.repo.units()).filter((u) => u.patrol || u.stationId);
  }
  async wards(): Promise<WardCount[]> {
    const s = await this.repo.complaintStats(startOfDay(this.now()), this.now() - 7 * 86_400_000);
    return s.byArea.filter((w) => (WARDS as readonly string[]).includes(w.area));
  }
  async opsSetIncident(actor: string | null, id: string, status: 'en_route' | 'on_scene' | 'resolved' | 'cancelled') {
    if (status === 'resolved' || status === 'cancelled') return this.close(actor, id, status);
    const next = await this.repo.updateIncident(id, { status });
    if (!next) throw new HttpError(404, 'Incident not found');
    this.publishIncident(next);
    return next;
  }

  /* ================= demo seed ================= */
  /** Starter content for a demo account — the prototype's sample data, now real records. */
  async starterData(user: User) {
    const now = this.now(), uid = user.id, H = 3_600_000;
    const at = (pt: SPoint) => toLatLng(pt);
    for (const [name, address, type, pt] of [
      ['Home', 'Koramangala 5th Block, Bengaluru', 'home', USER_PT],
      ['Work', 'Indiranagar, Bengaluru', 'work', [1300, -210]],
      ['Gym', 'Indiranagar 100 Feet Road, Bengaluru', 'frequent', [1250, -150]],
      ['Parents Home', 'RR Nagar, Bengaluru', 'frequent', [-1900, 400]],
    ] as [string, string, Place['type'], SPoint][]) {
      await this.repo.insertPlace(uid, { id: this.newId(), name, address, type, ...at(pt), createdAt: now });
    }
    const mk = async (cat: CategoryKey, title: string, address: string, status: Complaint['status'], ago: number, desc: string, art: Complaint['art'], pt: SPoint, steps: TimelineItem[], withCrew: boolean) => {
      const id = 'CS-' + (await this.repo.nextId('complaint'));
      const ll = at(pt);
      let crew: Assignment | null = null;
      if (withCrew) {
        const cu = await this.repo.nearestAvailableUnit('crew', ll);
        if (cu) { await this.repo.updateUnit(cu.id, { status: 'dispatched' }); crew = this.buildAssignment(cu, pt, now); }
      }
      await this.repo.insertComplaint({
        id, userId: uid, category: cat, title, description: desc, address, area: wardOf(ll), ...ll, status, agency: categoryOf(cat).agency,
        photoUrl: null, art, createdAt: now - ago, updatedAt: now - ago / 2, timeline: steps, crew,
      });
      return id;
    };
    const potholeId = await mk('pothole', 'Pothole on 80 Feet Road', 'Koramangala 5th Block, Bengaluru', 'progress', 3 * H,
      'Deep pothole near the signal. Two-wheelers are swerving into the next lane to avoid it.', 'pothole', ISSUE_PT,
      [{ label: 'Complaint Submitted', at: now - 3 * H, note: null, state: 'done' }, { label: `Assigned to ${CIVIC.short}`, at: now - 2.2 * H, note: null, state: 'done' }, { label: 'Work in Progress', at: null, note: 'Expected by Tomorrow, 10:00 AM', state: 'cur' }], true);
    await mk('signal', 'Traffic Signal Issue', 'Sony World Junction, Koramangala', 'resolved', 20 * H, 'Signal stuck on red for all directions during evening peak.', 'street', [520, 180],
      [{ label: 'Complaint Submitted', at: now - 20 * H, note: null, state: 'done' }, { label: 'Assigned to Traffic Police', at: now - 19.8 * H, note: null, state: 'done' }, { label: 'Resolved', at: now - 18.4 * H, note: null, state: 'done' }], false);
    await mk('civic', 'Garbage Collection', 'Zone 3, Koramangala', 'progress', 22 * H, 'Garbage not collected on 6th Cross for two days.', null, [780, 450],
      [{ label: 'Complaint Submitted', at: now - 22 * H, note: null, state: 'done' }, { label: `Assigned to ${CIVIC.short}`, at: now - 21.3 * H, note: null, state: 'done' }, { label: 'Pickup scheduled', at: null, note: 'Today, garbage van on the way', state: 'cur' }], false);

    /* one live ambulance trip, so the home screen shows tracking straight away */
    await this.raise(uid, 'ambulance', { ...ANCHOR, address: user.area.label, source: 'default', accuracyM: 12 }, 'Medical emergency');
    const old: [Notification['kind'], Notification['tone'], string, string, string, number, Notification['refType'], string | null][] = [
      ['emergency', 'police', 'police', 'Police Updated', 'Route cleared. You can proceed safely.', 1.4 * H, null, null],
      ['service', 'civic', 'bin', `${CIVIC.short} Notification`, 'Garbage van is 1.5 km away from your area', 1.7 * H, null, null],
      ['complaint', 'amber', 'clipboard', 'Complaint Update', 'Your pothole complaint is now in progress.', 2.2 * H, 'complaint', potholeId],
      ['emergency', 'fire', 'fire', 'Fire Service Alert', 'Fire truck is en route to the location.', 3.4 * H, null, null],
    ];
    for (const [kind, tone, icon, title, body, ago, refType, refId] of old) {
      await this.repo.insertNotification({ id: this.newId(), userId: uid, kind, tone, icon, title, body, refType, refId, createdAt: now - ago, readAt: ago > 2 * H ? now : null });
    }
  }

  /** City-wide sample data for the Command Centre (public incidents, complaint history). */
  async seedPublic() {
    const now = this.now(), M = 60_000, D = 86_400_000;
    const existing = await this.repo.incidents({ publicOnly: true, limit: 1 });
    if (existing.length) return;
    const pub: [string, IncidentKind, SPoint, Incident['status'], number, string][] = [
      ['Road accident', 'ambulance', [520, 180], 'on_scene', 2, 'Sony World Junction, Koramangala'],
      ['Fire alarm – commercial building', 'fire', [900, 630], 'en_route', 6, 'HSR Layout, Sector 1'],
      ['Medical emergency', 'ambulance', [650, 350], 'en_route', 9, 'Koramangala 5th Block'],
      ['Garbage pile-up', 'civic', [250, 270], 'dispatched', 21, 'Adugodi Main Road'],
      ['Water logging', 'civic', [780, 90], 'dispatched', 34, 'Ejipura Main Road'],
      ['Traffic signal failure', 'police', [-10, 720], 'resolved', 60, 'Madiwala Junction'],
    ];
    for (const [title, kind, pt, status, ago, address] of pub) {
      const id = 'INC-' + (await this.repo.nextId('incident'));
      const agencies = title.startsWith('Road') ? [{ agency: AGENCY.ambulance, role: 'primary' as const }, { agency: AGENCY.traffic, role: 'secondary' as const }]
        : title.startsWith('Water') ? [{ agency: `${CIVIC.short} Storm Water Drains`, role: 'primary' as const }]
        : title.startsWith('Traffic') ? [{ agency: AGENCY.traffic, role: 'primary' as const }] : POLICY[kind].agencies;
      await this.repo.insertIncident({
        id, kind, status, userId: null, title, address, ...toLatLng(pt), accuracyM: 10, source: 'gps', agencies, assignments: [],
        destinationHospitalId: null, createdAt: now - ago * M, closedAt: status === 'resolved' ? now - 20 * M : null,
      });
    }
    /* 60 days of response history (≈7–9 min now, slower the month before) */
    const r = rng(77);
    for (let i = 0; i < 90; i++) {
      const ago = D + r() * 59 * D, older = ago > 30 * D;
      const resp = (older ? 470 + r() * 240 : 380 + r() * 170) * 1000;
      const id = 'INC-' + (await this.repo.nextId('incident'));
      const created = now - ago;
      await this.repo.insertIncident({
        id, kind: 'ambulance', status: 'resolved', userId: null, title: 'Medical emergency', address: 'Bengaluru', ...ANCHOR, accuracyM: 20, source: 'gps',
        agencies: POLICY.ambulance.agencies, destinationHospitalId: null, createdAt: created, closedAt: created + resp + 20 * M,
        assignments: [{ unitId: 'hist', callSign: 'AMB', kind: 'ambulance', originName: 'History', originKind: 'ambulance_base', route: [[0, 0], [1, 0]], dispatchedAt: created, durationMs: resp, etaMin: 8, km: 2, arrivedAt: created + resp, officer: null }],
      });
    }
    /* a week of complaints across the zone's wards */
    const weights = [142, 118, 96, 71, 55, 43];
    const cats: CategoryKey[] = ['pothole', 'civic', 'light', 'water', 'signal', 'other'];
    for (let w = 0; w < WARDS.length; w++) {
      for (let n = 0; n < weights[w]; n++) {
        const ward = WARDS[w];
        const today = n < Math.round(weights[w] * 0.33);
        const created = today ? startOfDay(now) + r() * Math.max(1, now - startOfDay(now)) : now - D - r() * 6 * D;
        const resolved = today ? r() < 0.74 : r() < 0.86;
        const cat = cats[Math.floor(r() * cats.length)];
        const p = WARD_POINTS[ward];
        const id = 'CS-' + (await this.repo.nextId('complaint'));
        await this.repo.insertComplaint({
          id, userId: null, category: cat, title: `${categoryOf(cat).title} – ${ward}`, description: '', address: `${ward}, Bengaluru`, area: ward,
          ...toLatLng([p[0] + (r() - 0.5) * 120, p[1] + (r() - 0.5) * 120]), status: resolved ? 'resolved' : 'progress', agency: categoryOf(cat).agency,
          photoUrl: null, art: null, createdAt: created, updatedAt: resolved ? Math.min(now, created + (1 + r() * 5) * 3_600_000) : created,
          timeline: [], crew: null,
        });
      }
    }
  }
}

/* ---------- helpers ---------- */
function near(a: SPoint, b: SPoint) { return Math.abs(a[0] - b[0]) < 1 && Math.abs(a[1] - b[1]) < 1; }
const MARGIN = 40;
/** Where to draw/route to on the schematic; far-away real locations collapse to the default point. */
export function destPoint(ll: LatLng, fallback: SPoint = USER_PT): SPoint {
  if (!inBengaluru(ll)) return fallback;
  const p = toSchematic(ll);
  if (p[0] < CITY_BOUNDS.x0 + MARGIN || p[0] > CITY_BOUNDS.x1 - MARGIN || p[1] < CITY_BOUNDS.y0 + MARGIN || p[1] > CITY_BOUNDS.y1 - MARGIN) return fallback;
  return [Math.round(p[0]), Math.round(p[1])];
}
export function wardOf(ll: LatLng): string {
  const p = toSchematic(ll);
  let best: string = WARDS[0], bd = Infinity;
  for (const [w, q] of Object.entries(WARD_POINTS)) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = w; } }
  return best;
}
export const shortArea = (s: string) => String(s).replace(/,\s*Bengaluru$/, '');
function guessLatLng(address: string): LatLng {
  const a = address.toLowerCase();
  for (const [w, p] of Object.entries(WARD_POINTS)) if (a.includes(w.toLowerCase())) return toLatLng(p);
  return { ...ANCHOR };
}
function avg(l: number[]) { return l.length ? Math.round(l.reduce((s, x) => s + x, 0) / l.length) : null; }
/** Start of the current day in India Standard Time (UTC+5:30). */
export function startOfDay(now: number) {
  const IST = 5.5 * 3_600_000;
  return Math.floor((now + IST) / 86_400_000) * 86_400_000 - IST;
}
