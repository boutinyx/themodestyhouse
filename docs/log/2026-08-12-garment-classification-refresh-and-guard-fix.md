# Cleanup pass: npm run refresh, and three rounds of fixing resolveGarment on real data
**Date:** 2026-08-12 · **Status:** done

## Goal
Task 10 of `docs/superpowers/plans/2026-08-12-garment-classification.md`: the "clean up
now" half of the garment-classification design — run `npm run refresh` once to backfill
raw classification signals onto every existing row and apply the hardened tagger
catalogue-wide.

## What happened
The first `npm run refresh` run completed the scrape (all 108 brands) but its publish step
hit `brandDropViolations` hard: **39 brands collapsed, several by 90–100%**. Rather than
force it through with `ALLOW_LARGE_DIFF=1`, stopped and root-caused it against the real
output — this is exactly what that guard exists to catch, and it caught a real design flaw
in `lib/garmentReview.ts::resolveGarment`, not a dead feed. Three rounds of measured fixes
(each verified by re-running `build:data` — fast, no network — against the already-scraped
`raw-products.json`, not another full refresh):

1. **Held back everything not sourced from the title.** Real cost: 6,358 of 8,749 held
   rows were meta/foreign/description-sourced; only 139 (2%) had an actual product_type
   disagreement. These passes were trusted with zero review before this system existed —
   gating on source alone was strictly more cautious for no measured benefit.
2. **Trusting every source unconditionally went too far.** It would have auto-published an
   iLoveModesty "Neck Cover" accessory as a `dress` — a description-pass false positive
   from unrelated cross-sell prose. Root cause: `resolveGarment` never has `body_html`
   (deliberately not persisted, per the spec's non-goals), so it can never re-verify a
   description-sourced classification either way. Fixed by trusting the FROZEN value for
   `classifiedFrom: 'description'` rows specifically — identical to pre-existing behavior,
   not a regression. The Neck Cover gap is real and stays open, tracked below.
3. **The conflict check itself was inverting `tagDiscovery`'s own "trust the title first"
   priority.** 1,224 of 1,363 conflicts were title-confident matches (e.g. "Abaya" in the
   title) flagged against a merchant's storefront-wide `product_type: "Dresses"`. Now only
   applied to meta-sourced matches, and the abaya-vs-generic-"Dresses" pair specifically
   exempted even there (a `kaftan` tag is as specific as an abaya word — same precedent
   `FOREIGN_RULES` already established for French "Robe").

Held-for-review count across the three fixes, same real data each time: **8,749 → 2,530 →
1,540 → 248**. `data/rejected.json`/`refresh-report.json` confirmed at each step that the
drops were real classification holds, not fetch failures (only 2 of 108 brands logged an
incomplete fetch, both already handled by the existing partial-fetch safeguard).

## What changed
- `lib/garmentReview.ts` / `lib/garmentReview.test.ts` — see commit `4556911` for the full
  reasoning, kept in the file's own doc comment for future readers.
- `app/api/admin/garment-review/list/route.dev.ts` — filter list updated (`weak-signal` no
  longer exists as a `why` value).
- `data/*.json` — the actual refresh (commit `533ed22`): 22,943 products across 107 brands
  (was 23,088), review queue 248, rejected 3,425, 259 delisted by their own brands (normal
  churn).

## Verification
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean)
$ npx vitest run                                  Test Files 29 passed | Tests 523 passed
$ npm run build:data                              published 22943, review 248 — no guard trip
$ npm run build                                    site builds clean against the new catalogue
```

## Notes / follow-ups
- **Known, accepted gap:** the iLoveModesty "Neck Cover" case (and any similar accessory
  whose only classification signal is unreliable description text) is not caught by this
  system by design — it's an editorial/vocabulary question, not a confidence-scoring one.
  Follow-up: add "neck cover" (and similar accessory terms) to `lib/tag.ts`'s hijab word
  list so it classifies from title/tags directly and never reaches the description pass at
  all. Left as a separate, targeted task rather than folded in here.
- **248 items now sit in the review queue** (`/admin/review`, dev-only) — 71 signal-conflict,
  177 pre-existing reasons (no-price, contaminated-sku-family, filtered:unclassified) unrelated
  to this feature. Tina reviews at her own pace, no cadence imposed.
- Confirmed `npm run refresh` does not auto-commit on this machine — committed the data
  changes explicitly in two commits (code fix, then data), rather than assuming.
