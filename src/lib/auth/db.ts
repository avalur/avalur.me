import { PrismaClient } from '@prisma/client';

const state = globalThis as typeof globalThis & { avalurDb?: PrismaClient; avalurDbUrl?: string };

/** Lazy initialization keeps static public pages independent of the database. */
export function getDb(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  if (state.avalurDb && state.avalurDbUrl !== url) throw new Error('Database configuration changed inside a running process');
  if (!state.avalurDb) {
    state.avalurDb = new PrismaClient({ datasourceUrl: url, log: [] });
    state.avalurDbUrl = url;
  }
  return state.avalurDb;
}
