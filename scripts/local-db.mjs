import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import EmbeddedPostgres from 'embedded-postgres';

if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Local development only');
if (existsSync('.env')) loadEnvFile('.env');
if (existsSync('.env.local')) loadEnvFile('.env.local');
const databaseUrl = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) throw new Error('Local database URL required');
const pg = new EmbeddedPostgres({
  databaseDir: resolve('.private/postgres'),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  port: Number(databaseUrl.port || 5432),
  authMethod: 'scram-sha-256',
  persistent: true,
  createPostgresUser: false,
  postgresFlags: ['-h', '127.0.0.1', '-k', ''],
  onLog: () => {},
  onError: (error) => console.error(error),
});
if (!existsSync('.private/postgres/PG_VERSION')) await pg.initialise();
await pg.start();
const dbName = databaseUrl.pathname.slice(1);
const client = pg.getPgClient('postgres');
await client.connect();
const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
await client.end();
if (!exists.rowCount) await pg.createDatabase(dbName);
console.log('Local PostgreSQL ready on loopback. Stop with Ctrl+C.');
let stopping = false;
const stop = async () => { if (stopping) return; stopping = true; await pg.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});
