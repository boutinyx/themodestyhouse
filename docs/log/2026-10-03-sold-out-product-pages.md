# Sold-out products keep their page instead of 404ing
**Date:** 2026-10-03 · **Status:** on staging, awaiting Tina's approval for main

## Goal
Tina linked `https://themodestyhouse.com/product/chic-modesty/10323092668754` (Chic & Modesty, "Jupe satiné
évasée choco") for an Instagram post and it returned 404. Find the cause, fix it so it doesn't happen again.

## Cause
Not a bug in the page: the skirt is **sold out in every size** (S/M/L unavailable, both in our raw row from the
2026-10-02 refresh and live on chicandmodesty.com). `build-data.mjs` only publishes `inStock` rows, and the
product page looks products up in `products.json` only, so any product that sells out after someone has shared
its link turns that link into a 404. The size floor already had a narrow version of this problem and fix
(`_sizeFloorAllowIds` in exclusions.json: "Tina has published a link to it").

## What changed
- `scripts/build-data.mjs`: writes `data/unavailable-products.json`, products we would publish except for stock
  (out of stock, or stopped by the size floor). Never included: editorial cuts (decisions, exclusions, brand
  blacklist, price ceiling, non-apparel, held garments), brand-delisted rows, dead links, published rows. Compact rows
  `[title, image, url, garment, price, currency]` keyed by id, one per line, sorted. 7,105 rows, 1.8 MB.
  A first sizing that kept every unpublished row (incl. delisted) came to ~25k rows / ~9 MB per nightly commit, so
  that was rejected; links to products a brand has DELETED still 404, since there is nothing to send a shopper to.
- `lib/unavailableProducts.ts`: server-only lookup; respects live /staff cuts and brands removed from BRANDS.
- `app/product/[brandSlug]/[shopifyId]/page.tsx`: when the id is not in the catalogue but is in the sidecar, it
  renders a sold-out page: photo (dimmed, "Sold out" badge), brand, title, "Sold out right now.", "Check {brand} for a
  restock" (withUtm, surface `product-page-sold-out`), and "In stock and similar" (same `relatedPicks`). Same
  bot-scoped noindex and OG card. No price, no Product JSON-LD and no `product:availability` tags, because Meta compares
  those against the catalogue feed, which this product is not in.
- `lib/outbound.ts`: two new surfaces. `.github/workflows/refresh.yml`: the nightly commit now includes the sidecar
  (otherwise it would freeze at today's list).
- `lib/unavailableProducts.test.ts`: the sidecar never holds a published id or a blacklisted brand.

## Verification
- `npm run build:data`: `products.json` byte-identical (not in `git status`); "Sold-out pages: 7105".
- The skirt is in the sidecar: `"chic-modesty:10323092668754":["Chocolate flared satin skirt", …]`.
- `npx tsc --noEmit` clean; eslint clean on the touched files; vitest 1332 passed. The 2 failures
  (`colourLeads` "every listed id…", `edits` "no hand-picked edit has lost…") fail identically on untouched
  origin/staging (checked with the change stashed). They are pre-existing data drift and not addressed here.
- Staging check: see below.
- **On staging** (`themodestyhouse-staging-production.up.railway.app`, commit a8caabc): the skirt's URL returns 200
  with h1 "Chocolate flared satin skirt", "Sold out right now.", the restock link (utm-tagged) and an "In stock and
  similar" rail. Checked in Playwright at iPhone 13, full page. Controls: `/product/veiled/7653917589609` (live) still
  200 with its normal page; `/product/chic-modesty/1` (unknown) still 404.
