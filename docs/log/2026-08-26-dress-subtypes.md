# Modest Dresses sub-categories: Everyday / Occasion / Slip, plus 9 khimaars moved to Hijabs
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina: *"we are gonna add a few filters to the modest dresses 1 and 2 everyday dresses and
occasion dresses. everything from glow modesty i want i[n] t[he] ocassion ones execpt for the
few i wrote down in everyday. those 2 are going to ahve a filter in the modest dresses
catagory. then 1 more filter with slip dresses also a type and there are also some products in
the modest dresses thing that need to go to kihmars youll find them under Occasion"* — followed
by ~431 product URLs in four blocks.

## What changed

### The data — `data/dress-subtypes.json` (new, 419 entries)
`{productId: 'everyday' | 'occasion' | 'slip'}`, id-sorted for a readable diff. Everyday 353,
Occasion 49, Slip 17.

**Why a data file and not a rule: there is no rule.** Her picks are photo judgements, and two
of them prove no title regex could reproduce the call — Urban Modesty's *"Ruby Pearl Cape Long
Sleeve Maxi Dress"* is a **Slip** while its near-twin *"Silver Pearl Cape Long Sleeve Gown"* is
**Occasion**; Slip also contains *"Elena Dress"*, *"Fluid Contrast"* and a product titled simply
*"Dress"*. Writing a keyword classifier here would have been §10.11 all over again.

**How the URLs were resolved.** Normalised (host minus `www.`, percent-decoded, NFC, trailing
slash and query stripped) and matched against `Product.url`. 423 of 431 matched exactly. The 8
misses were all `eu.toucheprive.com`: we ingest the `int.` storefront, which is a *different
Shopify store* with different product ids AND different handles — `eu`'s `gathered-poplin-dress`
is `int`'s `gathered-poplin-dress-2`, and fetching `eu/…​.json` returned ids absent from our
catalogue entirely. Resolved by exact title match, then **independently confirmed against
`Product.altUrl`** (which already records each row's `eu.` twin — see
`docs/log/2026-08-15-touche-prive-dual-region-links.md`): all 8 agree, two methods, zero
disagreement.

### The classifier — `lib/specialty.ts::dressSubtype()`
Resolution order: not a dress → null; `isSpecialty()` → null; curated value → it; brand rule →
'occasion'; else **null**.

`OCCASION_BRANDS = {'glow-modesty'}` is Tina's one brand-level rule, confirmed back to her before
building. Applied only where the curated map is silent, so her three named Everyday exceptions
(Marisol Pigment Knitted, Marisol Knitted Maxi, Modest Barbie Corset) win over it. Measured:
Glow Modesty publishes 109 dresses, 108 of which reach the lane (the 109th, *"Inner Dress -
Satin"*, is correctly a Layering Basics under-dress) → **105 occasion + 3 everyday**.

### The filter is OPT-IN, and that was Tina's explicit choice
Her lists cover 419 of 2,521 lane products. Asked directly what should happen to the other
~2,100, she chose **leave them untyped** over defaulting them to Everyday. So a `null` means
"not yet classified", never "everyday", and an unclassified dress appears on the lane under
"All" while matching no chip. **Do not "fix" this with a keyword fallback — it is the decision.**

Final split on the lane: `{everyday: 353, occasion: 137, slip: 17, untyped: 2005}` = 2,512.

### The khimaars — `isKhimarAbaya()` gate widened
Her fourth block ("To kihmars", 6 URLs) is noureen's *"Luxury Jersey Khimaar"* line and
diversity-modest's *"The Everyday Khimaar"* — all `garment: 'dress'`, so
`isKhimarAbaya()`'s `garment === 'abaya'` gate never saw them and they sat in Modest Dresses.

Gate is now `garment !== 'hijab'`. **Measured before changing it** (§10.10 — widening a
classifier moves products silently): 190 published rows carry a khimar-shaped title, split
141 `hijab` / 40 `abaya` / 9 `dress`, and there is no fourth garment — so the change adds
**exactly those 9 rows and nothing else**. `'hijab'` stays excluded because ~141 cape-style
headcovers already route to Hijabs via the plain `garment === 'hijab'` check.

Tina listed 6; **9 moved**. The extra 3 (Off White, Beige, Lime) are the same noureen product
line in other colourways — splitting a colour run across two lanes would have been the wrong
call. Flagging it rather than doing it quietly.

### Plumbing
- `lib/types.ts` — `DressSubtype`, and `curatedDressSubtype?: DressSubtype` on `Product`.
  Named `curated…` not `forced…` on purpose: the other two forced fields override a classifier,
  this one **is** the classifier.
- `scripts/build-data.mjs` — stamps it at publish, same mechanism as `laneOverrides`. Stamped
  rather than looked up at render time because `lib/compactCatalogue.ts` is imported by
  `components/FilterableGrid.tsx` (`'use client'`), so a JSON import in that graph would ship
  the whole 419-entry map to every browser on every grid page (Invariant 16).
- `lib/compactCatalogue.ts` — fourth subtype column (`dressSubtypes` / `rows.dressSubtypeIdx`),
  added to `SENTINEL_COLUMNS` so it is dropped entirely on lanes with no dresses.
- `components/FilterableGrid.tsx` — `typeDomain` gains `'dress'`; a "Type" `FilterDropdown`
  renders when `cat.dressSubtypes` is non-empty.

### One design call worth stating: the dress filter is NOT URL-driven
The other three subtype families are reached by `?type=`, via the header flyout, and
`app/[lane]/page.tsx` derives the h1, `<title>`, canonical and JSON-LD ItemList from it. Dresses
deliberately do not participate: `initialType` explicitly rejects dress subtypes and
`lib/laneSubtypes.ts` has no entry for the lane.

If it did, landing on `?type=occasion` would set the heading to "Occasion Dresses" and then
picking "Everyday Dresses" **in the dropdown** would change the grid while the heading still
said Occasion — precisely the page-contradicts-itself defect the 2026-08-19 subtype work
removed. The three flyout lanes escape it only because they have no in-page control to desync
with. Dresses has no flyout of its own (nested flyouts off Clothing-panel rows were removed
2026-08-22 after §10.34/§10.36), so the dropdown is the right control and pure in-page state is
the right binding — the same shape as the hijab fabric dropdown beside it.

## Verification
```
$ npx tsc --noEmit                      → clean
$ npm run lint                          → exit 0, no output
$ npm test                              → 51 files, 854 tests passed
$ npm run build                         → all routes built

$ npm run build:data                    → rows 19208 → 19208, added 0, removed 0
  field-level diff over all 19,208 published rows:
      {'curatedDressSubtype': 419}      ← the ONLY field that changed, anywhere
  stamped: {'everyday': 353, 'occasion': 49, 'slip': 17}

modest-dresses lane: 2512  (was 2521 — the 9 khimaars left)
subtype split: { '(untyped)': 2005, everyday: 353, occasion: 137, slip: 17 }
khimaar rows with garment=dress now on /modest-hijabs: 9
khimaar dresses still on /modest-dresses: 0
encoded dressSubtypes dict: [ 'everyday', 'occasion', 'slip' ]
idx histogram: { '0': 353, '1': 137, '2': 17, '-1': 2005 }
/modest-skirts dressSubtypes: []  column present: false   ← sentinel drop works
```

**Negative control run before trusting the new khimaar test** (§10.28 rule 1) — restored the old
`garment === 'abaya'` gate and confirmed the new case fires:
```
× matches a khimaar the tagger read as a DRESS
  AssertionError: expected false to be true
  Tests  1 failed | 69 passed (70)
… gate restored → Tests  70 passed (70)
```

`data/title-translations.json` also moved: 8 identity entries appended by the `postbuild:data`
translate hook (CLAUDE.md §4 — it runs because this machine has `.venv-style`). Unrelated to
this work, no published title changed, recorded here so the hunk is accounted for (§10.30).

## Notes / follow-ups
- **2,005 dresses are unclassified**, by Tina's choice. If she wants more covered she can send
  another batch of URLs and they fold straight into `data/dress-subtypes.json`; nothing else
  needs to change. There is no staff UI for this yet — a "set dress type" control on the card,
  alongside the existing live lane-move, would be the natural next step if batching gets old.
- The three subtypes have **no `?type=` URL and no sitemap entry**, per the design note above.
  Promoting them later means adding a `LANE_SUBTYPES` entry AND removing the in-page dropdown —
  not one without the other.
- `isKhimarAbaya` is now a slightly wrong name (its matches are no longer all abayas). Left
  alone: it is referenced from `lib/lanes.ts`, `lib/hijabTypeFilter.ts` and two test files, and
  a comment says what a rename would.
