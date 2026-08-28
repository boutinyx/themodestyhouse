# Applied a fourth /staff/curate export: 19 cuts across 7 brands

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina's fourth export of the day, and the first not confined to one brand: 19 `deletes`, no
`moves`, `laneMoves` or `dressTypes`.

```
mukistore 8 · golden-dune 3 · la-petite-parisienne 2 · jawda 2 · baqa 2 ·
ilovemodesty 1 · veiled 1
```

By garment: 9 `top` (knitwear, cardigans, a bodywarmer, two bodysuits/blouses), 4 `dress`,
3 `abaya` (one a kaftan), 1 `set`, 1 `hijab`, 1 more `top`.

## What changed
- `data/decisions.json` — 19 ids -> `cut` (0 already matched), via
  `scripts/merge-live-edits.mjs`. No file hand-edited.
- `data/products.json` — republished. **18,732 -> 18,713 rows (-19).**

Nothing else: garment overrides, lane overrides and dress subtypes all reported 0 changes,
and no subtype pruning was needed.

## Verification
Base fetched immediately before cutting the worktree (§10.53 rule 1): `origin/main` was
`48fd87a`, worktree cut from it seconds later.

Presence **before**, on the base being written to (§10.49): `present: 19/19`, each with its
garment recorded.

After the republish, the check that a multi-brand cut actually needs — **per-brand movement
against the expected delta**, not just "are they gone":

```
rows: 18732 -> 18713  (expected -19)     deletes gone: 19/19

OK  jawda                 128 -> 126  (-2, expected -2)
OK  veiled                794 -> 793  (-1, expected -1)
OK  mukistore             122 -> 114  (-8, expected -8)
OK  baqa                  208 -> 206  (-2, expected -2)
OK  ilovemodesty          505 -> 504  (-1, expected -1)
OK  golden-dune           143 -> 140  (-3, expected -3)
OK  la-petite-parisienne  131 -> 129  (-2, expected -2)

brands moving unexpectedly: 0
rows gone that I did NOT cut:  0
rows that appeared:            0
```

Largest proportional drop is mukistore at 8/122 = 6.6%, well under `brandDropViolations`'
30% gate; no guard fired.

**One cut sat inside a colour group and was checked specifically.**
`veiled:7174811910249` "Modal Hijab - Storm" is one of 29 colourways of the same scarf, all
collapsed onto a single card by `lib/colorVariants.ts`. Cutting it takes the group **29 ->
28** and leaves the card itself alone — the lead was and remains "Modal Hijab - Mango Mint",
so nothing on the grid changes except the badge counting one fewer colour. Worth checking
rather than assuming: had Storm been the lead, this cut would have silently swapped the
photograph on a card Tina did not ask to change.

All **9 pinned colour leads still lead**, unchanged.

`npx vitest run` — 933 tests, **932 pass**. The one failure is the pre-existing
`lib/edits.test.ts` `fall-essentials` check on two size-rule ids, unrelated and left firing.

## Notes / follow-ups
Seven brands, none anywhere near a brand-level cut, so all seven stay in `data/brands.ts` and
out of `exclusions.json.brands`. Invariant 14 keeps the 19 durable against the nightly.

## Production verification (appended after the merge)

`main` fast-forwarded `48fd87a..71460e7`, ancestry asserted. Origin confirmed serving the new
build with a cache-busting query BEFORE the purge (§10.47), then `purge_everything` →
`success: true, errors: []`. Canonical URL, real GETs, twice (§10.47 rule 4):

```
pass 1: /directory 200 | cf-cache-status MISS | age -  | 865,675 bytes
          cut titles present 1/19 | controls 4/4
pass 2: /directory 200 | cf-cache-status HIT  | age 0  | 865,675 bytes
          cut titles present 1/19 | controls 4/4
```

### Why the expected answer is 1/19 and not 0/19, and how that was established
The first staging check read `1/18` and looked like a partial failure. Two separate things
were going on, and neither was a defect:

1. **A title is not a unique key** (§10.49 fault 1, in a new brand). **Two** golden-dune
   products carry the byte-identical title `"Strickweste Mit Knebelverschluss"` —
   `11107861496151`, which Tina cut, and `11107757883735` (handle `/sweater`), which she did
   not and which is still correctly published. Any title-based check must therefore read 1,
   forever, and a check that demanded 0 would have been "fixed" by cutting a live product.
2. **Five of the nineteen were already invisible in the payload**, because this morning's
   colour-grouping change removes non-lead colourways from every page's data —
   `veiled:7174811910249` "Modal Hijab - Storm" among them. So even the pre-cut build could
   only ever show 14.

**Production was used as the control that proved the matcher works** (§10.53 rule 2 — a
control from outside the change). Measured at the same moment, before the merge:

```
PRODUCTION (still pre-cut): 14/19 cut titles present
STAGING    (post-cut):       1/19
```

14 → 1 is the discriminator. Had the matcher been broken, production would have read 0 too,
and "staging is clean" would have been meaningless — which is exactly the shape of §10.49's
false negative. The payload carries neither bare Shopify ids nor product handles (both probed
and absent), so titles plus a same-title-sibling caveat is the honest instrument here.
