/**
 * GraphQL endpoint (/graphql, GraphiQL at /graphiql outside production).
 *
 * The same domain services and the same bearer-token auth as the REST API,
 * so the two can never disagree. REST remains the primary contract (and the
 * only one with the SOS idempotency + rate-limit carve-out); GraphQL is for
 * dashboards and integrations that want to pick their fields in one round trip.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import mercurius from 'mercurius';
import { IncidentIn, LocationIn, SERVICE_KEYS } from '../../shared/contract.ts';
import { CityShield, HttpError } from '../../shared/services.ts';
import { config } from './config.ts';

const schema = /* GraphQL */ `
  scalar JSON

  type Area { label: String!, lat: Float!, lng: Float!, accuracyM: Int, source: String! }
  type Prefs { emergency: Boolean!, service: Boolean!, complaint: Boolean! }
  type User { id: ID!, name: String!, phone: String, phoneVerified: Boolean!, city: String!, role: String!, lang: String!, theme: String!, prefs: Prefs!, shareLive: Boolean!, area: Area! }
  type Officer { name: String!, rank: String!, phone: String! }
  type Assignment {
    unitId: ID!, callSign: String!, kind: String!, originName: String!, originKind: String!
    "schematic route the unit drives along (clients animate it)"
    route: JSON!
    dispatchedAt: Float!, durationMs: Int!, etaMin: Int!, km: Float!, arrivedAt: Float, officer: Officer
  }
  type Agency { agency: String!, role: String! }
  type Incident {
    id: ID!, kind: String!, status: String!, title: String!, address: String!, lat: Float!, lng: Float!, accuracyM: Int, source: String!
    agencies: [Agency!]!, assignments: [Assignment!]!, destinationHospitalId: String, createdAt: Float!, closedAt: Float
  }
  type TimelineItem { label: String!, at: Float, note: String, state: String! }
  type Complaint {
    id: ID!, category: String!, title: String!, description: String!, address: String!, area: String!, lat: Float!, lng: Float!
    status: String!, agency: String!, photoUrl: String, createdAt: Float!, updatedAt: Float!, timeline: [TimelineItem!]!, crew: Assignment
  }
  type Notification { id: ID!, kind: String!, tone: String!, icon: String!, title: String!, body: String!, refType: String, refId: String, createdAt: Float!, readAt: Float }
  type Station { id: ID!, kind: String!, name: String!, address: String!, phone: String, lat: Float!, lng: Float!, beds: String, km: Float!, minutes: Int! }
  type OpsKpis { activeIncidents: Int!, avgResponseSec: Int, avgResponsePrevSec: Int, complaintsResolvedToday: Int!, complaintsReceivedToday: Int!, unitsOnDuty: Int!, unitsByKind: JSON! }
  type WardCount { area: String!, count: Int! }
  type Health { ok: Boolean!, store: String!, demo: Boolean!, serverTime: Float! }

  type Query {
    health: Health!
    me: User!
    incidents(active: Boolean = false): [Incident!]!
    incident(id: ID!): Incident
    complaints(status: String = "all"): [Complaint!]!
    complaint(id: ID!): Complaint
    notifications(kind: String): [Notification!]!
    nearbyHospitals(lat: Float!, lng: Float!): [Station!]!
    opsKpis: OpsKpis!
    opsIncidents: [Incident!]!
    wards: [WardCount!]!
  }
  type Mutation {
    "Request police / ambulance / fire / civic at a location (simulated dispatch)."
    requestService(kind: String!, lat: Float!, lng: Float!, address: String): Incident!
    "Mark notifications read; omit ids to mark all."
    markNotificationsRead(ids: [ID!]): Boolean!
  }
`;

interface Ctx { uid: () => Promise<string>; ops: () => Promise<void> }

export async function registerGraphql(app: FastifyInstance, svc: CityShield, repoKind: string) {
  const resolvers = {
    Query: {
      health: () => ({ ok: true, store: repoKind, demo: config.demo, serverTime: Date.now() }),
      me: async (_: unknown, __: unknown, c: Ctx) => svc.me(await c.uid()),
      incidents: async (_: unknown, a: { active: boolean }, c: Ctx) => svc.incidents(await c.uid(), a.active),
      incident: async (_: unknown, a: { id: string }, c: Ctx) => svc.incident(await c.uid(), a.id).catch(() => null),
      complaints: async (_: unknown, a: { status: string }, c: Ctx) => svc.complaints(await c.uid(), (['all', 'open', 'resolved'].includes(a.status) ? a.status : 'all') as 'all'),
      complaint: async (_: unknown, a: { id: string }, c: Ctx) => svc.complaint(await c.uid(), a.id).catch(() => null),
      notifications: async (_: unknown, a: { kind?: 'emergency' | 'service' | 'complaint' }, c: Ctx) => svc.notifications(await c.uid(), a.kind),
      nearbyHospitals: (_: unknown, a: { lat: number; lng: number }) => svc.nearby('hospital', LocationIn.pick({ lat: true, lng: true }).parse(a)),
      opsKpis: async (_: unknown, __: unknown, c: Ctx) => { await c.ops(); return svc.opsKpis(); },
      opsIncidents: async (_: unknown, __: unknown, c: Ctx) => { await c.ops(); return svc.opsIncidents(); },
      wards: async (_: unknown, __: unknown, c: Ctx) => { await c.ops(); return svc.wards(); },
    },
    Mutation: {
      requestService: async (_: unknown, a: { kind: string; lat: number; lng: number; address?: string }, c: Ctx) => {
        if (!(SERVICE_KEYS as readonly string[]).includes(a.kind)) throw new HttpError(400, `kind must be one of ${SERVICE_KEYS.join(', ')}`);
        const body = IncidentIn.parse({ kind: a.kind, location: { lat: a.lat, lng: a.lng, address: a.address } });
        return svc.raise(await c.uid(), body.kind, body.location);
      },
      markNotificationsRead: async (_: unknown, a: { ids?: string[] }, c: Ctx) => { await svc.markRead(await c.uid(), a.ids ?? null); return true; },
    },
  };

  await app.register(mercurius, {
    schema,
    resolvers,
    graphiql: !config.prod,
    /* depth/complexity guard: nested queries cannot fan out the database */
    queryDepth: 6,
    errorFormatter: (execution, ctx) => {
      const r = mercurius.defaultErrorFormatter(execution, ctx);
      for (const e of execution.errors ?? []) {
        const orig = (e as { originalError?: unknown }).originalError;
        if (orig instanceof HttpError) { r.statusCode = 200; (e as { extensions?: object }).extensions = { code: orig.status }; }
      }
      return r;
    },
    context: (req: FastifyRequest): Ctx => ({
      uid: async () => {
        try { await req.jwtVerify(); return req.user.sub; } catch { throw new HttpError(401, 'Sign-in required'); }
      },
      ops: async () => {
        if (config.demo) return;
        let uid: string;
        try { await req.jwtVerify(); uid = req.user.sub; } catch { throw new HttpError(401, 'Sign-in required'); }
        if (!(await svc.isOps(uid))) throw new HttpError(403, 'Command Centre access only');
      },
    }),
  });
}
