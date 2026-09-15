import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Exercise Auth.js itself, including its default account-linking decision,
// without a database connection, real provider request, or persistent grant.
type MemoryUser = { id: string; email: string; emailVerified: Date | null; name: string; image: null };
type MemorySession = { sessionToken: string; userId: string; expires: Date };
type MemoryAccount = { userId: string; provider: string; providerAccountId: string; type: string; [key: string]: unknown };
const state = vi.hoisted(() => ({
  user: null as MemoryUser | null,
  sessions: new Map<string, MemorySession>(),
  accounts: new Map<string, MemoryAccount>(),
}));
const database = {
  user: {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => state.user && (where.id === state.user.id || where.email === state.user.email) ? state.user : null,
    create: async () => { throw new Error('These tests must never create an additional user'); },
  },
  account: {
    findUnique: async ({ where }: { where: { provider_providerAccountId: { provider: string; providerAccountId: string } } }) => {
      const key = where.provider_providerAccountId;
      const account = state.accounts.get(`${key.provider}:${key.providerAccountId}`);
      return account ? { ...account, user: state.user } : null;
    },
    create: async ({ data }: { data: MemoryAccount }) => {
      state.accounts.set(`${data.provider}:${data.providerAccountId}`, data);
      return data;
    },
  },
  session: {
    findUnique: async ({ where }: { where: { sessionToken: string } }) => {
      const session = state.sessions.get(where.sessionToken);
      return session ? { ...session, user: state.user } : null;
    },
    create: async ({ data }: { data: MemorySession }) => { state.sessions.set(data.sessionToken, data); return data; },
    delete: async ({ where }: { where: { sessionToken: string } }) => { const session = state.sessions.get(where.sessionToken); state.sessions.delete(where.sessionToken); return session; },
  },
};
vi.mock('../src/lib/auth/db', () => ({ getDb: () => database }));
import { handleAuth } from '../src/lib/auth/oauth';

const origin = 'http://localhost:4321';
const originalEnvironment = { ...process.env };
const originalFetch = globalThis.fetch;
let providerEmail: string;
let providerVerified: boolean;

function request(path: string, cookies: Map<string, string>, body?: URLSearchParams, headers: Record<string, string> = {}) {
  return new Request(origin + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      Cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      ...(body ? { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...headers,
    },
    ...(body ? { body } : {}),
  });
}

function keepCookies(response: Response, jar: Map<string, string>) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0];
    const separator = pair.indexOf('=');
    jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function providerLogin(jar = new Map<string, string>()) {
  const csrf = await handleAuth({ request: request('/api/auth/csrf', jar) });
  expect(csrf.status).toBe(200);
  keepCookies(csrf, jar);
  const { csrfToken } = await csrf.json();
  const start = await handleAuth({ request: request('/api/auth/signin/github', jar, new URLSearchParams({ csrfToken, callbackUrl: `${origin}/account/` }), { 'X-Auth-Return-Redirect': 'true' }) });
  expect(start.status).toBe(200);
  expect(start.headers.get('content-type')).toContain('application/json');
  keepCookies(start, jar);
  const authorization = new URL((await start.json()).url);
  expect(authorization.origin).toBe('https://github.com');
  expect(authorization.searchParams.get('code_challenge')).toBeTruthy();
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
  const oauthState = authorization.searchParams.get('state');
  const params = new URLSearchParams({ code: 'synthetic-code' });
  if (oauthState) params.set('state', oauthState);
  const callback = await handleAuth({ request: request(`/api/auth/callback/github?${params}`, jar) });
  keepCookies(callback, jar);
  return { callback, jar };
}

describe('safe connection of an existing password account to OAuth', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.SITE_URL = origin;
    process.env.AUTH_SECRET = 'synthetic-linking-test-secret-at-least-32-characters';
    process.env.AUTH_GITHUB_ID = 'synthetic-github-client';
    process.env.AUTH_GITHUB_SECRET = 'synthetic-github-secret';
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    state.user = { id: 'registered-owner', email: 'owner@example.test', emailVerified: new Date(), name: 'Synthetic owner', image: null };
    state.accounts.clear();
    state.sessions.clear();
    providerEmail = state.user.email;
    providerVerified = true;
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'synthetic-access-token', token_type: 'bearer', scope: 'read:user user:email' });
      if (url === 'https://api.github.com/user') return Response.json({ id: 12345, login: 'synthetic-owner', name: 'Synthetic owner', email: providerEmail });
      if (url === 'https://api.github.com/user/emails') return Response.json([{ email: providerEmail, primary: true, verified: providerVerified }]);
      throw new Error('Unexpected provider request; network is disabled in this test');
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in originalEnvironment)) delete process.env[key];
    Object.assign(process.env, originalEnvironment);
    vi.restoreAllMocks();
  });

  it('does not automatically link a matching verified email without the existing session', async () => {
    const { callback } = await providerLogin();
    expect(callback.status).toBe(302);
    expect(callback.headers.get('cache-control')).toBe('private, no-store');
    const location = new URL(callback.headers.get('location')!, origin);
    expect(location.pathname).toBe('/login/');
    expect(location.searchParams.get('error')).toBe('OAuthAccountNotLinked');
    expect(state.accounts.size).toBe(0);
    expect(state.sessions.size).toBe(0);
    expect(state.user?.id).toBe('registered-owner');
  });

  it('links in the current verified session and allows later sign-in through the linked provider', async () => {
    const sessionToken = 'a'.repeat(64);
    state.sessions.set(sessionToken, { sessionToken, userId: state.user!.id, expires: new Date(Date.now() + 60000) });
    const { callback } = await providerLogin(new Map([['authjs.session-token', sessionToken]]));
    expect(callback.headers.get('location')).toBe(`${origin}/account/`);
    expect(state.accounts.get('github:12345')?.userId).toBe('registered-owner');
    expect(state.accounts.size).toBe(1);
    // Simulate the prior session ending. OAuth must now authenticate the same
    // account by provider ID, without creating another User or linking by email.
    state.sessions.clear();
    const { callback: nextLogin, jar } = await providerLogin();
    expect(nextLogin.headers.get('location')).toBe(`${origin}/account/`);
    expect(state.sessions.get(jar.get('authjs.session-token')!)?.userId).toBe('registered-owner');
    expect(state.accounts.size).toBe(1);
  });

  it('rejects linking a provider with a different or unverified email', async () => {
    const sessionToken = 'b'.repeat(64);
    state.sessions.set(sessionToken, { sessionToken, userId: state.user!.id, expires: new Date(Date.now() + 60000) });
    providerEmail = 'different@example.test';
    const first = await providerLogin(new Map([['authjs.session-token', sessionToken]]));
    expect(new URL(first.callback.headers.get('location')!, origin).searchParams.get('error')).toBe('AccessDenied');
    expect(state.accounts.size).toBe(0);
    providerEmail = state.user!.email;
    providerVerified = false;
    const second = await providerLogin(new Map([['authjs.session-token', sessionToken]]));
    expect(new URL(second.callback.headers.get('location')!, origin).searchParams.get('error')).toBe('AccessDenied');
    expect(state.accounts.size).toBe(0);
  });
});
