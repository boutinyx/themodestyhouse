# Add a live, authenticated curation admin (/staff/curate)
**Date:** 2026-08-12 · **Status:** done, needs Railway env vars to activate

## Goal
Tina asked for a version of the site where she can log in and select every
product that doesn't belong. That UI already existed — `/admin/curate` — but
was made dev-only in an earlier session after a real P0 security incident
(it was publicly reachable with zero auth). This adds it back in production,
properly, with real authentication this time, on new routes that don't touch
the hardened `/admin*` / `/api/{curate,decisions,raw,admin}*` prefixes the
proxy still hard-blocks.

Confirmed three design forks with Tina before writing anything (all
"recommended" options): a single shared password (not magic-link email),
cuts take effect on the live site immediately (not after a rebuild), and
cuts save to the server first, synced into git as a deliberate later step
(not an automatic git push from production).

## What changed
- **`lib/adminAuth.ts`** (+ test) — password check (`verifyPassword`,
  HMAC-normalized `timingSafeEqual`, fails closed if `ADMIN_PASSWORD` is
  unset) and a stateless signed session cookie (HMAC-SHA256 over
  `v1.<expiry>`, 7-day max age). Stateless on purpose: a Railway redeploy or
  restart must not silently log everyone out, so there's nothing for the
  server to remember between requests.
- **`lib/staffSession.ts`** — thin `next/headers` wrapper (`hasStaffSession`,
  `requireStaffSession`) split out so `lib/adminAuth.ts` stays framework-free
  and unit-testable; `cookies()` only works inside a real request.
- **`lib/liveCuts.ts`** (+ test) — reads/writes `data/.live-cuts.json`
  (gitignored, NOT `data/decisions.json`). Atomic write via temp-file +
  `renameSync` so a request reading mid-write never sees a truncated file.
  See the file's own comment for why this is a separate store from
  decisions.json rather than writing there directly — short version: no
  GitHub credentials in production, no silent loss on redeploy either.
- **`lib/products.ts`** — `getProducts()` now filters out live-cut ids. This
  is the ONE place the filter lives, so every consumer (every lane, the
  directory, home rails, favourites) picks up a cut immediately with no
  per-page wiring. Added `lib/products.ts` test coverage — it had none before.
- **`app/staff/login/`**, **`app/staff/curate/`** — the pages. Server
  components check the session and redirect; the curate page reuses the old
  CurateClient's tap-✕-to-cut/✓-to-keep pattern but reads the PUBLISHED
  catalogue (`data/products.json`) rather than raw (raw stays gated by
  `assertLocalDev()` regardless of this feature — Invariant 11 is untouched),
  adds brand/text filters, and a "Download cuts" link for the sync step.
- **`app/api/staff/{login,logout,curate/list,curate/decide,curate/export}/route.ts`**
  — session-gated (401, not the dev-tool's 404-as-if-absent — these routes
  are meant to be knowable, the login page itself says so). Login is rate
  limited (5/min/IP, same in-memory-burst-limiter pattern as
  `app/api/contact/route.ts`) since there is exactly one password to guess.
- **`app/[lane]/page.tsx`** — added `export const revalidate = 60`. These
  pages are statically prerendered (`generateStaticParams`); without this a
  cut would only reach them on the next full rebuild+redeploy, not
  "immediately". `/directory` needed no change — it was already fully
  dynamic (reads `searchParams`).
- **`next.config.ts`** — extended the existing noindex header rule from
  `/(admin|api)/:path*` to `/(admin|api|staff)/:path*`.
- **`scripts/merge-live-cuts.mjs`** — the deliberate sync step. Takes a
  downloaded `live-cuts-*.json` export, writes matching ids DIRECTLY into
  `data/decisions.json` (not through `nextDecisions()`, which only defaults
  an absent id — a human cut here must be able to override an existing
  'keep'), prints a summary, reminds to run `npm run build:data`.
- **`.env.example`** — documented `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`,
  with an `openssl rand -base64 24` suggestion for generating real values.
- **`.gitignore`** — `data/.live-cuts.json`.

## Why routes live under /staff, not /admin
`proxy.ts` hard-blocks `/admin*` and `/api/{curate,decisions,raw,admin}*` in
every environment that isn't local dev — that block is documented as
intentional and permanent ("any FUTURE public route on these prefixes will
404 in production... do not put a public route on those prefixes"). Reusing
those prefixes for an authenticated route would mean either weakening that
block (reintroducing exactly the class of mistake that caused P0-A) or
fighting it. `/staff` and `/api/staff` are new prefixes the proxy has no
opinion about, protected instead by the session check in every route/page —
defense lives in the auth layer here, not the routing layer.

## Verification
```
npx tsc --noEmit                    # clean
npm test                            # 32 files, 557 tests passed (24 new)
npm run lint                        # 0 errors (1 pre-existing unrelated warning)
npm run build                       # 38 routes; /[lane] shows Revalidate: 1m;
                                     # every /staff* and /api/staff* route is ƒ (dynamic)
```
Exercised the real thing against a production build (`next start`, real
`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`), not just unit tests:
- Unauthenticated `/staff/curate` → 307 to `/staff/login`; unauthenticated
  `/api/staff/curate/list` → 401.
- Wrong password → 401; 6th rapid attempt in a minute → 429.
- Correct password → 200, `Set-Cookie` with `HttpOnly; SameSite=Lax; Secure;
  Max-Age=604800`.
- Cut a REAL product (`niswa:10217348399402`) via the authenticated API,
  confirmed it disappeared from `/directory`'s live HTML in the same
  request cycle — `Cache-Control: private, no-cache, no-store` confirmed
  nothing was cached. (First check gave a false alarm — grepped the shared
  base title "Aurelia Linen Convertible Dress" and matched other color
  variants with different ids; re-checked the specific cut variant
  ["...- Blush"] and it was correctly the only one gone.)
- `data/.live-cuts.json` was written and read correctly, and never appeared
  in `git status` — confirmed gitignored.
- Logout sets `Max-Age=0`. Note: because sessions are stateless
  (signature + expiry, no server-side store), a cookie value already issued
  stays cryptographically valid until its 7-day expiry even after logout —
  logout tells a real browser to delete it, but can't revoke a copy that was
  captured before the fact. Accepted tradeoff for a single-admin tool behind
  HttpOnly+Secure+SameSite=Lax; flagging it rather than leaving it implicit.

## Notes / follow-ups
- **Won't do anything until Tina sets two env vars on Railway**:
  `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (suggested:
  `openssl rand -base64 24` for each). Without them `/api/staff/login`
  always returns 401 — fails closed, never a default password.
- **The sync step is manual on purpose** (Tina's choice): after cutting
  products live, download the export from the "Download cuts" link (or
  `GET /api/staff/curate/export` while signed in), hand the file to a
  session with repo access, run
  `node scripts/merge-live-cuts.mjs <file>` then `npm run build:data`. Until
  that happens, live cuts persist only on whichever Railway container wrote
  them and will NOT survive that container's next redeploy.
- Considered making `/[lane]` pages fully dynamic instead of `revalidate:
  60`. Kept the 60s ISR window — full dynamic would give up static
  prerendering sitewide for something that only needs to be near-real-time,
  and "near-real-time" is what was actually asked for.
