# Cloudflare caches every image and zero pages — and why
**Date:** 2026-08-26 · **Status:** partial — analysis done, cache rule NOT yet applied

## Goal
Tina: *"we really need to do something about the caching because it takes a
gazillion years for it to load the website. maybe cloudflare cdn?"*

## Finding 1 — Cloudflare is already there

The site is already proxied through Cloudflare. Every response carries
`server: cloudflare` and a `cf-ray`, and static assets are being cached
correctly:

```
$ curl -sD - -o /dev/null https://themodestyhouse.com/hero-home-mobile-1290.webp
cache-control: public, max-age=14400
cf-cache-status: REVALIDATED
```

So "add a CDN" is not available as a fix — the CDN is in place and is doing its
job on images. What it is not permitted to do is cache a single **page**.

## Finding 2 — every HTML response is `no-store`, on every route

```
$ for u in / /directory /modest-abayas /editorial /designers /modest-hijabs; do …
/                  cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
/directory         cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
/modest-abayas     cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
/editorial         cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
/designers         cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
/modest-hijabs     cache-control: private, no-cache, no-store, max-age=0, must-revalidate  cf-cache-status: DYNAMIC
```

The same headers come back from the Railway origin directly (staging), so this
is the app, not Cloudflare.

## Finding 3 — the cause is one line in the root layout

`app/layout.tsx:68`:

```ts
const isStaff = await hasStaffSession();   // -> cookies() via lib/staffSession.ts
```

Reading a cookie in the **root layout** opts every page in the app out of static
prerendering. The comment on that line already says so and records that it was a
deliberate, accepted trade at the time (`docs/superpowers/plans/2026-08-12-inline-staff-editing.md`).

It is not a theory. The build output confirms it — `.next/prerender-manifest.json`
contains no page routes at all:

```
$ node -e "console.log(Object.keys(require('./.next/prerender-manifest.json').routes))"
/_global-error  /apple-icon.png  /favicon.ico  /icon.png  /llms.txt  /sitemap.xml
```

There is no `/`, no `/directory`, no lane. Not one page is prerendered. The
`export const revalidate = 60` on `app/[lane]/page.tsx` and
`app/designers/[slug]/page.tsx` is inert for the same reason.

Consequence: every single page view re-renders on Railway, which includes
re-reading and re-parsing the 11.2 MB `data/products.json` — `getProducts()`
has no memoisation (`lib/products.ts:20`) and the homepage calls it more than
once. Measured TTFB 535-688 ms, versus roughly 30 ms for a Cloudflare edge hit.

## The RSC hazard, checked before proposing anything

Cloudflare ignores `Vary` (other than `Accept-Encoding`), and Next sends
`vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch`.
Naively caching HTML could therefore serve a React flight payload to a browser
asking for a document, which would break the site outright.

Verified with a real client-side navigation driven by Playwright rather than
assumed — clicking a nav link produces:

```
{"url":"/directory?_rsc=BZ8rZr2JQ0hSq6fo","rsc":"1","hasRscParam":true}
withoutRscParam: 0 of 1
```

Every RSC request carries **both** `?_rsc=<hash>` in the URL and an `RSC: 1`
request header. Cloudflare's default cache key includes the query string, so
those are already distinct cache entries; excluding them on the header as well
gives two independent layers. This hazard is closable.

## The proposed rule (NOT yet applied)

The `CLOUDFLARE_API_TOKEN` in `.env` fails `/user/tokens/verify` with
`Invalid API Token`, so this could not be applied from here. It needs either a
working token or five minutes in the dashboard.

Two Cache Rules on `themodestyhouse.com`, **bypass first** — Cloudflare takes
the first match.

**Rule 1 — "Never cache" (must be ordered above Rule 2)**

```
(http.request.method ne "GET")
or (starts_with(http.request.uri.path, "/api/"))
or (starts_with(http.request.uri.path, "/staff"))
or (starts_with(http.request.uri.path, "/admin"))
or (any(http.request.headers["rsc"][*] eq "1"))
or (http.cookie contains "staff_session=")
```

Action: **Bypass cache**.

- `rsc` header — the Vary hazard above.
- `staff_session` cookie — without this, a page rendered while Tina is logged in
  could be stored and served to the public with the staff editing UI in it.
  Bypass in Cloudflare means neither served from nor stored in cache, so this
  also keeps her own view live: her cuts appear immediately, for her, with no
  purge step.
- `/api/`, `/staff`, `/admin` — forms, the curate tooling, and the login route.

**Rule 2 — "Cache pages"**

```
http.request.method eq "GET"
```

Action: **Eligible for cache**, with
- Edge TTL: *Ignore cache-control header and use this TTL* -> **1 hour**
  (the override is required; the origin says `no-store`)
- Browser TTL: *Override origin* -> **0 seconds**

Browser TTL 0 is deliberate. The edge holds the page and can be purged; a
browser cache cannot be. CLAUDE.md §10.21 is the entry about exactly that
failure — new bytes at an old URL that a browser will not re-request. With
browser TTL 0 every navigation still revalidates against the edge (~30 ms) and
one purge fixes everything for everyone.

## Why this is safe with respect to staff edits

Tina's call, this session: *"cant we just do the cut on staging and when dont we
push to main?"* — i.e. curation moves to staging and reaches production through
the normal `staging -> main` pipeline that §1 already mandates, instead of being
live-edited on the production container. That removes the cache-staleness
objection entirely: production HTML no longer has to be near-real-time.

Note this also matches how the data already flows — `/staff/curate` writes to a
gitignored `data/.live-cuts.json` on the container which, per
`lib/liveCuts.ts`'s own docstring, has no path back into git on its own and
vanishes on the next deploy. It already had to be exported and merged
deliberately.

## Verification to run once the rule exists

```bash
# 1. a page should become a HIT on the second request
curl -sD - -o /dev/null https://themodestyhouse.com/modest-abayas | grep -i cf-cache-status
curl -sD - -o /dev/null https://themodestyhouse.com/modest-abayas | grep -i cf-cache-status   # expect HIT

# 2. an RSC request must NOT be cached
curl -sD - -o /dev/null -H 'RSC: 1' 'https://themodestyhouse.com/modest-abayas?_rsc=test' | grep -i cf-cache-status   # expect BYPASS

# 3. a staff request must NOT be cached
curl -sD - -o /dev/null -H 'Cookie: staff_session=x' https://themodestyhouse.com/ | grep -i cf-cache-status   # expect BYPASS

# 4. the document must still be HTML, not a flight payload
curl -s https://themodestyhouse.com/modest-abayas | head -c 80   # expect <!DOCTYPE html>
```

Point 4 is the one that matters. Run it after the rule has been live long enough
for the cache to have filled.

## Notes / follow-ups

- **The deeper fix, not done here:** moving the staff-session read out of the
  root layout to client-side detection would let pages genuinely prerender, so
  the origin would emit real `s-maxage` headers and the TTL override above would
  stop being necessary. Tina chose the cache-rule route this session as the
  lower-risk one; the layout option stays open.
- `getProducts()` re-reads and re-parses 11.2 MB on every call with no
  memoisation. Cheap to fix (an mtime-keyed module cache) and worth doing
  regardless of caching, since it is the bulk of the 535-688 ms TTFB.
- `/directory` ships **2.56 MB of decoded HTML** (675 KB brotli) and takes 1.8 s
  just to download the document. Edge caching hides the render cost but not the
  transfer. That one needs an editorial decision about how much of a 20k-row
  catalogue a single page should carry.
