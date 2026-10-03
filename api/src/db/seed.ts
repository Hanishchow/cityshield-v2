/** Seeds stations, the fleet and Command Centre sample data. Idempotent. `npm run db:seed -w api` */
import { STATIONS, seedUnits } from '../../../shared/catalog.ts';
import { CityShield } from '../../../shared/services.ts';
import { PostgresRepo } from '../store/postgres.ts';
import { connect } from './client.ts';

export async function seed(repo: PostgresRepo) {
  if (!(await repo.isSeeded())) {
    await repo.seedCatalog(STATIONS.map(({ pt: _p, ...s }) => s), seedUnits().map(({ pt: _p, ...u }) => u));
  }
  await new CityShield(repo).seedPublic();
}

if (process.argv[1]?.endsWith('seed.ts')) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
  const { db, close } = connect(url);
  seed(new PostgresRepo(db)).then(async () => { console.log('Seeded.'); await close(); }, async (e) => { console.error(e); await close(); process.exit(1); });
}
