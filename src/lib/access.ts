import { adminEmail, authSecret, cleanEmail } from './auth/config';
import { getDb } from './auth/db';
import { readSessionToken } from './auth/session';

export type Access = {
  user: { id: string; email: string | null; name: string | null; emailVerified: Date | null } | null;
  canViewTrips: boolean;
  isAdmin: boolean;
};

export async function getAccess(request: Request): Promise<Access> {
  const denied: Access = { user: null, canViewTrips: false, isAdmin: false };
  const sessionToken = readSessionToken(request);
  if (!sessionToken) return denied;
  authSecret();
  const db = getDb();
  const session = await db.session.findUnique({
    where: { sessionToken },
    select: { expires: true, user: { select: { id: true, email: true, name: true, emailVerified: true } } },
  });
  if (!session || session.expires <= new Date()) return denied;
  const { user } = session;
  const email = cleanEmail(user.email);
  if (!email || !user.emailVerified) return { ...denied, user };
  const grant = await db.accessGrant.findUnique({ where: { scope_emailNormalized: { scope: 'trips', emailNormalized: email } }, select: { revokedAt: true } });
  return { user, isAdmin: adminEmail(email), canViewTrips: !!grant && grant.revokedAt === null };
}
