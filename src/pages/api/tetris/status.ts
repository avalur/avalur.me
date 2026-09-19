export const prerender = false;

import { apiKey, defaultModel, handle, json, upstreamBase } from '../../../lib/tetris/agent';

export const GET = () => handle(async () => json({
  hasKey: Boolean(apiKey()),
  model: defaultModel(),
  upstream: upstreamBase(),
}));
