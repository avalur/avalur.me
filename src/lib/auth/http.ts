import { siteOrigin } from './config';

export class HttpProblem extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } });
}

export function enforceOrigin(request: Request): void {
  if (request.method !== 'POST') throw new HttpProblem(405, 'Используйте POST.');
  const origin = request.headers.get('origin');
  if (origin !== siteOrigin() || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpProblem(403, 'Запрос с другого сайта запрещён. Обновите страницу.');
  }
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new HttpProblem(415, 'Ожидается JSON.');
  }
  const limit = 16 * 1024;
  if (Number(request.headers.get('content-length')) > limit) throw new HttpProblem(413, 'Запрос слишком большой.');
  if (!request.body) throw new HttpProblem(400, 'Пустой запрос.');
  const reader = request.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new HttpProblem(413, 'Запрос слишком большой.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch { throw new HttpProblem(400, 'Не удалось прочитать запрос.'); }
}

export function accountHandler(handler: (request: Request, body: Record<string, unknown>) => Promise<Response>) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    try {
      enforceOrigin(request);
      return await handler(request, await jsonBody(request));
    } catch (error) {
      if (error instanceof HttpProblem) return json({ error: error.message }, error.status);
      // Never log a Request, database error, token, OAuth profile, or mail body.
      console.error('[account] request unavailable');
      return json({ error: 'Сервис аккаунтов временно недоступен. Попробуйте позже.' }, 503);
    }
  };
}
