# Applied a /staff/curate export: 10 Beyza cuts + 1 garment reclassification

**Date:** 2026-08-26 · **Status:** done

## Goal
Tina pasted the JSON from `/staff/curate`'s "Copy for Claude" button: 10 `deletes`
(all Beyza), 1 `move` (`beyza:10136416583864`, trousers -> set), 0 `laneMoves`.

## What changed
- `data/decisions.json` — 10 ids set to `cut` (0 already matched).
- `data/garment-overrides.json` — `beyza:10136416583864: "set"` added.
- `data/products.json` — republished. 19,208 -> 19,198 rows (-10).
- `data/title-translations.json` — 20 new entries, written by the `postbuild:data`
  translate hook (side effect of the republish, not part of this task).

Applied with `node scripts/merge-live-edits.mjs` — the purpose-built merger — then
`npm run build:data`. No file was hand-edited.

## Verification
Per §10.35, confirmed every id was PRESENT before the cut (absence is not evidence
of a successful cut unless you already know it was there):

```
PRESENT beyza:10136435065016 decision=keep garment=dress   5659 Dress Laleli
PRESENT beyza:10136435327160 decision=keep garment=dress   5629 Dress With Chain
PRESENT beyza:10136399151288 decision=keep garment=abaya   3699 Emet Pleated ...
PRESENT beyza:10136415043768 decision=keep garment=dress   Aydan Stone Striped ...
PRESENT beyza:10136433098936 decision=keep garment=abaya   3765 Sinem Abaya
PRESENT beyza:10136421138616 decision=keep garment=abaya   Zippered Abaya ... 3887
PRESENT beyza:10136433557688 decision=keep garment=abaya   Stone Embroidered ... 3539
PRESENT beyza:10136421564600 decision=keep garment=abaya   Zippered Side Pleated ... 3919
PRESENT beyza:10136434639032 decision=keep garment=top     Beaded Collar Hijab Shirt 4083
PRESENT beyza:10136431001784 decision=keep garment=dress   5656 Hijab Dress ...
PRESENT beyza:10136416583864 currentGarment=trousers -> set  9183 Jacket and Trouser Set
```

`git fetch` first (§10.35): `HEAD..origin/main` and `HEAD..origin/staging` were both
empty, so this ran on the current base and cannot revert a nightly refresh commit.

After the republish:

```
rows now: 19198
deletes gone: 10/10
move: beyza:10136416583864 present=true garment=set (expected set)
```

Publish output: `Published 19198 products (mixed across 109 brands) | rejected 6195 |
review 2126 | delisted-by-brand 2547`. No guard fired.

`npm test` — `Test Files 51 passed (51) · Tests 854 passed (854)`.

## Notes / follow-ups
**Found, not fixed — a pre-existing double-translation bug.** `scripts/translate_titles.py`
runs on the ALREADY-translated `data/products.json`, so for a non-English brand it can
translate a title a second time and cache the result under the English key. The cache
holds both links of the chain:

```
"Ines Oberteil" -> "Ine's top"
"Ine's top"     -> "Ine's great"
```

**46 published rows** currently have a title that differs from `cache[rawTitle]`. Most are
harmless case shifts, but some are corruptions: `Ine's top` -> `Ine's great`,
`Rossa hijab` -> `Pink hijab`, `Elenora Hijab` -> `Elena Hijab`,
`Black satin bustier top` -> `Black satin strapless top`. It predates this session —
`git show HEAD:data/products.json` already carried `Ine's great` — and was not caused by
this republish. Raised with Tina; not fixed here because it is a separate defect in the
cache populator, and fixing it means both pruning the poisoned second-pass keys and
stopping the script re-reading published titles.
