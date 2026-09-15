import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getAccess } from '../access';
import { cleanEmail, safeNext, siteOrigin } from './config';
import { getDb } from './db';
import { accountHandler, HttpProblem, json } from './http';
import { accountMail, mailConfigured, sendMail } from './mail';
import { hashPassword, passwordProblem, verifyPassword } from './password';
import { limitRequest } from './rate-limit';
import { attachSession, clearSession, newSession, readSessionToken } from './session';

const CHECK_MAIL = 'Если адрес указан верно, письмо придёт в течение нескольких минут. Проверьте также папку «Спам».';
const INVALID_LINK = 'Ссылка недействительна, истекла или уже использована. Запросите новое письмо.';
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

function requireEmail(value: unknown): string {
  const email = cleanEmail(value);
  if (!email) throw new HttpProblem(400, 'Введите корректный email.');
  return email;
}

function requireToken(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new HttpProblem(400, INVALID_LINK);
  return value;
}

function requirePassword(value: unknown, email?: string): string {
  const problem = passwordProblem(value, email);
  if (problem) throw new HttpProblem(400, problem);
  return value as string;
}

function registrationName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new HttpProblem(400, 'Введите имя длиной до 100 символов.');
  }
  return value.trim();
}

async function sendReset(userId: string, email: string): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const db = getDb();
  const row = await db.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
  const url = new URL('/reset-password/', siteOrigin());
  // A fragment keeps the token out of HTTP access logs and Referer headers.
  url.hash = new URLSearchParams({ token }).toString();
  try { await sendMail(accountMail(email, url.href, 'reset')); }
  catch (error) { await db.passwordResetToken.delete({ where: { id: row.id } }); throw error; }
}

export const register = accountHandler(async (request, body) => {
  const email = requireEmail(body.email);
  await limitRequest(request, 'register', email);
  mailConfigured();
  const db = getDb();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // The mailbox owner may set a password for an existing OAuth account only
    // through the reset flow, which also revokes every previous session.
    await sendReset(existing.id, email);
  } else {
    const token = randomBytes(32).toString('hex');
    const row = await db.emailVerificationToken.create({ data: { email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) } });
    const url = new URL('/verify-email/', siteOrigin());
    url.searchParams.set('next', safeNext(body.next));
    url.hash = new URLSearchParams({ token }).toString();
    try { await sendMail(accountMail(email, url.href, 'verify')); }
    catch (error) { await db.emailVerificationToken.delete({ where: { id: row.id } }); throw error; }
  }
  return json({ ok: true, message: CHECK_MAIL });
});

export const verifyEmail = accountHandler(async (request, body) => {
  await limitRequest(request, 'verify-email');
  const tokenHash = hashToken(requireToken(body.token));
  const name = registrationName(body.name);
  const db = getDb();
  const token = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) throw new HttpProblem(400, INVALID_LINK);
  const passwordHash = await hashPassword(requirePassword(body.password, token.email));
  let session;
  try {
    session = await db.$transaction(async tx => {
      const now = new Date();
      const claimed = await tx.emailVerificationToken.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new HttpProblem(400, INVALID_LINK);
      const user = await tx.user.create({ data: { email: token.email, emailVerified: now, name, passwordHash } });
      await tx.emailVerificationToken.updateMany({ where: { email: token.email, usedAt: null }, data: { usedAt: now } });
      return newSession(tx, user.id);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpProblem(409, 'Аккаунт уже создан. Войдите или запросите восстановление пароля.');
    }
    throw error;
  }
  return attachSession(json({ ok: true, redirectTo: safeNext(body.next) }), session);
});

export const login = accountHandler(async (request, body) => {
  const email = requireEmail(body.email);
  await limitRequest(request, 'login', email);
  const password = typeof body.password === 'string' && body.password.length <= 200 ? body.password : '';
  const db = getDb();
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!valid || !user || !user.emailVerified) throw new HttpProblem(401, 'Email или пароль не подошёл.');
  const session = await db.$transaction(async tx => {
    // Serialize session creation with reset: a checked old password must not
    // mint a new session immediately after reset has revoked the old ones.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current || current.passwordHash !== user.passwordHash || !current.emailVerified) throw new HttpProblem(401, 'Email или пароль не подошёл.');
    return newSession(tx, user.id);
  });
  return attachSession(json({ ok: true, redirectTo: safeNext(body.next) }), session);
});

export const forgotPassword = accountHandler(async (request, body) => {
  const email = requireEmail(body.email);
  await limitRequest(request, 'forgot-password', email);
  mailConfigured();
  const user = await getDb().user.findUnique({ where: { email }, select: { id: true } });
  if (user) await sendReset(user.id, email);
  return json({ ok: true, message: CHECK_MAIL });
});

export const resetPassword = accountHandler(async (request, body) => {
  await limitRequest(request, 'reset-password');
  const tokenHash = hashToken(requireToken(body.token));
  const db = getDb();
  const token = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: { select: { email: true } } } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) throw new HttpProblem(400, INVALID_LINK);
  const passwordHash = await hashPassword(requirePassword(body.password, token.user.email ?? undefined));
  const session = await db.$transaction(async tx => {
    // Lock the owner before claiming, so two different outstanding reset links
    // cannot both succeed concurrently after one has invalidated the other.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${token.userId} FOR UPDATE`;
    const now = new Date();
    const claimed = await tx.passwordResetToken.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (claimed.count !== 1) throw new HttpProblem(400, INVALID_LINK);
    await tx.user.update({ where: { id: token.userId }, data: { passwordHash, emailVerified: now } });
    await tx.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: now } });
    if (token.user.email) await tx.emailVerificationToken.updateMany({ where: { email: token.user.email, usedAt: null }, data: { usedAt: now } });
    await tx.session.deleteMany({ where: { userId: token.userId } });
    return newSession(tx, token.userId);
  });
  return attachSession(json({ ok: true, redirectTo: '/account/' }), session);
});

export const logout = accountHandler(async request => {
  const sessionToken = readSessionToken(request);
  if (sessionToken) await getDb().session.deleteMany({ where: { sessionToken } });
  return clearSession(json({ ok: true, redirectTo: '/login/' }));
});

export const manageAccess = accountHandler(async (request, body) => {
  const access = await getAccess(request);
  if (!access.user) throw new HttpProblem(401, 'Войдите в аккаунт.');
  if (!access.isAdmin) throw new HttpProblem(403, 'Управление доступом доступно владельцу сайта.');
  await limitRequest(request, 'manage-access', access.user.id);
  const email = requireEmail(body.email);
  if (body.action !== 'grant' && body.action !== 'revoke') throw new HttpProblem(400, 'Неизвестное действие.');
  await getDb().accessGrant.upsert({
    where: { scope_emailNormalized: { scope: 'trips', emailNormalized: email } },
    create: { scope: 'trips', emailNormalized: email, revokedAt: body.action === 'revoke' ? new Date() : null },
    update: { revokedAt: body.action === 'revoke' ? new Date() : null },
  });
  return json({ ok: true, message: body.action === 'grant' ? 'Доступ предоставлен.' : 'Доступ отозван.' });
});

export async function listAccess({ request }: { request: Request }): Promise<Response> {
  try {
    const access = await getAccess(request);
    if (!access.user) return json({ error: 'Войдите в аккаунт.' }, 401);
    if (!access.isAdmin) return json({ error: 'Недостаточно прав.' }, 403);
    const grants = await getDb().accessGrant.findMany({ where: { scope: 'trips' }, select: { emailNormalized: true, createdAt: true, revokedAt: true }, orderBy: { emailNormalized: 'asc' } });
    return json({ ok: true, grants });
  } catch { return json({ error: 'Сервис аккаунтов временно недоступен.' }, 503); }
}
