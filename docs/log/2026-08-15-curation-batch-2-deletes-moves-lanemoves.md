# Curation batch 2: 497 deletes, 7 garment moves, 97 lane moves

**Date:** 2026-08-15 · **Status:** done

## Goal

Second `/staff/curate` live-edit export from Tina (same shape as
docs/log/2026-08-14-curation-batch-deletes-moves-lanemoves.md): 497 products to
cut, 7 garment reclassifications (mostly no-op top→top confirmations plus one
top→hijab), and 97 lane/subtype moves (mostly Layering Basics base-layer-tops
and shirt-extenders, plus a run of Outerwear coats/blazers/cardigans).

## What changed

- Ran `scripts/merge-live-edits.mjs` against the pasted export.
  `data/decisions.json`: 497 ids → `cut` (0 already matched).
  `data/garment-overrides.json`: 7 ids (0 already matched).
  `data/lane-overrides.json`: 97 ids (0 already matched).
- `ALLOW_LARGE_DIFF=1 npm run build:data` — republished: 20,947 products
  across 109 brands (down from 110).
- **The brand-count drop is not from this batch.** While republishing,
  Ipekstil (343 raw rows, 272 marked `keep`) collapsed to 0 published
  products. Investigated before proceeding: `data/exclusions.json` and
  `data/brands.ts` both had uncommitted edits doing a full, correctly-executed
  two-edit brand cut (per Invariant/§7), with its own log entry already
  written — `docs/log/2026-08-15-cut-ipekstil-turkey-only-shipping.md` (Tina's
  editorial call, Ipekstil ships Turkey-only). Not something introduced by
  this batch; bundled into the same commit since `build:data` already wove it
  into this `products.json` and splitting it out would leave the tracked
  catalogue inconsistent with its own source files (same reasoning as the
  Parladusa/7-product bundling in the prior curation commit).

## Verification

```
$ node scripts/merge-live-edits.mjs <payload>
Deletes: 497 written to data/decisions.json, 0 already matched
Garment moves: 7 written to data/garment-overrides.json, 0 already matched
Lane moves: 97 written to data/lane-overrides.json, 0 already matched

$ ALLOW_LARGE_DIFF=1 npm run build:data
Published 20947 products (mixed across 109 brands) | rejected 5134 | review 180 | delisted-by-brand 362

# post-publish check against data/products.json:
Deletes still published (should be 0, out of 497): 0
Moves NOT matching target garment (should be 0): 0
LaneMoves NOT matching forcedLane (should be 0, out of 97): 0

$ npx tsc --noEmit
(clean)

$ npx vitest run --exclude '**/.claude/**'
Test Files  40 passed (40)
     Tests  653 passed (653)
```

## Notes / follow-ups

- Nothing committed yet at the time this was written — bundling with the
  Ipekstil cut into one commit, then pushing (redeploy resets the
  `/staff/curate` pending queue as a side effect, same mechanism documented
  in docs/log/2026-08-15-clear-live-edits-button.md — that button is also
  live now for future batches instead of relying on a redeploy).
