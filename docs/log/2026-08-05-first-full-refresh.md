# First full catalogue refresh (all 32 brands)
**Date:** 2026-08-05 · **Status:** done

## Goal
Run `npm run refresh` across the whole catalogue for the first time — the pipeline built in
`2026-08-05-catalogue-refresh.md` had only ever been exercised against one brand.

## What changed
No code. This is a data run: `data/raw-products.json`, `data/products.json`,
`data/decisions.json`, `data/refresh-report.json`, `data/review.json`.

## Verification

All 32 brands fetched **completely** — no partial fetches, no failures, so every brand was
eligible to delist and none was blocked:

```
{ added: 17, updated: 7798, delisted: 26, filtered: 0, returned: 0, incomplete: 0 }
Published 6409 products (mixed across 32 brands) | rejected 3018 | review 13 | delisted-by-brand 4
```

`filtered: 0` is the significant all-clear: not one product that a brand still sells was
dropped by our own filters, so re-deriving ~7.8k rows against the current `normalize`/`tag`
logic caused no classifier regression.

Site-level diff, measured against the last pre-refresh publish (`b69268b`, 6414 rows):

```
published: 6414 -> 6409
removed from site: 25 | added to site: 20
image changed: 120 | price changed: 258 | title changed: 10 | url changed: 0
```

The 25 removals, resolved against their raw rows:
- **21 sold out** at the brand
- **4 deleted by the brand** — these were live dead links until this run
  (niswa ×2, urban-modesty, mariams)

The 258 price corrections are real drift, e.g. `culture-hijab: The Culture Starter Set
52.95 -> 51.95`, `veiled: Tencel Smocked Skirt - Almond 91 -> 90`.

The 120 image changes are the `pickImage` cutout rule finally reaching existing data — every
sampled one is a `.png` flat cutout replaced by a `.jpg` photograph, e.g.
`Website_6.png -> 1_66dff6d2….jpg`. Per §10.12 this is the only mechanism by which that fix
could ever reach rows already in the file.

The per-brand collapse guard did not fire; no brand lost >30% or fell to zero.

## Notes / follow-ups
- Prediction in the previous log entry was wrong in a useful direction: I expected a large
  number of image changes and a guard challenge. Actual was 120 images and no challenge —
  because `e2e8b90` and `6c5d993` had already re-ingested the worst-affected brands by hand.
- `review.json` fell 41 -> 13.
- 17 new arrivals are live and listed in `data/refresh-report.json` (13 of the 16 from
  urban-modesty are hijabs, which stay on their own lane per §7).
- Still manual. No cadence is defined — see §12.
