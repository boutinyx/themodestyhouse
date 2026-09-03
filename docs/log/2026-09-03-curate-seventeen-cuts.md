# Applied a /staff/curate export: 17 cuts across 2 brands

**Date:** 2026-09-03 · **Status:** done

## Goal

Tina's export: 17 `deletes`, no `moves`, `laneMoves` or `dressTypes`.

```
aeon-abaya 12 · haute-hijab 5
by garment: dress 10 · hijab 5 · set 2
```

## What changed

- `data/decisions.json` — 17 ids → `cut`, via `scripts/merge-live-edits.mjs`.
  Nothing hand-edited.
- `data/products.json` — republished. **18,986 → 18,969 rows (−17).**
- `data/title-translations.json` — 19 new titles cached by the publish hook,
  unrelated to the cuts.

## Verification

Base fetched immediately before touching data (§10.53 rule 1): `HEAD..origin/main`
was empty, so no nightly had landed since.

Presence **before**, on the base being written to (§10.49): **17/17 present**,
with each one's garment recorded. Absence proves nothing unless presence was
established first.

After the republish:

```
rows: 18986 -> 18969  (expected -17)      deletes gone: 17/17

OK  aeon-abaya    705 -> 693  (-12, expected -12)   1.7% of the brand
OK  haute-hijab   147 -> 142  ( -5, expected  -5)   3.4% of the brand
```

Both far under `brandDropViolations`' 30% gate; no guard fired.

**Controls from outside the change** (§10.53 rule 2 — a control drawn from the
thing you are changing cannot see damage to everything you are not):

```
rows gone that I did NOT cut:   0
rows that appeared:             0
brands moving unexpectedly:     0
  merrachi  1029 -> 1029    niswa  396 -> 396
  jawda      106 ->  106    veiled 790 -> 790
```

`npm test` → 62 files, 1,099 passed. Note `lib/edits.test.ts` is green again —
it had two failures on `main` for several days from a hand-picked piece going
out of stock, and the nightly has since restored it.

**Two things checked because a plain "are they gone" would have missed them:**

- **No cut was the lead of a collapsed colour group.** `lib/colorVariants.ts`
  folds colourways onto one card, so cutting the lead silently swaps the
  photograph on a card nobody asked to change. Checked all 17; none was a lead,
  and none sat in a multi-colour group at all.
- **No cut id is referenced in a curated file** — `lib/edits.ts`, `lib/houses.ts`,
  the garment/lane/dress/colour override files. A cut that removes a hand-picked
  piece leaves an edit one card short, silently.
  My first pass at this reported all 17 as hand-picked, which was the grep's
  fault: it swept `data/*.json`, which includes `decisions.json`, and that file
  contains every id in the catalogue by definition. Narrowed to the files where
  a pick actually means something, the answer is none.
