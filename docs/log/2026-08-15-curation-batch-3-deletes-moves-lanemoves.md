# Curation batch 3: 121 deletes, 118 garment moves, 31 lane moves

**Date:** 2026-08-15 · **Status:** done

## Goal

Third `/staff/curate` live-edit export from Tina: 121 products to cut (mostly
"set"-titled non-apparel/loungewear items across mukistore, beyza, aeon-abaya,
nasiba), 118 garment reclassifications (overwhelmingly `set → hijab` — a large
run of Nasiba/Nour-Al-Houda underscarf/jersey-wrap products titled "Set" that
were misclassified as co-ord sets), and 31 lane moves (mostly Layering Basics
cropped-body-shirt for prayer sets, a few Outerwear blazer/cardigan).

## What changed

- `scripts/merge-live-edits.mjs`: `data/decisions.json` 121 → `cut`,
  `data/garment-overrides.json` 118 entries, `data/lane-overrides.json` 31
  entries — all 0-already-matched (fresh).
- **Mid-task discovery, resolved before committing:** while republishing,
  noticed local `main` had moved forward with commits I hadn't made —
  `478e6aa` (automated nightly catalogue refresh, +101 new/56 delisted/30595
  updated), `3b0d11e` (touche-prive dead-link fix), `94cb411` (shareable
  product link feature) — all from other sessions in this shared working
  tree/repo. Verified before proceeding:
  - `b1211c2` (my prior curation commit) is an ancestor of the new HEAD — a
    clean fast-forward, not a divergent history requiring a merge.
  - The only content difference in `data/decisions.json` between my last
    commit and the new HEAD was 238 **additive** keys (new products
    defaulted to `keep` by the refresh) — zero removed, zero changed values.
  - My working-tree `decisions.json` already contained all 238 of those keys
    on top of my own edits, confirming the pull/fast-forward had already
    merged cleanly with my uncommitted work before this batch's
    `build:data` ran.
  - `data/brands.ts`, `data/exclusions.json` were unchanged between commits
    — no repeat of the Ipekstil-style bundling question this time.
  - Republished again to be certain `products.json` reflects the *current*
    `raw-products.json` (post-refresh) rather than a stale in-memory build:
    `ALLOW_LARGE_DIFF=1 npm run build:data` → 20,965 products across 110
    brands (up from the 109 after the standalone Ipekstil cut — the refresh
    brought in enough new arrivals elsewhere to net a brand back above the
    publish threshold; unrelated to this batch).

## Verification

```
$ node scripts/merge-live-edits.mjs <payload>
Deletes: 121 written to data/decisions.json, 0 already matched
Garment moves: 118 written to data/garment-overrides.json, 0 already matched
Lane moves: 31 written to data/lane-overrides.json, 0 already matched

$ ALLOW_LARGE_DIFF=1 npm run build:data
Published 20965 products (mixed across 110 brands) | rejected 5137 | review 181 | delisted-by-brand 364

# post-publish check against data/products.json:
Deletes still published (should be 0, out of 121): 0
Moves NOT matching target garment (should be 0, out of 118): 0
LaneMoves NOT matching forcedLane (should be 0, out of 31): 0

$ npx tsc --noEmit
(clean)

$ npx vitest run --exclude '**/.claude/**'
Test Files  40 passed (40)
     Tests  653 passed (653)

$ git rev-parse HEAD; git rev-parse origin/main
(identical — confirmed no further drift before committing)
```

## Notes / follow-ups

- Only `data/decisions.json`, `data/garment-overrides.json`,
  `data/lane-overrides.json`, `data/products.json`, `data/title-translations.json`
  needed staging this time — `data/brands.ts`/`data/exclusions.json` were
  already at HEAD, and `data/rejected.json`/`data/review.json` had no diff
  (this batch was pure decision/override cuts, not a brand-level or
  pattern-based exclusion, so nothing new landed in the rejection log).
- General note for future batches: always re-check `git log` /
  `git rev-parse HEAD` vs `origin/main` immediately before committing in
  this repo — the shared working tree means another session's push can land
  mid-task, and a stale mental model of "what HEAD contains" is exactly the
  §10.17/§10.30 failure class this file has hit before.
