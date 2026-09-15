import type { APIRoute } from 'astro';
import { getAccess } from '../../../../lib/access';
import { handleMedia } from '../../../../lib/trips/media';

export const prerender = false;

export const ALL: APIRoute = ({ request, params }) => handleMedia(request, params.trip ?? '', params.asset ?? '', getAccess);
