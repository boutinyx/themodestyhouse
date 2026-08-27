# Applied a /staff/curate export: 9 cuts, 1 garment move, 2 lane moves

**Date:** 2026-08-27 · **Status:** done

## Goal
Tina pasted the JSON from `/staff/curate`'s "Copy for Claude" button: 9 `deletes` across
9 different brands, 1 `move` (`hum:9289624256724`, abaya -> top), and 2 `laneMoves` onto
`/outerwear`.

## What changed
- `data/decisions.json` — 9 ids set to `cut` (0 already matched).
- `data/garment-overrides.json` — `hum:9289624256724: "top"`.
- `data/lane-overrides.json` — `ellem-atelier:10941309649239 -> outerwear/cardigan`,
  `aeon-abaya:8905258500148 -> outerwear/blazer`. Both shapes already exist in that file
  (14 blazer, 8 cardigan overrides before this).
- `data/products.json` — republished. 18,907 -> 18,898 rows (-9).

Applied with `node scripts/merge-live-edits.mjs`, then `npm run build:data`. No file was
hand-edited.

## Verification
Per §10.35, every id confirmed PRESENT before the change — absence after is not evidence
of a successful cut unless you already know it was there:

```
PRESENT abaya-lounge:15002628292993   abaya   Palestinian Tatreez Closed Abaya - Turquoise & Gold
PRESENT almotahajiba:10482910953747   abaya   Quiet Focus
PRESENT bait-hanayen:15425326776431   abaya   Taraf Abaya (Linen)
PRESENT latifi:8083975667961          abaya   Mizna
PRESENT chi-ka:8643008397473          abaya   Metallic Effect Dark Brown Flowy Kaftan RTW
PRESENT madiha:5454347567254          abaya   The Embellished Open Abayah
PRESENT meriam-abdulaziz:10279538622742 abaya Silky slim abaya
PRESENT store-wf:16075677204860       abaya   Luna Lace Trim Kimono & Trouser Set Pink
PRESENT cult-abaya:8899267067964      abaya   Esra Abaya
PRESENT hum:9289624256724             abaya -> top
PRESENT ellem-atelier:10941309649239  forcedLane=(none) -> outerwear/cardigan
PRESENT aeon-abaya:8905258500148      forcedLane=(none) -> outerwear/blazer
```

`git fetch` first (§10.35): `HEAD..origin/main` and `HEAD..origin/staging` both empty, and
`git merge-base --is-ancestor origin/main HEAD` confirms staging contains everything on
`main` — including `f102cf2`, the merge that landed earlier today. So this ran on the
current base and cannot revert anyone's work.

After the republish:

```
rows now: 18898
deletes gone: 9/9
garment move: hum:9289624256724 garment=top (expected top)
lane move:    ellem-atelier:10941309649239 forcedLane=outerwear subtype=cardigan
lane move:    aeon-abaya:8905258500148     forcedLane=outerwear subtype=blazer
```

Publish line: `Published 18898 products (mixed across 109 brands) | rejected 6195 |
review 2126 | delisted-by-brand 2540`. No guard fired.

`npm test` — 54 files, **879 tests pass**.

## Notes / follow-ups
The two lane-moved rows keep `garment: "abaya"` and carry `forcedLane: "outerwear"` — that
is the mechanism working as designed, not a leftover. `data/lane-overrides.json` exists
precisely for the lanes a garment override cannot reach (`lib/specialty.ts`), so the row
moves lanes without its garment classification being rewritten.
