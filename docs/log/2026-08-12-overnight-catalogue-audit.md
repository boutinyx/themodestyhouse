# Overnight catalogue audit: non-clothing removal + misclassification fixes
**Date:** 2026-08-12 · **Status:** done

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

**Total removed across this "put it to the test" + overnight session: 21** (68 ids now in
`exclusions.json` — 11 pre-existing before today, 36 from the earlier same-day pass
documented in `2026-08-12-non-apparel-cleanup.md`, 21 from tonight specifically).

Re-ran a full sweep of every category above against the post-refresh, 23,028-product
catalogue (see Final refresh section below): all still clean, nothing new surfaced.

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

## The full refresh — re-discovering silently-dropped products

With tonight's vocabulary fixes in place, ran `npm run refresh` across all 108 brands
specifically to re-derive every row from scratch: any product that was `garment: 'other'`
at ingest time never even reached `raw-products.json` (`normalizeProductDetailed` returns
`null`), so no amount of publish-time fixing could ever have rescued it — only a re-scrape
with the improved classifier could.

**Biggest single find: an entire 25-item jumpsuit line from Aeon Abaya**, completely
invisible until tonight's `jumpsuit` → `dress` vocabulary fix. Also surfaced smaller
numbers of gilet/parka/cape/hoodie items across other brands that existed on brand sites
the whole time but were never in our data at all.

**Guard 2 (per-brand collapse) did NOT trip this time** — the strongest validation yet that
this morning's 3-round fix to `lib/garmentReview.ts` (trust title/meta/foreign unless they
actually conflict; only description-sourced classifications get held) holds up at full,
real scale, not just on the data it was tuned against.

One more fix came out of the refresh: a garment-override set earlier for chic-modesty's
"Pull maille" sweaters turned out structurally powerless — an item that fails
classification at **ingest** time never gets added to `raw-products.json` at all, so a
**publish-time** override has nothing to attach to. `resolveGarment` can only correct
*misclassified* rows, not *unclassifiable* ones. Fixed at the source instead: "maille"
never appears anywhere else in the 38k-row corpus, so `pull\s*maille` is a zero-risk
two-word addition (bare French "pull" stays excluded, per the existing documented
collision risk with English "pull-on"). Removed the now-redundant overrides.

Published 22994 → 23028 (net of the refresh's new discoveries and this session's
non-apparel removals).

## Verification (every round, before committing)
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean, every round)
$ npx vitest run                                  531/531 passing (was 514 at session start)
$ npm run build:data                              no guard trips on the final round
$ npm run build                                    clean, every round
```
Every regex/vocabulary change has a dedicated regression test using the real corpus title
that motivated it, not an invented example.

## Commits
`13bcdf0` `f4c7270` `b6e895d` `080cd3a` `6ff9c0f` `fb3b574` (plus earlier same-day commits
`705d76d` through `1791f28` from the garment-classification feature and first non-apparel
pass). All pushed to `origin/main`.

## Not done
- Not an exhaustive item-by-item review of all ~23k products — systematic, evidence-driven
  sweeps across many categories (accessories, jewelry, home goods, party supplies,
  vocabulary gaps in the garment tagger), each verified against real corpus impact and read
  by hand before acting, not a full manual read of the catalogue. A brand or pattern this
  session didn't happen to look at could still have something.
- `data/review.json` still carries `no-price` (99, legitimate — Shopify configurators and
  0%-price promo line items with no real price, already correctly excluded, not a
  misclassification) and 18 `contaminated-sku-family` entries that were genuine wearables
  needing no action (scarves, grip bands, a beanie). Left alone deliberately.
