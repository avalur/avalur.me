import assert from 'node:assert/strict';
import { afterAll as after, beforeAll as before, test } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { importLocal, prepareImport } from '../scripts/import-trips';
import { loadStoredTrip } from '../src/lib/trips';
import { parseManifest } from '../src/lib/trips/schema';
import { digest } from '../src/lib/trips/storage';

let source: string;
let directory: string;
const sourceMedia = {
  year: 2099, heroId: '111111', featuredIds: ['111111'], categories: { road: 'Road' },
  photos: [{ id: '111111', src: 'assets/media/2099/photo-111111.webp', thumb: 'assets/media/2099/photo-111111-thumb.webp', width: 10, height: 10, caption: 'Synthetic photograph', alt: 'Synthetic pixels', category: 'road', sourceMessageId: 111111 }],
  archivePhotos: [], videos: [],
};

before(async () => {
  source = await mkdtemp(resolve(tmpdir(), 'trip-import-source-'));
  directory = await mkdtemp(resolve(tmpdir(), 'trip-import-private-'));
  await mkdir(resolve(source, 'data')); await mkdir(resolve(source, 'assets/media/2099'), { recursive: true });
  const story = { title: 'Synthetic trip', subtitle: 'Test', intro: ['Test'], chapters: [{ id: 'chapter', title: '«Quoted title»', kicker: 'Test', paragraphs: ['Test'] }], closingQuote: 'Test', participants: [{ displayName: 'Synthetic person', role: 'Test' }], route: [{ label: 'Test', note: 'Test' }], sources: [{ path: '/private/original-export', sourceMessageId: 111111 }] };
  const presentation = {
    dateLabel: '2099', region: 'Test', heroTitleLines: [{ text: 'Synthetic', emphasis: true }], heroSubtitle: 'Test', heroLead: 'Test', heroCaption: 'Test', heroCredit: 'Test', facts: [{ icon: 'bike', label: 'Test' }], narratorNoteLines: ['Test'], chaptersLabel: 'Test', chapterVisuals: [{ chapterId: 'chapter', photoIds: ['111111'] }], videoNoteLines: ['Test'], videoContextLabels: { pretrip: 'Test' }, albumEyebrow: 'Test', albumOrder: ['111111'], peopleTitleLines: ['Test'], routeEyebrow: 'Test', routeTitle: 'Test', routeNote: 'Test', memoryTitleLines: ['Test'], memoryText: 'Test', closingCredit: 'Test', internalNote: '/private/editorial-note',
  };
  await writeFile(resolve(source, 'data/story-2099.json'), JSON.stringify(story));
  await writeFile(resolve(source, 'data/media-2099.json'), JSON.stringify(sourceMedia));
  await writeFile(resolve(source, 'data/presentation-2099.json'), JSON.stringify(presentation));
  await writeFile(resolve(source, 'assets/media/2099/photo-111111.webp'), Buffer.from('RIFF\x04\x00\x00\x00WEBP'));
  await writeFile(resolve(source, 'assets/media/2099/photo-111111-thumb.webp'), Buffer.from('RIFF\x04\x00\x00\x00WEBP'));
});
after(async () => { await rm(source, { recursive: true, force: true }); await rm(directory, { recursive: true, force: true }); });

test('import validates all media, replaces original IDs and strips internal fields', async () => {
  const prepared = await prepareImport(source, '2099');
  const repeated = await prepareImport(source, '2099');
  assert.equal(prepared.revision, repeated.revision);
  assert.equal(prepared.assets.length, 2);
  assert.doesNotMatch(prepared.manifestBytes, /111111|sourceMessageId|sources|original-export|internalNote|editorial-note/);
  const trip = prepared.manifest.trip;
  assert.equal(trip.story.chapters[0].title, '«Quoted title»');
  assert.equal(trip.media.heroId, 'photo-01');
  assert.deepEqual(trip.presentation.chapterVisuals[0].photoIds, ['photo-01']);
  assert.equal(trip.media.photos[0].src, '/api/private-media/2099/photo-01');
  assert.equal(trip.media.photos[0].thumb, '/api/private-media/2099/photo-01-thumb');
  await importLocal(prepared, directory);
  await importLocal(prepared, directory);
  const loaded = await loadStoredTrip('2099', { mode: 'local', directory });
  assert.deepEqual(loaded?.trip, trip);
  assert.equal(await loadStoredTrip('missing', { mode: 'local', directory }), null);
});

test('invalid paths fail validation; an incomplete or corrupt revision cannot replace catalog', async () => {
  const catalogBefore = await readFile(resolve(directory, 'catalog.json'), 'utf8');
  const badMedia = structuredClone(sourceMedia); badMedia.photos[0].src = '../../private.webp';
  await writeFile(resolve(source, 'data/media-2099.json'), JSON.stringify(badMedia));
  await assert.rejects(prepareImport(source, '2099'), /Invalid input media path/);
  await writeFile(resolve(source, 'data/media-2099.json'), JSON.stringify(sourceMedia));
  const prepared = await prepareImport(source, '2099');
  prepared.assets[0].sha256 = 'f'.repeat(64);
  await assert.rejects(importLocal(prepared, directory), /integrity check failed/);
  assert.equal(await readFile(resolve(directory, 'catalog.json'), 'utf8'), catalogBefore);
});

test('manifest refuses arbitrary external URLs, path traversal and missing assets', async () => {
  const prepared = await prepareImport(source, '2099');
  const badUrl = structuredClone(prepared.manifest); badUrl.trip.media.photos[0].src = 'https://example.com/private.webp';
  assert.throws(() => parseManifest(badUrl, '2099', prepared.revision));
  const badPath = structuredClone(prepared.manifest); badPath.assets['photo-01'].path = '../../secrets';
  assert.throws(() => parseManifest(badPath, '2099', prepared.revision));
  const missing = structuredClone(prepared.manifest); delete missing.assets['photo-01'];
  assert.throws(() => parseManifest(missing, '2099', prepared.revision));
});

test('private Blob coalesces current catalog reads and caches only validated immutable manifests', async () => {
  const prepared = await prepareImport(source, '2099');
  const config = { mode: 'blob' as const, origin: 'https://synthetic-cache.private.blob.vercel-storage.com', token: 'synthetic' };
  const catalog = { version: 1, trips: [{ slug: prepared.slug, revision: prepared.revision, manifestSha256: digest(prepared.manifestBytes) }] };
  const originalFetch = globalThis.fetch; let catalogs = 0; let manifests = 0;
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    if (url.pathname === '/trips/catalog.json') {
      catalogs++; assert.equal(url.search, '?cache=0'); assert.equal(options?.cache, 'no-store');
      return new Response(JSON.stringify(catalog));
    }
    manifests++; assert.equal(url.search, ''); assert.equal(options?.cache, 'default');
    return new Response(prepared.manifestBytes);
  };
  try {
    const [first, second] = await Promise.all([loadStoredTrip('2099', config), loadStoredTrip('2099', config)]);
    assert.equal(catalogs, 1); assert.equal(manifests, 1);
    first!.trip.story.title = 'Caller mutation';
    assert.equal(second!.trip.story.title, prepared.manifest.trip.story.title);
    assert.equal((await loadStoredTrip('2099', config))!.trip.story.title, prepared.manifest.trip.story.title);
    assert.equal(catalogs, 2); assert.equal(manifests, 1);
    catalog.trips[0].manifestSha256 = 'c'.repeat(64);
    await assert.rejects(loadStoredTrip('2099', config), /integrity check failed/);
    assert.equal(catalogs, 3); assert.equal(manifests, 2);
  } finally { globalThis.fetch = originalFetch; }
});
