# New In page, and the removal of All Clothing
**Date:** 2026-09-01 · **Status:** done (verified locally; staging verification pending)

## Goal

Tina, 2026-09-01: *"i want a new in page and the all clothing page gone. but only from
selected brands"* — followed by a list of 38 houses, with *"put a lot in of this one also
at the top because we are in their reffer system"* against Losyana, and later *"btw int he
homepage the shop the arcihve button need to be shop new in now"*.

Design: `docs/superpowers/specs/2026-09-01-new-in-page-design.md`
Plan: `docs/superpowers/plans/2026-09-01-new-in-page.md`

## What changed

**`lib/newIn.ts`** (new) — the selection rule, pure and unit-tested:

```
1. base      getProducts(), restricted to NEW_IN_HOUSES, minus isSwim / isActivewear
2. hijabs    unless ?hijabs=1, also drop the Hijabs & Scarves predicate
3. anchor    the latest firstSeen day in the published catalogue — NOT Date.now()
4. window    keep day >= anchor - 30 days
5. de-batch  per house, drop every day holding >= 30% of that house's dated rows
6. order     newest first ACROSS days, round-robin by house WITHIN a day
7. group     groupColourVariants last, after every other filter
8. seed      4 Losyana pieces spliced in at indices 2, 8, 15, 21
```

**The de-batching is the load-bearing part.** `Product.firstSeen` records when this
project first SCRAPED a piece, not when the house published it, and every one of the 38
houses was bulk-ingested on one day. A raw 30-day window returns **5,147 rows** opening
with Merrachi's entire 1,022-piece catalogue — 94% of it dated 2026-08-05. Measured
concentration, per house: 42%–100%, biggest single date.

**The window is anchored to the data, not the clock.** The page is prerendered, so its
data is frozen at build time; a `Date.now()` window would slide away from frozen data and
empty the page over a long gap between deploys. It also makes the function deterministic,
which is the only reason it can be unit-tested.

**Losyana had to be seeded, not merely boosted.** All 826 of its published pieces carry
`firstSeen: 2026-08-28` — the `.shop` domain move that reissued every product id (§10.54).
That is one batch, step 5 removes all of it, and its organic contribution is **zero**.

**`app/new-in/page.tsx`** (new) — `?q=` searches every house over `browseProducts()`, not
the New In selection, so the header magnifier, `useZeroResultSearch` and the `WebSite`
`SearchAction` behave exactly as they did on `/directory`. `?hijabs=1` is a URL switch
rather than client state, because `compactCatalogue` encodes a garment dictionary and a
jilbab carries garment `abaya`.

**`app/directory/page.tsx`** deleted; 21 references repointed; `/directory` and
`/hijabi-outfits` both 308 to `/new-in`.

**`interleaveByBrand` moved** from `scripts/build-data.mjs` into `lib/ordering.ts`, whose
own header already described itself as running "after interleaveByBrand" and which
build-data already imported `demoteGarment` from.

## Verification

**Unit tests — 13 in `lib/newIn.test.ts`, negative control run first (§10.28 rule 1).**
With `INGEST_BATCH_SHARE` forced to 1.01 so nothing is ever a batch:

```
× removes an ingest batch
× computes batch days before the view filters
× gives nothing to a house whose whole dated population is one date
× does not duplicate a seed that already arrived through the window
× appends the remaining seeds when the list is shorter than the last position
  Tests  5 failed | 6 passed (11)
```
Restored to 0.3: `Tests  11 passed (11)`, later 13 with the ordering pair.

**The guard test found 7 files the plan's grep missed** (§10.29 exactly). First run,
before the edits:

```
AssertionError: expected [ 'app/[lane]/page.tsx', …(20) ] to deeply equal []
  app/[lane]/page.tsx  app/directory/page.tsx  app/editorial/[slug]/page.tsx
  app/favourites/page.tsx  app/llms.txt/route.ts  app/page.tsx
  app/product/[brandSlug]/[shopifyId]/page.tsx  app/sitemap.ts
  components/HeaderSearch.tsx  components/MagnifierHero.tsx  components/MobileNav.tsx
  components/Nav.tsx  components/useZeroResultSearch.ts  lib/devOnly.test.ts
  lib/edits.ts  lib/ordering.ts  lib/pulse.test.ts  lib/routes.test.ts
  lib/schema.ts  lib/seoCopy.test.ts  lib/seoCopy.ts
```

Not on the plan's list: `components/MagnifierHero.tsx`'s CTA, `lib/edits.ts`'s "The whole
directory" link on the Fall Essentials edit, and five test fixtures. After the edits:
`Tests  2 passed (2)`.

**The `interleaveByBrand` move is provably a no-op for the publish path.** Ran
`npm run build:data` in a detached worktree at `5d2909f`:

```
Published 18945 products (mixed across 114 brands) | rejected 6410 | review 2127
regenerated: 3d16e703693669e5883210dd744e4d35
committed:   3d16e703693669e5883210dd744e4d35
```

**Built and served** (worktree — another session owns the shared `.next`, §10.28 rule 4):

```
http://localhost:3191/new-in            http=200  bytes=383585
http://localhost:3191/new-in?hijabs=1   http=200  bytes=378664
/directory       -> /new-in  http=200  bytes=383585
/hijabi-outfits  -> /new-in  http=200  bytes=383585
```
`curl -L` throughout, byte counts read — a 14-byte body is a redirect, not a page (§10.49).

**Playwright, real DOM:**

```
body bg: rgb(250, 247, 241)          <- CSS genuinely loaded (§10.24)
h1: "New In" | cards rendered: 24
SEED POSITIONS (1-indexed 3, 9, 16, 22):
  #3  losyana.shop   #9  losyana.shop   #16 losyana.shop   #22 losyana.shop
toggle chips: Clothing[active=false] Include hijabs[active=true]
```

**Controls from OUTSIDE the change** (§10.53 rule 2 — a control drawn from the thing you
are changing cannot see damage to everything you are not):

```
search "inayah" (a house NOT in the 38): 24 cards | inayah.com inayah.com inayah.com
/modest-dresses still renders: 24 cards | h1 "Modest Dresses"
homepage links to /new-in: ["Clothing","New In","Shop New In","Shop New In"]
```

**Suite / typecheck / lint:**

```
npm test    Test Files 1 failed | 59 passed (60)   Tests 2 failed | 1051 passed (1053)
npx tsc --noEmit    clean (in the worktree, against fresh .next route types)
npm run lint        exit 0
```

The two failures are `lib/edits.test.ts` and are **not from this change**. Both reproduce
at `f0c8830` — the merge of last night's refresh — run in a separate detached worktree
before any of this work existed (§10.38 rule 1):

```
× every hand-picked product id still resolves
    everyday-lace: expected [ 'by-hasanat:15098402079093' ] to deeply equal []
× mixed hand-picked edits never put two hijabs back to back
    fall-essentials: hijabs bunched together
```

Last night's refresh delisted a hand-picked product on the Everyday Lace edit and shifted
the Fall Essentials hijab ordering. Both need a re-pick in `/staff/curate`; neither is
touched here.

## Measured result

Against `products.json` at `5d2909f` (18,945 published rows):

```
hijabs off   343 rows   19 houses   seeds ["losyana","losyana","losyana","losyana"]
hijabs on    417 rows   20 houses   seeds ["losyana","losyana","losyana","losyana"]
```

These move nightly (§10.35) — re-measure rather than quoting them.

## Found on staging, after the first "done"

Two things the local run could not have shown, both fixed:

**1. The seed-placement comment was wrong.** It claimed a four-column grid and named
rows 1/3/4/6, columns 3/1/4/2. Measured on the built page instead:

```
390px   cols=2   r1c1  r4c1  r7c2  r10c2
768px+  cols=3   r0c3  r2c3  r5c1  r7c1
```

Two columns on a phone, three at every width from 768 up, never four. The property Tina
asked for — four different rows, none consecutive — holds in both layouts, but the gaps
between the positions (6, 7, 6) are what deliver it, not the column count. A false
explanation in the code is worse than no code (§10.43), so the comment now carries the
measurement.

**2. `audit:interaction` reported `PANEL DID NOT OPEN ON TAP` at every viewport in both
engines** — on filter dropdowns that work. This one WAS mine. The check does
`page.locator('.chip').first()`, and `/new-in` renders two `<a class="chip">` links (the
hijab toggle) above the filter bar. It clicked the toggle, navigated, and found no panel.
Now `button.chip`: a filter trigger is a `<button>`, the toggle is an `<a>`, which is
structural and cannot be renamed away (§10.32 rule 2).

Chasing it surfaced the larger miss: **`lib/routes.test.ts` covered `app/`, `components/`
and `lib/` but not `scripts/`** — so seven scripts still named `/directory`. They all still
WORKED, because the 308 resolves, which means five audits were quietly measuring a
redirect. Leaving `scripts/` out is precisely the §10.29 failure the test exists to
prevent, and it was made while writing the test. The test now covers `scripts/` and `.mjs`,
and the repo-wide grep is clean.

**`npm run audit:interaction` against staging, after the fix** — 5 viewports x 2 engines,
no `PROBLEM` line anywhere:

```
filter-dropdown-after-tap  mobile-390    chromium  panel opened (190px @100..290/390)
filter-dropdown-after-tap  tablet-819    chromium  panel opened (190px @116..306/819)
filter-dropdown-after-tap  ipad-1024     chromium  panel opened (190px @116..306/1024)
filter-dropdown-after-tap  ipad-1366     chromium  panel opened (190px @189..379/1366)
filter-dropdown-after-tap  desktop-1440  chromium  panel opened (190px @226..416/1440)
   … identical at all five in webkit
nav-dropdown-open               ipad-1366 / desktop-1440   ok   (both engines)
nav-tap-on-hover-capable-tablet ipad-1366                   ok   (both engines)
```

Before the fix, the same five read `PANEL DID NOT OPEN ON TAP` in both engines — which is
the negative control for this repair, run first and by accident (§10.28 rule 1).

## Second round — balance, mixing, and translations

Tina, after seeing the first version on staging: *"try to mix the items instead of putting
all the brands next to eachother also try to keep a balance between the number of products
so instead of if a brand has more you put everything in try to keep a balance and also you
need to translate the nsames of some"*.

### Balance and mixing

`NEW_IN_MAX_PER_HOUSE = 12`, applied to each house's own NEWEST cards, then a round-robin
across every house ordered by whose piece is newest. The order of those two steps matters:
capping after interleaving would delete cards from an already-mixed sequence and reopen the
runs it had just removed.

```
before   343 cards, 19 houses — la-petite-parisienne 75, jennah 43, whiteicy 36,
         manzaram 33 … the five biggest held 200 of 343, nine houses shared under ten
after    163 cards, 19 houses — nine houses at the cap of 12, nothing above it
         adjacent same-house pairs across the WHOLE page: 0
         first 24 cards span 19 different houses
```

This **deliberately gives up strict newest-first**, which the previous within-a-day
interleave preserved. That version could do nothing about a day when one house published
40 pieces and nobody else published at all — 16 of the first 24 cards were Jennah Boutique,
which is what Tina was looking at. "Newest" remains an option in the grid's own Sort
control, so the strict order is one click away.

`groupColourVariants` now runs BEFORE the cap and the interleave rather than last. The house
rule ("group last") exists so a filter that removes SIBLINGS cannot leave a card claiming
"+5 colours" it does not have. Neither step here removes a sibling — both move and drop
whole cards — so the badge stays truthful, and grouping first is what makes the cap count
what a visitor actually sees.

**Negative controls, run first (§10.28 rule 1):** `NEW_IN_MAX_PER_HOUSE = Infinity` fails the
two cap tests; removing `interleaveByBrand` fails the adjacency test. Restored, 15 pass.

**A test was found passing VACUOUSLY.** "never lets an older piece outrank a newer one" used
a fixture of 20 rows on one day per house — 100% of each house, so de-batching ate all of it
and the assertion compared `[]` to `[]`. It survived a real behaviour change without going
red. The `drip()` helper now documents both fixture traps (too few days makes a batch; too
many rows hits the cap) and every count assertion has a `toBeGreaterThan(0)` guard.

### Translations

The publish had been reporting the gap on every run — `278 in non-English brands NOT in the
cache` — and nobody had read it. Every Jennah Boutique title on the page was French and
Parladusa's were German. Both houses were already in `data/translate-brands.json`; only the
cache was empty.

```
scripts/translate_titles.py --only <slug> --no-republish   x 10 houses
cache 10982 -> 11255 (273 new)
republish: Titles: 4243 translated from cache | 5 NOT in the cache   (was 278)
```

Republished with `npx tsx scripts/build-data.mjs` rather than `npm run build:data`, to skip
the `postbuild:data` hook that would also have translated ~3,900 titles for mukistore, nihan
and zuhre — brands that are not on this page.

**Verified the republish changed titles and nothing else:**

```
rows before/after: 18945 18945
id sequence identical (no reorder): true
titles changed: 269
rows differing in any NON-title field: 0

jennah-boutique  "Pantalon oversize coton bleu" -> "Blue cotton oversized pants"
parladusa        "Verona Kleid"                 -> "Verona dress"
parladusa        "Liya Zweiteiler"              -> "Liya two-piece"
la-petite-...    "Trench beige Sali (V26099)"   -> "Beige Sali trench coat (V26099)"
```

**Losyana was checked and deliberately NOT added to `translate-brands.json`.** Its titles
look non-English but are place names — Ibiza, Tenerife, La Palma, Marbella, Alicante.
Marking it `de` would send 1,272 English titles to be translated AS German, which is exactly
the feedback loop that corrupted 40 titles in §10.46.

## Notes / follow-ups

- ~~**One house can still hold most of the opening.**~~ **CLOSED** — see "Second round"
  above. Tina chose the trade: balance and mixing over strict newest-first.
- **`NEW_IN_MAX_PER_HOUSE` is a judgement, not a measurement.** 12 gives 163 cards; 20 would
  give ~221 and let the six biggest houses lead more. One constant, one republish.
- **~3,900 titles are still untranslated for brands NOT on this page** — mukistore (1,432),
  nihan (1,230), zuhre (1,214) and six smaller ones. They are published and reachable on the
  lane pages. Filling them is the same command per slug and needs no code change.
- **Two labels now point at a page with a different name.** `lib/edits.ts`'s
  `"The whole directory"` and `components/MagnifierHero.tsx`'s `"Explore the directory"`
  both now link to `/new-in`. Both are Tina's words and were left as she wrote them
  (§10.18). MagnifierHero has zero importers and is KEPT deliberately, like
  `VerifiedSpotlight`.
- **Page copy is mechanism, not pitch.** `SEO_COPY['/new-in']`, the h1 intro and
  `NEW_IN_ANSWER` describe how the page works and nothing more. Tina overwrites any of it.
- `niswa` is in the 38 but has 0 rows carrying a `firstSeen`, so it contributes nothing
  until a refresh touches it.
