# Curation batch 4: 40 deletes, 18 garment moves, 126 lane moves

**Date:** 2026-08-15 · **Status:** done

## Goal

Fourth `/staff/curate` live-edit export from Tina — the first batch using the
new Undercaps/Prayer Khimaars/Prayer Sets subtypes shipped earlier today
(docs/log/2026-08-15-layering-basics-undercap-khimar-prayer-set.md). 40
deletes (mostly non-apparel/duplicate turban and scarf items), 18 garment
reclassifications (mostly `hijab → trousers/dress/skirt/set/swim` for
scarf-print pieces that were actually full garments, not hijabs), and 126
lane moves — by far the largest batch of that shape yet: ~59 to
`layering-basics/undercap`, ~55 to `layering-basics/khimar`, a handful to
`layering-basics/neck-cover` and `layering-basics/prayer-set`, and 9 to
`modest-activewear` (Haute Hijab sport hijab/cap sets).

## What changed

- `scripts/merge-live-edits.mjs`: `data/decisions.json` 40 → `cut`,
  `data/garment-overrides.json` 18 entries, `data/lane-overrides.json` 126
  entries — all 0-already-matched (fresh).
- `npm run build:data` — republished: 22,174 products across 111 brands, no
  `ALLOW_LARGE_DIFF` override needed.
- Checked repo state before starting (per the last two batches' lesson about
  concurrent-session drift): local `HEAD` matched `origin/main` exactly
  before and after this batch, no other session's work landed mid-task this
  time.

## Verification

```
$ node scripts/merge-live-edits.mjs <payload>
Deletes: 40 written to data/decisions.json, 0 already matched
Garment moves: 18 written to data/garment-overrides.json, 0 already matched
Lane moves: 126 written to data/lane-overrides.json, 0 already matched

$ npm run build:data
Published 22174 products (mixed across 111 brands) | rejected 5137 | review 181 | delisted-by-brand 2137

# post-publish checks against data/products.json:
Deletes still published (should be 0, out of 40): 0
Moves NOT matching target garment (should be 0, out of 18): 0
LaneMoves NOT matching forcedLane (should be 0, out of 126): 0
LaneMoves subtype mismatch (should be 0): 0

$ npx tsc --noEmit           → clean
$ npx vitest run --exclude '**/.claude/**'  → 41 files, 664 tests, all pass
```

## Notes / follow-ups

- This is the first real-scale use of the new subtypes — 55 khimar + 59
  undercap in one batch validates the classification/UI work held up under
  actual volume, not just the earlier spot checks.
