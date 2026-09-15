import { Auth, type AuthConfig } from '@auth/core';
import Google from '@auth/core/providers/google';
import GitHub from '@auth/core/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { authSecret, cleanEmail, oauthProviders, safeNext, siteOrigin } from './config';
import { getDb } from './db';
import { enforceOrigin, HttpProblem, json } from './http';
import { readSessionToken, SESSION_MAX_AGE, sessionCookie } from './session';

export function verifiedProviderEmail(provider: string, profile: Record<string, unknown> | undefined): string | null {
  if (!profile) return null;
  if (provider === 'google' && profile.email_verified === true) return cleanEmail(profile.email);
  if (provider === 'github' && profile.avalur_email_verified === true) return cleanEmail(profile.email);
  return null;
}

/** Built per request: evidence used by createUser never crosses requests. */
export function authConfig(request: Request): AuthConfig {
  const db = getDb();
  const adapter = PrismaAdapter(db);
  let verifiedEmail: string | null = null;
  const available = oauthProviders().map(provider => provider.id);
  const providers: AuthConfig['providers'] = [];
  if (available.includes('google')) providers.push(Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: false,
    profile(profile) {
      return { id: profile.sub, name: profile.name, email: cleanEmail(profile.email), image: null };
    },
  }));
  if (available.includes('github')) providers.push(GitHub({
    clientId: process.env.AUTH_GITHUB_ID,
    clientSecret: process.env.AUTH_GITHUB_SECRET,
    allowDangerousEmailAccountLinking: false,
    userinfo: {
      url: 'https://api.github.com/user',
      async request({ tokens }: { tokens: { access_token?: string } }) {
        const headers = { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'avalur.me', Accept: 'application/vnd.github+json' };
        const [profileResponse, emailsResponse] = await Promise.all([
          fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(15_000) }),
          fetch('https://api.github.com/user/emails', { headers, signal: AbortSignal.timeout(15_000) }),
        ]);
        if (!profileResponse.ok || !emailsResponse.ok) throw new Error('Cannot verify GitHub email');
        const profile = await profileResponse.json();
        const emails = await emailsResponse.json() as Array<{ email: string; verified: boolean; primary: boolean }>;
        const primary = Array.isArray(emails) ? emails.find(email => email.primary === true && email.verified === true && cleanEmail(email.email)) : undefined;
        return { ...profile, email: primary?.email ?? null, avalur_email_verified: !!primary };
      },
    },
    profile(profile) {
      return { id: String(profile.id), name: profile.name || profile.login, email: cleanEmail(profile.email), image: null };
    },
  }));

  return {
    basePath: '/api/auth',
    trustHost: true,
    secret: authSecret(),
    providers,
    adapter: {
      ...adapter,
      async createUser(data) {
        // Core deliberately sends emailVerified:null for OAuth. Set it only
        // from evidence checked by this request's preceding signIn callback.
        if (!verifiedEmail || cleanEmail(data.email) !== verifiedEmail) throw new Error('OAuth email verification required');
        return adapter.createUser!({ ...data, email: verifiedEmail, emailVerified: new Date() });
      },
      async getUserByEmail(email) {
        const normalized = cleanEmail(email);
        return normalized ? adapter.getUserByEmail!(normalized) : null;
      },
    },
    session: { strategy: 'database', maxAge: SESSION_MAX_AGE },
    cookies: { sessionToken: sessionCookie() },
    useSecureCookies: siteOrigin().startsWith('https://'),
    pages: { signIn: '/login/', error: '/login/' },
    callbacks: {
      async signIn({ user, account, profile }) {
        const email = verifiedProviderEmail(account?.provider || '', profile);
        if (!email || cleanEmail(user.email) !== email) return false;
        // Auth.js permits intentional linking while signed in. Require the
        // active account to own the exact same verified email in that case.
        const sessionToken = readSessionToken(request);
        if (sessionToken) {
          const current = await db.session.findUnique({ where: { sessionToken }, include: { user: true } });
          if (current && current.expires > new Date() && (!current.user.emailVerified || cleanEmail(current.user.email) !== email)) return false;
        }
        verifiedEmail = email;
        return true;
      },
      async redirect({ url }) {
        let path = url;
        try {
          const parsed = new URL(url, siteOrigin());
          if (parsed.origin !== siteOrigin()) return `${siteOrigin()}/account/`;
          path = parsed.pathname + parsed.search + parsed.hash;
        } catch { return `${siteOrigin()}/account/`; }
        return siteOrigin() + safeNext(path);
      },
      async session({ session, user }) {
        // No password hashes, grants, provider tokens, or email list in session.
        session.user = { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, image: null };
        return session;
      },
    },
    logger: {
      error() { console.error('[auth] authentication request failed'); },
      warn() { console.warn('[auth] configuration warning'); },
      debug() {},
    },
  };
}

export async function handleAuth({ request }: { request: Request }): Promise<Response> {
  try {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Метод не поддерживается.' }, 405);
    if (new URL(request.url).origin !== siteOrigin()) return json({ error: 'Недопустимый адрес сайта.' }, 400);
    if (request.method === 'POST') enforceOrigin(request);
    const response = await Auth(request, authConfig(request));
    // Auth.js error redirects have immutable headers. Preserve those redirects
    // so an account-linking prompt does not accidentally become a 503 response.
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    if (error instanceof HttpProblem) return json({ error: error.message }, error.status);
    console.error('[auth] service unavailable');
    return json({ error: 'Сервис входа временно недоступен.' }, 503);
  }
}
