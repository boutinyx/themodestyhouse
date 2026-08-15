# Touché Privé dual-region links — cookie-free, timezone-based routing

**Date:** 2026-08-15 · **Status:** done

## Goal

Neither `int.toucheprive.com` (USD, "International", no EU restriction found)
nor `eu.toucheprive.com` (EUR, "Touché Europe", checkout locked to 25 EU
member states — no United States option at all) serves the whole audience:
each carries a materially different catalog (~75% non-overlapping by SKU
style code). Tina asked for a genuinely different fix rather than picking one
broken option: show US visitors the int link, EU visitors the eu link,
**without cookies**.

## Design

- **No IP lookup, no cookie.** `lib/regionalLink.ts::readTimeZone()` reads
  `Intl.DateTimeFormat().resolvedOptions().timeZone` client-side; any
  `Europe/*` zone routes to the alternate URL, everything else keeps the
  default. Pure, unit-tested (`lib/regionalLink.test.ts`).
- **Product.altUrl** (`lib/types.ts`) — a second, optional URL. `url` is the
  SSR/crawler default; `altUrl`, when present, is what a European-timezone
  visitor gets routed to post-mount. Threaded through the columnar catalogue
  (`lib/compactCatalogue.ts`: `CardProduct.altUrl`, `rows.altUrl: string[]`,
  `''` sentinel for absent — a plain array, not the handle-compaction trick
  `urlTail` uses, since `altUrl` points at a different domain than the row's
  own `brand.homepage` and only a few hundred rows ever carry one).
- **`components/ProductCard.tsx` / `components/QuickView.tsx`** — both
  already `'use client'`. SSR renders `p.url`; a `useEffect` (same
  post-mount-external-read pattern `QuickViewProvider` already uses for
  localStorage favourites, right down to the `eslint-disable
  react-hooks/set-state-in-effect` comment) swaps to `p.altUrl` if present
  and the visitor's timezone is European.
- **Two brand slugs, not one.** `data/brands.ts`: `touche-prive` (int, USD,
  the ordinary generically-refreshed brand) and `touche-prive-eu` (eu, EUR).
  Not a hack — `compactCatalogue.ts` already enforces one currency per brand
  record (`if (p.currency !== brand.currency) throw`), and these genuinely
  are two different storefronts with different checkout/currency/shipping.
  Both display as "Touché Privé" (same `name`) — the slug split is invisible
  to visitors.
- **`scripts/touche-prive-dual-region.mjs`** (new) — the only thing that
  touches `touche-prive-eu`. Fetches both RAW feeds directly (bypassing
  `data/brands.ts`'s single-feed assumption, since `normalizeProduct`'s
  output has no `sku` field to match on), matches by SKU style-code prefix,
  patches `altUrl` onto matching `touche-prive` (int) raw rows, and upserts
  only the **unmatched** eu items as `touche-prive-eu:*` rows via the same
  `applyBrandRefresh`/`nextDecisions` machinery every other brand uses —
  never duplicating an item that already has an int card.
- **`scripts/refresh.mjs`**: `CUSTOM_MANAGED = new Set(['touche-prive-eu'])`,
  excluded from the bare/all-brands loop (so the nightly `refresh.yml` run
  never re-adds the matched items as duplicates). Naming it explicitly still
  works but does a plain full-catalog refresh — reintroduces the duplicates,
  documented as "use the dedicated script instead."

## What changed (this run)

1. `data/brands.ts`: touche-prive reverted to int/USD (primary);
   touche-prive-eu added (eu/EUR, custom-managed).
2. `ALLOW_LARGE_DIFF=1 npm run refresh -- touche-prive` — restored the
   int-sourced catalog (delisted since the earlier eu-switch commit
   `85ba6ca`; `applyBrandRefresh`'s `returned` path un-delisted 1067 of them
   cleanly). `complete: true, fetched: 1069, delisted: 1865` (the eu-sourced
   rows from `85ba6ca`, now genuinely gone from int's feed under those ids).
3. `npx tsx scripts/touche-prive-dual-region.mjs`: int 1083 products, eu 1876
   products, both `complete: true`. **533 EU items matched an int style code
   → 261 int rows got `altUrl`.** 1343 eu-exclusive items (1332 after our own
   filters) upserted as `touche-prive-eu:*`.
4. `npm run build:data` — no `ALLOW_LARGE_DIFF` needed (a brand appearing
   from zero isn't a collapse).

## Verification

- Published: `touche-prive` 946 (USD only), `touche-prive-eu` 1250 (EUR
  only), 241 of the 946 carry `altUrl`. Total Touché Privé coverage 2196,
  up from 946 before this feature and up from the single-domain-only 947/1769
  of the two earlier (reverted) approaches.
- Directly fetched (not just fed-checked) a mixed sample of 12 URLs — 4
  primary (int) dual-url, 4 alt (eu) dual-url, 4 eu-exclusive: **12/12
  returned real 200s**, `redirect: 'manual'`.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx eslint --max-warnings 0 lib components app scripts` — clean (after
  adding the same `set-state-in-effect` disable comment `QuickViewProvider`
  already uses, for the same reason).
- `npx vitest run --exclude '.claude/**'` — 41 files, **664 passed** (was
  653; +11 from `lib/regionalLink.test.ts`, +4 net elsewhere).
- `rm -rf .next && npm run build` — clean.
- **Live browser verification, added after this entry was first written.**
  The Claude Chrome extension wasn't connected in this session, so a
  standalone Playwright script did the check instead: `chromium.launch()`,
  two contexts (`timezoneId: 'Europe/Amsterdam'` and `'America/New_York'`),
  loaded `/modest-dresses` in production (`next start`, the real build),
  clicked "Load more" until the dual-url "Floral Patterned Chiffon Dress"
  card appeared, and read its live `href`. **Europe/Amsterdam → routed to
  `eu.toucheprive.com`. America/New_York → stayed on `int.toucheprive.com`.
  Both PASS, zero console/page errors in either context.** This confirms the
  actual React wiring (SSR default → post-mount `useEffect` → DOM `href`
  update), not just the extracted pure function.

## Notes / follow-ups

- `components/ProductCard.tsx` had unrelated, pre-existing uncommitted work
  from another concurrent session (an outbound-link visual cue, tap-target
  sizing — referencing a "2026-08-13 marketing audit") already sitting in
  the shared working tree before this feature touched the file. Committed
  only this feature's 3 hunks via a hand-crafted blob (`git hash-object` +
  `git update-index --cacheinfo`) rather than the whole file, so the other
  session's pending work stays exactly as uncommitted as it was — see
  CLAUDE.md §10.30 for why `git add <path>` is not safe to trust blindly in
  this repo.
- The ~800 int-only products (no eu counterpart) keep the original, smaller
  Geolizr-redirect risk for EU visitors — bounded to those specific items,
  not the whole catalog. The ~1250 eu-exclusive products always link to eu;
  a non-EU visitor clicking one of those specific items still can't check
  out, which is inherent to a genuinely region-exclusive listing, not
  something a link-routing fix can solve.
- Two "Touché Privé" entries will appear if anything ever lists brands by
  slug rather than by name (nothing found that does, but not exhaustively
  audited).
