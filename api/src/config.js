import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(apiRoot, '.env') });

const defaultClientOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const port = process.env.PORT || 4000;
export const databaseUrl = process.env.DATABASE_URL?.trim();
export const isPostgres = Boolean(databaseUrl);
export const allowLocalDatabase = process.env.ALLOW_LOCAL_DATABASE === 'true';
export const runStartupMigrations = process.env.RUN_STARTUP_MIGRATIONS !== 'false';
export const allowedOrigins = unique([
  ...defaultClientOrigins,
  ...splitEnv(process.env.CLIENT_ORIGIN)
]);

export function validateDatabaseConfig() {
  if (!databaseUrl) return;

  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed) {
    throw new Error('DATABASE_URL is not a valid PostgreSQL connection string.');
  }

  if (isLocalDatabaseHost(parsed.hostname) && isCloudRuntime() && !allowLocalDatabase) {
    throw new Error(
      'DATABASE_URL points to localhost/127.0.0.1. Deployed apps cannot reach a database on your computer. Use a hosted PostgreSQL URL from Render, Neon, Supabase, Railway, or another cloud database provider.'
    );
  }

  if (isRenderPrivateDatabaseHost(parsed.hostname) && !process.env.RENDER) {
    throw new Error(
      'DATABASE_URL uses a Render private database host. That URL only works from Render services in the same private network. Use Render\'s external database URL for local development or for a backend hosted outside Render.'
    );
  }
}

export function postgresSsl() {
  if (!databaseUrl) return undefined;
  if (process.env.DATABASE_SSL === 'false') return undefined;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };

  const parsed = parseDatabaseUrl(databaseUrl);
  if (!parsed || isLocalDatabaseHost(parsed.hostname)) return undefined;

  const sslMode = parsed.searchParams.get('sslmode');
  if (sslMode === 'disable') return undefined;

  return { rejectUnauthorized: false };
}

export function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

function splitEnv(value) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function parseDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalDatabaseHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname);
}

function isRenderPrivateDatabaseHost(hostname) {
  return /^dpg-[a-z0-9-]+-a$/i.test(hostname);
}

function isCloudRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER || process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT);
}
