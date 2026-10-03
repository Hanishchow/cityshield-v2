/** Applies drizzle/*.sql (the first one creates the PostGIS extension). `npm run db:migrate -w api` */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connect } from './client.ts';

export async function runMigrations(url: string) {
  const { db, close } = connect(url);
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
  } finally {
    await close();
  }
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/').replace(/^\//, '')}` || process.argv[1]?.endsWith('migrate.ts')) {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL is not set (see api/.env.example).'); process.exit(1); }
  runMigrations(url).then(() => { console.log('Migrations applied.'); }, (e) => { console.error(e); process.exit(1); });
}
