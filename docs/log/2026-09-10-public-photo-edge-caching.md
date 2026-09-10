# Photographs were never served from Cloudflare's cache — fixed at the origin
**Date:** 2026-09-10 · **Status:** partial — live and verified on staging; main needs Tina's approval

## Goal
Tina: *"the caching is still going on we need to fix that. yesterday i went on my own
website using themodestyhouse.com and the pictures on the homepage … especially was the
pictures we used for the edits that were loading really slow"*

## Finding 1 — not one photograph was ever a cache HIT

Every edit-hero variant the homepage references, fetched twice from production:

```
/edit-lace-hero-v2-3200.webp     1540682  ttfb 0.259  MISS         (#1)
/edit-lace-hero-v2-3200.webp     1540682  ttfb 0.220  REVALIDATED  (#2)
/edit-jersey-hero-1672.webp       133882  ttfb 0.283  MISS
/edit-jersey-hero-1672.webp       133882  ttfb 0.231  REVALIDATED
/edit-fall-hero-mobile-7-1170.webp 488500 ttfb 0.222  REVALIDATED
… 31 URLs, 62 requests: MISS or REVALIDATED, never once HIT, no `age` header
```

In real browsers on production (Playwright, empty cache, scrolling like a visitor), every
edit hero came back `cf=REVALIDATED` with ~170-180 ms before the first byte:

| device | jersey | lace | fall |
|---|---|---|---|
| laptop 1470x956 @2x (Chromium) | 1672w · 131 KB | **3200w · 1,505 KB** | 1920w · 549 KB |
| iPhone 13 390x844 @3x (WebKit) | 1170w · 206 KB | 1170w · 503 KB | 1170w · 477 KB |

Throttled with CDP network emulation — how long each photo sat **blank after it had
scrolled into view**:

```
phone 9 Mbps / 60 ms    jersey  302 ms   lace  609 ms   fall 0 ms
laptop 20 Mbps / 40 ms  0 ms on all three (Chrome's lazy-load distance starts them early),
                        but the 1.5 MB lace file took 839 ms to download
```

## Finding 2 — the cause is Next's default for public/, and Cloudflare's documented reaction

The origin, read directly on the Railway staging host (no Cloudflare in front):

```
$ curl -sD - -o /dev/null https://themodestyhouse-staging-production.up.railway.app/edit-jersey-hero-640.webp
cache-control: public, max-age=0
```

- Next: *"The default caching headers applied are: `Cache-Control: public, max-age=0`"*
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md`).
- Cloudflare: *"When using Origin Cache Control and setting `max-age=0`, Cloudflare prefers to
  cache and revalidate."* (developers.cloudflare.com/cache/concepts/cache-control). That is
  `REVALIDATED` on every request: the copy is stored, stale on arrival, re-checked with Railway
  every time.
- The `cache-control: public, max-age=14400` a browser sees is **Cloudflare's zone
  `browser_cache_ttl` = 14400** (read from the API) rewriting the header on the way out.
  Railway never sent it. CLAUDE.md §6 said "Railway serves `public/` with
  `cache-control: public, max-age=14400`" — that was the CDN, not the origin.

## Finding 3 — the 2026-08-26 caching log recorded this as working

`docs/log/2026-08-26-cloudflare-html-caching.md`, Finding 1, shows
`cf-cache-status: REVALIDATED` for `/hero-home-mobile-1290.webp` and concludes *"static
assets are being cached correctly"*. `REVALIDATED` is the status of a stale copy that had to
go back to the origin. Every photograph on the site has paid that round trip since, and the
sentence closed the question for two weeks. → CLAUDE.md §10.57.

## What changed
- `lib/publicAssetCache.ts` — the header value and the source pattern, with the reasoning.
- `next.config.ts` — one `headers()` entry: image / svg / mp4 paths outside `/_next/` get
  `Cache-Control: public, max-age=14400, stale-while-revalidate=604800`.
- `lib/publicAssetCache.test.ts` — compiles the source through Next's own
  `buildCustomRoute` (what writes `routes-manifest.json`) and asserts 9 paths that must match
  and 14 that must not; plus that the value never gains a directive that disables Cloudflare's
  stale-while-revalidate.
- `CLAUDE.md` — §6 corrected, §10.57 added. (CLAUDE.md is local-only — listed in
  `.git/info/exclude`, never committed — so that edit is not part of the staging commit.)

**Why `max-age` + `stale-while-revalidate`, not `s-maxage`.** Cloudflare's revalidation docs:
*"`s-maxage` — Implies `proxy-revalidate` semantics, so shared caches cannot serve stale
content."* With `stale-while-revalidate`, an expired copy is served at once as `UPDATING`
while Cloudflare re-checks in the background, so no visitor waits on Railway for a file the
edge holds. 14400 keeps a browser's freshness exactly where the zone setting already had it.

**Why the origin and not a Cloudflare cache rule.** The origin was the thing telling every
cache not to trust the file. Fixing it there is in git, goes through staging like any other
change, and holds for any cache in front of the site.

**Why the extension list stops at photographs.** `/sitemap.xml`, `/llms.txt` and
`/meta-catalogue.xml` are routes whose freshness matters (Meta ingests the feed daily), so
`.xml`, `.txt`, `.json`, `.html` and `.ico` are deliberately outside the rule.

## Verification

**Negative control first.** With `lib/publicAssetCache.ts` in place but no rule in
`next.config.ts`, the test failed on the right assertion:
```
AssertionError: no public-asset Cache-Control rule in next.config.ts: expected undefined to be defined
Tests  3 failed | 1 passed (4)
```
With the rule: `Tests 4 passed (4)`.

**Suite, types, lint, build** (in an isolated worktree cut from `origin/staging` + `origin/main`):
```
Test Files  67 passed (67)
Tests       1181 passed (1181)
tsc --noEmit   exit 0
eslint (3 files) exit 0
next build     exit 0
```

**Local production build** (`next start -p 3199`, confirmed to be this build by its BUILD_ID
`eek-tkSV0Gas0R_r6pbfb` in the served HTML), against the staging origin's before-values:

| path | before (staging origin) | after (this build) |
|---|---|---|
| `/edit-lace-hero-v2-3200.webp` | `public, max-age=0` | `public, max-age=14400, stale-while-revalidate=604800` |
| `/edit-jersey-hero-mobile-1170.webp` | `public, max-age=0` | same new value |
| `/edit-fall-hero-8.jpg` | `public, max-age=0` | same new value |
| `/hero-home-mobile-1290.webp`, `/editorial/…webp`, `/style-it/…png`, `/file.svg`, `/header.mp4` | `public, max-age=0` | same new value |
| `/`, `/modest-abayas` | `private, no-cache, no-store, max-age=0, must-revalidate` | unchanged |
| `/sitemap.xml`, `/robots.txt`, `/favicon.ico` | `public, max-age=0, must-revalidate` | unchanged |
| `/llms.txt`, `/meta-catalogue.xml` | `public, max-age=3600` | unchanged |
| `/_next/static/…css`, `/_next/static/media/…woff2` | `public, max-age=31536000, immutable` | unchanged |
| `/cee9f84f….txt` (IndexNow key) | `public, max-age=0` | unchanged |
| `/icon.png`, `/apple-icon.png` | `public, max-age=0, must-revalidate` | **new value** — see notes |

`x-content-type-options: nosniff` still present on every row, so the security-header rule
still applies alongside the new one.

**Staging** — pushed as `17c490e`. Polled the Railway staging host until the header changed
(the header itself is the discriminator: old build `max-age=0`, new build the new value):
```
0s  200 public, max-age=0
62s 200 public, max-age=14400, stale-while-revalidate=604800
NEW BUILD LIVE on staging
```
Then the same probe as the local build, against
`https://themodestyhouse-staging-production.up.railway.app`: **identical to the local table,
row for row** — all 8 photograph rows carry the new value; `/`, `/modest-abayas`,
`/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/meta-catalogue.xml`, `/favicon.ico`,
`/_next/static/…css`, `/_next/static/media/…woff2` and the IndexNow key all unchanged.

The edit photographs still render on staging (Playwright, same throttled script, every
`img.complete && naturalWidth > 0`), with the SAME blank times as production before the fix —
phone: jersey 303 ms, lace 605 ms, fall 0 ms. That is expected, not a failed fix: staging has
no Cloudflare in front of it, so there is no edge cache for the header to unlock.

Staging has no Cloudflare in front of it, so it can prove the ORIGIN header only. The edge
behaviour (`HIT` instead of `REVALIDATED`) can only be measured on production, after the merge
and a purge — in that order (§10.47).

## Notes / follow-ups
- **The photographs are also heavy, and that is Tina's call, not a cache setting.** The edit
  heroes are WebP quality 95 (lace, jersey) and 100 (fall), from her "highest quality"
  request. Estimated sizes re-encoding the same source at the same width
  (the fall files were built from her PNG, so their q95 figure is an estimate from the JPEG):

  | file served | width | q95 | q90 | q85 | q80 |
  |---|---|---|---|---|---|
  | lace, laptop | 3200 | 1,505 KB | 891 | 557 | 395 |
  | fall, laptop | 1920 | 242 | 136 | 88 | 66 |
  | jersey, laptop | 1672 | 131 | 78 | 55 | 44 |
  | lace, iPhone | 1170 | 503 | 311 | 221 | 166 |
  | fall, iPhone | 1170 | 259 | 145 | 90 | 67 |
  | jersey, iPhone | 1170 | 206 | 109 | 75 | 60 |

  Not changed. Asked.
- `/icon.png` and `/apple-icon.png` match the `.png` rule, so they now cache 4h + SWR too.
  Both are static brand marks built from `app/icon.png` / `app/apple-icon.png`; a purge after
  a merge to main replaces them at the edge like everything else.
- Chrome and Firefox honour `stale-while-revalidate` too, so a browser may show a copy older
  than 4h once while it re-checks. That only matters for a file replaced in place, which §6
  already forbids.
- **Not touched:** the homepage HTML itself came back `cf-cache-status: EXPIRED` at 518 ms
  TTFB. A 1h edge TTL on a low-traffic site means many visits find it expired. Lengthening it
  first needs the post-deploy purge automated (CLAUDE.md §12), or deploys disappear for longer.
- **Not touched:** Smart Tiered Cache is `off` and editable on the Free plan. It would raise
  the hit ratio for visitors far from Amsterdam.
