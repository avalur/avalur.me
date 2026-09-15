import { resolveAsset } from './index';
import { openAsset, type ByteRange } from './storage';
import type { StoredAsset } from './types';

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Vary': 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

export function parseRange(header: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size < 1) return null;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) return null;
  if (first === undefined) {
    if (!last) return null;
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (last !== undefined && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

function failure(status: number, head: boolean): Response {
  return new Response(head ? null : (status === 503 ? 'Материалы временно недоступны.' : 'Нет доступа к материалу.'), {
    status, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

type AccessCheck = (request: Request) => Promise<{ user: unknown; canViewTrips: boolean }>;
type MediaDependencies = {
  resolveAsset: (slug: string, id: string) => Promise<StoredAsset | null>;
  openAsset: typeof openAsset;
};

/** Authorization is deliberately before path checks, JSON reads, HEAD and conditional handling. */
export async function handleMedia(request: Request, slug: string, id: string, getAccess: AccessCheck, dependencies: MediaDependencies = { resolveAsset, openAsset }): Promise<Response> {
  const head = request.method === 'HEAD';
  try {
    const access = await getAccess(request);
    if (!access.user) return failure(401, head);
    if (!access.canViewTrips) return failure(403, head);
    if (request.method !== 'GET' && !head) return new Response(null, { status: 405, headers: { ...PRIVATE_HEADERS, Allow: 'GET, HEAD' } });
    const asset = await dependencies.resolveAsset(slug, id);
    if (!asset) return failure(404, head);
    const etag = `"${asset.sha256}"`;
    // RFC 9110: Range applies only to GET. HEAD describes the full GET response.
    const rangeHeader = !head && (!request.headers.has('if-range') || request.headers.get('if-range') === etag) ? request.headers.get('range') : null;
    const range = rangeHeader ? parseRange(rangeHeader, asset.size) : undefined;
    const headers = new Headers({
      ...PRIVATE_HEADERS, 'Accept-Ranges': 'bytes', 'Content-Type': asset.contentType,
      'Content-Disposition': 'inline', ETag: etag,
    });
    if (range === null) {
      headers.set('Content-Range', `bytes */${asset.size}`);
      headers.set('Content-Length', '0');
      return new Response(null, { status: 416, headers });
    }
    if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${asset.size}`);
    headers.set('Content-Length', String(range ? range.end - range.start + 1 : asset.size));
    const body = await dependencies.openAsset(asset, range, head, request.signal);
    return new Response(body, { status: range ? 206 : 200, headers });
  } catch {
    // Never send provider errors/URLs or fall back to a public object on auth/storage failure.
    return failure(503, head);
  }
}
