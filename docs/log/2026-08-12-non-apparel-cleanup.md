# Non-apparel cleanup: 36 confirmed non-clothing items found and removed
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina: "there are a lot of items that arent clothing items in the directory/products page
your task is to find them and delete." Find real, currently-live non-clothing items on the
site and remove them permanently.

## Method
`lib/nonApparel.ts`'s veto already runs on every product before publish and is heavily
validated (0 false positives on its own 248-row measurement). So anything currently live in
`products.json` already *passed* that veto — meaning any real miss is a gap in it, not a
one-off to hand-delete. Found two distinct, real gaps, each verified against live data
before acting (not guessed):

**1. The veto runs on the pre-translation title.** `verdict()` in `build-data.mjs` calls
`isNonApparel({title: p.title, ...})` inside the `kept` filter, which processes raw rows
*before* `publishTitle()` (the translation step) ever runs — same ordering bug already
documented for the gender filter (`exclusions.json`'s `_commentGenderNonEnglish` note).
`isNonApparel`'s vocabulary is English-only, so a non-English title naming an accessory in
its own language sails through untouched — e.g. Danish "Hijab-magneter" (hijab magnets)
never matches the English `magnets?` rule the way translated "Hijab magnets" would.

Tested this directly: computed `isNonApparel()` on every non-English brand's row using the
**translated** title (via the same cache `publishTitle()` uses) and compared against the
verdict on the **original** title. 42 rows flipped from "keep" to "reject."

**Manually read all 42** (per this file's own stated discipline: hand-verify before
trusting a new check) — **31 were genuinely non-apparel; 11 were false positives** of this
translate-then-veto method itself, caught and NOT deleted:
- Real hardware/bags/prayer goods (31): hijab magnets and pins (Hidayah, Chic & Modesty,
  Eynaa Paris — 17 items), handbags sold by a clothing brand under a colourway-style SKU
  name (Nihan, İpekstil — 10 items), leather shoes/sandals (Baqa — 4 items), a literal
  prayer rug (Mukistore — 1 item, the exact §10.10 "Prayer Room" bug in a new brand).
- False positives kept live: a garment described as having a "tie belt" or "buckle detail"
  (the accessory word describes a DESIGN FEATURE of real clothing, not a standalone product
  for sale) — a two-piece set, a "double suit," an abaya with a decorative chain-necklace
  neckline, and critically **a real swimwear bikini**, wrongly flagged only because
  "bikini" was missing from `nonApparel.ts`'s own `GARMENT_NOUN` list (fixed, see below).

**2. Kamin's home-goods sub-line ("Kaminhome").** Kamin is a legitimate luxury abaya brand
that also sells tableware under the same storefront, tagged `Kaminhome`. Most individual
pieces (`Entrée | Dinner Plate`, `Pebble | Dinner Bowl`, etc.) were already correctly
vetoed — TIER_B's `home` category already covers `plates?|bowls?`. **5 slipped through**:
four `"[Line] | Set for N"` listings with no home-goods keyword at all (just a generic
"Set"), and one `Entrée | Deep Dish` (`dish` isn't in the TIER_B vocabulary).

## What changed
- **`data/exclusions.json`** — 36 product ids added under `ids` (id-pin, the correct
  permanent mechanism per Invariant 3 — never hand-edited `products.json`, never
  `decisions.json`).
- **`lib/nonApparel.ts`** — added `bikinis?` to `GARMENT_NOUN`. Narrow, single-word, safety
  fix (this file's own design bias is toward keeping — a missed accessory just needs review,
  a wrongly-vetoed garment is deleted real inventory).
- **`lib/nonApparel.test.ts`** — added the real "Toka Detaylı Bikini" title to
  `MUST_SURVIVE`.
- **`data/products.json`/`rejected.json`/`title-translations.json`** — rebuilt via
  `npm run build:data`. Published 22,943 → 22,919 (24 newly excluded via id-pin; the other
  12 of the 36 were already being excluded via pre-existing `filteredAt` lifecycle tracking
  from a prior refresh — the id-pin entries make that permanent and explicit rather than
  relying on churn-dependent state).

## Verification
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit    (clean)
$ npx vitest run                                  Test Files 29 passed | Tests 524 passed
$ npm run build:data                              published 22919, no guard trip
$ npm run build                                    site builds clean
```
Confirmed directly: all 36 excluded ids are absent from the rebuilt `products.json`; all 4
manually-caught false-positive candidates (tie-belt set, buckled suit, necklace-detail
abaya, the bikini) remain published.

## Not done / follow-ups
- **The translation-timing gap is architectural and not fixed here** — only the 36 rows it
  currently affects were removed. A durable fix (run the veto on the post-translation title,
  or give `isNonApparel` its own lightweight non-English vocabulary the way `lib/tag.ts`'s
  `FOREIGN_RULES` does) is a real follow-up, deliberately out of scope for a "find and
  delete" pass — reordering the pipeline risks new false positives elsewhere (exactly what
  the translate-then-veto method itself produced, on this method) and needs its own
  corpus-wide validation, not a same-session bolt-on.
- **Kamin's 4 remaining "Set for N" home-line ids weren't caught by vocabulary** — handled
  individually via id-pin. `dish`/`platter` are not yet in TIER_B's `home` list; adding them
  wasn't validated against the full corpus this session, so left alone rather than guessed.
- This was NOT an exhaustive scan of all 22,943 published rows — it covered non-English
  brands (the translation gap) and one brand's home sub-line found by direct
  investigation. Other undiscovered gaps may exist.
