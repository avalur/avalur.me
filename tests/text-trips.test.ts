import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { importLocal, prepareImport } from '../scripts/import-trips';
import { loadStoredTrip } from '../src/lib/trips';
import { parseManifest, parsePresentation } from '../src/lib/trips/schema';
import type { TripPhoto } from '../src/lib/trips/types';

const year = '2096';
const webpHeader = Buffer.from('RIFF\x04\x00\x00\x00WEBP');
type SourcePhoto = TripPhoto & { sourceFile?: string };

function syntheticSource(withArchive = false) {
  return {
    story: {
      title: 'Synthetic text trip', subtitle: 'Test', intro: ['Synthetic recollection'],
      chapters: [{ id: 'scene', title: 'Synthetic scene', kicker: 'Test', paragraphs: ['Synthetic text'] }],
      closingQuote: 'Test', participants: [], route: [],
    },
    media: {
      year: Number(year), heroId: null as string | null, featuredIds: [] as string[], categories: {},
      photos: [] as SourcePhoto[], videos: [],
      archivePhotos: (withArchive ? [{
        id: 'archive_source', src: `assets/media/${year}/archive_source.webp`, thumb: `assets/media/${year}/archive_source_thumb.webp`,
        width: 16, height: 12, caption: 'A separate synthetic event', alt: 'Synthetic pixels', category: 'archive',
        year: 2095, sourceFile: '/private/synthetic-original.webp',
      }] : []) as SourcePhoto[],
    },
    presentation: {
      dateLabel: year, heroTitleLines: [{ text: 'Synthetic' }], heroSubtitle: 'Test', heroLead: 'Test',
      facts: [], narratorNoteLines: [], chaptersLabel: 'Test', peopleTitleLines: [], closingCredit: 'Test',
      ...(withArchive ? { memoryTitleLines: ['Another year'], memoryText: 'A separate synthetic event.', memoryEyebrow: 'Synthetic archive', peopleNote: 'Synthetic note' } : {}),
    } as Record<string, unknown>,
  };
}
type Source = ReturnType<typeof syntheticSource>;

async function writeInputs(directory: string, input: Source): Promise<void> {
  await Promise.all(Object.entries(input).map(([name, value]) => writeFile(resolve(directory, `data/${name}-${year}.json`), JSON.stringify(value))));
}

async function withSource(withArchive: boolean, run: (directory: string, input: Source) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(resolve(tmpdir(), 'synthetic-text-trip-'));
  try {
    const input = syntheticSource(withArchive);
    await mkdir(resolve(directory, 'data'));
    if (withArchive) {
      await mkdir(resolve(directory, `assets/media/${year}`), { recursive: true });
      await Promise.all(input.media.archivePhotos.flatMap(photo => [photo.src, photo.thumb]).map(path => writeFile(resolve(directory, path), webpHeader)));
    }
    await writeInputs(directory, input);
    await run(directory, input);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('a text-only trip imports and loads without a source media directory', async () => {
  await withSource(false, async directory => {
    const prepared = await prepareImport(directory, year);
    assert.equal(prepared.manifest.trip.media.heroId, null);
    assert.deepEqual(prepared.assets, []);
    assert.deepEqual(prepared.manifest.assets, {});
    assert.deepEqual(prepared.manifest.trip.story.route, []);
    await assert.rejects(stat(resolve(directory, `assets/media/${year}`)), { code: 'ENOENT' });
    assert.equal(JSON.stringify(parseManifest(JSON.parse(prepared.manifestBytes), year, prepared.revision)), prepared.manifestBytes);
    assert.equal((await prepareImport(directory, year)).revision, prepared.revision);
    const destination = await mkdtemp(resolve(tmpdir(), 'synthetic-text-trip-private-'));
    try {
      await importLocal(prepared, destination);
      assert.deepEqual((await loadStoredTrip(year, { mode: 'local', directory: destination }))?.trip, prepared.manifest.trip);
      assert.equal((JSON.parse(await readFile(resolve(destination, 'catalog.json'), 'utf8'))).trips[0].revision, prepared.revision);
    } finally { await rm(destination, { recursive: true, force: true }); }
  });
});

test('archive-only imports preserve the separate event year, notes and private references', async () => {
  await withSource(true, async (directory, input) => {
    const prepared = await prepareImport(directory, year);
    const trip = prepared.manifest.trip;
    assert.equal(trip.media.heroId, null);
    assert.deepEqual(trip.media.photos, []);
    assert.equal(prepared.assets.length, 2);
    assert.equal(trip.media.archivePhotos[0].year, 2095);
    assert.equal(trip.media.archivePhotos[0].src, `/api/private-media/${year}/archive-01`);
    assert.equal(trip.presentation.memoryEyebrow, 'Synthetic archive');
    assert.equal(trip.presentation.peopleNote, 'Synthetic note');
    assert.doesNotMatch(prepared.manifestBytes, /archive_source|sourceFile|synthetic-original|assets\/media/);
    assert.equal(JSON.stringify(parseManifest(prepared.manifest, year, prepared.revision)), prepared.manifestBytes);
    input.media.heroId = 'archive_source';
    await writeInputs(directory, input);
    assert.equal((await prepareImport(directory, year)).manifest.trip.media.heroId, 'archive-01');
  });
});

test('optional presentation fields default only when omitted and preserve legacy serialization', () => {
  const input = syntheticSource().presentation;
  const normalized = parsePresentation(input);
  for (const key of ['region', 'heroCaption', 'heroCredit', 'albumEyebrow', 'routeEyebrow', 'routeTitle', 'routeNote'] as const) {
    assert.equal(normalized[key], '');
    assert.equal(parsePresentation({ ...input, [key]: 'Supplied value' })[key], 'Supplied value');
    for (const value of [null, 42, [], {}]) assert.throws(() => parsePresentation({ ...input, [key]: value }));
  }
  assert.deepEqual(normalized.chapterVisuals, []);
  assert.equal(Object.hasOwn(normalized, 'memoryEyebrow'), false);
  assert.equal(Object.hasOwn(normalized, 'peopleNote'), false);
  assert.equal(JSON.stringify(parsePresentation(normalized)), JSON.stringify(normalized));
  for (const key of ['memoryEyebrow', 'peopleNote']) {
    for (const value of [null, 42, [], {}]) assert.throws(() => parsePresentation({ ...input, [key]: value }));
  }
  assert.throws(() => parsePresentation({ ...input, chapterVisuals: null }));
  const missingTitle = { ...input }; delete missingTitle.heroTitleLines;
  assert.throws(() => parsePresentation(missingTitle));
});

test('nullable heroes do not allow dangling or inconsistent stored photo references', async () => {
  await withSource(true, async directory => {
    const prepared = await prepareImport(directory, year);
    const mutations: ((manifest: typeof prepared.manifest) => void)[] = [
      manifest => { Reflect.deleteProperty(manifest.trip.media, 'heroId'); },
      manifest => { manifest.trip.media.heroId = 'photo-99'; },
      manifest => { manifest.trip.media.featuredIds = ['photo-99']; },
      manifest => { manifest.trip.presentation.chapterVisuals = [{ chapterId: 'scene', photoIds: ['photo-99'] }]; },
      manifest => { manifest.trip.media.photos = manifest.trip.media.archivePhotos; manifest.trip.media.archivePhotos = []; },
      manifest => { manifest.trip.media.archivePhotos.push(manifest.trip.media.archivePhotos[0]); },
      manifest => { delete manifest.assets['archive-01']; },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(prepared.manifest); mutate(invalid);
      assert.throws(() => parseManifest(invalid, year, prepared.revision));
    }
  });
});

test('imports reject missing heroes, unresolved media references and invalid archive paths', async () => {
  await withSource(true, async (directory, input) => {
    const mutations: ((source: Source) => void)[] = [
      source => { Reflect.deleteProperty(source.media, 'heroId'); },
      source => { source.media.heroId = 'missing_source'; },
      source => { source.media.featuredIds = ['missing_source']; },
      source => { source.presentation.albumOrder = ['archive_source']; },
      source => { source.presentation.albumOrder = null; },
      ...['../../outside.webp', `assets/media/${year}/../outside.webp`, `assets/media/${year}/archive_source.webp?download=1`, 'https://example.invalid/photo.webp'].map(path => (source: Source) => { source.media.archivePhotos[0].src = path; }),
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(input); mutate(invalid);
      await writeInputs(directory, invalid);
      await assert.rejects(prepareImport(directory, year));
    }
  });
});

test('archive media still requires a real directory and cannot escape it through a symlink', async () => {
  await withSource(true, async (directory, input) => {
    const photoPath = resolve(directory, input.media.archivePhotos[0].src);
    const outside = resolve(directory, 'outside.webp');
    await writeFile(outside, webpHeader);
    await rm(photoPath);
    await symlink(outside, photoPath);
    await assert.rejects(prepareImport(directory, year), /Input media symlink escapes directory/);
    await rm(resolve(directory, `assets/media/${year}`), { recursive: true });
    await assert.rejects(prepareImport(directory, year), { code: 'ENOENT' });
  });
});

test('media-directory and input-JSON symlinks cannot escape the source root', async () => {
  await withSource(true, async (directory, input) => {
    const outside = await mkdtemp(resolve(tmpdir(), 'synthetic-trip-outside-'));
    try {
      const mediaDirectory = resolve(directory, `assets/media/${year}`);
      await rm(mediaDirectory, { recursive: true });
      await symlink(outside, mediaDirectory);
      await assert.rejects(prepareImport(directory, year), /Media directory escapes source/);
      const storyPath = resolve(directory, `data/story-${year}.json`);
      const outsideStory = resolve(outside, 'story.json');
      await writeFile(outsideStory, JSON.stringify(input.story));
      await rm(storyPath);
      await symlink(outsideStory, storyPath);
      await assert.rejects(prepareImport(directory, year), /Input JSON symlink escapes source/);
    } finally { await rm(outside, { recursive: true, force: true }); }
  });
});
