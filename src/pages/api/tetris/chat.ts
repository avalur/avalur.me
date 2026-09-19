export const prerender = false;

import { apiKey, chatPayload, handle, json, limitChat, upstreamRequest } from '../../../lib/tetris/agent';

export const POST = ({ request }: { request: Request }) => handle(async () => {
  if (!apiKey()) return json({ error: 'OPENROUTER_API_KEY is not set on the server' }, 503);

  const payload = await chatPayload(request);
  await limitChat(request);

  const response = await upstreamRequest('/chat/completions', payload, Boolean(payload.stream));
  if (!response.ok) return json({ error: await response.text() }, response.status);

  if (!payload.stream) return json(await response.json());

  // Server-sent events: pass the upstream body straight through to the page.
  return new Response(response.body, { headers: {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
    'X-Robots-Tag': 'noindex, nofollow',
  } });
});
