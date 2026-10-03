/**
 * Storage interface. Two implementations: shared/memory.ts (also used by the
 * browser's offline demo mode) and api/src/store/postgres.ts (PostGIS).
 * Domain logic lives in shared/services.ts and only talks to this interface.
 */
import type {
  Complaint, Incident, IncidentStatus, Notification, NotificationKind, Place, Station, StationKind, Unit, UnitKind, User, WardCount,
} from './contract.ts';
import type { LatLng } from './geo.ts';

export interface OtpRecord { codeHash: string; expiresAt: number; attempts: number }
export interface IncidentFilter { userId?: string; active?: boolean; since?: number; limit?: number; publicOnly?: boolean }
export interface ComplaintFilter { userId?: string; status?: 'all' | 'open' | 'resolved'; pending?: boolean; limit?: number }
export interface AuditEntry { at: number; actor: string | null; action: string; entity: string; data?: unknown }

export interface Repo {
  readonly kind: 'memory' | 'postgres';

  userById(id: string): Promise<User | null>;
  userByPhone(phone: string): Promise<User | null>;
  userByDevice(deviceId: string): Promise<User | null>;
  insertUser(u: User, deviceId: string | null): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;
  linkDevice(deviceId: string, userId: string): Promise<void>;

  putOtp(phone: string, rec: OtpRecord): Promise<void>;
  getOtp(phone: string): Promise<OtpRecord | null>;
  deleteOtp(phone: string): Promise<void>;

  places(userId: string): Promise<Place[]>;
  insertPlace(userId: string, p: Place): Promise<Place>;
  updatePlace(userId: string, id: string, patch: Partial<Place>): Promise<Place | null>;
  deletePlace(userId: string, id: string): Promise<boolean>;

  stations(kind?: StationKind): Promise<Station[]>;
  nearestStations(kind: StationKind, at: LatLng, limit: number): Promise<(Station & { distKm: number })[]>;
  units(): Promise<Unit[]>;
  unitById(id: string): Promise<Unit | null>;
  nearestAvailableUnit(kind: UnitKind, at: LatLng): Promise<Unit | null>;
  updateUnit(id: string, patch: Partial<Pick<Unit, 'status' | 'lat' | 'lng'>>): Promise<void>;

  nextId(seq: 'incident' | 'complaint'): Promise<number>;
  insertIncident(i: Incident): Promise<Incident>;
  updateIncident(id: string, patch: Partial<Incident>): Promise<Incident | null>;
  incidentById(id: string): Promise<Incident | null>;
  incidents(f: IncidentFilter): Promise<Incident[]>;
  insertPing(incidentId: string, userId: string, at: number, loc: LatLng & { accuracyM: number | null }): Promise<void>;

  insertComplaint(c: Complaint): Promise<Complaint>;
  updateComplaint(id: string, patch: Partial<Complaint>): Promise<Complaint | null>;
  complaintById(id: string): Promise<Complaint | null>;
  complaints(f: ComplaintFilter): Promise<Complaint[]>;
  complaintStats(dayStart: number, weekStart: number): Promise<{ receivedToday: number; resolvedToday: number; byArea: WardCount[] }>;
  responseTimes(since: number, until: number): Promise<number[]>;

  insertNotification(n: Notification): Promise<Notification>;
  notifications(userId: string, kind?: NotificationKind): Promise<Notification[]>;
  markRead(userId: string, ids: string[] | null, at: number): Promise<void>;

  insertFeedback(userId: string | null, message: string, at: number): Promise<void>;
  audit(e: AuditEntry): Promise<void>;
  /** DPDP retention: drop location pings older than `before`. Returns rows removed. */
  prunePings(before: number): Promise<number>;
}

export const ACTIVE_STATUSES: IncidentStatus[] = ['dispatched', 'en_route', 'on_scene'];
