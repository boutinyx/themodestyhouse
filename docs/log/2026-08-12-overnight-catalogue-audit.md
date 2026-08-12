# Overnight catalogue audit: non-clothing removal + misclassification fixes
**Date:** 2026-08-12 · **Status:** in progress — a full `npm run refresh` is running in the
background to re-discover products previously dropped by classifier gaps fixed tonight;
this entry will be finalized with those results once it completes.

## Goal
Tina, going to bed: "find everything that doesn't belon in our directory and delete it or
put misplaced items in the right places... go over all 17.000 products work until im
getting up in the morning."

## Approach
Same evidence-first discipline as every change tonight: no keyword removed or reclassified
without checking real corpus impact and reading actual hits by hand — several broad
keyword nets turned out to be almost entirely false positives (colourways, sleeve styles,
skirt names) and were discarded rather than acted on.

## Non-apparel removed (data/exclusions.json), by how it was found

1. **Translation-timing gap** (documented earlier today,
   `2026-08-12-non-apparel-cleanup.md`): 31 items.
2. **Kamin's "Kaminhome" tableware sub-line**, found by direct brand investigation after
   spotting "Beverage Dispenser with Gahwa & Tea Set": 12 items total across two rounds
   (5 dinnerware "Set for N" listings + a stray "Deep Dish", 7 more "Gahwa & Tea Set"
   listings at $280–640 each).
3. **ByHasanat sticker sets** (`product_type: "Accessories"`, tags `"Extras"`/`"Stickers"`)
   and **Chic & Modesty sewing notions** ("anti-hole pliers", a "needle pick for hijab")
   sitting inside their hijab catalogue at low prices: 4 items.
4. **SKU-family contamination flag** (Guard 1, mariams' "MAC"/"MR" families, 84–85% already
   vetoed): 5 items — two literal prayer-bead tasbeeh listings (published as `set`; the
   existing pattern requires "tasbeeh" directly followed by "beads", these said "N Bead...
   Tasbeeh", bead-count first — a real regex gap worked around with a targeted id-pin), a
   decorative "waist chain" (body jewelry), two rhinestone fashion headbands.
5. **Literal party supplies hiding in "balloon sleeve" noise**: of 97 titles containing
   "balloon", 95 were the real fashion term (balloon sleeves/skirts); 2 were literal
   "Ramadan Foil Balloon Set"/"Hajj Foil Balloon Set" (Nasiba). Same brand also had a
   "Cupcake Wrapper Set". 3 items.

**Total removed tonight: 57** (68 ids now in `exclusions.json`, 11 pre-existing from
earlier work today).

**Checked and confirmed clean** (0 remaining hits after all rounds): platters/dishes/vases/
trays/mugs, bracelets/anklets/chokers/earrings/bangles/pendants, stickers/keychains/phone
cases/candles/incense/perfume/tasbeeh/misbaha/prayer mats/bakhoor, banners/confetti/party
favors/decorations/countdown items, home/kitchen/dining/tableware/furniture/decor by
`product_type`, USD items over $700 (all legitimate luxury designer pieces, e.g. Bouguessa
blazers at $990).

## Misclassified items fixed (put in the right place)

**Review queue work** (`data/review.json`'s `signal-conflict` + `filtered:unclassified`
buckets, 248 → 167 → resolved further):
- `lib/tag.ts` vocabulary gaps found and fixed, each measured against the full corpus
  before shipping:
  - `tee|hoodie|cape|crewneck|button-up` → top (161 rows changed, 159 confirmed correct,
    2 documented tradeoffs)
  - `jumpsuit|romper` → dress, `gilet|parka` → top (47 rows changed, all correct)
  - German `bluse`, Turkish `tulum` added to `FOREIGN_RULES`
  - **`neck cover(s)` → hijab** — the exact case that started this whole project (the
    Reddit screenshot). Root cause: no `product_type`, tags said "Neck Covers", so it fell
    through to the last-resort description-parsing pass, which read unrelated cross-sell
    prose. 15 rows changed, including nasiba's 11 "Long Neck Cover" items that were
    landing as `set`.
- `data/garment-overrides.json`: 58 total (56 for the signal-conflict batch — nasiba's 51
  "Premium Chiffon" hijabs, yasmin-jay's swim paddle suits, zaskia-sungkar's Indonesian
  set/outer terms, aeon-abaya's blazer — plus 2 for chic-modesty's French "Pull maille"
  sweaters, which French "pull" was deliberately NOT added to the general vocabulary for,
  per an existing documented collision risk with English "pull-on").
- Re-ingested 5 brands (chic-modesty, touche-prive, jennah-boutique, aurora-abaya, baqa)
  via `add-brands.mjs` so the vocabulary fixes actually cleared their stale `filteredAt`
  flags and reached the live site, not just future ingests.

## Verification (each round, before committing)
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean, every round)
$ npx vitest run                                  530 tests passing (was 514 at session start)
$ npm run build:data                              no guard trips after round 1's fixes
$ npm run build                                    clean, every round
```
Every regex/vocabulary change has a dedicated regression test using the real corpus title
that motivated it, not an invented example.

## Commits so far tonight
`13bcdf0` `f4c7270` `b6e895d` `080cd3a` (plus earlier same-day commits `705d76d` through
`1791f28` from the garment-classification feature and first non-apparel pass, already
pushed to `origin/main`).

## Not yet done — will follow up in this file
- `npm run refresh` across all 108 brands is running in the background, specifically to
  re-discover products that were silently dropped (`garment: 'other'` → never even reached
  `raw-products.json`) by the vocabulary gaps fixed tonight, before those fixes existed.
  Will report real counts once complete, run the same guard-trip investigation process as
  this morning's first refresh if it trips, and do a final full audit pass over whatever
  new products it surfaces.
- Not an exhaustive item-by-item review of all ~23k products — systematic, evidence-driven
  sweeps across many categories, each verified by hand before acting, not a full manual
  read of the catalogue.
