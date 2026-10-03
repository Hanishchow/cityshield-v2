import type {
  Complaint, ComplaintIn, GeoResult, Health, Incident, IncidentIn, LocationIn, MePatchIn, NearbyStation, Notification,
  OpsKpis, Place, PlaceIn, Session, SosIn, StationKind, StreamEvent, Unit, User, WardCount,
} from '@shared/contract.ts';

/**
 * Everything the UI can ask of the server. Implemented by HttpBackend (the real
 * API on :8787 via /v1) and OfflineBackend (the same domain engine running in
 * the browser, used when the API is unreachable).
 */
export interface Backend {
  readonly mode: 'live' | 'offline';
  health(): Promise<Health>;
  session(): Promise<Session>;
  me(): Promise<User>;
  updateMe(p: MePatchIn): Promise<User>;
  otpRequest(phone: string): Promise<{ sent: true; devCode?: string }>;
  otpVerify(phone: string, code: string): Promise<Session>;

  places(): Promise<Place[]>;
  addPlace(p: PlaceIn): Promise<Place>;
  updatePlace(id: string, p: Partial<PlaceIn>): Promise<Place>;
  deletePlace(id: string): Promise<void>;
  nearby(kind: StationKind, lat: number, lng: number): Promise<NearbyStation[]>;
  geoReverse(lat: number, lng: number): Promise<GeoResult>;
  geoSearch(q: string): Promise<GeoResult[]>;

  sos(b: SosIn, idempotencyKey: string): Promise<Incident>;
  raise(b: IncidentIn): Promise<Incident>;
  incidents(active: boolean): Promise<Incident[]>;
  incident(id: string): Promise<Incident>;
  setHospital(id: string, hospitalId: string | null): Promise<Incident>;
  cancel(id: string): Promise<Incident>;
  close(id: string): Promise<Incident>;
  replay(id: string): Promise<Incident>;
  ping(id: string, loc: LocationIn): Promise<void>;
  unit(id: string): Promise<Unit>;

  complaints(status: 'all' | 'open' | 'resolved'): Promise<Complaint[]>;
  complaint(id: string): Promise<Complaint>;
  upload(file: Blob): Promise<{ id: string; url: string }>;
  createComplaint(b: ComplaintIn): Promise<Complaint>;

  notifications(): Promise<Notification[]>;
  markRead(ids: string[] | null): Promise<void>;
  feedback(message: string): Promise<void>;

  opsKpis(): Promise<OpsKpis>;
  opsIncidents(): Promise<Incident[]>;
  opsUnits(): Promise<Unit[]>;
  opsWards(): Promise<WardCount[]>;
  opsSetComplaint(id: string, status: 'assigned' | 'progress' | 'resolved'): Promise<Complaint>;
  opsSetIncident(id: string, status: 'en_route' | 'on_scene' | 'resolved' | 'cancelled'): Promise<Incident>;

  /** Live events for the signed-in user. Returns an unsubscribe function. */
  subscribe(cb: (e: StreamEvent) => void): () => void;
  /** City-wide live events for the Command Centre. */
  subscribeOps(cb: (e: StreamEvent) => void): () => void;
  dispose(): void;
}

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(status: number, message: string, issues?: unknown) { super(message); this.status = status; this.issues = issues; }
}
