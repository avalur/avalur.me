import assert from 'node:assert/strict';
import { afterAll as after, beforeAll as before, test } from 'vitest';
import { mkdtemp, mkdir, open, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { handleMedia, parseRange } from '../src/lib/trips/media';
import { openAsset, storageConfig, validateObjectPath, blobObjectUrl } from '../src/lib/trips/storage';
import type { StoredAsset } from '../src/lib/trips/types';

let directory: string;
const revision = 'a'.repeat(64);
const size = 22 * 1024 * 1024 + 13;
const asset: StoredAsset = { path: `revisions/2099/${revision}/assets/video-01.mp4`, size, sha256: 'b'.repeat(64), contentType: 'video/mp4' };
const allowed = async () => ({ user: { id: 'synthetic' }, canViewTrips: true });
const url = 'http://localhost/api/private-media/2099/video-01';
function request(headers: HeadersInit = {}, method = 'GET', signal?: AbortSignal) { return new Request(url, { headers, method, signal }); }
const dependencies = {
  resolveAsset: async () => asset,
  openAsset: (a: StoredAsset, range: Parameters<typeof openAsset>[1], head: boolean, signal?: AbortSignal) => openAsset(a, range, head, signal, { mode: 'local', directory }),
};

before(async () => {
  directory = await mkdtemp(resolve(tmpdir(), 'private-media-test-'));
  const path = resolve(directory, asset.path);
  await mkdir(resolve(path, '..'), { recursive: true });
  const file = await open(path, 'w');
  try { await file.truncate(size); await file.write(Buffer.from('START'), 0, 5, 0); await file.write(Buffer.from('FINISH'), 0, 6, size - 6); } finally { await file.close(); }
});
after(async () => { await rm(directory, { recursive: true, force: true }); });

test('denies anonymous, unverified and revoked users before every metadata/media operation', async () => {
  for (const method of ['GET', 'HEAD']) for (const headers of [{}, { Range: 'bytes=0-10' }, { 'If-None-Match': `"${asset.sha256}"` }] as HeadersInit[]) {
    for (const state of [{ user: null, canViewTrips: false }, { user: { id: 'unverified' }, canViewTrips: false }, { user: { id: 'revoked' }, canViewTrips: false }]) {
      let touched = false;
      const response = await handleMedia(request(headers, method), '2099', 'video-01', async () => state, {
        resolveAsset: async () => { touched = true; return asset; },
        openAsset: async () => { touched = true; return null; },
      });
      assert.equal(response.status, state.user ? 403 : 401);
      assert.equal(touched, false);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('content-range'), null);
      assert.equal(response.headers.get('etag'), null);
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
});

test('auth/storage failure closes access with generic 503 and no provider data', async () => {
  const response = await handleMedia(request(), '2099', 'video-01', async () => { throw new Error('secret upstream URL'); }, dependencies);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret|https/);
  const broken = await handleMedia(request(), '2099', 'video-01', allowed, { ...dependencies, resolveAsset: async () => { throw new Error('bad catalog'); } });
  assert.equal(broken.status, 503);
});

test('streams a complete file larger than 20 MiB in bounded chunks', async () => {
  const response = await handleMedia(request(), '2099', 'video-01', allowed, dependencies);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-length'), String(size));
  assert.equal(response.headers.get('content-type'), 'video/mp4');
  let total = 0; let chunks = 0;
  for await (const chunk of response.body!) { assert.ok(chunk.byteLength <= 64 * 1024); total += chunk.byteLength; chunks++; }
  assert.equal(total, size);
  assert.ok(chunks > 320);
});

test('full/open/suffix ranges, clipping and HEAD have precise HTTP semantics', async () => {
  for (const [header, expected, content] of [
    ['bytes=0-4', 'bytes 0-4/' + size, 'START'],
    [`bytes=${size - 6}-`, `bytes ${size - 6}-${size - 1}/${size}`, 'FINISH'],
    ['bytes=-6', `bytes ${size - 6}-${size - 1}/${size}`, 'FINISH'],
    [`bytes=${size - 6}-${size + 100}`, `bytes ${size - 6}-${size - 1}/${size}`, 'FINISH'],
  ]) {
    const response = await handleMedia(request({ Range: header }), '2099', 'video-01', allowed, dependencies);
    assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), expected);
    assert.equal(response.headers.get('content-length'), String(content.length)); assert.equal(await response.text(), content);
  }
  const middle = await handleMedia(request({ Range: 'bytes=8000000-8000015' }), '2099', 'video-01', allowed, dependencies);
  assert.equal(middle.status, 206); assert.equal((await middle.arrayBuffer()).byteLength, 16);
  const head = await handleMedia(request({ Range: 'bytes=0-1' }, 'HEAD'), '2099', 'video-01', allowed, dependencies);
  assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(size)); assert.equal(head.body, null);
});

test('invalid/multiple/unsatisfiable ranges produce 416 without opening bytes', async () => {
  for (const value of ['bytes=', 'bytes=-0', 'bytes=7-3', 'bytes=0-1,5-8', `bytes=${size}-`, 'items=0-1', 'bytes=999999999999999999999-']) {
    let opened = false;
    const response = await handleMedia(request({ Range: value }), '2099', 'video-01', allowed, { ...dependencies, openAsset: async () => { opened = true; return null; } });
    assert.equal(response.status, 416); assert.equal(opened, false);
    assert.equal(response.headers.get('content-range'), `bytes */${size}`); assert.equal(await response.text(), '');
  }
  assert.equal(parseRange('bytes=0-', 0), null);
  assert.deepEqual(parseRange('bytes=-999', 10), { start: 0, end: 9 });
});

test('cancellation and abort stop the lazy local reader', async () => {
  const stream = await dependencies.openAsset(asset, undefined, false);
  const reader = stream!.getReader(); assert.equal((await reader.read()).value!.length, 65536);
  await reader.cancel(); assert.equal((await reader.read()).done, true);
  const controller = new AbortController();
  const stream2 = await dependencies.openAsset(asset, undefined, false, controller.signal);
  const reader2 = stream2!.getReader(); await reader2.read(); controller.abort();
  await assert.rejects(reader2.read(), /cancelled/);
});

test('storage configuration and symlinks cannot turn private reads into arbitrary file/URL access', async () => {
  assert.throws(() => storageConfig({ PRIVATE_TRIPS_STORAGE: 'local', PRIVATE_TRIPS_DIR: directory, VERCEL: '1' }));
  assert.throws(() => storageConfig({ PRIVATE_TRIPS_STORAGE: 'local', PRIVATE_TRIPS_DIR: directory, NODE_ENV: 'production' }));
  assert.throws(() => storageConfig({ PRIVATE_TRIPS_STORAGE: 'local', PRIVATE_TRIPS_DIR: '/site/public/private' }));
  for (const origin of ['https://evil.example', 'https://a.public.blob.vercel-storage.com', 'http://a.private.blob.vercel-storage.com', 'https://a.private.blob.vercel-storage.com/secret', 'https://u:p@a.private.blob.vercel-storage.com']) assert.throws(() => storageConfig({ PRIVATE_TRIPS_BLOB_ORIGIN: origin, BLOB_READ_WRITE_TOKEN: 'synthetic' }));
  for (const path of ['../secrets', 'https://evil.example/a', `revisions/2099/${revision}/assets/../../secret`, `revisions/2099/${revision}/assets/video-01.mp4?redirect=1`]) assert.throws(() => validateObjectPath(path));
  const outside = resolve(directory, '..', `outside-${Date.now()}.mp4`); await writeFile(outside, 'secret');
  const linkAsset = { ...asset, path: asset.path.replace('video-01', 'video-02'), size: 6 };
  try { await symlink(outside, resolve(directory, linkAsset.path)); await assert.rejects(dependencies.openAsset(linkAsset, undefined, false), /symlink escapes/); }
  finally { await rm(outside); }
});

test('private Blob forwards Range server-side, rejects ignored Range and propagates cancellation', async () => {
  const originalFetch = globalThis.fetch; const config = { mode: 'blob' as const, origin: 'https://synthetic.private.blob.vercel-storage.com', token: 'synthetic-token' };
  let cancelled = false; let observed = false;
  globalThis.fetch = async (input, options) => {
    observed = true;
    const target = new URL(String(input)); assert.equal(target.origin, config.origin); assert.equal(target.pathname, `/trips/${asset.path}`);
    assert.equal(options?.redirect, 'error'); assert.equal(options?.cache, 'default');
    const headers = new Headers(options?.headers); assert.equal(headers.get('authorization'), 'Bearer synthetic-token'); assert.equal(headers.get('range'), 'bytes=7-10');
    return new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 206, headers: { 'Content-Length': '4', 'Content-Range': `bytes 7-10/${size}` } });
  };
  try {
    const body = await openAsset(asset, { start: 7, end: 10 }, false, undefined, config); assert.equal(observed, true); await body!.cancel(); assert.equal(cancelled, true);
    globalThis.fetch = async () => new Response('full bytes', { status: 200, headers: { 'Content-Length': String(size) } });
    await assert.rejects(openAsset(asset, { start: 7, end: 10 }, false, undefined, config), /did not honor/);
    assert.equal(blobObjectUrl(config, asset.path).search, '');
    assert.equal(blobObjectUrl(config, 'catalog.json').search, '?cache=0');
    assert.equal(blobObjectUrl(config, asset.path, false).search, '?cache=0');
  } finally { globalThis.fetch = originalFetch; }
});
