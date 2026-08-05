# Data pipeline

How a product gets from a brand's storefront onto the site — and the runbooks for changing
the catalogue safely. Verified **2026-08-05**.

## Overview

```
Shopify /products.json  ──┐
  (34 feeds, brands.ts)   │  scrape.mjs      FULL REPLACE  ⚠ destructive
                          │  add-brands.mjs  UPSERT by id  ✅ safe
                          ▼
                  lib/normalize.ts :: normalizeProduct()
                          ▼
              data/raw-products.json     (gitignored, single copy)
                          ▼
        decisions.json  +  exclusions.json      ← the editorial gate
                          ▼
                 scripts/build-data.mjs
                          ▼
              data/products.json  (tracked — this is what ships)
```

## Stage 1 — Fetch

Feeds are Shopify's public `/products.json`, paginated `?limit=250&page=N`, with a spoofed
Chrome user-agent.

**These stores rate-limit aggressively.** A burst of requests returns HTTP 429 with the body
`local_rate_limited` (not JSON). This is the single most common source of trouble in the
pipeline.

| Script | Merge semantics | Retry | Checkpointing | Use when |
|---|---|---|---|---|
| `scripts/scrape.mjs` | **Replaces** all rows for every brand | None — `break` on failure | None — one write at the end | Almost never. See warning. |
| `scripts/add-brands.mjs` | **Upsert by product id** — updates + adds, never deletes | 14 attempts, backoff `min(8000 + n*4000, 45000)` | Writes after each brand | Always |

> ⚠️ **`npm run scrape` is dangerous.** It buffers all 34 brands in memory and writes once.
> A crash late in the run loses everything; a brand truncated by a 429 *still replaces* its
> previously complete data. Prefer `add-brands.mjs` with explicit slugs.

`add-brands.mjs` **defaults to a hardcoded slug list if given no arguments** — never run it
bare. Always pass slugs.

## Stage 2 — Normalize

`normalizeProduct(shopifyProduct, brand)` is the only translation boundary. Every step can
silently drop a product:

1. **`pickImage(images)`** — prefers a **portrait** image (`height / width >= 1.2`, which
   indicates a model shot rather than a flat-lay); falls back to `images[0]`. Requires
   numeric `width` *and* `height` in the feed. No image at all ⇒ dropped.
2. **`EXCLUDE` regex** over `title + product_type + all tags` — drops men's, thobe, kurta,
   kids/children/boys/girls/baby/toddler/junior/infant/newborn ⇒ dropped.
   *Note:* this tests the joined tag list, so a brand that tags womenswear with a "kids"
   collection tag loses those products with no record anywhere. `\bkurta\b` is also a
   legitimate women's garment for South-Asian modest brands.
3. **`tagDiscovery()`** (`lib/tag.ts`) — if `garment === 'other'` ⇒ dropped.
4. **Price** = `variants[0].price` — first variant only. **Currency** comes from the brand
   record, never the feed.
5. **Emit** — `id = ${brandSlug}:${shopifyId}`, `url = ${brand.homepage}/products/${handle}`,
   `inStock = variants.some(v => v.available)`.

### Garment classification

`GARMENT_RULES` in `lib/tag.ts` is **ordered, first match wins**:

```
swim → abaya → hijab → dress → skirt → trousers → set → top → (maxi|midi) → dress
```

Pass 1 tests the **title only**. Pass 2 (only if still `'other'`) tests
`title + productType + tags`.

**The `(maxi|midi) → dress` rule must stay LAST.** `lib/tag.test.ts` guards this with
regression tests ("Maxi Skirt" → skirt, "Maxi Dress" → dress). Reordering silently
reclassifies hundreds of items.

## Stage 3 — Curate

Two independent gates, with different lifetimes:

**`data/decisions.json`** — `{productId: 'keep' | 'cut'}`, **default-deny**: a product
publishes only if its id maps to `'keep'`. In practice `add-brands.mjs` auto-keeps
everything it ingests, so this gate is currently a formality.

**`data/exclusions.json`** — the real editorial filter, applied on **every** rebuild:

```jsonc
{
  "patterns":    [ /* title regexes: men's terms, non-apparel */ ],
  "urlPatterns": [ /* product-URL regexes */ ],
  "brands":      [ /* permanently blocklisted brand slugs */ ],
  "ids":         [ /* individually banned product ids */ ]
}
```

**Use exclusions, not decisions, for permanent removals.** A `cut` decision is overwritten
back to `keep` the next time `add-brands.mjs` touches that product; an exclusion is
re-applied forever and cannot be reintroduced by a rescrape.

`lib/exclude.test.ts` asserts the published catalogue contains nothing matching the
exclusion list. ⚠️ The exclusion logic is **duplicated verbatim** in `build-data.mjs` and
the test — change one and the test silently stops testing the real filter.

### Known false positives

Exclusion patterns are unbounded substring regexes:
- `incense` kills two Zahraa hijabs in an "Incense" **colourway**
- `gift set` kills ~15 legitimate multi-hijab bundles

Prefer word boundaries. **Always check what a new pattern removes before committing it.**

### Permanently cut brands

`eastessence`, `kabayare`, `bazar-al-haya`, `shukr`, `abayatopia`, `mayovera`.

Re-adding one to `brands.ts` is a **silent no-op** — the scraper will happily fetch it and
`build-data.mjs` will drop 100% of its rows. Nothing warns you. Remove it from
`exclusions.brands` first.

## Stage 4 — Publish

```js
raw.filter(p => decisions[p.id] === 'keep' && p.inStock && !isExcluded(p))
   |> interleaveByBrand()   // round-robin so grids mix brands
```

`build-data.mjs` **never re-runs** `normalizeProduct` or `tagDiscovery`. Raw rows are frozen
at the tag logic that existed when they were scraped — so **fixing `lib/tag.ts` changes
nothing** until those brands are re-scraped. (~157 raw rows still carry `garment: 'other'`,
a value current code would drop; ~29 of them are published and match no lane or filter.)

## Runbooks

### Add a brand

```bash
# 1. verify the feed is real (200 is NOT enough — check the payload)
curl -s --compressed -L -m 20 -A "Mozilla/5.0 (Macintosh)" \
  "https://BRAND.com/products.json?limit=5" -o /tmp/f.json -w "%{http_code}\n"
node -e "const d=JSON.parse(require('fs').readFileSync('/tmp/f.json','utf8'));
         console.log(d.products.length, d.products.slice(0,3).map(p=>p.title))"

# 2. append to data/brands.ts (all fields required except `badge`)
# 3. ingest, then publish
npx tsx scripts/add-brands.mjs <slug>
npm run build:data
npm test
```

If the feed 429s, wait a minute and re-run the same command — it's idempotent (upsert).

### Remove products permanently

Add a pattern or id to `data/exclusions.json`, then:

```bash
npm run build:data && npm test
```

### Refresh images / re-apply tagging

Re-scrape the affected brands (raw rows are frozen — see Stage 4):

```bash
npx tsx scripts/add-brands.mjs <slug> [<slug>…]
npm run build:data
```

Run **one scrape at a time** — concurrent runs clash on `raw-products.json`.

### Verify catalogue state

```bash
node -e "const p=require('./data/products.json');
  console.log('products', p.length, 'brands', new Set(p.map(x=>x.brandName)).size)"
```

## Operational hazards

- **`raw-products.json` is gitignored and is the only copy.** It cannot be fully
  regenerated — rows for the six cut brands are gone for good, since their slugs no longer
  exist in `BRANDS`. Back it up.
- **`add-brands.mjs` never deletes**, so raw accumulates delisted products forever. Only
  the `inStock` filter keeps them out of the published set — and a brand that removes a
  product without setting `available: false` keeps it published indefinitely.
- **`decisions.json` has drifted** — thousands of keys reference products that no longer
  exist or belong to blocked brands. There's no pruning step.
- **Formatting war**: `add-brands.mjs` writes `decisions.json` minified,
  `app/api/curate` writes it pretty-printed. Whichever ran last reflows the whole tracked
  427 KB file.
- **Ingest and publish are one operation.** Always finish with `npm run build:data` — the
  site has already served a stale catalogue once because this was skipped.
