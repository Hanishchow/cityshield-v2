import { fileURLToPath } from 'node:url';

/**
 * Configuration. Hard rule: the API boots and serves every route with ZERO
 * environment variables. Missing credentials degrade a capability to a
 * clearly-labelled stand-in; they never stop an emergency service starting.
 * The one exception is production, which refuses to run with a dev secret.
 */
const str = (k: string) => process.env[k]?.trim() || null;
const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== '' && process.env[k] != null ? v : d; };
const bool = (k: string, d: boolean) => { const v = str(k); return v == null ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase()); };

const env = process.env.NODE_ENV ?? 'development';
const prod = env === 'production';
const DEV_SECRET = 'dev-only-insecure-secret-change-me';

export const config = {
  env, prod,
  port: num('PORT', 8787),
  host: str('HOST') ?? '127.0.0.1',
  /** Postgres + PostGIS (e.g. Neon). Absent → in-memory store. */
  databaseUrl: str('DATABASE_URL'),
  corsOrigins: (str('CORS_ORIGINS') ?? 'http://localhost:5178,http://127.0.0.1:5178,http://localhost:4178').split(',').map((s) => s.trim()).filter(Boolean),
  jwtSecret: str('JWT_SECRET') ?? DEV_SECRET,
  /** Demo mode: new accounts get starter data; Command Centre is open to everyone. */
  demo: bool('DEMO_MODE', !prod),
  /** Seconds of playback per ETA minute (12 = demo speed, 60 = real time). */
  secondsPerMinute: num('SECONDS_PER_MINUTE', prod ? 60 : 12),
  mapplsClientId: str('MAPPLS_CLIENT_ID'),
  mapplsClientSecret: str('MAPPLS_CLIENT_SECRET'),
  olaKey: str('OLA_MAPS_API_KEY'),
  uploadDir: str('UPLOAD_DIR') ?? fileURLToPath(new URL('../uploads/', import.meta.url)),
  maxUploadBytes: num('MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
  /** Who may set X-Forwarded-For (the rate limiter keys on client IP). */
  trustProxy: ((): boolean | number | string => {
    const raw = str('TRUST_PROXY');
    if (!raw) return false;
    if (raw === 'true') return true;
    const hops = Number(raw);
    return Number.isInteger(hops) ? hops : raw;
  })(),
  /** DPDP Act 2023: location pings are kept only as long as needed. */
  retentionPingDays: num('RETENTION_PING_DAYS', 30),
};

if (config.prod && config.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set in production.');
}

export const geocoder = (): 'mappls' | 'ola' | 'mock' =>
  config.mapplsClientId && config.mapplsClientSecret ? 'mappls' : config.olaKey ? 'ola' : 'mock';
