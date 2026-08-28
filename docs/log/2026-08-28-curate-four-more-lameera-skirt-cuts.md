# Applied a third /staff/curate export: 4 cuts, all Lameera Moda skirts

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina's third export of the day: 4 `deletes`, no `moves`, `laneMoves` or `dressTypes`. All
`lameera-moda`, all `skirt` — Luxe Ribbed Maxi (Pink), Luxe Soft Maxi (White), Luxe Spandex
Maxi (Dark Lavender), Lameera Satin (Light Sage).

## What changed
- `data/decisions.json` — 4 ids -> `cut` (0 already matched), via
  `node scripts/merge-live-edits.mjs`. No file hand-edited.
- `data/products.json` — republished. **18,736 -> 18,732 rows (-4).**

Nothing else. `garment-overrides.json`, `lane-overrides.json` and `dress-subtypes.json` were
all untouched (0 changes each), and no pruning was needed this time — none of the four had a
dress subtype, being skirts.

## Verification
Base fetched immediately before cutting the worktree, not at session start (§10.53 rule 1):
`origin/main` was `31cc6a2` and the worktree was cut from it seconds later.

Presence **before** the cut, on the base being written to (§10.49): all 4 resolved as
`skirt`, `present: 4/4`.

After the republish, a full before/after diff of the published set rather than a one-sided
"is it gone" check:

```
rows: 18736 -> 18732
deletes gone: 4/4
brands whose count changed: lameera-moda: 219->215
rows gone that I did NOT cut: 0
rows that appeared:           0
```

**The middle three lines are the control** (§10.53 rule 2). "4/4 gone" passes just as happily
if the republish also dropped a hundred rows elsewhere; "exactly one brand's count moved, by
exactly 4, with zero unexpected departures and zero arrivals" does not. That is the
outside-the-change control the earlier 37-cut pass was missing.

All nine pinned colour leads re-checked through `browseProducts()` after the republish — all
nine still lead, with unchanged counts (+3, +2, +2, and six at +1), so no cut landed inside a
colour group and silently changed a badge.

`npx vitest run` — 933 tests, **932 pass**. The one failure is the pre-existing
`lib/edits.test.ts` `fall-essentials` check, still on the same two size-rule ids
(`zahraa:7389671391319`, `les-atelier:15725952008565`) and unrelated to these cuts. Left
firing deliberately — the fix is Tina re-picking in `/staff/curate`.

## Notes / follow-ups
Cumulative for the day: 46 + 37 + 4 = **87 Lameera Moda products cut**, 290 -> 215. Still not
a brand cut — these are individual editorial judgements, so `lameera-moda` stays in
`data/brands.ts` and out of `exclusions.json.brands`. Invariant 14 makes them durable against
the nightly refresh.

## Production verification (appended after the merge)

Staging first: `cut titles 0/4, controls 2/2`. Then `main` fast-forwarded `31cc6a2..5fe3f15`,
ancestry asserted. Origin confirmed serving the new build with a cache-busting query BEFORE
the purge (§10.47), then `purge_everything` → `success: true, errors: []`.

Canonical URL, real GETs, twice (§10.47 rule 4):

```
pass 1: /directory 200 | cf-cache-status MISS | age -  | 866,450 bytes
          cut titles 0/4 | controls 2/2
pass 2: /directory 200 | cf-cache-status HIT  | age 0  | 866,450 bytes
          cut titles 0/4 | controls 2/2
```

The two controls (`Naomi Pleated Skirt- Sage Green`, `Tala premium Ribbed Knit Abaya-
Espresso`) are both pinned colour leads, so they check two things at once: that the cut did
not take anything with it, and that the colour-lead pins shipped earlier are still in force
on production.
