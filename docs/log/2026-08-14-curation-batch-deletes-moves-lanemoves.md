# Curation batch: 125 deletes, 19 garment moves, 43 lane moves

**Date:** 2026-08-14 · **Status:** done

## Goal

Apply a curation batch Tina sent directly (in the `/staff/curate` "Copy for Claude"
export shape: `{ deletes, moves, laneMoves }`) — 125 products to cut, 19 garment
reclassifications, and 43 lane/subtype moves (mostly outerwear coats/vests/cardigans,
plus a few layering-basics base-layer-tops and one neck-cover).

## What changed

- Saved the payload to a scratchpad file and ran the existing
  `scripts/merge-live-edits.mjs` — the exact tool built for this export shape
  (docs/log/2026-08-12-inline-staff-editing.md, docs/log/2026-08-12-lane-overrides.md).
- `data/decisions.json`: 125 ids written `cut` (0 already matched).
- `data/garment-overrides.json`: 19 ids given a garment override (0 already matched).
  One entry (`modesty-in-style:10651708031286`, "Darlene Denim Jacket") was `from: top,
  to: top` in the `moves` array but also appears in `laneMoves` as `outerwear/coat` —
  the garment override is a no-op (top -> top), the real correction is the lane move.
- `data/lane-overrides.json`: 43 ids given a `forcedLane` (+ subtype where given), 0
  already matched.
- `ALLOW_LARGE_DIFF=1 npm run build:data` — republished. The `ALLOW_LARGE_DIFF` flag was
  needed because `brandDropViolations` guards against exactly this shape of change
  (many ids disappearing at once); reviewed the delete list against the input before
  overriding, all 125 were exactly the requested cuts.

## Verification

```
$ node scripts/merge-live-edits.mjs <payload>
Deletes: 125 written to data/decisions.json, 0 already matched
Garment moves: 19 written to data/garment-overrides.json, 0 already matched
Lane moves: 43 written to data/lane-overrides.json, 0 already matched

$ ALLOW_LARGE_DIFF=1 npm run build:data
Published 21688 products (mixed across 110 brands) | rejected 4890 | review 183 | delisted-by-brand 362

# post-publish check against data/products.json:
Deletes still published (should be 0): 0
Moves NOT matching target garment (should be 0): 0
Moves not published at all (out of 19): 0
LaneMoves NOT matching forcedLane (should be 0): 0
LaneMoves not published at all (out of 43): 0

$ npx vitest run --exclude '**/.claude/**'
Test Files  39 passed (39)
     Tests  651 passed (651)
```

`npm test` (bare) reported 2 failures, both inside `.claude/worktrees/jiggly-hugging-honey/`
— a separate git worktree from another concurrent session, picked up by vitest's default
glob, not this repo's code. Re-run scoped to the main tree is fully green.

## Notes / follow-ups

- **Concurrent-session hazard, not acted on:** `data/brands.ts`, `data/exclusions.json`,
  `data/raw-products.json`, and `data/translate-brands.json` are also modified in this
  working tree, but none of that came from anything run in this session — no scrape,
  add-brands, or file edit touched them here. Per §10.17/10.30 this is very likely another
  session doing brand-ingestion work in the same shared tree. Left entirely untouched and
  unstaged; flagged to Tina rather than guessed at.
- Nothing has been committed. `data/decisions.json`, `data/garment-overrides.json`,
  `data/lane-overrides.json`, and the republished `data/products.json` /
  `data/rejected.json` are staged-worthy but sitting as working-tree changes pending
  Tina's go-ahead to commit (mixed in with the other session's unrelated changes, so a
  commit here needs a careful `git add` by explicit path, not `-A`).
