# Self-hosted Plausible, running alongside Pulse for comparison
**Date:** 2026-09-23 · **Status:** done (staging), awaiting approval to merge to main

## Goal
Tina wants to compare Pulse (the site's existing analytics) against Plausible, to see how the two report the same traffic.

## What changed
- **Infrastructure.** Deployed Plausible Community Edition to the existing Railway project (`themodestyhouse`), via Railway's official `plausible-analytics-ce` template, using the `RAILWAY_API_KEY` in `.env` as a project-scoped token (the CLI/`whoami` form of that key doesn't authenticate — only the GraphQL API with a `Project-Access-Token` header does). Three new services, all in the same project as the main site and Ghost:
  - **Postgres** (`ghcr.io/railwayapp-templates/postgres-ssl:18`) — accounts/site settings.
  - **ClickHouse** (custom low-memory image tuned for Railway) — event storage.
  - **Plausible** (`ghcr.io/plausible/community-edition:v3.2.1`) — the app itself, public at `plausible-production-09f2.up.railway.app`.
  All three report healthy (`/api/health` → `{"sessions":"ok","postgres":"ok","clickhouse":"ok","sites_cache":"ok"}`).
- **Admin account.** Registered `hello@themodestyhouse.com` with a random 24-char password (the registration form is Phoenix LiveView — a raw `curl` POST 404s, so it was driven through a real browser). Site `themodestyhouse.com` added, timezone Europe/Amsterdam (matches Pulse's hosting region). Credentials saved to `.env` as `PLAUSIBLE_URL` / `PLAUSIBLE_ADMIN_EMAIL` / `PLAUSIBLE_ADMIN_PASSWORD` — local only, never committed.
- **Site wiring** (`feat/plausible-analytics`, merged into `staging`):
  - `app/layout.tsx` — a second `<Script>` tag, mirroring Pulse's pattern exactly: production-only (`NODE_ENV === 'production'`), `defer`, `strategy="afterInteractive"`, `data-domain="themodestyhouse.com"`.
  - `next.config.ts` — CSP allowlist. Unlike Pulse (whose script host and event-endpoint host differ — `js.ciphera.net` vs `pulse-api.ciphera.net`), self-hosted Plausible serves the script AND receives events on the same host, so one entry in both `script-src` and `connect-src` covers it.
  - `content/legal/privacy.md` — disclosed in §2, §3, §4, §5, §8, alongside Pulse. Framed as **not** a third-party subprocessor: it's our own software on our own already-disclosed Railway hosting, so the data never leaves our infrastructure — a simpler story than Pulse's.
  - Pageviews only. No custom goals, no outbound-click/file-download script variants — matching the stated purpose (compare traffic totals against Pulse), not replicating Pulse's 17 custom events.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run lib/legal.test.ts` — 18/18 passing (Pulse's own disclosure guards still pass; nothing in that file is Plausible-specific yet).
- `npm test` — 1326 passed, 1 pre-existing failure in `lib/colourLeads.test.ts` (a stale product id from nightly catalogue drift, unrelated to this change — neither the test file nor `data/colour-leads.json` is touched here).
- `npx eslint next.config.ts app/layout.tsx` — clean. (`npm run lint`'s 213 problems are entirely in an untracked, unrelated vendored file, `launch-film/assets/vendor/TextPlugin.min.js`, left over from other scratch work.)
- Pushed to `staging` (`e99276a`, after fast-forwarding staging to catch up with `origin/main`'s pinterest-feed commit first).
- Staging deploy verified live:
  - `curl -sI https://themodestyhouse-staging-production.up.railway.app/` — CSP header includes the new domain in both `script-src` and `connect-src`; `x-robots-tag: noindex, nofollow, noarchive` still present (staging stays unindexed).
  - Opened staging in a real browser (Claude in Chrome): the script tag renders (`data-domain="themodestyhouse.com"`), loads with `200`, `window.plausible` is a function, no CSP console errors.
  - Plausible dashboard, same visit: **1 unique visitor, 2 pageviews, "1 current visitor"** — confirmed events are actually reaching ClickHouse, not just that the script loads.

## Notes / follow-ups
- The dashboard's own footer disclaimer: *"This dashboard is running on self-managed infrastructure, not tested by Plausible Analytics. We cannot vouch for its performance or reliability."* — Plausible's standard self-hosted-CE notice, not something we added.
- `data-domain="themodestyhouse.com"` is hardcoded (same as Pulse's), so a staging visit is attributed to the production domain in Plausible's dashboard — identical to how Pulse already behaves. The verification visits above are already in Plausible's numbers for today.
- Not yet on `main`. Per §1, merging needs Tina's explicit approval — asked, not yet merged as of this entry.
