import { parseCatalog, parseManifest, SLUG, ASSET_ID } from './schema';
import { digest, readPrivateJson, storageConfig, type StorageConfig } from './storage';
import type { CatalogEntry, StoredAsset, StoredCatalog, Trip, TripManifest, TripSummary } from './types';

export type { Trip, TripPhoto, TripVideo, TripSummary, TripPresentation } from './types';

// Server-only caches contain validated immutable manifests. Access grants are never cached here.
const manifests = new Map<string, { manifest: TripManifest; bytes: number }>();
const pendingManifests = new Map<string, Promise<TripManifest>>();
const pendingCatalogs = new Map<string, Promise<StoredCatalog>>();
let manifestBytes = 0;
const MAX_MANIFESTS = 32;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

async function readCatalog(config: StorageConfig): Promise<StoredCatalog> {
  const read = async () => parseCatalog((await readPrivateJson('catalog.json', config)).value);
  if (config.mode === 'local') return read();
  const key = `${config.origin}:${digest(config.token)}`;
  const pending = pendingCatalogs.get(key);
  if (pending) return pending;
  // Coalesce only overlapping reads; no TTL or stale catalog survives a completed request.
  const promise = read();
  if (pendingCatalogs.size >= 8) return promise;
  pendingCatalogs.set(key, promise);
  try { return await promise; } finally { pendingCatalogs.delete(key); }
}

async function readManifestUncached(entry: CatalogEntry, config: StorageConfig): Promise<{ manifest: TripManifest; bytes: number }> {
  const document = await readPrivateJson(`revisions/${entry.slug}/${entry.revision}/manifest.json`, config);
  if (digest(document.bytes) !== entry.manifestSha256) throw new Error('Private manifest integrity check failed');
  return { manifest: parseManifest(document.value, entry.slug, entry.revision), bytes: document.bytes.byteLength };
}

async function readManifest(entry: CatalogEntry, config: StorageConfig): Promise<TripManifest> {
  if (config.mode === 'local') return (await readManifestUncached(entry, config)).manifest;
  const key = `${config.origin}:${entry.slug}:${entry.revision}:${entry.manifestSha256}`;
  const hit = manifests.get(key);
  if (hit) {
    manifests.delete(key); manifests.set(key, hit);
    return structuredClone(hit.manifest);
  }
  const pending = pendingManifests.get(key);
  if (pending) return structuredClone(await pending);
  const read = async () => {
    const result = await readManifestUncached(entry, config);
    if (result.bytes <= MAX_MANIFEST_BYTES) {
      while (manifests.size >= MAX_MANIFESTS || manifestBytes + result.bytes > MAX_MANIFEST_BYTES) {
        const oldest = manifests.keys().next().value;
        if (!oldest) break;
        manifestBytes -= manifests.get(oldest)!.bytes; manifests.delete(oldest);
      }
      manifests.set(key, result); manifestBytes += result.bytes;
    }
    return result.manifest;
  };
  const promise = read();
  const tracked = pendingManifests.size < MAX_MANIFESTS;
  if (tracked) pendingManifests.set(key, promise);
  try { return structuredClone(await promise); } finally { if (tracked) pendingManifests.delete(key); }
}

/** Call only after the server has checked current session + verified-email grant. */
export async function loadCatalog(): Promise<{ trips: TripSummary[] }> {
  const config = storageConfig();
  const catalog = await readCatalog(config);
  const trips = await Promise.all(catalog.trips.map(async entry => {
    const { trip } = await readManifest(entry, config);
    const hero = trip.media.photos.find(p => p.id === trip.media.heroId) ?? trip.media.archivePhotos.find(p => p.id === trip.media.heroId)!;
    return {
      slug: trip.slug, year: trip.year, title: trip.story.title, subtitle: trip.story.subtitle,
      dateLabel: trip.presentation.dateLabel,
      hero: { src: hero.src, thumb: hero.thumb, alt: hero.alt, width: hero.width, height: hero.height },
      photoCount: trip.media.photos.length, videoCount: trip.media.videos.length,
    };
  }));
  return { trips };
}

export async function loadStoredTrip(slug: string, config = storageConfig()): Promise<TripManifest | null> {
  if (!SLUG.test(slug)) return null;
  const catalog = await readCatalog(config);
  const entry = catalog.trips.find(t => t.slug === slug);
  return entry ? readManifest(entry, config) : null;
}

/** Never returns storage URLs, source identifiers, checksums, paths, or editorial sources. */
export async function loadTrip(slug: string): Promise<Trip | null> {
  return (await loadStoredTrip(slug))?.trip ?? null;
}

export async function resolveAsset(slug: string, id: string): Promise<StoredAsset | null> {
  if (!SLUG.test(slug) || !ASSET_ID.test(id)) return null;
  const manifest = await loadStoredTrip(slug);
  return manifest && Object.hasOwn(manifest.assets, id) ? manifest.assets[id] : null;
}
