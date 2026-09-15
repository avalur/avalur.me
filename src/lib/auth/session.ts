import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { siteOrigin } from './config';

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function sessionCookie() {
  const secure = siteOrigin().startsWith('https://');
  return {
    name: secure ? '__Secure-authjs.session-token' : 'authjs.session-token',
    options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure },
  };
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const name = sessionCookie().name;
  const matches = cookieHeader.split(';').map(c => c.trim()).filter(c => c.startsWith(`${name}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(name.length + 1);
  // UUIDs from Auth.js and hex tokens from password sign-in share this cookie.
  return /^[a-zA-Z0-9_-]{20,256}$/.test(value) ? value : null;
}

export async function newSession(tx: Prisma.TransactionClient, userId: string) {
  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await tx.session.create({ data: { sessionToken, expires, userId } });
  return { sessionToken, expires };
}

export function attachSession(response: Response, session: { sessionToken: string; expires: Date }): Response {
  const { name, options } = sessionCookie();
  response.headers.append('Set-Cookie', `${name}=${session.sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${session.expires.toUTCString()}; Max-Age=${SESSION_MAX_AGE}${options.secure ? '; Secure' : ''}`);
  return response;
}

export function clearSession(response: Response): Response {
  const { name, options } = sessionCookie();
  response.headers.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${options.secure ? '; Secure' : ''}`);
  return response;
}
