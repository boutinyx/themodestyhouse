# Touché Privé: dual-store-only policy (drop single-store items)

**Date:** 2026-08-15 · **Status:** done

## Goal

The timezone-routing feature (`docs/log/2026-08-15-touche-prive-dual-region-links.md`,
same day) kept all three tiers: 946 int-only (USD), 1250 eu-only (EUR), 241
dual-linked. Tina's read after seeing the real numbers: three tiers is a
mess, and a future refresh needs to keep enforcing "only publish what exists
on both stores" — not just be cut once by hand.

## What changed

- **`scripts/touche-prive-dual-region.mjs`** rewritten. Previously: publish
  all int items, attach `altUrl` where a match exists, separately upsert
  eu-exclusives as `touche-prive-eu`. Now: touche-prive publishes **only**
  the matched subset (every published row carries `altUrl`); every unmatched
  int item is marked **filtered** (`reason: 'no-eu-match'`) via the ordinary
  `applyBrandRefresh` "our own filters reject it" path — not delisted, since
  the item is still genuinely live on int, we're just choosing not to carry
  it. `touche-prive-eu` now filters (`reason: 'dual-only-policy'`) every
  single item on every run and publishes nothing; the brand stays in
  `data/brands.ts` only so historical `touche-prive-eu:*` ids still resolve.
- **`scripts/refresh.mjs`**: `CUSTOM_MANAGED` now excludes `touche-prive`
  too (was only `touche-prive-eu`). Neither brand is ever touched by the
  nightly bare refresh again — both are owned exclusively by the dual-region
  script, which re-verifies dual-store presence from scratch every run. This
  is the actual answer to "next time we're looking for products we need to
  make sure they're on both": it's not a one-time cut, it's now how this
  brand's ingestion works, permanently.
- `data/brands.ts` comments rewritten to state the policy plainly on both
  entries.

## Verification

- Script output: `260 style codes present on both stores` (natural drift
  from 261 a few hours earlier — this store's catalogue churns fast, see
  the two earlier log entries the same day). `touche-prive: 260
  matched+normalized, 823 filtered`. `touche-prive-eu: 0 published, 1320
  filtered`.
- `ALLOW_LARGE_DIFF=1 npm run build:data` — the brand-collapse guard fired
  as expected (`touche-prive: 946 -> 240 (-75%)`, `touche-prive-eu: 1250 ->
  0 (-100%)`) and was overridden deliberately; this collapse **is** the
  intended policy, not a broken feed.
- Published: `touche-prive` 240 (all USD, all carrying `altUrl`),
  `touche-prive-eu` 0.
- `data/review.json` jumped 181 → 2122 — investigated before trusting it:
  entirely explained by the two new filter reasons (`filtered:no-eu-match`
  700, `filtered:dual-only-policy` 1241) flowing into the existing generic
  "any filtered row shows up in review.json" mechanism
  (`scripts/build-data.mjs:167`) — not a bug, working as designed.
- Directly fetched (not just fed-checked) 6 random published products' BOTH
  urls (`url` + `altUrl`, 12 requests): **12/12 real 200s**.
- `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit` — clean.
- `npx eslint --max-warnings 0 lib components app scripts` — clean (removed
  an unused `classifyFeed` import left over from the rewrite).
- `npx vitest run --exclude '.claude/**'` — 41 files, 664 passed (unchanged
  — this policy change is pure ingestion logic, no new pure functions to
  test beyond what `lib/regionalLink.test.ts` already covers).

## Notes / follow-ups

- Touché Privé's published count went from 946 (original int-only) up to
  2196 (both tiers + dual) and now down to 240 (dual-only). 240 is a real
  number, not a bug — this brand's catalogue only has ~260 designs that are
  genuinely stocked on both regional stores at any given moment; the rest
  is inherently single-market inventory.
- The 823 + 1320 filtered rows are NOT lost — they stay in
  `data/raw-products.json` with `filteredAt`/`filterReason` set, reversible,
  same as any other filtered row, and every one of them shows up in
  `data/review.json` for anyone who wants to look.
