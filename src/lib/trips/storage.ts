import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { StoredAsset } from './types';

// Node-only imports are deliberate: this module must never enter a client bundle.
if (typeof window !== 'undefined') throw new Error('Private trip storage is server-only');

export type StorageConfig = { mode: 'local'; directory: string } | { mode: 'blob'; origin: string; token: string };
export interface ByteRange { start: number; end: number }
const MAX_JSON_BYTES = 1024 * 1024;

function privateOrigin(value: string): string {
  const origin = new URL(value);
  if (origin.protocol !== 'https:' || !/^[a-z0-9-]+\.private\.blob\.vercel-storage\.com$/.test(origin.hostname) || origin.port || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid private Blob origin');
  return origin.origin;
}

export function validatePrivateDirectory(directory: string): void {
  if (!isAbsolute(directory) || directory.split(sep).some(part => ['public', 'dist', '.vercel', 'src'].includes(part))) throw new Error('Private storage cannot be in application assets');
}

export function storageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const mode = env.PRIVATE_TRIPS_STORAGE || (env.NODE_ENV !== 'production' && env.PRIVATE_TRIPS_DIR ? 'local' : 'blob');
  if (mode === 'local') {
    if (env.VERCEL || (env.NODE_ENV === 'production' && env.PRIVATE_TRIPS_ALLOW_LOCAL_PRODUCTION !== 'true')) throw new Error('Local private storage is not enabled on this host');
    if (!env.PRIVATE_TRIPS_DIR || !isAbsolute(env.PRIVATE_TRIPS_DIR)) throw new Error('PRIVATE_TRIPS_DIR must be absolute');
    const directory = resolve(env.PRIVATE_TRIPS_DIR);
    // Catch accidental placement in web assets or deployment output, including absolute paths.
    validatePrivateDirectory(directory);
    return { mode: 'local', directory };
  }
  if (mode !== 'blob' || !env.BLOB_READ_WRITE_TOKEN || !env.PRIVATE_TRIPS_BLOB_ORIGIN) throw new Error('Private Blob storage is not configured');
  return { mode: 'blob', origin: privateOrigin(env.PRIVATE_TRIPS_BLOB_ORIGIN), token: env.BLOB_READ_WRITE_TOKEN };
}

export function validateObjectPath(path: string): void {
  if (path !== 'catalog.json' && !/^revisions\/[a-z0-9][a-z0-9-]{0,63}\/[a-f0-9]{64}\/(?:manifest\.json|assets\/(?:photo|archive|video)-[0-9]{2,4}(?:-thumb|-poster)?\.(?:webp|mp4))$/.test(path)) throw new Error('Invalid private object path');
}

function beneath(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function openLocal(config: Extract<StorageConfig, {mode: 'local'}>, path: string) {
  validateObjectPath(path);
  const root = await realpath(config.directory);
  validatePrivateDirectory(root);
  const candidate = resolve(root, path);
  if (!beneath(root, candidate)) throw new Error('Invalid local path');
  const actual = await realpath(candidate);
  if (!beneath(root, actual)) throw new Error('Private asset symlink escapes storage');
  // O_NOFOLLOW also rejects replacement of the last path component with a symlink.
  const file = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error('Private object is not a file');
    return { file, size: stat.size };
  } catch (error) { await file.close(); throw error; }
}

export function blobObjectUrl(config: Extract<StorageConfig, {mode: 'blob'}>, path: string, useCache = path !== 'catalog.json'): URL {
  validateObjectPath(path);
  const url = new URL(`/trips/${path}`, privateOrigin(config.origin));
  // The origin comes exclusively from validated server configuration, never from JSON or a request.
  if (url.origin !== config.origin) throw new Error('Invalid storage origin');
  // Revisions are immutable. Only the active catalog (and import verification) needs an origin read.
  if (!useCache) url.searchParams.set('cache', '0');
  return url;
}

export async function fetchBlob(config: Extract<StorageConfig, {mode: 'blob'}>, path: string, options: { method?: string; range?: ByteRange; signal?: AbortSignal; useCache?: boolean } = {}) {
  const headers = new Headers({ Authorization: `Bearer ${config.token}`, 'Accept-Encoding': 'identity' });
  if (options.range) headers.set('Range', `bytes=${options.range.start}-${options.range.end}`);
  const useCache = options.useCache ?? path !== 'catalog.json';
  return fetch(blobObjectUrl(config, path, useCache), { method: options.method ?? 'GET', headers, cache: useCache ? 'default' : 'no-store', redirect: 'error', signal: options.signal });
}

export function digest(bytes: Uint8Array | string): string { return createHash('sha256').update(bytes).digest('hex'); }

export async function readPrivateJson(path: string, config = storageConfig()): Promise<{ bytes: Uint8Array; value: unknown }> {
  let bytes: Uint8Array;
  if (config.mode === 'local') {
    const { file, size } = await openLocal(config, path);
    try {
      if (size > MAX_JSON_BYTES) throw new Error('Private JSON is too large');
      // Read at most the measured size + one byte, so a file growing mid-read remains bounded.
      const buffer = Buffer.alloc(size + 1); let count = 0;
      while (count < buffer.length) { const part = await file.read(buffer, count, buffer.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
      if (count !== size) throw new Error('Private JSON changed while reading');
      bytes = buffer.subarray(0, count);
    } finally { await file.close(); }
  } else {
    const response = await fetchBlob(config, path);
    if (response.status !== 200 || !response.body) { await response.body?.cancel(); throw new Error('Private JSON unavailable'); }
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        length += chunk.value.byteLength;
        if (length > MAX_JSON_BYTES) throw new Error('Private JSON is too large');
        chunks.push(chunk.value);
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
    bytes = Buffer.concat(chunks, length);
  }
  return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
}

/** A lazy file reader with bounded memory. Cancellation closes the file immediately. */
function localStream(file: Awaited<ReturnType<typeof open>>, range: ByteRange, signal?: AbortSignal): ReadableStream<Uint8Array> {
  let position = range.start; let closed = false;
  const close = async () => { if (!closed) { closed = true; signal?.removeEventListener('abort', onAbort); await file.close(); } };
  const onAbort = () => { void close(); };
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) void close();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (closed || signal?.aborted) throw new Error('Media request cancelled');
        if (position > range.end) { await close(); controller.close(); return; }
        const buffer = new Uint8Array(Math.min(64 * 1024, range.end - position + 1));
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
        if (bytesRead !== buffer.length) throw new Error('Private asset changed while streaming');
        position += bytesRead; controller.enqueue(buffer);
        if (position > range.end) { await close(); controller.close(); }
      } catch (error) { await close(); controller.error(error); }
    },
    async cancel() { await close(); },
  }, { highWaterMark: 0 });
}

/** Does not normalize an ignored upstream Range to 206: the storage must implement it. */
export async function openAsset(asset: StoredAsset, range: ByteRange | undefined, head: boolean, signal?: AbortSignal, config = storageConfig()): Promise<ReadableStream<Uint8Array> | null> {
  const selected = range ?? { start: 0, end: asset.size - 1 };
  if (config.mode === 'local') {
    const { file, size } = await openLocal(config, asset.path);
    if (size !== asset.size) { await file.close(); throw new Error('Private asset size mismatch'); }
    if (head || !size) { await file.close(); return null; }
    return localStream(file, selected, signal);
  }
  const response = await fetchBlob(config, asset.path, { method: head ? 'HEAD' : 'GET', range, signal });
  const length = selected.end - selected.start + 1;
  if (response.status !== (range ? 206 : 200) || response.headers.get('content-length') !== String(length) || (range && response.headers.get('content-range') !== `bytes ${range.start}-${range.end}/${asset.size}`) || (!head && length > 0 && !response.body)) {
    await response.body?.cancel(); throw new Error('Private media upstream did not honor the requested range');
  }
  if (head) { await response.body?.cancel(); return null; }
  return response.body;
}
