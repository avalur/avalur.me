import { existsSync } from 'node:fs';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

async function main() {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Local development only');
  if (existsSync('.env')) loadEnvFile('.env');
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const source = new URL(process.env.DATABASE_URL || '');
  if (!['postgres:', 'postgresql:'].includes(source.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
    throw new Error('A loopback PostgreSQL connection is required');
  }
  const test = new URL(source);
  test.pathname = '/avalur_private_tests';
  // A separate database isolates all fictional accounts and grants from the
  // running local website. No application tables are read or changed here.
  test.searchParams.delete('schema');
  const admin = new URL(source);
  admin.pathname = '/postgres';
  admin.searchParams.delete('schema');
  const db = new PrismaClient({ datasourceUrl: admin.href, log: [] });
  try {
    const existing = await db.$queryRaw`SELECT 1 FROM pg_database WHERE datname = 'avalur_private_tests'`;
    if (!existing.length) await db.$executeRawUnsafe('CREATE DATABASE "avalur_private_tests"');
  } finally { await db.$disconnect(); }
  await mkdir('.private', { recursive: true, mode: 0o700 });
  const configuration = {
    DATABASE_URL: test.href,
    DIRECT_URL: test.href,
    TEST_DATABASE_URL: test.href,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    SITE_URL: 'http://localhost:4321',
    MAIL_TRANSPORT: 'file',
  };
  const text = '# Synthetic integration tests only. Never use this environment for the website.\n' +
    Object.entries(configuration).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n';
  await writeFile('.private/test.env', text, { mode: 0o600 });
  await chmod('.private/test.env', 0o600);
  console.log('Dedicated local test database is ready. Its configuration is in ignored .private/test.env.');
}

main().catch(() => {
  console.error('Test database setup failed. Check the local PostgreSQL process and local configuration.');
  process.exitCode = 1;
});
