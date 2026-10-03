/**
 * The City Shield API: builds the Fastify app (without listening) so tests
 * can drive it through app.inject(). See docs/API.md for the contract.
 */
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fstatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, hasZodFastifySchemaValidationErrors, type ZodTypeProvider } from 'fastify-type-provider-zod';
import sharp from 'sharp';
import { z } from 'zod';
import {
  ComplaintIn, DeviceSessionIn, FeedbackIn, IncidentIn, IncidentPatchIn, MePatchIn, OpsComplaintPatchIn, OpsIncidentPatchIn, OtpRequestIn,
  PhoneIn, PingIn, PlaceIn, ReadIn, SosIn, type Health, type Role, type StreamEvent,
} from '../../shared/contract.ts';
import { CityShield, HttpError } from '../../shared/services.ts';
import type { Repo } from '../../shared/repo.ts';
import { config, geocoder } from './config.ts';
import { Hub } from './hub.ts';
import { reverseGeocode, searchPlaces } from './providers/geo.ts';
import { registerGraphql } from './graphql.ts';

declare module '@fastify/jwt' {
  interface FastifyJWT { payload: { sub: string; role: Role }; user: { sub: string; role: Role } }
}

export interface AppDeps { repo: Repo; logger?: boolean; now?: () => number }

export async function buildApp({ repo, logger = true, now }: AppDeps) {
  const hub = new Hub();
  const svc = new CityShield(repo, { demo: config.demo, secondsPerMinute: config.secondsPerMinute, now, emit: (uid, e) => hub.publish(uid, e) });
  const started = Date.now();

  const app = Fastify({
    logger: logger ? { level: config.prod ? 'info' : 'warn' } : false,
    trustProxy: config.trustProxy as boolean | string,
    bodyLimit: 256 * 1024,
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  /* Registered before routes: Fastify gives each plugin context the handler that exists when it is created. */
  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) return reply.code(400).send({ error: 'Invalid request', issues: err.validation });
    if (err instanceof z.ZodError) return reply.code(400).send({ error: 'Invalid request', issues: err.issues });
    if (err instanceof HttpError) return reply.code(err.status).send({ error: err.message });
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error({ err }, 'unhandled error');
    return reply.code(status).send({ error: status >= 500 ? 'Internal error' : (err as Error).message });
  });

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } });
  /* gzip / brotli for JSON over ~1 KB. SSE replies are hijacked and stay uncompressed (streaming). */
  await app.register(compress, { global: true, threshold: 1024, encodings: ['br', 'gzip', 'deflate'] });
  /* Caching: live data must never be served stale from a cache (an "ambulance en route" for a
     cancelled incident is worse than nothing). Only slow-changing lookups get a short cache. */
  app.addHook('onSend', async (req, reply, payload) => {
    if (reply.getHeader('cache-control')) return payload;
    const url = req.url;
    if (req.method === 'GET' && /^\/v1\/(nearby|geo)\//.test(url)) reply.header('cache-control', 'private, max-age=300');
    else if (url.startsWith('/v1/media/')) { /* static plugin sets immutable caching */ }
    else if (url.startsWith('/v1') || url.startsWith('/health') || url.startsWith('/graphql')) reply.header('cache-control', 'no-store');
    return payload;
  });
  await app.register(cors, { origin: config.corsOrigins, credentials: true });
  /* 120/min per IP — except SOS (see the route): throttling someone panic-tapping an emergency button is the wrong failure mode. */
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(jwt, { secret: config.jwtSecret, sign: { expiresIn: '30d' } });
  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 1 } });
  await mkdir(config.uploadDir, { recursive: true });
  await app.register(fstatic, { root: config.uploadDir, prefix: '/v1/media/', decorateReply: false, maxAge: '30d', immutable: true });
  await app.register(swagger, {
    openapi: {
      info: { title: 'City Shield API', version: '1.0.0', description: 'One-tap emergency help and civic complaints for Bengaluru. Dispatch is simulated in this build.' },
      components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
      security: [{ bearer: [] }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  /* ---------- auth helpers ---------- */
  const user = async (req: FastifyRequest) => {
    try { await req.jwtVerify(); } catch { throw new HttpError(401, 'Sign-in required'); }
    return req.user.sub;
  };
  const ops = async (req: FastifyRequest) => {
    if (config.demo) { try { await req.jwtVerify(); return req.user.sub; } catch { return null; } }
    const uid = await user(req);
    if (!(await svc.isOps(uid))) throw new HttpError(403, 'Command Centre access only');
    return uid;
  };
  const session = async (uid: string) => {
    const u = await svc.me(uid);
    return { token: app.jwt.sign({ sub: u.id, role: u.role }), user: u };
  };
  const otpHash = (phone: string, code: string) => createHash('sha256').update(`${config.jwtSecret}:${phone.replace(/\D/g, '').slice(-10)}:${code}`).digest('hex');
  const items = <T,>(l: T[]) => ({ items: l, serverTime: Date.now() });

  /* ---------- system ---------- */
  app.get('/health', { schema: { tags: ['system'] } }, async (): Promise<Health & { openStreams: number }> => ({
    ok: true, store: repo.kind, demo: config.demo, serverTime: Date.now(), uptimeSeconds: Math.round((Date.now() - started) / 1000),
    capabilities: { geocode: geocoder(), dispatch: 'simulated', notify: 'mock', telephony: 'simulated' }, openStreams: hub.openStreams,
  }));

  await registerGraphql(app as unknown as FastifyInstance, svc, repo.kind);

  await app.register(async (v1) => {
    const r = v1.withTypeProvider<ZodTypeProvider>();

    /* ----- auth ----- */
    r.post('/auth/device', { schema: { tags: ['auth'], body: DeviceSessionIn } }, async (req) => session((await svc.deviceUser(req.body.deviceId)).id));
    r.post('/auth/otp/request', { schema: { tags: ['auth'], body: OtpRequestIn }, config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      await repo.putOtp(req.body.phone, { codeHash: otpHash(req.body.phone, code), expiresAt: Date.now() + 5 * 60_000, attempts: 0 });
      /* No SMS provider agreement yet: outside production (or in an explicit demo deployment) the code is returned so the app can show it. */
      if (!config.prod || config.demo) { req.log.warn({ phone: req.body.phone.slice(-4) }, `dev OTP ${code}`); return { sent: true, devCode: code }; }
      return { sent: true };
    });
    r.post('/auth/otp/verify', { schema: { tags: ['auth'], body: z.object({ phone: PhoneIn, code: z.string().regex(/^\d{6}$/), deviceId: z.string().min(8).max(100) }) } }, async (req) => {
      const { phone, code, deviceId } = req.body;
      const rec = await repo.getOtp(phone);
      if (!rec || rec.expiresAt < Date.now()) throw new HttpError(400, 'That code has expired. Request a new one.');
      if (rec.attempts >= 5) throw new HttpError(429, 'Too many attempts. Request a new code.');
      if (rec.codeHash !== otpHash(phone, code)) { await repo.putOtp(phone, { ...rec, attempts: rec.attempts + 1 }); throw new HttpError(400, 'That code is not right.'); }
      await repo.deleteOtp(phone);
      /* A verified number is the account: sign this device into it if it exists, else verify the device's account. */
      const existing = await repo.userByPhone(phone);
      if (existing) { await repo.linkDevice(deviceId, existing.id); return session(existing.id); }
      const me = await svc.deviceUser(deviceId);
      await repo.updateUser(me.id, { phone, phoneVerified: true });
      return session(me.id);
    });

    /* ----- me ----- */
    r.get('/me', { schema: { tags: ['account'] } }, async (req) => svc.me(await user(req)));
    r.patch('/me', { schema: { tags: ['account'], body: MePatchIn } }, async (req) => svc.updateMe(await user(req), req.body));

    /* ----- places ----- */
    r.get('/places', { schema: { tags: ['account'] } }, async (req) => items(await svc.places(await user(req))));
    r.post('/places', { schema: { tags: ['account'], body: PlaceIn } }, async (req, reply) => reply.code(201).send(await svc.addPlace(await user(req), req.body)));
    r.patch('/places/:id', { schema: { tags: ['account'], params: z.object({ id: z.string() }), body: PlaceIn.partial() } }, async (req) => svc.updatePlace(await user(req), req.params.id, req.body));
    r.delete('/places/:id', { schema: { tags: ['account'], params: z.object({ id: z.string() }) } }, async (req, reply) => { await svc.deletePlace(await user(req), req.params.id); return reply.code(204).send(); });

    /* ----- geo & nearby ----- */
    const ll = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });
    r.get('/geo/reverse', { schema: { tags: ['geo'], querystring: ll } }, async (req) => reverseGeocode(req.query.lat, req.query.lng));
    r.get('/geo/search', { schema: { tags: ['geo'], querystring: z.object({ q: z.string().max(120) }) } }, async (req) => items(await searchPlaces(req.query.q)));
    r.get('/nearby/hospitals', { schema: { tags: ['geo'], querystring: ll } }, async (req) => items(await svc.nearby('hospital', req.query)));
    r.get('/nearby/stations', { schema: { tags: ['geo'], querystring: ll.extend({ kind: z.enum(['police_station', 'fire_station', 'ward_depot', 'roads_depot', 'ambulance_base']) }) } },
      async (req) => items(await svc.nearby(req.query.kind, req.query)));
    r.get('/units/:id', { schema: { tags: ['geo'], params: z.object({ id: z.string() }) } }, async (req) => { await user(req); return svc.unit(req.params.id); });

    /* ----- emergency ----- */
    const idem = new Map<string, { id: string; at: number }>();
    r.post('/sos', { schema: { tags: ['emergency'], body: SosIn }, config: { rateLimit: false } }, async (req) => {
      const uid = await user(req);
      /* Panic-tapping must not create several incidents: the client sends an Idempotency-Key per press. */
      const key = String(req.headers['idempotency-key'] ?? '').slice(0, 100);
      const k = key ? `${uid}:${key}` : null;
      for (const [x, v] of idem) if (Date.now() - v.at > 10 * 60_000) idem.delete(x);
      if (k && idem.has(k)) return svc.incident(uid, idem.get(k)!.id);
      const inc = await svc.raise(uid, 'sos', req.body.location);
      if (k) idem.set(k, { id: inc.id, at: Date.now() });
      return inc;
    });
    r.post('/incidents', { schema: { tags: ['emergency'], body: IncidentIn } }, async (req, reply) => reply.code(201).send(await svc.raise(await user(req), req.body.kind, req.body.location)));
    r.get('/incidents', { schema: { tags: ['emergency'], querystring: z.object({ active: z.enum(['0', '1']).optional() }) } }, async (req) => items(await svc.incidents(await user(req), req.query.active === '1')));
    const idP = { params: z.object({ id: z.string().max(40) }) };
    r.get('/incidents/:id', { schema: { tags: ['emergency'], ...idP } }, async (req) => svc.incident(await user(req), req.params.id));
    r.patch('/incidents/:id', { schema: { tags: ['emergency'], ...idP, body: IncidentPatchIn } }, async (req) => svc.setHospital(await user(req), req.params.id, req.body.destinationHospitalId));
    r.post('/incidents/:id/cancel', { schema: { tags: ['emergency'], ...idP } }, async (req) => svc.cancel(await user(req), req.params.id));
    r.post('/incidents/:id/close', { schema: { tags: ['emergency'], ...idP } }, async (req) => svc.close(await user(req), req.params.id, 'resolved'));
    r.post('/incidents/:id/replay', { schema: { tags: ['emergency'], ...idP } }, async (req) => svc.replay(await user(req), req.params.id));
    r.post('/incidents/:id/location', { schema: { tags: ['emergency'], ...idP, body: PingIn } }, async (req, reply) => { await svc.ping(await user(req), req.params.id, req.body); return reply.code(204).send(); });

    /* ----- complaints ----- */
    r.get('/complaints', { schema: { tags: ['complaints'], querystring: z.object({ status: z.enum(['all', 'open', 'resolved']).default('all') }) } },
      async (req) => items(await svc.complaints(await user(req), req.query.status)));
    r.get('/complaints/:id', { schema: { tags: ['complaints'], ...idP } }, async (req) => svc.complaint(await user(req), req.params.id));
    r.post('/uploads', { schema: { tags: ['complaints'] } }, async (req, reply) => {
      await user(req);
      const f = await req.file();
      if (!f) throw new HttpError(400, 'No file');
      if (!f.mimetype.startsWith('image/')) throw new HttpError(415, 'Images only');
      const buf = await f.toBuffer();
      /* Re-encode: normalises format and strips EXIF (which can carry the reporter's GPS position). */
      const out = await sharp(buf, { failOn: 'error' }).rotate().resize(1280, 1280, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
        .catch(() => { throw new HttpError(415, 'That file is not a readable image'); });
      const id = `${randomUUID()}.jpg`;
      await writeFile(join(config.uploadDir, id), out);
      return reply.code(201).send({ id, url: `/v1/media/${id}` });
    });
    r.post('/complaints', { schema: { tags: ['complaints'], body: ComplaintIn } }, async (req, reply) => {
      const uid = await user(req);
      const pid = req.body.photoId;
      const photoUrl = pid && /^[0-9a-f-]{36}\.jpg$/.test(pid) ? `/v1/media/${pid}` : null;
      return reply.code(201).send(await svc.createComplaint(uid, req.body, photoUrl));
    });

    /* ----- notifications & feedback ----- */
    r.get('/notifications', { schema: { tags: ['account'], querystring: z.object({ kind: z.enum(['emergency', 'service', 'complaint']).optional() }) } },
      async (req) => items(await svc.notifications(await user(req), req.query.kind)));
    r.post('/notifications/read', { schema: { tags: ['account'], body: ReadIn } }, async (req, reply) => {
      await svc.markRead(await user(req), req.body.all ? null : (req.body.ids ?? []));
      return reply.code(204).send();
    });
    r.post('/feedback', { schema: { tags: ['account'], body: FeedbackIn } }, async (req, reply) => {
      let uid: string | null = null; try { uid = await user(req); } catch { /* anonymous feedback is fine */ }
      await repo.insertFeedback(uid, req.body.message, Date.now());
      return reply.code(204).send();
    });

    /* ----- client error reports (browser crashes / unhandled rejections) ----- */
    r.post('/client-errors', {
      schema: { tags: ['system'], body: z.object({
        message: z.string().max(500), stack: z.string().max(4000).optional(), url: z.string().max(500).optional(),
        source: z.enum(['error', 'unhandledrejection', 'boundary']), release: z.string().max(60).optional(), ua: z.string().max(300).optional(),
      }) },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    }, async (req, reply) => {
      let uid: string | null = null; try { await req.jwtVerify(); uid = req.user.sub; } catch { /* anonymous */ }
      req.log.warn({ clientError: { ...req.body, user: uid } }, `client ${req.body.source}: ${req.body.message}`);
      await repo.audit({ at: Date.now(), actor: uid, action: 'client.error', entity: req.body.source, data: { message: req.body.message, url: req.body.url, release: req.body.release } }).catch(() => {});
      return reply.code(204).send();
    });

    /* ----- command centre ----- */
    r.get('/ops/kpis', { schema: { tags: ['ops'] } }, async (req) => { await ops(req); return svc.opsKpis(); });
    r.get('/ops/incidents', { schema: { tags: ['ops'] } }, async (req) => { await ops(req); return items(await svc.opsIncidents()); });
    r.get('/ops/units', { schema: { tags: ['ops'] } }, async (req) => { await ops(req); return items(await svc.opsUnits()); });
    r.get('/ops/wards', { schema: { tags: ['ops'] } }, async (req) => { await ops(req); return items(await svc.wards()); });
    r.patch('/ops/incidents/:id', { schema: { tags: ['ops'], ...idP, body: OpsIncidentPatchIn } }, async (req) => svc.opsSetIncident(await ops(req), req.params.id, req.body.status));
    r.patch('/ops/complaints/:id', { schema: { tags: ['ops'], ...idP, body: OpsComplaintPatchIn } }, async (req) => svc.opsSetComplaint(await ops(req), req.params.id, req.body.status));

    /* ----- live streams (SSE). EventSource cannot set headers, so the token rides in the query. ----- */
    const sse = (req: FastifyRequest, reply: FastifyReply, sub: (send: (e: StreamEvent) => void) => () => void) => {
      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no',
        'access-control-allow-origin': config.corsOrigins.includes(String(req.headers.origin)) ? String(req.headers.origin) : config.corsOrigins[0],
      });
      const send = (e: StreamEvent) => res.write(`data: ${JSON.stringify(e)}\n\n`);
      send({ type: 'hello', serverTime: Date.now() });
      const off = sub(send);
      const beat = setInterval(() => res.write(': ping\n\n'), 25_000);
      req.raw.on('close', () => { clearInterval(beat); off(); });
    };
    const tokenUser = (q: unknown, auth?: string) => {
      const t = (q as { token?: string }).token ?? (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined);
      if (!t) throw new HttpError(401, 'Sign-in required');
      try { return app.jwt.verify<{ sub: string; role: Role }>(t); } catch { throw new HttpError(401, 'Session expired'); }
    };
    r.get('/stream', { schema: { tags: ['live'], querystring: z.object({ token: z.string().optional() }) }, config: { rateLimit: false } }, async (req, reply) => {
      const u = tokenUser(req.query, req.headers.authorization);
      sse(req, reply, (send) => hub.subscribe(u.sub, send));
    });
    r.get('/ops/stream', { schema: { tags: ['live'], querystring: z.object({ token: z.string().optional() }) }, config: { rateLimit: false } }, async (req, reply) => {
      if (!config.demo) { const u = tokenUser(req.query, req.headers.authorization); if (!(await svc.isOps(u.sub))) throw new HttpError(403, 'Command Centre access only'); }
      sse(req, reply, (send) => hub.subscribeOps(send));
    });
  }, { prefix: '/v1' });

  return { app: app as unknown as FastifyInstance, svc, hub };
}
