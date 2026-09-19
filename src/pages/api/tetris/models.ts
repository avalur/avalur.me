export const prerender = false;

import { apiKey, defaultModel, handle, json, upstreamRequest } from '../../../lib/tetris/agent';

type Model = { id: string; name?: string; created?: number; pricing?: { completion?: string };
               supported_parameters?: string[]; benchmarks?: { artificial_analysis?: Record<string, number> } };

/** How good a model is for driving the game, best first. OpenRouter publishes
 * Artificial Analysis indices for most models; the agentic one matches what
 * the chat panel does. Models without any benchmark fall back to their price,
 * which correlates well enough with capability. */
function score(item: Model): [number, number, number] {
  const indices = item.benchmarks?.artificial_analysis || {};
  for (const key of ['agentic_index', 'coding_index', 'intelligence_index']) {
    if (typeof indices[key] === 'number') return [1, indices[key], item.created || 0];
  }
  return [0, Number(item.pricing?.completion) || 0, item.created || 0];
}

/** The two strongest models of every provider - the full list is ~450 long.
 * Only models that can call tools are offered: the agent is useless without
 * them. Alias entries ('~openai/...') and variants ('...:free', '...:batch')
 * are dropped, they only clutter the dropdown. */
function pickModels(catalog: { data?: Model[] }, fallback: string, perProvider = 2) {
  const providers = new Map<string, Model[]>();
  for (const item of catalog.data || []) {
    if (!item.id || item.id.startsWith('~') || item.id.includes(':')) continue;
    if (!(item.supported_parameters || []).includes('tools')) continue;
    const provider = item.id.split('/')[0];
    providers.set(provider, (providers.get(provider) || []).concat(item));
  }

  const groups = [...providers].map(([provider, items]) => {
    items.sort((a, b) => { const x = score(a), y = score(b); return y[0] - x[0] || y[1] - x[1] || y[2] - x[2]; });
    return { provider, items: items.slice(0, perProvider) };
  });

  // strongest providers first, but the workshop is about GLM, so z-ai leads
  groups.sort((a, b) => {
    if ((a.provider === 'z-ai') !== (b.provider === 'z-ai')) return a.provider === 'z-ai' ? -1 : 1;
    const x = score(a.items[0]), y = score(b.items[0]);
    return y[0] - x[0] || y[1] - x[1];
  });

  const models = groups.flatMap((group) => group.items.map((item) => ({ id: item.id, name: item.name || item.id })));
  if (fallback && !models.some((m) => m.id === fallback)) models.unshift({ id: fallback, name: fallback });
  return models;
}

/** The catalog changes rarely and every warm instance would otherwise refetch
 * it on each page load. */
let cache: { at: number; models: { id: string; name: string }[] } | null = null;
const CACHE_MS = 10 * 60_000;

export const GET = () => handle(async () => {
  const fallback = defaultModel();
  if (!apiKey()) return json({ models: [{ id: fallback, name: fallback }], default: fallback });
  if (cache && Date.now() - cache.at < CACHE_MS) return json({ models: cache.models, default: fallback });

  const response = await upstreamRequest('/models');
  if (!response.ok) return json({ error: await response.text() }, response.status);
  const models = pickModels(await response.json(), fallback);
  cache = { at: Date.now(), models };
  return json({ models, default: fallback });
});
