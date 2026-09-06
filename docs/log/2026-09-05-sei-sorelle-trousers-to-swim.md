# Sei Sorelle's "Aiyla (Trousers)" is a swimsuit — moved to the swim lane
**Date:** 2026-09-05 · **Status:** done

## Goal

Tina, with a live product link: *"this one needs to go to swimwear its now in trousers"*
— `seisorelle:aiyla-trousers-cloud`.

## Why it was misclassified

The title literally says "Trousers" — `"Aiyla (Trousers) - Cloud"` — so `GARMENT_RULES`
correctly, mechanically, tagged it `trousers`. The live product page tells the real story:
type `Aiyla`, tags include `hijabi swimwear`, `long sleeve swimsuit`, `modest swimwear`,
`swim`, `swimsuit`, `swimwear`, and the description opens *"The AIYLA swimsuit... Creating a
new standard for full coverage swimwear... Meets ASA guidelines."* It's a competitive
swimsuit bottom that the brand itself names "(Trousers)" for fit description, not garment
category. `lib/specialty.ts`'s `SWIM_RE` (`/burkini|swim|bathing ?suit|beachwear/i`) tests
only the title, which contains none of those words, so no automatic rule was going to catch
this one.

## What changed

**`data/garment-overrides.json`** — one entry added:
`"sei-sorelle:7095557292113": "swim"`. `resolveGarment()` (`lib/garmentReview.ts`) checks
overrides first and returns them unconditionally, so this both fixes the published `garment`
field and — since `isSwim()` in `lib/specialty.ts` checks `p.garment === 'swim'` as well as
the title regex — moves the product onto `/modest-swimwear` and off `/modest-trousers` and
`browseProducts()` in the same edit.

**`data/products.json`** — republished with `npx tsx scripts/build-data.mjs`.

## Verification

```
before: garment "trousers"  title "Aiyla (Trousers) - Cloud"
after : garment "swim"      title "Aiyla (Trousers) - Cloud"

rows before/after: 19172 19172
ids only before: 0 | ids only after: 0
rows whose CONTENT changed (by id): 1   [sei-sorelle:7095557292113]
```

The republish reshuffles the whole array via `interleaveByBrand` (§8 — expected for any
single-product change), so the comparison above is by id, not by array index, which is what
makes "exactly one row changed" a real claim rather than an artefact of ordering.

Suite: `65 files, 1169 tests passed`.

## Notes / follow-ups

- Not pushed to `staging`/`main` yet — bundling with whatever else is in flight, since this
  is a one-line data fix with no code change.
- No pattern change to `lib/tag.ts` or `SWIM_RE`: this is a genuine one-off (a brand naming a
  swimsuit "(Trousers)" for silhouette), not evidence of a systematic gap. If another
  "named after its cut, not its category" swim piece turns up, that would be the point to
  look for a real pattern rather than adding a second override.
