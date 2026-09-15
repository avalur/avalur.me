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

Use `.env.example` for variable names; configure **Vercel Preview** and **Vercel Production** separately. Set `SITE_URL=https://avalur-me-private-preview.vercel.app` in Preview and `SITE_URL=https://avalur.me` in Production. Credentials, private storage, database accounts, sessions and access grants must belong to the intended environment; do not copy the Preview environment wholesale into Production.

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

Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` as server-only variables in each Vercel environment that enables the corresponding provider. Even when one provider application covers both exact callbacks, configure its credentials separately in Preview and Production. Registering a callback alone does not enable sign-in: the deployed environment also needs the matching variables and `SITE_URL`.

Google/GitHub account linking and subsequent sign-in after logout have been verified in Preview. Production uses a different origin and its own configuration, so its flows still require validation after deployment.

For an existing account, sign in with its password or an already connected provider, then connect Google or GitHub in the “Вход через сервисы” section at `/account/`. The provider must return the **same verified email** as the signed-in account; GitHub must use that address as its primary email. Matching emails alone do not automatically link separate accounts. An account created through OAuth can also set a password through email password recovery.

With separate databases, Preview accounts do not automatically exist in Production. A controlled migration of the verified owner can preserve the password hash and provider identity records, using new database IDs and excluding sessions, OAuth access/refresh/ID tokens, email tokens and test accounts. Alternatively, the owner can create a new Production account through OAuth or email registration. Production `ADMIN_EMAILS` and the owner's Production `AccessGrant` must also be configured; creating or transferring the account does not grant either permission.

### Production release checklist

- Configure Production database migrations, private storage, mail, `AUTH_SECRET`, `ADMIN_EMAILS`, provider credentials and the exact Production `SITE_URL`. Add the owner and intended viewers to the Production access list without committing that list.
- Make **https://avalur.me/privacy/** publicly reachable without signing in, and set this exact URL in the Google consent screen before publishing the Google app. A protected Preview URL does not meet this requirement.
- Verify the Production callback URLs above in the provider settings. Complete Google app publication before offering Google sign-in to friends outside its test-user list. While Google remains in **Testing**, only explicitly listed test users can use that provider; the site's email access list does not change this Google restriction. Email and GitHub sign-in have their own configuration and do not depend on Google publication.
- On the deployed Production origin, verify email registration and delivery, confirmation, password login and recovery, OAuth login and linking, and login again after logout. Check that the owner can manage access and an approved viewer can open trips, while a guest or an unapproved account cannot open pages or media. Verify revocation with an existing session.
- Share the Production `/trips/` link after these checks pass. Preview verification and a successful deployment alone do not establish Production readiness.

## Access

The verified owner manages email permissions at `/account/access/`. Adding an address does not create an account or send an invitation. Revocation applies on the next page/media request even with a live session.

Viewers use the exact email granted access, then choose Google, GitHub or email registration/login. Normal login and registration preserve the requested trip URL through `next`; password recovery returns to `/account/`, where an approved viewer can open the cycling archive. A signed-in viewer without a matching grant sees a request to tell the owner which email they used.

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
