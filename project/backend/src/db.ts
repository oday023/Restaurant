import { Pool } from 'pg';
import { loadEnvironment } from './env';

loadEnvironment();

export type DatabaseConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  max?: number;
};

let pool: Pool | null = null;

const toBoolean = (value?: string) => value?.toLowerCase() === 'true';

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getDatabaseConfig = (): DatabaseConfig => {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (connectionString) {
    return {
      connectionString,
      ssl: toBoolean(process.env.PGSSL),
      max: toNumber(process.env.PGPOOL_MAX, 10),
    };
  }

  const host = process.env.PGHOST?.trim();
  const user = process.env.PGUSER?.trim();
  const database = process.env.PGDATABASE?.trim();

  if (!host || !user || !database) {
    return { max: toNumber(process.env.PGPOOL_MAX, 10) };
  }

  return {
    host,
    port: toNumber(process.env.PGPORT, 5432),
    user,
    password: process.env.PGPASSWORD,
    database,
    ssl: toBoolean(process.env.PGSSL),
    max: toNumber(process.env.PGPOOL_MAX, 10),
  };
};

export const isDatabaseConfigured = () => {
  const config = getDatabaseConfig();
  return Boolean(config.connectionString || (config.host && config.user && config.database));
};

export const getDatabasePool = () => {
  if (!pool) {
    const config = getDatabaseConfig();
    if (!isDatabaseConfigured()) {
      throw new Error('DATABASE_URL or PGHOST/PGUSER/PGDATABASE must be set before using PostgreSQL.');
    }

    pool = new Pool(config);
  }

  return pool;
};

export const testDatabaseConnection = async () => {
  const client = getDatabasePool();
  const result = await client.query<{ now: string }>('select now()::text as now');

  return {
    connected: true,
    timestamp: result.rows[0]?.now,
  };
};

export const closeDatabasePool = async () => {
  if (!pool) return;
  await pool.end();
  pool = null;
};

export const query = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
) => {
  const client = getDatabasePool();
  return client.query<T>(text, values);
};