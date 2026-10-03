import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';

export type Db = PostgresJsDatabase<typeof schema>;

export function connect(url: string): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    /* Neon requires TLS; sslmode=require in the URL is honoured, this is the fallback. */
    ssl: /sslmode=disable/.test(url) || /@(localhost|127\.0\.0\.1|db)[:/]/.test(url) ? false : 'require',
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 5 }) };
}
