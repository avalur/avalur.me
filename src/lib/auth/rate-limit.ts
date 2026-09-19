import { createHmac } from 'node:crypto';
import { authSecret } from './config';
import { getDb } from './db';
import { HttpProblem } from './http';

/** Only Vercel's overwritten proxy header is trusted; arbitrary forwarded-for
 * headers in local development cannot create unlimited new rate buckets. */
export function clientKey(request: Request): string {
  if (process.env.VERCEL === '1') {
    const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (ip && /^[\da-f.:]{3,80}$/i.test(ip)) return ip;
  }
  return 'local-or-unidentified';
}

export async function checkRate(scope: string, identity: string, limit: number, durationMs: number): Promise<void> {
  const now = Date.now();
  const window = Math.floor(now / durationMs);
  const digest = createHmac('sha256', authSecret()).update(identity).digest('hex');
  const key = `${scope}:${window}:${digest}`;
  const db = getDb();
  const bucket = await db.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((window + 1) * durationMs) },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  if (bucket.count === 1) await db.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date(now - 86400000) } } });
  if (bucket.count > limit) throw new HttpProblem(429, 'Слишком много попыток. Подождите и попробуйте снова.');
}

export async function limitRequest(request: Request, action: string, email?: string): Promise<void> {
  const mailAction = action === 'register' || action === 'forgot-password';
  await checkRate(`${action}:ip`, clientKey(request), mailAction ? 20 : 60, 15 * 60_000);
  if (email) await checkRate(`${action}:email`, email, mailAction ? 4 : 12, 15 * 60_000);
}
