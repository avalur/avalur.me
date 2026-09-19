import { siteOrigin } from '../auth/config';
import { HttpProblem } from '../auth/http';
import { checkRate, clientKey } from '../auth/rate-limit';

/** OpenRouter proxy for the Tetris chat panel (public/tetris/agent-chat.js).
 * The key stays on the server: the page talks to /api/tetris/*, and these
 * handlers attach it on the way out. */

const DEFAULT_MODEL = 'z-ai/glm-5.3';
/** A conversation carries the system prompt, the tool definitions and the
 * whole history, so it is far larger than an account form. */
const BODY_LIMIT = 512 * 1024;
const MAX_MESSAGES = 80;
const MAX_TOKENS = 4096;

export function upstreamBase(): string {
  return process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
}

export function apiKey(): string {
  return process.env.OPENROUTER_API_KEY || '';
}

export function defaultModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

export function upstreamRequest(path: string, payload?: unknown, stream = false): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': siteOrigin(),
    'X-Title': 'avalur.me Tetris',
  };
  if (stream) headers.Accept = 'text/event-stream';
  return fetch(upstreamBase() + path, {
    method: payload === undefined ? 'GET' : 'POST',
    headers,
    body: payload === undefined ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000),
  });
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  } });
}

/** Reads the chat payload: same origin only, size capped, and every knob that
 * costs money clamped before the request leaves the server. */
export async function chatPayload(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (origin !== siteOrigin() || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpProblem(403, 'Cross-site requests are not allowed. Reload the page.');
  }
  if (Number(request.headers.get('content-length')) > BODY_LIMIT) throw new HttpProblem(413, 'Conversation is too long. Reload the page.');
  if (!request.body) throw new HttpProblem(400, 'Empty request.');

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > BODY_LIMIT) { await reader.cancel(); throw new HttpProblem(413, 'Conversation is too long. Reload the page.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error();
  } catch { throw new HttpProblem(400, 'Could not read the request.'); }

  const messages = payload.messages;
  if (!Array.isArray(messages) || messages.length === 0) throw new HttpProblem(400, 'No messages to send.');
  if (messages.length > MAX_MESSAGES) throw new HttpProblem(413, 'Conversation is too long. Press Reset to start over.');

  const model = typeof payload.model === 'string' ? payload.model : '';
  if (model && !/^[\w.\-]{1,40}\/[\w.\-:]{1,60}$/.test(model)) throw new HttpProblem(400, 'Unknown model.');
  payload.model = model || defaultModel();

  const wanted = Number(payload.max_tokens);
  payload.max_tokens = Number.isFinite(wanted) && wanted > 0 ? Math.min(wanted, MAX_TOKENS) : MAX_TOKENS;
  delete payload.provider; // no routing overrides from the browser
  return payload;
}

const LIMIT = 120;
const WINDOW_MS = 15 * 60_000;

/** Per-instance backstop for when the shared bucket store cannot be reached:
 * weaker than the database counter, but better than letting the key through
 * unmetered. */
const recent = new Map<string, { start: number; count: number }>();

function limitInMemory(key: string): void {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [id, bucket] of recent) if (now - bucket.start > WINDOW_MS) recent.delete(id);
  }
  const bucket = recent.get(key);
  if (!bucket || now - bucket.start > WINDOW_MS) return void recent.set(key, { start: now, count: 1 });
  bucket.count += 1;
  if (bucket.count > LIMIT) throw new HttpProblem(429, 'Too many requests. Wait a few minutes and try again.');
}

/** Anyone can open /tetris, so the wallet is guarded per IP rather than per
 * account. One agent turn can take several completions, hence the headroom. */
export async function limitChat(request: Request): Promise<void> {
  const key = clientKey(request);
  try {
    await checkRate('tetris-chat:ip', key, LIMIT, WINDOW_MS);
  } catch (error) {
    if (error instanceof HttpProblem) throw error; // the limit itself, not the store
    console.error('[tetris] rate-limit store unavailable, counting in memory');
    limitInMemory(key);
  }
}

export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof HttpProblem) return json({ error: error.message }, error.status);
    console.error('[tetris] agent request failed:', error instanceof Error ? error.message : error);
    return json({ error: 'The agent service is temporarily unavailable.' }, 503);
  }
}
