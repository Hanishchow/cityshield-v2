/**
 * In-memory Repo. Used by the API when DATABASE_URL is absent and by the web
 * app's offline demo mode, so both behave identically to the Postgres store.
 */
import type { Complaint, Incident, Notification, NotificationKind, Place, Station, StationKind, Unit, UnitKind, User, WardCount } from './contract.ts';
import { haversineKm, type LatLng } from './geo.ts';
import { ACTIVE_STATUSES, type AuditEntry, type ComplaintFilter, type IncidentFilter, type OtpRecord, type Repo } from './repo.ts';
import { STATIONS, seedUnits } from './catalog.ts';

const clone = <T>(v: T): T => (v == null ? v : structuredClone(v));

export class MemoryRepo implements Repo {
  readonly kind = 'memory' as const;
  private users = new Map<string, User>();
  private devices = new Map<string, string>();
  private otps = new Map<string, OtpRecord>();
  private placeMap = new Map<string, Place[]>();
  private stationList: Station[] = STATIONS.map(({ pt: _pt, ...s }) => s);
  private unitMap = new Map<string, Unit>(seedUnits().map(({ pt: _pt, ...u }) => [u.id, u]));
  private seqs = { incident: 3188, complaint: 2042 };
  private incidentMap = new Map<string, Incident>();
  private complaintMap = new Map<string, Complaint>();
  private ntf: Notification[] = [];
  private pings: { incidentId: string; at: number }[] = [];
  readonly feedback: { userId: string | null; message: string; at: number }[] = [];
  readonly auditLog: AuditEntry[] = [];

  async userById(id: string) { return clone(this.users.get(id) ?? null); }
  async userByPhone(phone: string) { const n = normPhone(phone); for (const u of this.users.values()) if (u.phone && normPhone(u.phone) === n && u.phoneVerified) return clone(u); return null; }
  async userByDevice(deviceId: string) { const id = this.devices.get(deviceId); return id ? this.userById(id) : null; }
  async insertUser(u: User, deviceId: string | null) { this.users.set(u.id, clone(u)); if (deviceId) this.devices.set(deviceId, u.id); return clone(u); }
  async updateUser(id: string, patch: Partial<User>) {
    const u = this.users.get(id); if (!u) return null;
    const next = { ...u, ...clone(patch) }; this.users.set(id, next); return clone(next);
  }
  async linkDevice(deviceId: string, userId: string) { this.devices.set(deviceId, userId); }

  async putOtp(phone: string, rec: OtpRecord) { this.otps.set(normPhone(phone), { ...rec }); }
  async getOtp(phone: string) { return clone(this.otps.get(normPhone(phone)) ?? null); }
  async deleteOtp(phone: string) { this.otps.delete(normPhone(phone)); }

  async places(userId: string) { return clone(this.placeMap.get(userId) ?? []); }
  async insertPlace(userId: string, p: Place) { const l = this.placeMap.get(userId) ?? []; l.push(clone(p)); this.placeMap.set(userId, l); return clone(p); }
  async updatePlace(userId: string, id: string, patch: Partial<Place>) {
    const l = this.placeMap.get(userId) ?? []; const i = l.findIndex((p) => p.id === id); if (i < 0) return null;
    l[i] = { ...l[i], ...clone(patch) }; return clone(l[i]);
  }
  async deletePlace(userId: string, id: string) {
    const l = this.placeMap.get(userId) ?? []; const n = l.length;
    this.placeMap.set(userId, l.filter((p) => p.id !== id)); return n !== (this.placeMap.get(userId) ?? []).length;
  }

  async stations(kind?: StationKind) { return clone(kind ? this.stationList.filter((s) => s.kind === kind) : this.stationList); }
  async nearestStations(kind: StationKind, at: LatLng, limit: number) {
    return this.stationList.filter((s) => s.kind === kind).map((s) => ({ ...clone(s), distKm: haversineKm(at, s) }))
      .sort((a, b) => a.distKm - b.distKm).slice(0, limit);
  }
  async units() { return clone([...this.unitMap.values()]); }
  async unitById(id: string) { return clone(this.unitMap.get(id) ?? null); }
  async nearestAvailableUnit(kind: UnitKind, at: LatLng) {
    let best: Unit | null = null, bd = Infinity;
    for (const u of this.unitMap.values()) {
      if (u.kind !== kind || u.status !== 'available' || u.patrol) continue;
      const d = haversineKm(at, u); if (d < bd) { bd = d; best = u; }
    }
    return clone(best);
  }
  async updateUnit(id: string, patch: Partial<Pick<Unit, 'status' | 'lat' | 'lng'>>) {
    const u = this.unitMap.get(id); if (u) this.unitMap.set(id, { ...u, ...patch });
  }

  async nextId(seq: 'incident' | 'complaint') { return this.seqs[seq]++; }
  async insertIncident(i: Incident) { this.incidentMap.set(i.id, clone(i)); return clone(i); }
  async updateIncident(id: string, patch: Partial<Incident>) {
    const i = this.incidentMap.get(id); if (!i) return null;
    const next = { ...i, ...clone(patch) }; this.incidentMap.set(id, next); return clone(next);
  }
  async incidentById(id: string) { return clone(this.incidentMap.get(id) ?? null); }
  async incidents(f: IncidentFilter) {
    let l = [...this.incidentMap.values()];
    if (f.userId) l = l.filter((i) => i.userId === f.userId);
    if (f.publicOnly) l = l.filter((i) => i.userId == null);
    if (f.active) l = l.filter((i) => ACTIVE_STATUSES.includes(i.status));
    if (f.since != null) l = l.filter((i) => i.createdAt >= f.since!);
    l.sort((a, b) => b.createdAt - a.createdAt);
    return clone(f.limit ? l.slice(0, f.limit) : l);
  }
  async insertPing(incidentId: string, _userId: string, at: number) { this.pings.push({ incidentId, at }); }

  async insertComplaint(c: Complaint) { this.complaintMap.set(c.id, clone(c)); return clone(c); }
  async updateComplaint(id: string, patch: Partial<Complaint>) {
    const c = this.complaintMap.get(id); if (!c) return null;
    const next = { ...c, ...clone(patch) }; this.complaintMap.set(id, next); return clone(next);
  }
  async complaintById(id: string) { return clone(this.complaintMap.get(id) ?? null); }
  async complaints(f: ComplaintFilter) {
    let l = [...this.complaintMap.values()];
    if (f.userId) l = l.filter((c) => c.userId === f.userId);
    if (f.status === 'open') l = l.filter((c) => c.status !== 'resolved');
    if (f.status === 'resolved') l = l.filter((c) => c.status === 'resolved');
    if (f.pending) l = l.filter((c) => c.status === 'submitted' || (c.crew != null && c.crew.arrivedAt == null));
    l.sort((a, b) => b.createdAt - a.createdAt);
    return clone(f.limit ? l.slice(0, f.limit) : l);
  }
  async complaintStats(dayStart: number, weekStart: number) {
    let receivedToday = 0, resolvedToday = 0;
    const byArea = new Map<string, number>();
    for (const c of this.complaintMap.values()) {
      if (c.createdAt >= dayStart) receivedToday++;
      if (c.status === 'resolved' && c.updatedAt >= dayStart) resolvedToday++;
      if (c.createdAt >= weekStart) byArea.set(c.area, (byArea.get(c.area) ?? 0) + 1);
    }
    const areas: WardCount[] = [...byArea.entries()].map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count);
    return { receivedToday, resolvedToday, byArea: areas };
  }
  async responseTimes(since: number, until: number) {
    const out: number[] = [];
    for (const i of this.incidentMap.values()) {
      if (i.createdAt < since || i.createdAt >= until) continue;
      const first = i.assignments.map((a) => a.arrivedAt).filter((x): x is number => x != null).sort((a, b) => a - b)[0];
      if (first != null) out.push((first - i.createdAt) / 1000);
    }
    return out;
  }

  async insertNotification(n: Notification) { this.ntf.unshift(clone(n)); return clone(n); }
  async notifications(userId: string, kind?: NotificationKind) {
    return clone(this.ntf.filter((n) => n.userId === userId && (!kind || n.kind === kind)).sort((a, b) => b.createdAt - a.createdAt));
  }
  async markRead(userId: string, ids: string[] | null, at: number) {
    for (const n of this.ntf) if (n.userId === userId && n.readAt == null && (!ids || ids.includes(n.id))) n.readAt = at;
  }

  async insertFeedback(userId: string | null, message: string, at: number) { this.feedback.push({ userId, message, at }); }
  async audit(e: AuditEntry) { this.auditLog.push(e); if (this.auditLog.length > 5000) this.auditLog.splice(0, 1000); }
  async prunePings(before: number) { const n = this.pings.length; this.pings = this.pings.filter((p) => p.at >= before); return n - this.pings.length; }
}

export const normPhone = (p: string) => p.replace(/[^\d+]/g, '').replace(/^\+?91(?=\d{10}$)/, '');
