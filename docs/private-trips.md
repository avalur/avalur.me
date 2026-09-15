# Private trips and accounts

Public Astro pages remain prerendered. `/trips/`, account pages and API routes run on the server. A trip request requires a database session, a verified email, and an active `AccessGrant` for `trips`. Administrators also need that grant to view trips.

The original VeloTrips design is rendered from a private, versioned manifest. No personal narrative or media is committed to this repository, copied to `public/`, or traced into a Vercel function. The local source archive is retained separately.

## Local development

Use Node 24. Install with `npm ci`, then create local configuration:

```sh
node scripts/setup-local.mjs --admin=YOUR_EMAIL
npm run db:local
```

Keep the isolated PostgreSQL process running. In another terminal:

```sh
npm run db:migrate
node --env-file=.env --import tsx scripts/import-trips.ts --source /ABSOLUTE/PATH/TO/VeloTrips --year 2026 --local-dir /ABSOLUTE/PATH/TO/avalur.me/.private/trips --write
node --env-file=.env --import tsx scripts/manage-access.ts --grant YOUR_EMAIL
npm run dev -- --host 127.0.0.1 --port 8827
```

Use `npm run dev` for account, API and private-trip routes. `npm run preview` is limited to static output because the Vercel adapter does not provide a local server preview. Test the built server routes in the stable Vercel Preview environment.

`setup-local` will not overwrite existing configuration. It generates unique local credentials, does not create users, and does not grant access. Local registration writes confirmation messages to ignored `.private/mail/*.json` files; no actual email is sent. Production and Vercel reject this transport.

Registration tokens travel in URL fragments so they do not enter HTTP logs. The browser clears the fragment. Password creation and token consumption happen on POST. Resetting a password revokes previous sessions and establishes a fresh one. OAuth buttons appear only when configured; provider-verified email is required and accounts are not automatically linked by matching email.

## Deployment

Use `.env.example` for variable names; configure each environment separately:

- `SITE_URL`: exact HTTPS browser origin, checked on account mutations and callbacks.
- Dedicated Postgres/Neon database with `prisma migrate deploy` applied. Keep preview/test accounts separate from production.
- **Private** Vercel Blob store, origin and server-only token. No signed or public object URLs are returned to the browser.
- Resend with a verified `MAIL_FROM` sender, a unique `AUTH_SECRET`, and server-only `ADMIN_EMAILS`.
- Dedicated Google/GitHub OAuth applications configured as described below.

Before importing personal files, verify actual Vercel streaming with synthetic media larger than 20 MiB. Test GET, HEAD, full/middle/suffix Range requests, 416, cancellation and unauthorized access. Browser/CDN responses remain private and non-cacheable. Immutable revisions may use the storage's private upstream cache without skipping session or permission checks.

For Blob import, use the local import command with `--blob` instead of `--local-dir`, with Blob environment variables and `--write`. Omit `--write` for a dry-run. Import validates expected files and hashes, uploads an immutable revision, then activates the catalog last. Never upload the DOCX or Telegram export, and never change the store to public.

## OAuth setup

Create OAuth applications dedicated to avalur.me; do not reuse the ml-practice-tasks clients. Register the exact callback URLs below, without wildcards. Always open the stable preview alias for sign-in, rather than a changing deployment URL, and set `SITE_URL` to that exact browser origin.

| Provider | Stable Preview callback | Production callback |
| --- | --- | --- |
| Google | `https://avalur-me-private-preview.vercel.app/api/auth/callback/google` | `https://avalur.me/api/auth/callback/google` |
| GitHub | `https://avalur-me-private-preview.vercel.app/api/auth/callback/github` | `https://avalur.me/api/auth/callback/github` |

Google can have both exact callbacks registered. The current GitHub application settings allow up to 10 redirect URIs, so one dedicated avalur.me application can also contain both callbacks.

Keep `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` server-only and scoped to **Vercel Preview only for now**. Registering a production callback does not enable production sign-in. Enable production variables only after the real provider flows have been validated in Preview; configuration alone does not verify a working OAuth flow.

The owner first signs in with a password, then connects Google or GitHub in the “Вход через сервисы” section at `/account/`. The provider must return the **same verified email** as the signed-in account. Matching emails alone do not automatically link separate accounts.

### Before enabling production OAuth

- Keep the Google app in **Testing**, with only the owner explicitly added as a test user, while Preview validation continues. Other Google accounts are not enabled for this test.
- Publish the public privacy page at **https://avalur.me/privacy/** before publishing the Google app. It must be reachable without signing in. Set this exact URL in the Google consent screen; a protected Preview URL does not meet this requirement.
- Validate the real Google and GitHub sign-in and account-linking flows in Preview before enabling their Production environment variables. A configured provider is not evidence that its real OAuth flow has passed.
- Production deployment and Google app publication are separate release steps. This implementation prepares the source on the current branch; committing and pushing that branch does not authorize a production release.

## Access

The verified owner manages email permissions at `/account/access/`. Adding an address does not create an account or send an invitation. Revocation applies on the next page/media request even with a live session.

```sh
node --env-file=PRIVATE_ENV --import tsx scripts/manage-access.ts --grant ADDRESS
node --env-file=PRIVATE_ENV --import tsx scripts/manage-access.ts --revoke ADDRESS
node --env-file=PRIVATE_ENV --import tsx scripts/manage-access.ts --grant-file PRIVATE_EMAIL_LIST --dry-run
```

Do not commit address lists, email files, environment files, database dumps or personal media. The existing public `/family/tolya-i-ira/` album is outside this migration and remains as it was.

## Verification

```sh
npm run check
npm test
npm run build
npm audit --omit=dev
```

Database integration tests need `TEST_DATABASE_URL` pointing to an isolated test database with migrations applied, never production or a running development server's database. Tests cover safe redirects, passwords, token expiry/concurrency, verification, OAuth/password session compatibility, revocation, rate limits, storage paths and media ranges.

Astro and its integrations were upgraded for server-rendering security fixes. Markdown retains the unified engine and existing remark/rehype plugins. Scoped `path-to-regexp` and `deepmerge-ts` overrides fix vulnerable upstream pins; recheck them when upgrading Vercel/Prisma.
