export function siteOrigin(): string {
  const configured = process.env.SITE_URL;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('SITE_URL is required');
  }
  const url = new URL(configured || 'http://localhost:4321');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('SITE_URL must be an HTTP origin');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('SITE_URL must use HTTPS in production');
  }
  return url.origin;
}

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters');
  return secret;
}

export function cleanEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null;
  return email;
}

/** Only internal account/trip paths may be used after authentication. */
export function safeNext(value: unknown, fallback = '/account/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return fallback;
  const url = new URL(value, 'https://local.invalid');
  if (url.origin !== 'https://local.invalid') return fallback;
  if (!/^\/(?:account|trips)(?:\/|$)/.test(url.pathname)) return fallback;
  return url.pathname + url.search + url.hash;
}

export function adminEmail(email: string | null): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || '').split(/[,;\n]/).map(cleanEmail).includes(email);
}

export function oauthProviders(): Array<{ id: 'google' | 'github'; name: string }> {
  const providers: Array<{ id: 'google' | 'github'; name: string }> = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push({ id: 'google', name: 'Google' });
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push({ id: 'github', name: 'GitHub' });
  return providers;
}
