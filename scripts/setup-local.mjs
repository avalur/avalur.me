import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Local development only');
if (existsSync('.env') || existsSync('.env.local')) throw new Error('Local configuration exists; it was not changed');
const admin = process.argv.find(value => value.startsWith('--admin='))?.slice(8).trim().toLowerCase() || '';
if (admin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin)) throw new Error('Invalid administrator email');
const root = process.cwd();
await mkdir('.private/mail', { recursive: true, mode: 0o700 });
const url = `postgresql://avalur_local:${randomBytes(24).toString('hex')}@127.0.0.1:55436/avalur_private`;
await writeFile('.env', [
  `DATABASE_URL=${url}`, `DIRECT_URL=${url}`, 'SITE_URL=http://127.0.0.1:8827',
  `AUTH_SECRET=${randomBytes(48).toString('hex')}`, `ADMIN_EMAILS=${admin}`,
  'MAIL_TRANSPORT=file', `PRIVATE_MAIL_DIR=${resolve(root, '.private/mail')}`,
  'PRIVATE_TRIPS_STORAGE=local', `PRIVATE_TRIPS_DIR=${resolve(root, '.private/trips')}`, '',
].join('\n'), { mode: 0o600, flag: 'wx' });
console.log('Local configuration created in ignored .env. No accounts or access grants were created.');
