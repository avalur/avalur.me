import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function clickProvider(redirectUrl: string) {
  let click: (() => Promise<void>) | undefined;
  const button = {
    disabled: false,
    dataset: { oauthProvider: 'google', next: '/account/' },
    addEventListener: (event: string, listener: () => Promise<void>) => { if (event === 'click') click = listener; },
  };
  const message = { textContent: '', dataset: {} };
  const assign = vi.fn();
  const fetch = vi.fn()
    .mockResolvedValueOnce(Response.json({ csrfToken: 'synthetic-csrf-token' }))
    .mockResolvedValueOnce(Response.json({ url: redirectUrl }));
  vi.stubGlobal('location', { origin: 'https://site.example.test', hash: '', assign });
  vi.stubGlobal('document', {
    querySelectorAll: (selector: string) => selector === '[data-oauth-provider]' ? [button] : [],
    querySelector: () => message,
    // A native form would recreate the Origin:null regression.
    createElement: () => { throw new Error('OAuth must not submit a native form'); },
  });
  vi.stubGlobal('fetch', fetch);
  await import('../src/scripts/account');
  expect(click).toBeTypeOf('function');
  await click!();
  return { fetch, assign, button, message };
}

describe('OAuth button JSON redirect flow', () => {
  it('posts CSRF using a same-origin fetch and navigates after receiving the provider URL', async () => {
    const authorization = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=synthetic';
    const { fetch, assign } = await clickProvider(authorization);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe('/api/auth/signin/google');
    expect(options).toMatchObject({
      method: 'POST', mode: 'same-origin', credentials: 'same-origin',
      redirect: 'error', referrerPolicy: 'same-origin',
      headers: { 'X-Auth-Return-Redirect': 'true', 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect(options.body).toBeInstanceOf(URLSearchParams);
    expect(options.body.get('csrfToken')).toBe('synthetic-csrf-token');
    expect(options.body.get('callbackUrl')).toBe('https://site.example.test/account/');
    expect(assign).toHaveBeenCalledExactlyOnceWith(authorization);
  });

  it('allows Auth.js to return to the local error page and rejects other redirect origins', async () => {
    const local = await clickProvider('https://site.example.test/login/?error=AccessDenied');
    expect(local.assign).toHaveBeenCalledExactlyOnceWith('https://site.example.test/login/?error=AccessDenied');
    vi.unstubAllGlobals(); vi.resetModules();
    const invalid = await clickProvider('https://unrelated.example.test/');
    expect(invalid.assign).not.toHaveBeenCalled();
    expect(invalid.button.disabled).toBe(false);
    expect(invalid.message.textContent).toContain('недопустимый адрес');
  });
});
