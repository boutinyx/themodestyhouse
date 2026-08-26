# Curation batch 5: 100 deletes, 33 garment moves, 50 lane moves

**Date:** 2026-08-26 · **Status:** done

## Goal

Fifth `/staff/curate` live-edit export from Tina, and the first one that is
almost entirely about the **dress** garment. Three shapes in one batch:

- **100 deletes** — all currently published dresses/gowns/skirts Tina cut on
  editorial grounds. Heaviest on `beyza` (25), `baqa` (16),
  `urban-modesty` (11), and `lameera-moda` / `mukistore` / `touche-prive`
  (7 each).
- **33 garment moves**, every one of them `dress → …`: 25 to `abaya`
  (Abaya Lounge's whole Plain Butterfly Farasha and Elasticated Cuff Sleeve
  Farasha runs, Summer Evenings' aghabani bishts, Kamin's Dalal, Ria
  Miranda's Lameera Long Outer, Ki Modesty's Dubai dress, Chic & Modesty's
  tank dress), 7 to `skirt` (Manzaram, Mukistore and Baqa maxi/pleated
  skirts that the tagger read as dresses), 1 to `top` (Qupid's Sòlis).
- **50 lane moves** — 47 to `layering-basics/under-dress` (the slip- and
  inner-dress runs from Aab, Abaya Lounge, Nasiba, Kamin, Merrachi, Chi Ka,
  Veiled, Golden Dune, Bemu and others), 1 to
  `layering-basics/shirt-extender` (Jaida's Dress Extension), 1 to
  `outerwear/cardigan` (Ria Miranda's Ranjani Shirt Dress) and 1 to
  `outerwear/coat` (Mukistore's Teddy Maxi Belt Poncho).

## What changed

- `scripts/merge-live-edits.mjs` with the pasted export:
  `data/decisions.json` 100 → `cut`, `data/garment-overrides.json` 33
  entries, `data/lane-overrides.json` 50 entries. All three were
  0-already-matched — nothing in this batch had been applied before.
- `npm run build:data` republished `data/products.json`: **19,308 → 19,208
  rows**, exactly −100, no `ALLOW_LARGE_DIFF` override needed.
- `data/title-translations.json` picked up 26 new cache entries as a
  side effect of the `postbuild:data` translate hook (unrelated to this
  batch's ids).

## Verification

Repo state checked first per §10.35 — `git fetch` then
`git log HEAD..origin/main` and `HEAD..origin/staging` both empty, so this
ran on a current base and no nightly `refresh.yml` commit was missing.

**Pre-change presence check** (the other half of §10.35 — "it's not there"
only means something if it used to be):

```
deletes:   100/100 currently published; missing 0
moves:      33/33  currently published; missing 0
laneMoves:  50/50  currently published; missing 0
moves current garment:     Counter({'dress': 33})
laneMoves current garment: Counter({'dress': 50})
```

Merge, then a second idempotent run to confirm every id landed:

```
$ node scripts/merge-live-edits.mjs /tmp/curate-export-2026-08-26b.json
   (first run: 100 / 33 / 50 written)
$ node scripts/merge-live-edits.mjs /tmp/curate-export-2026-08-26b.json
Deletes: 0 written to data/decisions.json, 100 already matched
Garment moves: 0 written to data/garment-overrides.json, 33 already matched
Lane moves: 0 written to data/lane-overrides.json, 50 already matched
```

Post-publish, read back out of `data/products.json`:

```
published rows now: 19208            (was 19308)
Deletes still published (should be 0 of 100): 0
Moves not matching target garment (should be 0 of 33): 0
LaneMoves not matching forcedLane/subtype (should be 0 of 50): 0
```

The lane-move check asserts both `forcedLane` and the right subtype field
(`forcedLayeringSubtype` for `layering-basics`, `forcedOuterwearSubtype` for
`outerwear`), matching what `scripts/build-data.mjs:188-196` writes.

All four subtypes used here were confirmed to exist in the real vocabulary
before merging, not assumed: `under-dress` and `shirt-extender` in
`lib/specialty.ts:266,269`, `cardigan` and `coat` in the outerwear subtype
table at `lib/specialty.ts:419-433`.

```
$ npx tsc --noEmit                            → exit 0, clean
$ npx vitest run --exclude '**/.claude/**'    → 50 files, 844 tests, all pass
```

## Notes / follow-ups

- Only `data/` files were staged. The six modified
  `public/edit-fall-hero-4-*.webp` in the working tree belong to another
  session and were deliberately left untouched (§10.30, §10.39).
- **Pre-existing bad translations, not from this batch.** The publish
  surfaced two wrong cached titles that are live on the site today:
  `Ine's top → "Ine's great"` and `Two-part Salt → "Two-part salt"`.
  `git show HEAD:data/title-translations.json` confirms both were already
  in the committed cache before this run, so nothing here caused them —
  but they are wrong product titles on live cards. Worth a separate pass
  over `data/title-translations.json` for entries where the "translation"
  mangles an English word (`top → great` is a French-detection artefact:
  the free endpoint read the title as French).
- Abaya Lounge's farasha runs moving `dress → abaya` en masse (18 of the 33
  moves) suggests a real classifier gap: `grep -in "farasha\|bisht" lib/tag.ts`
  returns nothing, so neither word has a rule. Worth
  checking whether adding one would prevent the next batch of the same
  hand-corrections — though per §8 a tag fix only reaches rows a refresh
  re-derives.
