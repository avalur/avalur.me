import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { getDb } from '../src/lib/auth/db';
import { getAccess } from '../src/lib/access';
import { register, verifyEmail, login, logout, forgotPassword, resetPassword, manageAccess, listAccess, hashToken } from '../src/lib/auth/accounts';
import { handleAuth, authConfig } from '../src/lib/auth/oauth';
import { checkRate } from '../src/lib/auth/rate-limit';
import { mailConfigured } from '../src/lib/auth/mail';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const target = new URL(testDatabaseUrl);
  // These tests grant access to fictional accounts. They must never run
  // against the database used by a live private album, even accidentally.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production' ||
      !['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
      !/^[a-z0-9_]+_tests$/.test(decodeURIComponent(target.pathname.slice(1)))) {
    throw new Error('Auth integration tests require a dedicated local PostgreSQL database with a name ending in _tests. Run scripts/setup-test-db.mjs.');
  }
}
const integration = describe.skipIf(!testDatabaseUrl);
const run = randomBytes(6).toString('hex');
const suffix = `-${run}@auth.test.invalid`;
const email = (label: string) => label + suffix;
const origin = 'http://localhost:4321';
let mailDir = '';
const initialEnv = { ...process.env };

function request(path: string, body: Record<string, unknown> = {}, cookie?: string, method = 'POST'): Request {
  return new Request(origin + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
}
function call(handler: (context: { request: Request }) => Promise<Response>, body: Record<string, unknown> = {}, cookie?: string) {
  return handler({ request: request('/api/account/test', body, cookie) });
}
const cookieOf = (response: Response) => response.headers.get('set-cookie')!.split(';')[0];

async function mailToken(to: string, route: string) {
  const files = await readdir(mailDir);
  const mails = await Promise.all(files.map(async filename => JSON.parse(await readFile(join(mailDir, filename), 'utf8'))));
  const mail = mails.reverse().find(item => item.to === to && item.text.includes(route));
  expect(mail).toBeTruthy();
  const href = (mail.text as string).match(/http:\/\/[^\s]+/)![0];
  const url = new URL(href);
  expect(url.searchParams.has('token')).toBe(false);
  return new URLSearchParams(url.hash.slice(1)).get('token')!;
}

async function createConfirmed(label: string) {
  const address = email(label);
  expect((await call(register, { email: address })).status).toBe(200);
  const token = await mailToken(address, '/verify-email/');
  const result = await call(verifyEmail, { token, name: 'Test rider', password: 'A valid cycling password' });
  expect(result.status).toBe(200);
  return { address, token, cookie: cookieOf(result) };
}

integration('accounts, verified access and shared database sessions', () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.DIRECT_URL = testDatabaseUrl;
    process.env.SITE_URL = origin;
    process.env.AUTH_SECRET = `test-only-secret-at-least-32-characters-${run}`;
    process.env.NODE_ENV = 'test';
    process.env.MAIL_TRANSPORT = 'file';
    process.env.ADMIN_EMAILS = '';
    delete process.env.VERCEL;
    mailDir = await mkdtemp(join(tmpdir(), 'avalur-auth-test-'));
    process.env.PRIVATE_MAIL_DIR = mailDir;
    await getDb().$connect();
  });

  afterAll(async () => {
    const db = getDb();
    const users = await db.user.findMany({ where: { email: { endsWith: suffix } }, select: { id: true, email: true } });
    const pending = await db.emailVerificationToken.findMany({ where: { email: { endsWith: suffix } }, select: { email: true } });
    const identities = ['local-or-unidentified', ...users.flatMap(user => [user.id, user.email!]), ...pending.map(row => row.email)];
    const digests = [...new Set(identities)].map(identity => createHmac('sha256', process.env.AUTH_SECRET!).update(identity).digest('hex'));
    await db.rateLimitBucket.deleteMany({ where: { OR: digests.map(digest => ({ key: { endsWith: digest } })) } });
    await db.emailVerificationToken.deleteMany({ where: { email: { endsWith: suffix } } });
    await db.accessGrant.deleteMany({ where: { emailNormalized: { endsWith: suffix } } });
    await db.user.deleteMany({ where: { email: { endsWith: suffix } } });
    await db.rateLimitBucket.deleteMany({ where: { key: { startsWith: `test-concurrent-${run}:` } } });
    await db.$disconnect();
    await rm(mailDir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) if (!(key in initialEnv)) delete process.env[key];
    Object.assign(process.env, initialEnv);
  });

  it('does not create a user/password until the mailbox owner completes registration', async () => {
    const address = email('register');
    const response = await call(register, { email: ` ${address.toUpperCase()} `, password: 'attacker chosen password' });
    expect(response.status).toBe(200);
    expect(await getDb().user.findUnique({ where: { email: address } })).toBeNull();
    const token = await mailToken(address, '/verify-email/');
    const stored = await getDb().emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
    expect(stored?.tokenHash).not.toBe(token);
    const get = await verifyEmail({ request: request('/api/account/verify-email', {}, undefined, 'GET') });
    expect(get.status).toBe(405);
    expect((await getDb().emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } }))?.usedAt).toBeNull();
    const completions = await Promise.all([0, 1].map(() => call(verifyEmail, { token, name: 'Mailbox owner', password: 'owner cycling password', next: '//evil.test' })));
    expect(completions.map(response => response.status).sort()).toEqual([200, 400]);
    expect(await completions.find(response => response.status === 200)!.json()).toMatchObject({ redirectTo: '/account/' });
    const user = await getDb().user.findUnique({ where: { email: address } });
    expect(user?.emailVerified).toBeInstanceOf(Date);
    expect(await getDb().session.count({ where: { userId: user!.id } })).toBe(1);
    expect((await call(login, { email: address, password: 'attacker chosen password' })).status).toBe(401);
  });

  it('fails expired confirmation and never consumes a link for an invalid password', async () => {
    const address = email('expired');
    await call(register, { email: address });
    const token = await mailToken(address, '/verify-email/');
    expect((await call(verifyEmail, { token, name: 'Rider', password: 'short' })).status).toBe(400);
    expect((await getDb().emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } }))?.usedAt).toBeNull();
    await getDb().emailVerificationToken.update({ where: { tokenHash: hashToken(token) }, data: { expiresAt: new Date(0) } });
    expect((await call(verifyEmail, { token, name: 'Rider', password: 'valid cycling password' })).status).toBe(400);
    expect(await getDb().user.findUnique({ where: { email: address } })).toBeNull();
  });

  it('shares password sessions with Auth.js and checks live grants on every request', async () => {
    const { address, cookie } = await createConfirmed('access');
    const req = request('/trips/2026/', {}, cookie, 'GET');
    expect(await getAccess(req)).toMatchObject({ canViewTrips: false, isAdmin: false, user: { email: address } });
    const authSession = await handleAuth({ request: request('/api/auth/session', {}, cookie, 'GET') });
    expect(authSession.status).toBe(200);
    const payload = await authSession.json();
    expect(payload.user.email).toBe(address);
    expect(JSON.stringify(payload)).not.toMatch(/passwordHash|access_token|AccessGrant/);
    await getDb().accessGrant.create({ data: { scope: 'trips', emailNormalized: address } });
    expect((await getAccess(req)).canViewTrips).toBe(true);
    await getDb().accessGrant.update({ where: { scope_emailNormalized: { scope: 'trips', emailNormalized: address } }, data: { revokedAt: new Date() } });
    expect((await getAccess(req)).canViewTrips).toBe(false);
    const out = await call(logout, {}, cookie);
    expect(out.status).toBe(200);
    expect(out.headers.get('set-cookie')).toContain('Max-Age=0');
    expect((await getAccess(req)).user).toBeNull();
  });

  it('refuses unverified, expired and forged sessions even for a granted email', async () => {
    const user = await getDb().user.create({ data: { email: email('unverified') } });
    await getDb().accessGrant.create({ data: { scope: 'trips', emailNormalized: user.email! } });
    const sessionToken = randomBytes(32).toString('hex');
    await getDb().session.create({ data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 100000) } });
    const req = request('/trips/', {}, `authjs.session-token=${sessionToken}`, 'GET');
    expect((await getAccess(req)).canViewTrips).toBe(false);
    await getDb().user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    await getDb().session.update({ where: { sessionToken }, data: { expires: new Date(0) } });
    expect((await getAccess(req)).user).toBeNull();
    expect((await getAccess(request('/trips/', {}, `authjs.session-token=${'c'.repeat(64)}`, 'GET'))).user).toBeNull();
  });

  it('resets once, invalidates sibling links and revokes all previous sessions', async () => {
    const { address, cookie } = await createConfirmed('reset');
    const secondSession = await call(login, { email: address, password: 'A valid cycling password' });
    await call(forgotPassword, { email: address });
    const token = await mailToken(address, '/reset-password/');
    const user = await getDb().user.findUniqueOrThrow({ where: { email: address } });
    const siblingToken = randomBytes(32).toString('hex');
    await getDb().passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(siblingToken), expiresAt: new Date(Date.now() + 60000) } });
    const responses = await Promise.all([token, siblingToken].map(link => call(resetPassword, { token: link, password: 'New owner cycling password' })));
    expect(responses.map(response => response.status).sort()).toEqual([200, 400]);
    for (const oldCookie of [cookie, cookieOf(secondSession)]) expect((await getAccess(request('/account/', {}, oldCookie, 'GET'))).user).toBeNull();
    expect(await getDb().session.count({ where: { userId: user.id } })).toBe(1);
    expect((await call(resetPassword, { token, password: 'Another changed password' })).status).toBe(400);
    expect((await call(login, { email: address, password: 'A valid cycling password' })).status).toBe(401);
    expect((await call(login, { email: address, password: 'New owner cycling password' })).status).toBe(200);
  });

  it('keeps administration separate from trip permission and protects the email list', async () => {
    const owner = await createConfirmed('owner');
    process.env.ADMIN_EMAILS = owner.address.toUpperCase();
    expect(await getAccess(request('/account/', {}, owner.cookie, 'GET'))).toMatchObject({ isAdmin: true, canViewTrips: false });
    expect((await call(manageAccess, { email: email('recipient'), action: 'grant' }, owner.cookie)).status).toBe(200);
    expect((await listAccess({ request: request('/api/account/access', {}, undefined, 'GET') })).status).toBe(401);
    const ordinary = await createConfirmed('ordinary');
    expect((await call(manageAccess, { email: ordinary.address, action: 'grant' }, ordinary.cookie)).status).toBe(403);
    expect((await listAccess({ request: request('/api/account/access', {}, ordinary.cookie, 'GET') })).status).toBe(403);
    expect((await listAccess({ request: request('/api/account/access', {}, owner.cookie, 'GET') })).status).toBe(200);
    process.env.ADMIN_EMAILS = '';
  });

  it('counts concurrent requests atomically in the database', async () => {
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => checkRate(`test-concurrent-${run}`, 'same-identity', 3, 60000)));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(9);
  });

  it('marks OAuth accounts verified only with request-local verified evidence', async () => {
    process.env.AUTH_GOOGLE_ID = 'test-client';
    process.env.AUTH_GOOGLE_SECRET = 'test-secret';
    const address = email('oauth');
    const config = authConfig(request('/api/auth/callback/google', {}, undefined, 'GET'));
    await expect(config.adapter!.createUser!({ id: 'ignored', email: address, emailVerified: null, name: 'OAuth rider' })).rejects.toThrow();
    const callback = config.callbacks!.signIn!;
    expect(await callback({ user: { id: 'provider-id', email: address }, account: { provider: 'google', providerAccountId: 'provider-id', type: 'oidc' }, profile: { email: address, email_verified: false } })).toBe(false);
    expect(await callback({ user: { id: 'provider-id', email: address }, account: { provider: 'google', providerAccountId: 'provider-id', type: 'oidc' }, profile: { email: address, email_verified: true } })).toBe(true);
    const user = await config.adapter!.createUser!({ id: 'ignored', email: address, emailVerified: null, name: 'OAuth rider' });
    expect(user.emailVerified).toBeInstanceOf(Date);
    const sessionToken = randomUUID();
    await config.adapter!.createSession!({ sessionToken, userId: user.id, expires: new Date(Date.now() + 60000) });
    expect((await getAccess(request('/account/', {}, `authjs.session-token=${sessionToken}`, 'GET'))).user?.id).toBe(user.id);
    const cookie = `authjs.session-token=${sessionToken}`;
    const second = authConfig(request('/api/auth/callback/google', {}, cookie, 'GET'));
    expect(await second.callbacks!.signIn!({ user: { id: 'other', email: email('other') }, account: { provider: 'google', providerAccountId: 'other', type: 'oidc' }, profile: { email: email('other'), email_verified: true } })).toBe(false);
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
  });

  it('forbids file mail in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => mailConfigured()).toThrow();
    process.env.NODE_ENV = 'test';
  });
});
