import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRepo } from '../../shared/memory.ts';
import { buildApp } from '../src/app.ts';
import type { Complaint, Incident, Session } from '../../shared/contract.ts';

const KORAMANGALA = { lat: 12.9352, lng: 77.6245, address: 'Koramangala 5th Block, Bengaluru' };

async function setup() {
  let clock = Date.now();
  const { app, svc } = await buildApp({ repo: new MemoryRepo(), logger: false, now: () => clock });
  await svc.seedPublic();
  const s = (await app.inject({ method: 'POST', url: '/v1/auth/device', payload: { deviceId: 'test-device-0001' } })).json() as Session;
  const auth = { authorization: `Bearer ${s.token}` };
  return { app, svc, s, auth, advance: async (ms: number) => { clock += ms; await svc.tick(); } };
}

test('health reports the live store and capabilities', async () => {
  const { app } = await setup();
  const r = await app.inject('/health');
  assert.equal(r.statusCode, 200);
  assert.equal(r.json().store, 'memory');
  assert.equal(r.json().capabilities.dispatch, 'simulated');
});

test('device session creates a demo account with starter data', async () => {
  const { app, auth, s } = await setup();
  assert.ok(s.token);
  const places = (await app.inject({ url: '/v1/places', headers: auth })).json().items;
  const complaints = (await app.inject({ url: '/v1/complaints', headers: auth })).json().items;
  const active = (await app.inject({ url: '/v1/incidents?active=1', headers: auth })).json().items as Incident[];
  assert.equal(places.length, 4);
  assert.equal(complaints.length, 3);
  assert.equal(active.length, 1, 'a live ambulance trip is running');
  /* the same device gets the same account back */
  const again = (await app.inject({ method: 'POST', url: '/v1/auth/device', payload: { deviceId: 'test-device-0001' } })).json() as Session;
  assert.equal(again.user.id, s.user.id);
});

test('SOS dispatches ambulance + police and is idempotent per key', async () => {
  const { app, auth } = await setup();
  /* free the starter ambulance so the named unit is nearest */
  const starter = (await app.inject({ url: '/v1/incidents?active=1', headers: auth })).json().items[0] as Incident;
  await app.inject({ method: 'POST', url: `/v1/incidents/${starter.id}/cancel`, headers: auth });
  const send = () => app.inject({ method: 'POST', url: '/v1/sos', headers: { ...auth, 'idempotency-key': 'press-1' }, payload: { location: KORAMANGALA } });
  const a = (await send()).json() as Incident, b = (await send()).json() as Incident;
  assert.equal(a.id, b.id, 'second press returns the same incident');
  assert.deepEqual(a.assignments.map((x) => x.kind).sort(), ['ambulance', 'police']);
  assert.ok(a.assignments.some((x) => x.callSign === 'AMB-14'), 'nearest named ambulance chosen');
  assert.ok(a.agencies.some((g) => g.agency.includes('112')), 'shared with 112 ERSS');
});

test('units arrive and the incident goes on scene', async () => {
  const { app, auth, advance } = await setup();
  const inc = (await app.inject({ method: 'POST', url: '/v1/incidents', headers: auth, payload: { kind: 'fire', location: KORAMANGALA } })).json() as Incident;
  await advance(Math.max(...inc.assignments.map((a) => a.durationMs)) + 1000);
  const after = (await app.inject({ url: `/v1/incidents/${inc.id}`, headers: auth })).json() as Incident;
  assert.equal(after.status, 'on_scene');
  assert.ok(after.assignments.every((a) => a.arrivedAt != null));
  const ntf = (await app.inject({ url: '/v1/notifications', headers: auth })).json().items as { title: string }[];
  assert.ok(ntf.some((n) => n.title === 'Fire truck has arrived'));
});

test('complaints are auto-routed, then assigned with a crew', async () => {
  const { app, auth, advance } = await setup();
  const r = await app.inject({ method: 'POST', url: '/v1/complaints', headers: auth, payload: { category: 'light', description: 'Dark stretch', location: { ...KORAMANGALA, address: '6th Cross, Koramangala' } } });
  assert.equal(r.statusCode, 201);
  const c = r.json() as Complaint;
  assert.match(c.id, /^CS-\d+$/);
  assert.equal(c.status, 'submitted');
  assert.equal(c.agency, 'GBA Electrical');
  await advance(6000);
  const after = (await app.inject({ url: `/v1/complaints/${c.id}`, headers: auth })).json() as Complaint;
  assert.equal(after.status, 'progress');
  assert.ok(after.crew, 'a repair crew is dispatched');
  /* operator resolves it */
  const res = (await app.inject({ method: 'PATCH', url: `/v1/ops/complaints/${c.id}`, headers: auth, payload: { status: 'resolved' } })).json() as Complaint;
  assert.equal(res.status, 'resolved');
});

test('phone OTP verifies the account (dev code returned outside production)', async () => {
  const { app, auth } = await setup();
  const req = (await app.inject({ method: 'POST', url: '/v1/auth/otp/request', payload: { phone: '+91 98450 00000' } })).json();
  assert.match(req.devCode, /^\d{6}$/);
  const bad = await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { phone: '+91 98450 00000', code: '000000' === req.devCode ? '111111' : '000000', deviceId: 'test-device-0001' } });
  assert.equal(bad.statusCode, 400);
  const ok = (await app.inject({ method: 'POST', url: '/v1/auth/otp/verify', payload: { phone: '+91 98450 00000', code: req.devCode, deviceId: 'test-device-0001' } })).json() as Session;
  assert.equal(ok.user.phoneVerified, true);
  assert.ok(auth);
});

test('validation and auth errors are clean 4xx responses', async () => {
  const { app, auth } = await setup();
  assert.equal((await app.inject({ url: '/v1/me' })).statusCode, 401);
  const bad = await app.inject({ method: 'POST', url: '/v1/complaints', headers: auth, payload: { category: 'nope', location: KORAMANGALA } });
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.json().error, 'Invalid request');
});

test('uploads reject non-images', async () => {
  const { app, auth } = await setup();
  const boundary = '----cs';
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--${boundary}--\r\n`;
  const r = await app.inject({ method: 'POST', url: '/v1/uploads', headers: { ...auth, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body });
  assert.equal(r.statusCode, 415);
});

test('command centre KPIs reflect seeded city data', async () => {
  const { app } = await setup();
  const k = (await app.inject('/v1/ops/kpis')).json();
  assert.ok(k.activeIncidents >= 5);
  assert.ok(k.unitsOnDuty > 250);
  assert.ok(k.avgResponseSec > 300 && k.avgResponseSec < 600, `avg response ${k.avgResponseSec}s`);
  const wards = (await app.inject('/v1/ops/wards')).json().items;
  assert.equal(wards[0].area, 'Koramangala');
});
