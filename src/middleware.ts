import { defineMiddleware } from 'astro:middleware';

const privateRoute = /^\/(?:trips|account|api|login|register|verify-email|forgot-password|reset-password)(?:\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  // The matched pattern also covers percent-encoded route spellings.
  if (!privateRoute.test(context.url.pathname) && !privateRoute.test(context.routePattern)) return response;
  // Copy the headers: redirects and provider responses may have immutable headers.
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('CDN-Cache-Control', 'no-store');
  headers.set('Vercel-CDN-Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
