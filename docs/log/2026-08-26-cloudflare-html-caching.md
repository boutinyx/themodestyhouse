# Cloudflare caches every image and zero pages — and why
**Date:** 2026-08-26 · **Status:** done — rules applied and verified on production

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


---

# APPLIED — 2026-08-26

Tina supplied a working token. Two notes on the token itself, both worth
keeping:

- **`/user/tokens/verify` reported `Invalid API Token` for a token that works
  fine.** That endpoint does not support the newer `cfat_`-prefixed token
  format. The earlier `.env` token was declared dead on that basis and that
  claim was probably wrong. **Never conclude a credential is bad from
  `/user/tokens/verify` alone — call a real endpoint** (`/zones?name=…`).
  Same shape as §10.26: the harness lied, not the thing being measured.
- A permission failure and an empty-resource failure look different and the
  difference is diagnostic: `request is not authorized` = missing permission,
  `could not find entrypoint ruleset` = authorized, nothing there yet.

Zone `480bf96b3a960f3933b8e69d13417b3d`. No cache rules existed beforehand, so
nothing was overwritten.

## The trap: cache-phase rules do NOT stop at the first match

The first version applied was the one drafted above — a bypass rule followed by
a "cache all GETs" rule. It **failed**, and failed silently in the dangerous
direction:

```
POST /                        -> DYNAMIC   (bypass rule works)
GET /faq?_rsc=probeX (RSC: 1) -> MISS then HIT
$ curl -H 'RSC: 1' '…/faq?_rsc=probeX' | head -c 60
1:"$Sreact.fragment"                      <- a React flight payload, CACHED
GET / (Cookie: staff_session=…) -> HIT    <- staff request served from cache
```

Unlike firewall rules, **every matching rule in the
`http_request_cache_settings` phase executes in order, and a later rule
overrides an earlier one.** The "cache all GETs" rule matched the RSC request
and the staff request too, and flipped `cache` back to `true` after the bypass
had set it to `false`.

The staff case is the one that mattered: `app/layout.tsx` bakes
`isStaff={true}` into the HTML, so a page rendered while Tina was logged in
could be stored and served to the public with the staff editing UI in it.

**Fix:** rule 2 re-states every bypass condition as a negation rather than
relying on rule 1 having run. Then `purge_everything` to clear whatever was
stored during the broken window.

## A second flaw caught before it shipped

The drafted rule 2 matched `http.request.method eq "GET"` — i.e. **everything**,
including `/_next/static/*` and every image. With `browser_ttl: 0` that would
have destroyed browser caching of static assets and made the site
*substantially slower*, while every cache-status check still read green.

Rule 2 is scoped to `not http.request.uri.path contains "."` instead. Verified
first that this is a real separator here: no lane, brand, edit or editorial slug
contains a dot, and no `<loc>` path in `sitemap.xml` does either. Pages are
extensionless; assets all carry an extension.

## Rules as applied

**Rule 1 — bypass**
```
(http.request.method ne "GET")
or (starts_with(http.request.uri.path, "/api/"))
or (starts_with(http.request.uri.path, "/staff"))
or (starts_with(http.request.uri.path, "/admin"))
or (any(http.request.headers["rsc"][*] eq "1"))
or (http.cookie contains "staff_session=")
```
-> `set_cache_settings { cache: false }`

**Rule 2 — cache pages**
```
(http.request.method eq "GET")
and (not http.request.uri.path contains ".")
and (not starts_with(http.request.uri.path, "/api/"))
and (not starts_with(http.request.uri.path, "/staff"))
and (not starts_with(http.request.uri.path, "/admin"))
and (not any(http.request.headers["rsc"][*] eq "1"))
and (not http.cookie contains "staff_session=")
```
-> `set_cache_settings { cache: true, edge_ttl: override_origin 3600,
   browser_ttl: override_origin 0 }`

## Verification (production, after the fix)

```
1. pages cache            /  MISS -> HIT     /modest-abayas  MISS -> HIT
                          /directory MISS -> HIT   /faq  MISS -> HIT
2. RSC never cached       DYNAMIC, DYNAMIC
3. staff cookie never     DYNAMIC, DYNAMIC
4. document is HTML       <!DOCTYPE html><html lang="en-GB" …
5. assets untouched       cache-control: public, max-age=14400
6. page from the edge     cf-cache-status: HIT, age: 5
```

TTFB, measured on production:

| route | edge HIT | origin render (cache bypassed) |
|---|---|---|
| `/` | **0.074 s** | 0.760 s |
| `/directory` | **0.065 s** | 0.738 s |
| `/modest-abayas` | **0.066 s** | 0.491 s |
| `/modest-dresses` | 0.078 s | — |
| `/editorial` | 0.064 s | — |
| `/faq` | 0.063 s | — |

Roughly **10x**, ~600 ms saved on every page load and every navigation.

Note `cache-control` sent to the BROWSER is still `no-store` — the
`browser_ttl` override did not rewrite it. That is the wanted outcome, not a
miss: the edge holds the page and can be purged, the browser holds nothing and
cannot go stale (CLAUDE.md §10.21).

## NEW OPERATIONAL RULE — a deploy is no longer visible for up to an hour

Pages are held at the edge for 3600 s. **A Railway deploy will not be visible on
production until the cache is purged or the hour elapses.** This is now the
single most likely way for someone to spend an afternoon debugging a change that
already shipped — precisely §10.21 and §10.23, one layer out.

Purge after any merge to `main`:

```bash
set -a && . ./.env && set +a
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/480bf96b3a960f3933b8e69d13417b3d/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

**Follow-up worth doing:** automate this in the deploy path so it is not a step
anyone has to remember. Until then, treat it as part of "merged to main", the
same way `npm run build:data` is part of "ingested".
