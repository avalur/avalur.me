import type { StoredCatalog, Trip, TripManifest, TripPresentation, TripStory } from './types';

export const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const ASSET_ID = /^(?:photo|archive|video)-[0-9]{2,4}(?:-thumb|-poster)?$/;
export const SHA256 = /^[a-f0-9]{64}$/;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid object');
  return value as Record<string, unknown>;
}
export function string(value: unknown, pattern?: RegExp): string {
  if (typeof value !== 'string' || value.length > 50000 || (pattern && !pattern.test(value))) throw new Error('Invalid string');
  return value;
}
export function number(value: unknown, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) throw new Error('Invalid number');
  return value;
}
export function array<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > 10000) throw new Error('Invalid array');
  return value.map(parse);
}
function strings(value: unknown): string[] { return array(value, item => string(item)); }
function stringMap(value: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(record(value)).map(([key, item]) => [string(key, SLUG), string(item)]));
}
export function mediaUrl(slug: string, id: string): string {
  return `/api/private-media/${string(slug, SLUG)}/${string(id, ASSET_ID)}`;
}

export function parseStory(value: unknown): TripStory {
  const v = record(value);
  return {
    title: string(v.title), subtitle: string(v.subtitle), intro: strings(v.intro),
    chapters: array(v.chapters, item => { const c = record(item); return { id: string(c.id, SLUG), title: string(c.title), kicker: string(c.kicker), paragraphs: strings(c.paragraphs) }; }),
    closingQuote: string(v.closingQuote),
    participants: array(v.participants, item => { const p = record(item); return { displayName: string(p.displayName), role: string(p.role ?? '') }; }),
    route: array(v.route, item => { const s = record(item); return { label: string(s.label), note: string(s.note) }; }),
  };
}

export function parsePresentation(value: unknown): TripPresentation {
  const v = record(value);
  const textKeys = ['dateLabel', 'region', 'heroSubtitle', 'heroLead', 'heroCaption', 'heroCredit', 'chaptersLabel', 'albumEyebrow', 'routeEyebrow', 'routeTitle', 'routeNote', 'memoryText', 'closingCredit'] as const;
  const lineKeys = ['narratorNoteLines', 'videoNoteLines', 'peopleTitleLines', 'memoryTitleLines'] as const;
  return {
    ...Object.fromEntries(textKeys.map(key => [key, string(v[key])])) as Pick<TripPresentation, typeof textKeys[number]>,
    ...Object.fromEntries(lineKeys.map(key => [key, strings(v[key])])) as Pick<TripPresentation, typeof lineKeys[number]>,
    heroTitleLines: array(v.heroTitleLines, item => { const l = record(item); return { text: string(l.text), ...(l.emphasis === true ? { emphasis: true } : {}) }; }),
    facts: array(v.facts, item => {
      const f = record(item); const icon = string(f.icon);
      if (icon !== 'people' && icon !== 'bike' && icon !== 'route') throw new Error('Invalid icon');
      return { icon, label: string(f.label) };
    }),
    chapterVisuals: array(v.chapterVisuals, item => { const c = record(item); return { chapterId: string(c.chapterId, SLUG), photoIds: strings(c.photoIds) }; }),
    videoContextLabels: stringMap(v.videoContextLabels),
  };
}

export function parseTrip(value: unknown): Trip {
  const v = record(value); const m = record(v.media); const slug = string(v.slug, SLUG);
  function url(value: unknown): string {
    const u = string(value);
    const id = u.slice(`/api/private-media/${slug}/`.length);
    if (mediaUrl(slug, id) !== u) throw new Error('Invalid media URL');
    return u;
  }
  function photo(item: unknown) {
    const p = record(item);
    return { id: string(p.id, ASSET_ID), src: url(p.src), thumb: url(p.thumb), width: number(p.width, true), height: number(p.height, true), caption: string(p.caption), alt: string(p.alt), category: string(p.category), ...(p.year === undefined ? {} : { year: number(p.year, true) }) };
  }
  const trip: Trip = {
    slug, year: number(v.year, true), story: parseStory(v.story), presentation: parsePresentation(v.presentation),
    media: {
      heroId: string(m.heroId, ASSET_ID), featuredIds: array(m.featuredIds, item => string(item, ASSET_ID)), categories: stringMap(m.categories),
      photos: array(m.photos, photo), archivePhotos: array(m.archivePhotos, photo),
      videos: array(m.videos, item => {
        const p = record(item); const kind = string(p.kind);
        if (kind !== 'round' && kind !== 'video') throw new Error('Invalid video kind');
        return { id: string(p.id, ASSET_ID), src: url(p.src), poster: url(p.poster), title: string(p.title), duration: number(p.duration), width: number(p.width, true), height: number(p.height, true), kind, context: string(p.context) };
      }),
    },
  };
  const photos = new Set([...trip.media.photos, ...trip.media.archivePhotos].map(p => p.id));
  const allIds = [...photos, ...trip.media.videos.map(p => p.id)];
  const chapterIds = trip.story.chapters.map(c => c.id);
  if (photos.size !== trip.media.photos.length + trip.media.archivePhotos.length || new Set(allIds).size !== allIds.length || new Set(chapterIds).size !== chapterIds.length || !photos.has(trip.media.heroId)) throw new Error('Invalid trip references');
  for (const id of trip.media.featuredIds) if (!photos.has(id)) throw new Error('Invalid featured photo');
  for (const visual of trip.presentation.chapterVisuals) {
    if (!chapterIds.includes(visual.chapterId) || visual.photoIds.length < 1 || visual.photoIds.length > 2 || visual.photoIds.some(id => !photos.has(id))) throw new Error('Invalid chapter visual');
  }
  return trip;
}

export function parseCatalog(value: unknown): StoredCatalog {
  const v = record(value);
  if (v.version !== 1) throw new Error('Unsupported catalog');
  const trips = array(v.trips, item => { const t = record(item); return { slug: string(t.slug, SLUG), revision: string(t.revision, SHA256), manifestSha256: string(t.manifestSha256, SHA256) }; });
  if (new Set(trips.map(t => t.slug)).size !== trips.length) throw new Error('Duplicate catalog entry');
  return { version: 1, trips };
}

export function parseManifest(value: unknown, slug: string, revision: string): TripManifest {
  const v = record(value);
  if (v.version !== 1) throw new Error('Unsupported manifest');
  const trip = parseTrip(v.trip);
  if (trip.slug !== slug) throw new Error('Manifest slug mismatch');
  const prefix = `revisions/${slug}/${revision}/assets/`;
  const assets = Object.fromEntries(Object.entries(record(v.assets)).map(([id, item]) => {
    string(id, ASSET_ID); const a = record(item); const contentType = string(a.contentType);
    if (contentType !== 'image/webp' && contentType !== 'video/mp4') throw new Error('Invalid content type');
    const path = string(a.path);
    if (path !== `${prefix}${id}.${contentType === 'image/webp' ? 'webp' : 'mp4'}`) throw new Error('Invalid asset path');
    return [id, { path, contentType, size: number(a.size, true), sha256: string(a.sha256, SHA256) }];
  })) as TripManifest['assets'];
  for (const item of [...trip.media.photos, ...trip.media.archivePhotos, ...trip.media.videos]) {
    for (const [key, value] of Object.entries(item)) if (key === 'src' || key === 'thumb' || key === 'poster') {
      const id = (value as string).split('/').at(-1)!;
      if (!Object.hasOwn(assets, id)) throw new Error('Unknown media reference');
    }
  }
  return { version: 1, trip, assets };
}
