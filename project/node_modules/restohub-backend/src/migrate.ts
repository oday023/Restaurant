import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDatabasePool, isDatabaseConfigured } from './db';
import { loadEnvironment } from './env';

loadEnvironment();

const defaultMigrationPath = resolve(process.cwd(), 'db/migrations/001_init.sql');
const explicitMigrationPath = process.env.RESTOHUB_SCHEMA_FILE ? resolve(process.cwd(), process.env.RESTOHUB_SCHEMA_FILE) : null;
const migrationPath = explicitMigrationPath && existsSync(explicitMigrationPath)
  ? explicitMigrationPath
  : defaultMigrationPath;

const main = async () => {
  if (!isDatabaseConfigured()) {
    throw new Error('Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE before running the migration.');
  }

  const schema = await readFile(migrationPath, 'utf8');
  const pool = getDatabasePool();
  await pool.query(schema);
  console.log(`Migration applied from ${migrationPath}`);
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown migration error';
  console.error(message);
  process.exitCode = 1;
});