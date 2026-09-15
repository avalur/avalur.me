export {};

const fragments = new URLSearchParams(location.hash.slice(1));
const emailToken = fragments.get('token');
if (emailToken) {
  document.querySelectorAll<HTMLInputElement>('input[data-email-token]').forEach(input => { input.value = emailToken; });
  history.replaceState(null, '', location.pathname + location.search);
}

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-account-form]')) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = form.querySelector<HTMLElement>('[data-form-message]');
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit],button:not([type])');
    if (submit?.disabled) return;
    if (message) { message.textContent = ''; delete message.dataset.error; }
    const values = Object.fromEntries(new FormData(form));
    if ('token' in values && !values.token) {
      if (message) { message.textContent = 'Откройте ссылку из письма ещё раз или запросите новую.'; message.dataset.error = 'true'; }
      return;
    }
    if (submit) submit.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Не удалось выполнить действие. Попробуйте ещё раз.');
      if (body.redirectTo) {
        const target = new URL(body.redirectTo, location.origin);
        if (target.origin !== location.origin) throw new Error('Недопустимый адрес перехода.');
        location.assign(target.href);
        return;
      }
      if (form.hasAttribute('data-reload')) { location.reload(); return; }
      if (message) message.textContent = body.message || 'Готово.';
      if (form.hasAttribute('data-clear-password')) form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach(input => { input.value = ''; });
    } catch (error) {
      if (message) { message.textContent = error instanceof Error ? error.message : 'Не удалось связаться с сервером.'; message.dataset.error = 'true'; }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-oauth-provider]')) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    const message = document.querySelector<HTMLElement>('[data-oauth-message]');
    try {
      const response = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
      const { csrfToken } = await response.json();
      if (!response.ok || typeof csrfToken !== 'string') throw new Error('Вход через этот сервис временно недоступен.');
      const provider = button.dataset.oauthProvider!;
      // Native form navigation can send Origin:null under no-referrer. Keep
      // this POST on our origin and request Auth.js's JSON redirect response.
      const started = await fetch('/api/auth/signin/' + encodeURIComponent(provider), {
        method: 'POST', mode: 'same-origin', credentials: 'same-origin', cache: 'no-store',
        redirect: 'error', referrerPolicy: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'X-Auth-Return-Redirect': 'true' },
        body: new URLSearchParams({ csrfToken, callbackUrl: new URL(button.dataset.next || '/account/', location.origin).href }),
      });
      const result = await started.json();
      if (!started.ok || typeof result.url !== 'string') throw new Error('Не удалось начать вход через сервис. Попробуйте ещё раз.');
      const target = new URL(result.url, location.origin);
      const providerOrigin = provider === 'google' ? 'https://accounts.google.com' : provider === 'github' ? 'https://github.com' : null;
      if (target.username || target.password || (target.origin !== location.origin && target.origin !== providerOrigin)) throw new Error('Сервис вернул недопустимый адрес входа.');
      location.assign(target.href);
    } catch (error) {
      if (message) { message.textContent = error instanceof Error ? error.message : 'Не удалось начать вход.'; message.dataset.error = 'true'; }
      button.disabled = false;
    }
  });
}
