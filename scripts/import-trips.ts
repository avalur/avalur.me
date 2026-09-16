import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, mkdir, open, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { array, mediaUrl, number, parseCatalog, parseManifest, parsePresentation, parseStory, record, SLUG, string } from '../src/lib/trips/schema';
import { blobObjectUrl, digest, fetchBlob, storageConfig, validatePrivateDirectory, type StorageConfig } from '../src/lib/trips/storage';
import type { StoredCatalog, Trip, TripManifest } from '../src/lib/trips/types';

interface SourceAsset { id: string; source: string; size: number; sha256: string; contentType: 'image/webp' | 'video/mp4' }
export interface PreparedImport { slug: string; revision: string; manifestBytes: string; manifest: TripManifest; assets: SourceAsset[] }

async function checksum(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function readInput(path: string): Promise<unknown> {
  if ((await stat(path)).size > 1024 * 1024) throw new Error('Input JSON is too large');
  return JSON.parse(await readFile(path, 'utf8'));
}

/** Whitelists content fields; raw export paths and Telegram identifiers never enter the revision. */
export async function prepareImport(source: string, year: string): Promise<PreparedImport> {
  string(year, /^\d{4}$/);
  const sourceRoot = await realpath(source);
  async function input(name: string) {
    const actual = await realpath(resolve(sourceRoot, `data/${name}-${year}.json`));
    if (!actual.startsWith(`${sourceRoot}${sep}`)) throw new Error('Input JSON symlink escapes source');
    return readInput(actual);
  }
  const [storyInput, mediaInput, presentationInput] = await Promise.all([
    input('story'), input('media'), input('presentation'),
  ]);
  const media = record(mediaInput); const presentation = record(presentationInput);
  if (number(media.year, true) !== Number(year)) throw new Error('Source year mismatch');
  const photoInputs = array(media.photos, record);
  const archiveInputs = array(media.archivePhotos, record);
  const videoInputs = array(media.videos, record);
  const ids = new Map<string, string>(); const assets: SourceAsset[] = [];
  const mediaRoot = await realpath(resolve(sourceRoot, `assets/media/${year}`));
  if (!mediaRoot.startsWith(`${sourceRoot}${sep}`)) throw new Error('Media directory escapes source');
  function remember(input: Record<string, unknown>, prefix: string, index: number) {
    const original = string(input.id, /^[a-zA-Z0-9_-]+$/);
    if (ids.has(original)) throw new Error('Duplicate input media identifier');
    ids.set(original, `${prefix}-${String(index + 1).padStart(2, '0')}`);
  }
  photoInputs.forEach((p, i) => remember(p, 'photo', i));
  archiveInputs.forEach((p, i) => remember(p, 'archive', i));
  videoInputs.forEach((p, i) => remember(p, 'video', i));
  function reference(original: unknown): string {
    const id = ids.get(string(original)); if (!id) throw new Error('Unknown source media reference'); return id;
  }
  async function asset(input: unknown, id: string, contentType: SourceAsset['contentType']): Promise<string> {
    const path = string(input);
    const extension = contentType === 'image/webp' ? 'webp' : 'mp4';
    const required = new RegExp(`^assets/media/${year}/[a-zA-Z0-9_-]+\\.${extension}$`);
    if (!required.test(path)) throw new Error('Invalid input media path');
    const actual = await realpath(resolve(sourceRoot, path));
    const rel = relative(mediaRoot, actual);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error('Input media symlink escapes directory');
    const info = await stat(actual);
    if (!info.isFile() || info.size < 12 || info.size > 1024 * 1024 * 1024) throw new Error('Invalid input media file size');
    const handle = await open(actual, 'r'); const header = Buffer.alloc(12);
    try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
    if (contentType === 'image/webp' ? (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WEBP') : header.toString('ascii', 4, 8) !== 'ftyp') throw new Error('Input media type does not match its extension');
    assets.push({ id, source: actual, size: info.size, sha256: await checksum(actual), contentType });
    return mediaUrl(year, id);
  }
  async function photo(input: Record<string, unknown>) {
    const id = reference(input.id);
    return { id, src: await asset(input.src, id, 'image/webp'), thumb: await asset(input.thumb, `${id}-thumb`, 'image/webp'), width: number(input.width, true), height: number(input.height, true), caption: string(input.caption), alt: string(input.alt), category: string(input.category), ...(input.year === undefined ? {} : { year: number(input.year, true) }), ...(input.liveVideoId === undefined ? {} : { liveVideoId: reference(input.liveVideoId) }) };
  }
  const photos: Trip['media']['photos'] = []; for (const p of photoInputs) photos.push(await photo(p));
  const archivePhotos: Trip['media']['archivePhotos'] = []; for (const p of archiveInputs) archivePhotos.push(await photo(p));
  const videos: Trip['media']['videos'] = [];
  for (const v of videoInputs) {
    const id = reference(v.id); const kind = string(v.kind);
    if (kind !== 'video' && kind !== 'round' && kind !== 'live') throw new Error('Invalid source video kind');
    videos.push({ id, src: await asset(v.src, id, 'video/mp4'), poster: await asset(v.poster, `${id}-poster`, 'image/webp'), title: string(v.title), duration: number(v.duration), width: number(v.width, true), height: number(v.height, true), kind, context: string(v.context) });
  }
  const order = array(presentation.albumOrder, reference);
  if (new Set(order).size !== order.length || order.some(id => !photos.some(p => p.id === id))) throw new Error('Invalid initial album order');
  photos.sort((a, b) => (order.indexOf(a.id) < 0 ? order.length : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? order.length : order.indexOf(b.id)));
  const parsedPresentation = parsePresentation(presentation);
  parsedPresentation.chapterVisuals = parsedPresentation.chapterVisuals.map(c => ({ ...c, photoIds: c.photoIds.map(reference), ...(c.videoIds === undefined ? {} : { videoIds: c.videoIds.map(reference) }) }));
  const trip: Trip = { slug: year, year: Number(year), story: parseStory(storyInput), presentation: parsedPresentation, media: { heroId: reference(media.heroId), featuredIds: array(media.featuredIds, reference), categories: Object.fromEntries(Object.entries(record(media.categories)).map(([key, value]) => [string(key, SLUG), string(value)])), photos, videos, archivePhotos: archivePhotos.sort((a, b) => (a.year ?? 0) - (b.year ?? 0)) } };
  const identity = { trip, assets: assets.map(({ id, size, sha256, contentType }) => ({ id, size, sha256, contentType })) };
  const revision = digest(JSON.stringify(identity));
  const manifest = parseManifest({ version: 1, trip, assets: Object.fromEntries(assets.map(a => [a.id, { path: `revisions/${year}/${revision}/assets/${a.id}.${a.contentType === 'image/webp' ? 'webp' : 'mp4'}`, size: a.size, sha256: a.sha256, contentType: a.contentType }])) }, year, revision);
  return { slug: year, revision, manifest, manifestBytes: JSON.stringify(manifest), assets };
}

function nextCatalog(old: StoredCatalog, prepared: PreparedImport): StoredCatalog {
  return { version: 1, trips: [...old.trips.filter(t => t.slug !== prepared.slug), { slug: prepared.slug, revision: prepared.revision, manifestSha256: digest(prepared.manifestBytes) }].sort((a, b) => b.slug.localeCompare(a.slug)) };
}

function missing(error: unknown): boolean { return !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'; }

export async function importLocal(prepared: PreparedImport, directory: string): Promise<void> {
  const config = storageConfig({ PRIVATE_TRIPS_STORAGE: 'local', PRIVATE_TRIPS_DIR: directory, NODE_ENV: 'development' });
  if (config.mode !== 'local') throw new Error('Invalid local configuration');
  await mkdir(config.directory, { recursive: true, mode: 0o700 });
  const root = await realpath(config.directory);
  validatePrivateDirectory(root);
  const lock = resolve(root, '.import.lock');
  const lockHandle = await open(lock, 'wx', 0o600);
  try {
    let catalog: StoredCatalog = { version: 1, trips: [] };
    try { catalog = parseCatalog(await readInput(resolve(root, 'catalog.json'))); } catch (error) { if (!missing(error)) throw error; }
    const revisionDirectory = resolve(root, `revisions/${prepared.slug}/${prepared.revision}`);
    await mkdir(resolve(revisionDirectory, 'assets'), { recursive: true, mode: 0o700 });
    if (!(await realpath(resolve(revisionDirectory, 'assets'))).startsWith(`${root}${sep}`)) throw new Error('Destination symlink escapes storage');
    for (const asset of prepared.assets) {
      const target = resolve(root, prepared.manifest.assets[asset.id].path);
      try { await copyFile(asset.source, target, constants.COPYFILE_EXCL); } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error; }
      if (!(await realpath(target)).startsWith(`${root}${sep}`) || (await stat(target)).size !== asset.size || await checksum(target) !== asset.sha256) throw new Error('Copied media integrity check failed');
    }
    const manifestPath = resolve(revisionDirectory, 'manifest.json');
    try { await writeFile(manifestPath, prepared.manifestBytes, { flag: 'wx', mode: 0o600 }); } catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')) throw error; }
    if (await checksum(manifestPath) !== digest(prepared.manifestBytes)) throw new Error('Immutable revision already exists with different contents');
    const temp = resolve(root, `.catalog-${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(nextCatalog(catalog, prepared)), { flag: 'wx', mode: 0o600 });
    // All 94 source files and the manifest have been checked before the single activation step.
    await rename(temp, resolve(root, 'catalog.json'));
  } finally { await lockHandle.close(); await unlink(lock); }
}

async function verifyRemote(response: Response, expected: { size: number; sha256: string }): Promise<void> {
  if (response.status !== 200 || !response.body) { await response.body?.cancel(); throw new Error('Uploaded private object is unavailable'); }
  const hash = createHash('sha256'); const reader = response.body.getReader(); let size = 0;
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > expected.size) throw new Error('Uploaded object grew'); hash.update(part.value); }
  } finally { await reader.cancel(); reader.releaseLock(); }
  if (size !== expected.size || hash.digest('hex') !== expected.sha256) throw new Error('Uploaded object checksum mismatch');
}

export async function importBlob(prepared: PreparedImport, config: Extract<StorageConfig, {mode: 'blob'}>): Promise<void> {
  const { put } = await import('@vercel/blob');
  const tokenStore = /^vercel_blob_rw_([^_]+)_/.exec(config.token)?.[1]?.toLowerCase();
  if (!tokenStore || new URL(config.origin).hostname !== `${tokenStore}.private.blob.vercel-storage.com`) throw new Error('Blob token and private origin must name the same store');
  const oldResponse = await fetchBlob(config, 'catalog.json'); let old: StoredCatalog = { version: 1, trips: [] }; let etag: string | undefined;
  if (oldResponse.status === 200) {
    etag = oldResponse.headers.get('etag') ?? undefined;
    if (!etag || Number(oldResponse.headers.get('content-length')) > 1024 * 1024) { await oldResponse.body?.cancel(); throw new Error('Invalid existing catalog'); }
    old = parseCatalog(await oldResponse.json());
  } else if (oldResponse.status !== 404) { await oldResponse.body?.cancel(); throw new Error('Unable to read existing private catalog'); }
  else await oldResponse.body?.cancel();
  async function upload(path: string, input: string | ReturnType<typeof createReadStream>, type: string) {
    const result = await put(`trips/${path}`, input, { token: config.token, access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: type, multipart: true });
    if (new URL(result.url).origin !== config.origin || new URL(result.url).pathname !== blobObjectUrl(config, path).pathname) throw new Error('Unexpected private upload destination');
  }
  for (const asset of prepared.assets) {
    const stored = prepared.manifest.assets[asset.id];
    let response = await fetchBlob(config, stored.path, { useCache: false });
    if (response.status === 404) { await response.body?.cancel(); await upload(stored.path, createReadStream(asset.source), asset.contentType); response = await fetchBlob(config, stored.path, { useCache: false }); }
    await verifyRemote(response, asset);
  }
  const manifestPath = `revisions/${prepared.slug}/${prepared.revision}/manifest.json`;
  let response = await fetchBlob(config, manifestPath, { useCache: false });
  if (response.status === 404) { await response.body?.cancel(); await upload(manifestPath, prepared.manifestBytes, 'application/json'); response = await fetchBlob(config, manifestPath, { useCache: false }); }
  await verifyRemote(response, { size: Buffer.byteLength(prepared.manifestBytes), sha256: digest(prepared.manifestBytes) });
  // Conditional catalog write prevents one operator from silently discarding another import.
  await put('trips/catalog.json', JSON.stringify(nextCatalog(old, prepared)), { token: config.token, access: 'private', addRandomSuffix: false, contentType: 'application/json', ...(etag ? { ifMatch: etag } : { allowOverwrite: false }) });
}

async function main() {
  const args = process.argv.slice(2); const allowed = new Set(['--source', '--year', '--local-dir', '--blob', '--write', '--dry-run']);
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]; if (!allowed.has(key) || options.has(key)) throw new Error('Unknown or repeated option');
    if (['--blob', '--write', '--dry-run'].includes(key)) options.set(key, 'true');
    else { const value = args[++i]; if (!value || value.startsWith('--')) throw new Error('Missing option value'); options.set(key, value); }
  }
  if (!options.get('--source') || !options.get('--year')) throw new Error('Usage: import-trips --source /path/to/VeloTrips --year 2026 [--local-dir /private/trips | --blob] [--write | --dry-run]');
  if (options.has('--write') && options.has('--dry-run')) throw new Error('Choose --write or --dry-run');
  if (options.has('--blob') && options.has('--local-dir')) throw new Error('Choose one storage destination');
  const prepared = await prepareImport(options.get('--source')!, options.get('--year')!);
  console.log(`Validated ${prepared.assets.length} media files, ${prepared.assets.reduce((n, a) => n + a.size, 0)} bytes. Revision ${prepared.revision}.`);
  if (!options.has('--write')) { console.log('Dry run complete. No files written or uploaded.'); return; }
  if (options.has('--local-dir')) await importLocal(prepared, options.get('--local-dir')!);
  else if (options.has('--blob')) { const config = storageConfig({ ...process.env, PRIVATE_TRIPS_STORAGE: 'blob' }); if (config.mode !== 'blob') throw new Error('Expected Blob configuration'); await importBlob(prepared, config); }
  else throw new Error('Writing requires an explicit --local-dir or --blob destination');
  console.log('Private revision verified and catalog activated.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Import failed. Check arguments, input files, destination configuration and integrity; the previous catalog is retained until activation.'); process.exitCode = 1; });
}
