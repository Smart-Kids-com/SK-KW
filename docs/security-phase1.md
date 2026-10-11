# Phase 1: administration security

## Isolated local demo

Run `npm run demo:security` and leave the terminal open. Visit
`http://127.0.0.1:4311/` for the synthetic password and live OTP, then follow its
login link to the real application at `http://127.0.0.1:4310/admin`.
For another port, use `npm run demo:security -- --port 4410`; its helper is 4411.

The launcher passes only OS essentials to a child process, installs the same
isolation guards as security tests, creates two temporary databases and seeds
synthetic products, customers and orders. It never loads `.env` or `.env.local`.
It additionally blocks browser-side external requests using CSP and replaces the
Meta Pixel script with a no-op. External CDN assets may therefore be unavailable.
The separate helper is local-only and is not part of `server.js` or production.
Authentication still requires both the password and OTP. If a code was just used,
wait for the next 30-second code; replay protection is active.

Stop with Ctrl+C. The parent cleans up the disposable data after the child exits.
The temporary fixture schema includes fields needed by the demo store; this does
not migrate the real store or fix the later-phase pricing/inventory issues.

The orders page has a POST logout button on desktop and mobile. Use it to revoke
the session before signing in again; clearing a browser cookie alone is not logout.
The demo uses password `Local-SK-Demo!2026` and a synthetic TOTP secret, independently
of all existing operational credentials. The helper displays only this dummy OTP.

### Verification performed on 2026-10-09

The ten administration pages share the original Home image buttons,
three-dimensional icons, colors, image sizes and 12px visible spacing, with the
latest Redirects image. Menu markup lives in `public/js/admin-navigation.js` and
its isolated styling in `public/css/admin-navigation.css`; see `docs/admin-navigation.md`.
The existing page scripts are preserved. Original images were downloaded once
from their Shopify CDN links and are served from `public/admin-assets`.
The source returned PNG bytes despite its `.webp` URL suffix; the files retain
those exact bytes with a `.png` extension, without image conversion or substitutes.
`public/admin-assets/manifest.json` records the source URL, local URL, byte length
and SHA-256 for every active image. The shared menu marks the current page and
keeps Home and POST logout available; mobile expansion pushes content down and
Theme's internal settings menu stays inside its content. The disposable fixture creates the
abandoned-checkouts table so dashboard summary queries do not encounter a missing
table. No operational database is affected.

The browser verifier now clears cookies and checks both `/admin-enhanced` and
`/orders-admin.html`: password then OTP required, no access with a password-only
challenge, the 15 active dashboard images local and loaded with HTTP 200, image/png and
matching SHA-256 fingerprints, and copied cookies rejected after
logout from either page. Desktop and mobile screenshots were visually reviewed.

- Node 24.21.0: all 17 security tests pass, including expiry, forged cookies,
  cross-instance logout, OTP replay, limits, route authorization and safe rendering.
- Actual `server.js`, two disposable database files, and isolated headless Chrome:
  anonymous pages/APIs denied, public catalog accessible, incorrect password and
  external redirect denied, password challenge cannot read orders, correct OTP
  opens orders, customer markup displayed as text at 1365px and 390px, POST logout
  revokes a copied cookie and protected pages return to login.
- Browser CSP and request interception emitted no external requests. Node guards
  prohibit remote databases, mail, Meta and non-loopback network transports.
- Existing `.env.local` and `orders.db` SHA-256 fingerprints remain unchanged.

The optional browser verifier is `node scripts/verify-security-demo.js` on Node 24,
while the default-port demo is running. It requires an already installed Chrome
or Edge and waits for a fresh OTP step. It saves desktop/mobile evidence under the
OS temporary directory and closes its isolated browser after verification.

Not verified here: a remote shared libSQL authentication database, Vercel deployment
and multi-region behavior, production HTTPS cookie delivery, live mail/Meta
delivery, real mobile devices or other browser engines. No production schema,
data or credentials have been altered; no service has been provisioned or deployed.

## Local verification and scope

Run `npm run test:security`. The bootstrap discards inherited database, auth, mail,
Meta and hosting settings before application modules load. It skips dotenv, uses
unique temporary SQLite files and synthetic credentials, and blocks remote
database URLs, external network traffic, email and Meta calls. No operating
database or environment file is migrated or changed by these tests.

The change covers authentication, authorization, login limits, safe return URLs
and safe order-list rendering. Pricing, inventory and general schema defects from
the audit remain outside this phase.

## Activation later (not performed in this phase)

1. Provision a **separate shared libSQL/Turso authentication database**. Do not use
   the store database or a local Vercel filesystem. Apply `db/auth-schema.sql`
   explicitly to the new database. The application never runs authentication DDL.
2. Configure `AUTH_DATABASE_URL`, `AUTH_DATABASE_AUTH_TOKEN` and a cryptographically
   random `AUTH_SESSION_SECRET` of at least 32 characters. Use the same settings on
   every instance of one environment; separate preview and production stores.
   Keep all values server-side and out of logs/version control.
3. Keep the existing `ADMIN_PASSWORD_1/2` and `ADMIN_OTP_SECRET` for now. The normal
   login page no longer offers enrollment or discloses the OTP secret.
4. Configure `PUBLIC_ORIGIN` for the deployed site. On Vercel, login rate limiting
   uses the platform-overwritten `x-forwarded-for`; self-hosted instances use the
   socket IP and ignore user-supplied forwarding headers. A self-hosted reverse
   proxy may therefore share one rate-limit bucket until separately configured.
5. Validate on an isolated preview before any production release. This phase does
   not provision services, change Vercel settings or deploy.

Until configured, admin login fails closed with a generic 503; public requests
without an authentication token still work. Missing auth tables also fail closed.
Legacy constant cookies are never accepted and are cleared on login/logout.

## Behavior

- Random 256-bit opaque tokens; only SHA-256 token hashes are stored.
- Password success creates a five-minute, unprivileged challenge. Only a valid
  OTP consumes that challenge and creates a twelve-hour admin session.
- Expiry is checked on the server on every authenticated request. Logout deletes
  the session and challenge from the shared database. No in-process session cache.
- Credential version is keyed by `AUTH_SESSION_SECRET` and binds all sessions to
  the configured passwords/OTP secret. Changing any invalidates prior sessions.
- OTP replay protection and challenge consumption use one write transaction.
- Cookies use HttpOnly, SameSite=Strict and Path=/; production also uses Secure
  and the `__Host-` prefix. Administrative responses use Cache-Control: no-store.
- Shared atomic rate counters: 10 password attempts/IP/15 minutes; 10 OTP
  attempts/IP/15 minutes; 5 attempts/challenge; 100 attempts/phase globally per
  15 minutes. Successful attempts count too. 429 responses include Retry-After.
- Private API routes are denied before store database initialization. Public
  reads are limited to catalog/collections/theme data and health. Public writes
  retain order creation, discount validation, draft save and visitor heartbeat.
  Order/customer/discount/inventory/dashboard reads and draft token reads require
  admin login. Draft recovery remains admin-only, as before; securely associating
  storefront recovery with order creation belongs to a subsequent phase.
- Unknown HTML pages default to admin protection; storefront pages and search
  verification pages are explicitly allowed. Login aliases use server rendering.
- Return URLs are restricted to local paths. Order rows, mobile cards and print
  output escape text; customer-controlled values never enter inline JavaScript.

For later maintenance, remove expired `admin_sessions` and reset-expired
`admin_login_limits` rows in the **authentication database only**. Do not remove
the current `admin_totp_replay` row, which prevents reuse of accepted OTP steps.

## OTP rotation later (not done now)

Coordinate a maintenance window with the authorized administrators. Generate a
fresh Base32 secret using a trusted offline tool, provision their authenticators
through a private channel, and store the new `ADMIN_OTP_SECRET` in the deployment's
secret settings without displaying it in a page or logs. Switch all instances to
the new configuration together and verify login. The credential-version binding
automatically rejects sessions and challenges issued under the old secret after
the configuration switch. Never keep old and new secrets active indefinitely;
remove old authenticator entries after verification. Consider rotating passwords
as well if there is evidence of prior access.
