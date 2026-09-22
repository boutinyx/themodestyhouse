# A Pinterest Catalogs feed, reusing the Meta catalogue's data
**Date:** 2026-09-22 · **Status:** done — code shipped; connecting it in Pinterest is Tina's next step

## Goal
Tina wants to start on Pinterest without waiting on the Pinterest developer API's approval
queue. Connected Instagram auto-publish (native Pinterest feature, no API) while looking at
this; that's live already, posting to a new "Sociaal" board.

The bigger opportunity for a fashion directory isn't auto-pinning ~6 blog posts, it's turning
the actual 19k-product catalogue into shoppable Pins — which Pinterest also supports without
the API, via **Catalogs**: point it at a Google Shopping-format XML feed.

## What was checked before writing anything
- Ghost's own `/rss/` is walled behind Ghost's "private site" setting (redirects to `/private/`,
  serves a login page, not XML) — not usable as-is, and not the right thing anyway.
- `app/meta-catalogue.xml` already exists for Meta Commerce Manager: same RSS 2.0 + Google
  Merchant namespace format Pinterest Catalogs accepts, 19,161 in-stock items, refreshed
  hourly from the nightly-updated catalogue. Verified compatible by inspecting the live feed.
- **Could not just point Pinterest at the same URL.** Every link in it carries
  `utm_source=instagram&utm_medium=product_tag&utm_campaign=meta_shop` (`lib/metaFeed.ts`).
  Reusing it verbatim would count every Pinterest-driven click as Instagram in Pulse.

## What changed
- `lib/metaFeed.ts`: added `PINTEREST_FEED_UTM` (`pinterest` / `product_pin` /
  `pinterest_shop`), and threaded an optional `utm` parameter through `feedItem()` and
  `metaFeedXml()` down to the `feedLink()` call — which already supported a `utm` override
  (its own test literally says "so a future Google/Pinterest feed is not forced to say
  instagram"). Both default to the existing `FEED_UTM`, so `app/meta-catalogue.xml` is
  unchanged.
  - Caught in passing: `products.map(feedItem)` would have silently passed the array INDEX
    as the new `utm` argument once `feedItem` gained a second parameter. Changed to
    `products.map((p) => feedItem(p, utm))`.
- `app/pinterest-catalogue.xml/route.ts` (new): same shape as the Meta route, calls
  `metaFeedXml(products, PINTEREST_FEED_UTM)`. `noindex`, hourly revalidate, same reasoning
  as the Meta route (see its own comments).

## Verification
```
npx tsc --noEmit                     exit 0
eslint (3 changed/new files)         exit 0
vitest                               1326 passed, 1 failed (colourLeads.test.ts, pre-existing)
lib/metaFeed.test.ts                 23/23 — new tests confirm Pinterest tag is distinct from
                                      Meta's, and feedItem/metaFeedXml thread the override
                                      through without changing the untagged default
npm run build                        /pinterest-catalogue.xml built as a real static route,
                                      alongside /meta-catalogue.xml
local next start, curl               19,161 <item> elements, links carry
                                      utm_source=pinterest&utm_medium=product_pin&
                                      utm_campaign=pinterest_shop
```

## Notes / follow-ups
- Not yet connected in Pinterest itself — that's Tina's Business Hub → Catalogs step, feed
  URL `https://themodestyhouse.com/pinterest-catalogue.xml`.
- Not in `app/sitemap.ts`, linked from nowhere — same as the Meta feed, a machine endpoint.
