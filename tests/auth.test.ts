import { describe, expect, it, afterEach } from 'vitest';
import { cleanEmail, safeNext, siteOrigin } from '../src/lib/auth/config';
import { enforceOrigin, HttpProblem } from '../src/lib/auth/http';
import { hashPassword, passwordProblem, verifyPassword } from '../src/lib/auth/password';
import { readSessionToken, sessionCookie } from '../src/lib/auth/session';
import { verifiedProviderEmail } from '../src/lib/auth/oauth';
import { getAccess } from '../src/lib/access';

const originalSite = process.env.SITE_URL;
afterEach(() => { if (originalSite === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = originalSite; });

describe('authentication boundaries', () => {
  it('denies anonymous access without needing a database', async () => {
    expect(await getAccess(new Request('https://example.test/trips/'))).toEqual({ user: null, canViewTrips: false, isAdmin: false });
  });
  it('normalizes email without merging dots or plus aliases', () => {
    expect(cleanEmail(' Alice.Name+cycling@Example.COM ')).toBe('alice.name+cycling@example.com');
    expect(cleanEmail('a@localhost')).toBeNull();
    expect(cleanEmail('a@example.com\nBcc: stranger@example.com')).toBeNull();
  });
  it('permits only local trip/account return paths', () => {
    expect(safeNext('/trips/2026/#album')).toBe('/trips/2026/#album');
    for (const input of ['//evil.example/path', '/\\evil.example/', 'https://evil.example', '/login/', '/api/auth/signout', '/trips/../../outside', '/trips/%2f%2fevil']) {
      // Encoded slash in a deeper path stays on our own origin.
      expect(new URL(safeNext(input), 'https://example.test').origin).toBe('https://example.test');
    }
    expect(safeNext('/trips/../../outside')).toBe('/account/');
  });
  it('requires the configured Origin on all mutations', () => {
    process.env.SITE_URL = 'https://example.test';
    expect(() => enforceOrigin(new Request(`${siteOrigin()}/api/account/logout`, { method: 'POST' }))).toThrow(HttpProblem);
    expect(() => enforceOrigin(new Request(`${siteOrigin()}/api/account/logout`, { method: 'POST', headers: { Origin: 'https://evil.example' } }))).toThrow(HttpProblem);
    expect(() => enforceOrigin(new Request(`${siteOrigin()}/api/account/logout`, { method: 'POST', headers: { Origin: siteOrigin() } }))).not.toThrow();
  });
  it('uses the same host-only session cookie for HTTPS and local login', () => {
    process.env.SITE_URL = 'https://example.test';
    expect(sessionCookie()).toEqual({ name: '__Secure-authjs.session-token', options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true } });
    const token = 'a'.repeat(64);
    expect(readSessionToken(new Request(siteOrigin(), { headers: { Cookie: `__Secure-authjs.session-token=${token}` } }))).toBe(token);
    expect(readSessionToken(new Request(siteOrigin(), { headers: { Cookie: `authjs.session-token=${token}` } }))).toBeNull();
    expect(readSessionToken(new Request(siteOrigin(), { headers: { Cookie: `__Secure-authjs.session-token=${token}; __Secure-authjs.session-token=${token}` } }))).toBeNull();
  });
  it('accepts only explicit provider evidence for email ownership', () => {
    expect(verifiedProviderEmail('google', { email: 'A@example.test', email_verified: true })).toBe('a@example.test');
    expect(verifiedProviderEmail('google', { email: 'A@example.test', email_verified: 'true' })).toBeNull();
    expect(verifiedProviderEmail('github', { email: 'a@example.test', verified: true })).toBeNull();
    expect(verifiedProviderEmail('github', { email: 'a@example.test', avalur_email_verified: true })).toBe('a@example.test');
  });
  it('hashes passwords with a per-password salt and rejects malformed stored costs', async () => {
    const password = 'A long cycling password';
    const one = await hashPassword(password);
    const two = await hashPassword(password);
    expect(one).not.toBe(two);
    expect(await verifyPassword(password, one)).toBe(true);
    expect(await verifyPassword('wrong password', one)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, one.replace('$32768$', '$2147483648$'))).toBe(false);
    expect(passwordProblem('short')).toBeTruthy();
    expect(passwordProblem('a'.repeat(201))).toBeTruthy();
  });
});
