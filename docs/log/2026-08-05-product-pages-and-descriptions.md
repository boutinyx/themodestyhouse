# Product pages with scraped descriptions (SEO) — built, then reverted
**Date:** 2026-08-05 · **Status:** REVERTED same day (see Reversion)

## Goal
Products had no description anywhere, and clicking one opened `QuickView`, a client-side
modal. Tina asked for descriptions scraped from the source feeds, "for the SEO a lot".

**A modal has no URL, so nothing in it can rank.** `sitemap.ts` had 7 static paths plus lanes
and not one product URL, for 7,737 products. Descriptions in the modal would have improved
the browsing experience and done approximately nothing for search. Tina chose per-product
pages once that was clear.

## Decisions
| # | Decision | Note |
|---|---|---|
| D1 | Real pages at `/product/<brand>/<handle>` | Indexable URLs are the actual SEO mechanism |
| D2 | Rendered on demand, cached (`revalidate = 86400`) | Keeps `npm run build` at 32 routes instead of 7,769; we run a long-lived Node server on Railway |
| D3 | Full brand description, verbatim | **Owner's decision against my recommendation.** See Risks |
| D4 | Descriptions in per-brand shards, never on `Product` | ~6.5 MB of HTML must not enter `products.json` or any RSC payload (§8) |
| D5 | Sanitise once at ingest via `sanitize-html` | Third-party HTML into `dangerouslySetInnerHTML` |
| D6 | `ProductCard` becomes a `<Link>`; the modal is deleted | A crawler follows an href; it does not click a div |

## What changed

**`lib/description.ts`** + 18 tests — `sanitizeDescription` (allowlisted tags, **every**
attribute stripped), `plainText` (meta descriptions), `stripDescription`, `shardByBrand`.

**`lib/normalize.ts`** — `ShopifyProduct` gains `body_html`; sanitising happens at the single
Shopify→Product boundary, so no unsanitised feed HTML is ever written to disk. `Product`
gains `handle` (required) and `description` (raw-side only).

**`lib/ingest.ts`** — `wooToShopify` now maps Woo's `description` / `short_description` into
`body_html`. Without this every WooCommerce brand would have silently published pages with no
description at all.

**`scripts/build-data.mjs`** — writes `data/descriptions/<brand>.json`, removes shards for
brands that no longer publish, and strips `description` from `products.json`.

**`app/product/[brand]/[handle]/page.tsx`** (new) — image, price, outbound affiliate link,
the description, a facts list, `generateMetadata` (title, meta description, canonical, OG)
and JSON-LD `Product` structured data.

**`app/sitemap.ts`** — every published product URL. Without this, the pages exist and nothing
points a crawler at them.

**`components/QuickView.tsx`** — the 90-line modal is gone; the provider remains because
`Header` and `/favourites` use the favourites store. **`components/ProductCard.tsx`** is now
a `<Link>`. **`app/globals.css`** — `.product-description` styles, needed because the
sanitiser strips every class the brands ship.

**`lib/payload.test.ts`** (new) — runs against the real `data/products.json`: no
descriptions, no lifecycle fields, every product has a handle, brand+handle is unique, and no
orphaned shard entries.

## Verification

```
$ npx vitest run
 Test Files  13 passed (13)
      Tests  296 passed (296)      (was 264)
$ npm run typecheck     (clean)
$ npm run lint          (clean)
$ npm run build         (succeeded; /product/[brand]/[handle] registered as ƒ Dynamic)
```

`npm run refresh` re-ingested all 41 brands — required, because raw rows are frozen at ingest
and the code change reached **zero** existing rows until then (§10.12). `lib/payload.test.ts`
caught exactly that: 7,742 products with no handle before the refresh.

```
Published 7737 products (mixed across 41 brands) | ... | descriptions 7504 (41 shards)
```

97% description coverage. Nasiba's first fetch returned `sawErrorStatus`, so it was correctly
treated as incomplete — **nothing delisted**, but its 333 rows kept old data and failed the
handle assertion. A second targeted `npm run refresh nasiba` completed and fixed it. The
guard worked as designed, and the payload test is what surfaced the gap.

Served from a real production server (`next start`), not a dev server:

```
GET /product/mariams/tonal-chain-stitch-embroidered-setms501   HTTP 200, 46,494 bytes
<title>Tonal Chain Stitch Embroidered Set(MS501) — Mariam's Collection</title>
<meta name="description" content="Embroidery that works with the fabric, not against it. …">
<link rel="canonical" href="https://themodestyhouse.com/product/mariams/tonal-…">
JSON-LD blocks: 2 · description rendered: yes · unsanitised markup: 0 matches
/product/mariams/does-not-exist-xyz -> HTTP 404
/sitemap.xml -> HTTP 200, 7,737 product URLs
/ , /favourites, /directory, /modest-dresses -> HTTP 200, 0 server errors
```

Payload boundary held. A probe phrase taken from a real description does **not** appear in
`/directory`'s HTML:

```
probe phrase: "Embroidery that works with the fabric,"
present in /directory HTML? false
products.json: 3.77 MB · handle field accounts for 0.24 MB · descriptions 6.5 MB, all in shards
```

`/directory` ships 2.67 MB, up from the ~1.4 MB §8 records — that is catalogue growth
(6,409 → 7,737 rows) plus `handle`, not descriptions. The underlying problem is the §8
landmine that server pages pass whole arrays into client components; this change did not
create it and adds 0.24 MB to it, having kept 6.5 MB out.

## Risks
- **Duplicate content (accepted by the owner).** All 7,504 descriptions are the brands' own
  copy, verbatim. Google's guidance on thin affiliate pages describes exactly this: merchant
  copy republished without added value. At 7,500-page scale it also engages the scaled-content
  policy. I recommended an excerpt plus original copy generated from our own curation data
  (garment, occasion, season, aesthetic, city); Tina chose full verbatim. Recorded here so
  that if the pages fail to rank, this is the first thing to revisit — the page template
  already renders a facts list, so adding original copy later is a small change.
- Descriptions are only as fresh as the last refresh, which is now nightly.
- `data/descriptions/` is committed (6.5 MB, ~41 files). It must be: per Invariant 11 only
  committed files reach production. Per-brand sharding means a nightly refresh only rewrites
  the brands that actually changed.

## Reversion

Reverted at Tina's request the same day, after reviewing what it would do to Google Search
Console. Her call, and a reasonable one: submitting ~7,700 URLs whose text is duplicated from
the merchants would most likely have produced thousands of "Crawled – currently not indexed"
rows, which is not a penalty but does bury real problems in noise.

**What was removed:** `app/product/[brand]/[handle]/`, `lib/description.ts`,
`lib/payload.test.ts`, `data/descriptions/`, the `sanitize-html` dependency, product URLs in
`sitemap.ts`, the `handle` and `description` fields on `Product`, and the shard-writing in
`build-data.mjs`. `ProductCard` is a click-to-modal div again and the `QuickView` modal is
restored. `description` and `handle` were stripped from `data/raw-products.json` in place
(9,765 and 10,064 rows) rather than by re-scraping, so no refresh was needed.

Verified after reverting: `products.json` has its original 14 keys and 7,737 rows, no
`description`, no `handle`; suite green; typecheck, lint and build clean.

**Deliberately kept** — these are true regardless and were measured, not assumed:
- Only ~396 of 7,737 products (~5%) are reachable by a crawler, because grids reveal items
  through client-side state. Recorded as a §8 landmine.
- Descriptions exist in every feed at ~97% coverage, averaging ~1,376 chars.
- Bulk text must never live on `Product` (Invariant 15).

**To resume:** the full code diff and new files are preserved outside the repo at
`scratchpad/product-pages-wip/` for this session only — after that, this document plus the
git history of the reverted files is the record. Descriptions regenerate from the feeds with
one `npm run refresh`; nothing about the data was lost permanently.
