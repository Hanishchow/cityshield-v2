/**
 * Entry point. Store selection: DATABASE_URL → Postgres + PostGIS (migrated
 * and seeded on boot), otherwise the in-memory store. Either way the API
 * serves every route.
 */
import { config } from './config.ts';
import { buildApp } from './app.ts';
import { MemoryRepo } from '../../shared/memory.ts';
import type { Repo } from '../../shared/repo.ts';

/* A fresh PostGIS container reports ready on its init server and then restarts,
   and a rebooted host may start the API first. Wait for the database instead of
   crashing into a restart loop; any other error still fails fast. */
const NOT_READY = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', '57P03'];
async function whenDbReady<T>(what: string, fn: () => Promise<T>, attempts = 30): Promise<T> {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      const err = e as { code?: string; cause?: { code?: string } };
      const code = String(err.cause?.code ?? err.code);
      if (i >= attempts || !NOT_READY.includes(code)) throw e;
      console.warn(`${what}: database not ready (${code}), retry ${i}/${attempts}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

let repo: Repo;
let closeDb: (() => Promise<void>) | null = null;
if (config.databaseUrl) {
  const { runMigrations } = await import('./db/migrate.ts');
  const { connect } = await import('./db/client.ts');
  const { PostgresRepo } = await import('./store/postgres.ts');
  const { seed } = await import('./db/seed.ts');
  await whenDbReady('migrations', () => runMigrations(config.databaseUrl!));
  const c = connect(config.databaseUrl);
  closeDb = c.close;
  const pg = new PostgresRepo(c.db);
  await seed(pg);
  repo = pg;
} else {
  repo = new MemoryRepo();
}

const { app, svc } = await buildApp({ repo });
if (repo.kind === 'memory') await svc.seedPublic();

/* Lifecycle: arrivals, complaint auto-assignment, auto-close. Never overlaps itself.
   During an outage it fails every second: log the first failure, then once a minute,
   and say when it recovers, instead of 3,600 identical errors an hour. */
let ticking = false, failingSince = 0, lastTickLog = 0, failedTicks = 0;
const tick = setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try {
    await svc.tick();
    if (failingSince) { app.log.warn({ failedTicks, seconds: Math.round((Date.now() - failingSince) / 1000) }, 'tick recovered'); failingSince = 0; failedTicks = 0; }
  } catch (e) {
    failedTicks++;
    failingSince ||= Date.now();
    if (Date.now() - lastTickLog > 60_000) { lastTickLog = Date.now(); app.log.error({ err: e, failedTicks }, 'tick failed'); }
  } finally { ticking = false; }
}, 1000);

/* DPDP retention: live-location pings are deleted after RETENTION_PING_DAYS;
   browser crash reports (audit action client.error) after 30 days. */
const sweep = async () => {
  try {
    const pings = await repo.prunePings(Date.now() - config.retentionPingDays * 86_400_000);
    const crashes = await repo.pruneAudit('client.error', Date.now() - 30 * 86_400_000);
    if (pings || crashes) app.log.info({ pings, crashes }, 'retention sweep');
  } catch (e) { app.log.error({ err: e }, 'retention sweep failed'); }
};
const sweeper = setInterval(sweep, 3_600_000);
void sweep();

await app.listen({ port: config.port, host: config.host });
app.log.warn(`City Shield API on http://${config.host}:${config.port} · store=${repo.kind} · demo=${config.demo} · docs at /docs`);

const shutdown = async (sig: string) => {
  app.log.warn(`${sig}: shutting down`);
  clearInterval(tick); clearInterval(sweeper);
  await app.close();
  await closeDb?.();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
