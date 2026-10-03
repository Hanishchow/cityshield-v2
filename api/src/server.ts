/**
 * Entry point. Store selection: DATABASE_URL → Postgres + PostGIS (migrated
 * and seeded on boot), otherwise the in-memory store. Either way the API
 * serves every route.
 */
import { config } from './config.ts';
import { buildApp } from './app.ts';
import { MemoryRepo } from '../../shared/memory.ts';
import type { Repo } from '../../shared/repo.ts';

let repo: Repo;
let closeDb: (() => Promise<void>) | null = null;
if (config.databaseUrl) {
  const { runMigrations } = await import('./db/migrate.ts');
  const { connect } = await import('./db/client.ts');
  const { PostgresRepo } = await import('./store/postgres.ts');
  const { seed } = await import('./db/seed.ts');
  await runMigrations(config.databaseUrl);
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

/* Lifecycle: arrivals, complaint auto-assignment, auto-close. Never overlaps itself. */
let ticking = false;
const tick = setInterval(async () => {
  if (ticking) return;
  ticking = true;
  try { await svc.tick(); } catch (e) { app.log.error({ err: e }, 'tick failed'); } finally { ticking = false; }
}, 1000);

/* DPDP retention: live-location pings are deleted after RETENTION_PING_DAYS. */
const sweep = async () => {
  try {
    const n = await repo.prunePings(Date.now() - config.retentionPingDays * 86_400_000);
    if (n) app.log.info({ removed: n }, 'retention sweep');
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
