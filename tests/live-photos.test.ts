import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { prepareImport } from '../scripts/import-trips';
import { parseManifest } from '../src/lib/trips/schema';

const year = '2097';
function syntheticSource() {
  return {
    story: {
      title: 'Synthetic trip', subtitle: 'Test', intro: ['Test'],
      chapters: [{ id: 'scene', title: 'Synthetic scene', kicker: 'Test', paragraphs: ['Test'] }],
      closingQuote: 'Test', participants: [], route: [],
      sources: [{ path: '/private/synthetic-original-export' }],
    },
    media: {
      year: Number(year), heroId: 'still_source_01', featuredIds: ['still_source_01'], categories: { scene: 'Scene' },
      photos: [{
        id: 'still_source_01', src: `assets/media/${year}/still_source_01.webp`, thumb: `assets/media/${year}/still_source_01_thumb.webp`,
        width: 12, height: 16, caption: 'Synthetic still', alt: 'Synthetic pixels', category: 'scene',
        liveVideoId: 'motion_source_01', sourceFile: '/private/synthetic-original-photo',
      }],
      archivePhotos: [],
      videos: [
        { id: 'recording_source_01', src: `assets/media/${year}/recording_source_01.mp4`, poster: `assets/media/${year}/recording_source_01_poster.webp`, title: 'Synthetic recording', duration: 8, width: 12, height: 16, kind: 'video', context: 'scene', sourceFile: '/private/synthetic-original-recording' },
        { id: 'motion_source_01', src: `assets/media/${year}/motion_source_01.mp4`, poster: `assets/media/${year}/motion_source_01_poster.webp`, title: 'Synthetic motion', duration: 2, width: 12, height: 16, kind: 'live', context: 'scene', sourceFile: '/private/synthetic-original-motion' },
      ],
    },
    presentation: {
      dateLabel: year, region: 'Test', heroTitleLines: [{ text: 'Synthetic' }],
      heroSubtitle: 'Test', heroLead: 'Test', heroCaption: 'Test', heroCredit: 'Test', facts: [],
      narratorNoteLines: [], chaptersLabel: 'Test',
      chapterVisuals: [{ chapterId: 'scene', photoIds: ['still_source_01'], videoIds: ['recording_source_01'] }],
      videoNoteLines: [], videoContextLabels: {}, albumEyebrow: 'Test', albumOrder: ['still_source_01'],
      peopleTitleLines: [], routeEyebrow: 'Test', routeTitle: 'Test', routeNote: 'Test',
      memoryTitleLines: [], memoryText: '', closingCredit: 'Test', internalNote: '/private/synthetic-editorial-note',
    },
  };
}
type Source = ReturnType<typeof syntheticSource>;

async function writeSource(directory: string, input: Source): Promise<void> {
  await Promise.all(Object.entries(input).map(([name, value]) => writeFile(resolve(directory, `data/${name}-${year}.json`), JSON.stringify(value))));
}

async function withSource(run: (directory: string, input: Source) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(resolve(tmpdir(), 'synthetic-live-source-'));
  try {
    const input = syntheticSource();
    await mkdir(resolve(directory, 'data'));
    await mkdir(resolve(directory, `assets/media/${year}`), { recursive: true });
    const images = [...input.media.photos.flatMap(photo => [photo.src, photo.thumb]), ...input.media.videos.map(clip => clip.poster)];
    await Promise.all([
      ...images.map(path => writeFile(resolve(directory, path), Buffer.from('RIFF\x04\x00\x00\x00WEBP'))),
      ...input.media.videos.map(clip => writeFile(resolve(directory, clip.src), Buffer.from('\x00\x00\x00\x0cftypisom'))),
    ]);
    await writeSource(directory, input);
    await run(directory, input);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('import remaps live-photo and chapter references without exposing source identifiers', async () => {
  await withSource(async directory => {
    const prepared = await prepareImport(directory, year);
    const trip = prepared.manifest.trip;
    assert.equal(prepared.assets.length, 6);
    assert.equal(trip.media.photos[0].liveVideoId, 'video-02');
    assert.equal(trip.media.videos[1].kind, 'live');
    assert.deepEqual(trip.presentation.chapterVisuals[0].photoIds, ['photo-01']);
    assert.deepEqual(trip.presentation.chapterVisuals[0].videoIds, ['video-01']);
    assert.equal(trip.media.videos[1].src, `/api/private-media/${year}/video-02`);
    assert.equal(trip.media.videos[1].poster, `/api/private-media/${year}/video-02-poster`);
    assert.doesNotMatch(prepared.manifestBytes, /still_source|recording_source|motion_source|sourceFile|sources|internalNote|synthetic-original|synthetic-editorial|assets\/media/);
    assert.deepEqual(parseManifest(prepared.manifest, year, prepared.revision), prepared.manifest);
    assert.equal((await prepareImport(directory, year)).manifestBytes, prepared.manifestBytes);
  });
});

test('legacy manifests keep motion and chapter-video fields absent after parsing', async () => {
  await withSource(async (directory, input) => {
    Reflect.deleteProperty(input.media.photos[0], 'liveVideoId');
    Reflect.deleteProperty(input.presentation.chapterVisuals[0], 'videoIds');
    input.media.videos = input.media.videos.slice(0, 1);
    await writeSource(directory, input);
    const prepared = await prepareImport(directory, year);
    const parsed = parseManifest(prepared.manifest, year, prepared.revision);
    assert.equal(Object.hasOwn(parsed.trip.media.photos[0], 'liveVideoId'), false);
    assert.equal(Object.hasOwn(parsed.trip.presentation.chapterVisuals[0], 'videoIds'), false);
    assert.equal(JSON.stringify(parsed), prepared.manifestBytes);
  });
});

test('import rejects missing and wrong-kind motion or chapter-video references', async () => {
  await withSource(async (directory, input) => {
    const cases: ((value: Source) => void)[] = [
      value => { value.media.photos[0].liveVideoId = 'missing_source'; },
      value => { value.media.photos[0].liveVideoId = 'recording_source_01'; },
      value => { value.media.photos[0].liveVideoId = 'still_source_01'; },
      value => { value.presentation.chapterVisuals[0].videoIds = ['missing_source']; },
      value => { value.presentation.chapterVisuals[0].videoIds = ['still_source_01']; },
    ];
    for (const mutate of cases) {
      const invalid = structuredClone(input); mutate(invalid);
      await writeSource(directory, invalid);
      await assert.rejects(prepareImport(directory, year));
    }
  });
});

test('stored manifests independently validate live-photo and chapter-video references', async () => {
  await withSource(async directory => {
    const prepared = await prepareImport(directory, year);
    for (const liveVideoId of ['video-99', 'video-01', 'photo-01', null]) {
      const invalid = structuredClone(prepared.manifest);
      Object.assign(invalid.trip.media.photos[0], { liveVideoId });
      assert.throws(() => parseManifest(invalid, year, prepared.revision));
    }
    for (const videoIds of [['video-99'], ['photo-01'], null]) {
      const invalid = structuredClone(prepared.manifest);
      Object.assign(invalid.trip.presentation.chapterVisuals[0], { videoIds });
      assert.throws(() => parseManifest(invalid, year, prepared.revision));
    }
    for (const kind of ['animation', null]) {
      const invalid = structuredClone(prepared.manifest);
      Object.assign(invalid.trip.media.videos[1], { kind });
      assert.throws(() => parseManifest(invalid, year, prepared.revision));
    }
  });
});

test('underscore support does not permit invalid kinds, null references or unsafe media paths', async () => {
  await withSource(async (directory, input) => {
    const cases: ((value: Source) => void)[] = [
      value => { Object.assign(value.media.videos[1], { kind: 'animation' }); },
      value => { Object.assign(value.media.videos[1], { kind: null }); },
      value => { Object.assign(value.media.photos[0], { liveVideoId: null }); },
      value => { Object.assign(value.presentation.chapterVisuals[0], { videoIds: null }); },
      ...['../../outside.mp4', `assets/media/${year}/../motion_source_01.mp4`, `assets/media/${year}/motion_source_01.mp4?download=1`, 'https://example.invalid/motion_source_01.mp4'].map(path => (value: Source) => { value.media.videos[1].src = path; }),
    ];
    for (const mutate of cases) {
      const invalid = structuredClone(input); mutate(invalid);
      await writeSource(directory, invalid);
      await assert.rejects(prepareImport(directory, year));
    }
  });
});
