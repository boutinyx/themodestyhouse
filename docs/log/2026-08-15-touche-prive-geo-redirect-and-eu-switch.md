# Touché Privé: geo-redirect discovery and switch to eu.toucheprive.com

**Date:** 2026-08-15 · **Status:** done

## Goal

After two rounds of dead-link cleanup on `int.toucheprive.com`, Tina reported
a specific link (`.../products/kemerli̇-vi̇skon-elbi̇se-2`) still broken and
sent a screenshot. Investigated further rather than treating it as one more
individually-dead product.

## What was found

Touché Privé runs Shopify's "Geolizr" market/geo-redirect app on `int.
toucheprive.com`. It sets a sticky `localization` cookie (1-year expiry) and
silently redirects real browser visitors to a regional storefront based on
IP geolocation — Tina (Netherlands) landed on `eu.toucheprive.com`.
**`eu.toucheprive.com` is a materially different, largely non-overlapping
catalog**: different Shopify product ids, ~1865 products vs int's ~1073,
priced in **EUR** (int is USD — confirmed via each domain's
`Shopify.currency` global and `/cart.json`).

The specific product from the screenshot was live (200) on `int` but simply
didn't exist under that handle on `eu` — a genuine 404, not staleness. A
follow-up sample of 5 more random published products found 3 more with the
same `int=200, eu=404` split. This is invisible to our pipeline: `fetchBrand`
does a plain HTTP fetch of `int`'s feed with no JS execution, so it never
sees the client-side redirect a real geolocated visitor triggers.

Given Tina is in the EU and this looked likely to affect a large fraction of
her real traffic, presented the finding and options; she chose to switch the
brand's scrape source to `eu.toucheprive.com` outright.

## What changed

- **`data/brands.ts`**: touche-prive's `homepage` and `feedUrl` changed from
  `int.toucheprive.com` to `eu.toucheprive.com`; `currency` changed from
  `USD` to `EUR` (verified, not assumed — the wrong currency would have
  mislabeled every price on the site).
- **`ALLOW_LARGE_DIFF=1 npm run refresh -- touche-prive`**: a full catalog
  swap, not an incremental refresh — `eu`'s product ids don't intersect
  `int`'s at all (id is `touche-prive:${shopifyId}`, and Shopify assigns ids
  per store). Report: `complete: true, fetched: 1865, added: 1865, updated:
  0, delisted: 1073, returned: 0`. The 1073 delisted are every previously-
  published int-sourced row (correctly hidden via `delistedAt`, never
  deleted from raw — Invariant 12). The `ALLOW_LARGE_DIFF` escape was
  needed because `brandDropViolations` correctly flags a brand's published
  count going to zero — this one is deliberate, not an accidental collapse.
  Republished via the refresh's own `build:data` step.

## Verification

- Published touche-prive count: 947 (int) → **1769** (eu, after non-apparel/
  price-ceiling/etc. filtering of the 1865 fetched).
- `currencies` across all published touche-prive rows: `['EUR']` only.
- 0 published rows still reference `int.toucheprive.com`.
- Directly fetched (not just fed-checked) a random sample of 10 newly-
  published eu URLs with `redirect: 'manual'`: **10/10 returned 200**.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx vitest run --exclude '.claude/**'` — 40 files, 653 passed.

## Notes / follow-ups

- The 11 ids Tina originally cut via `/staff/curate` (all int-sourced) are
  now moot — delisted along with the rest of the int catalog, so their
  `decisions.json` entries are orphaned but harmless (CLAUDE.md §8 already
  documents `decisions.json` has no pruning step; not new debt from this).
- **Worth checking on other brands**: any brand using a Shopify-Markets-style
  geo-redirect app (Geolizr or similar) could have the same class of bug —
  our scraper only ever sees the literal feed URL configured in
  `data/brands.ts`, never what a geolocated real visitor's browser does
  client-side after landing. No other brand was audited for this in this
  session; flagging as a pattern to watch for, not a confirmed second case.
- Not pushed yet — same as the two earlier commits this session, pushing is
  Tina's call.
