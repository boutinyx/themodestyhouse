# A colour filter on every grid, derived from the titles we already have
**Date:** 2026-08-29 · **Status:** done (on `feature/colour-filter`, not yet merged)

## Goal

Tina, 2026-08-28: *"is there a tool of anything so we can colorcode everything so we can
select on colors? i know you can do that youself but is there a tool we can use"* — and then,
after the plan: *"when the sub agent doesnt know, or doesnt know for sure if the color is
correct, it shows me. give me a list and i will see if its correct or ill change it."*

So: a Colour filter on every product grid, and a way for her to answer the cases the machine
cannot.

## The measurement that decided the design

Before writing anything, three sources of colour were measured against the real catalogue:

| Source | Coverage | Verdict |
|---|---|---|
| The product **title** | **70.2%** of 18,713 rows at the time | The whole design |
| Product **tags** | +~5pp | Rejected — needs a field on `Product` and a pipeline change |
| The Shopify feed's own `options: [{name:"Color"}]` | **12.5%** of products across a 12-brand sample | Rejected — not worth a re-ingest |

Niswa publishes a real `Color` option; almost nobody else does. The title is where the
evidence is, and it is already on disk. That is why nothing here re-scrapes, and why the whole
feature is derived rather than stored.

## What changed

**`lib/colour.ts`** (new) — the whole colour domain. 15 families, an ordered `RULES` array, and
`classifyColour(title)` returning `{ family, confidence, term, candidates, matchedWord }` with
confidence `'override' | 'suffix' | 'weak' | 'none'`. `colourFamily()` is a one-line wrapper.
It reads the title's colourway suffix first (via the existing `splitColourSuffix()`, which the
colour-grouping work already built) because a suffix is 25 characters a brand set aside to name
a colourway, then falls back to the body of the title, where a colour word is as likely to be a
style name.

**No `\b` anywhere.** Every rule uses `word()` from `lib/tag.ts`, now exported rather than
copied. §10.31 is exactly this catalogue: `\b` is ASCII-only, so in the Turkish, French and
Dutch titles here it finds a boundary mid-word.

**`data/colour-overrides.json`** (new) — Tina's editorial calls, read *before* the vocabulary,
in the same spirit as `data/colour-leads.json` and `data/default-cut-brands.json`. Keyed by the
lowercased colourway suffix, so **one answer covers every piece any house ever names that way,
including rows not scraped yet**. A `null` is a recorded decision meaning "this suffix is not a
colour", not a gap — membership is tested with `in`, never truthiness.

**`scripts/colour-review.mjs`** (new, `npm run colour:review`) — generates a gitignored
`colour-review.html` at the repo root, beside `hero-picker.html` and `designer-discovery.html`.
**858 colour names covering 1,899 products**, ranked by row count so the top 100 cover 55.7%.
Each block shows the name, the count, six real garment photographs and 17 buttons: 15 families,
"Not a colour", and "Skip — not sure". Nobody can say whether *çağla* is green from the word;
six pictures of the clothes and you know instantly. Copy puts the complete overrides file on
the clipboard.

**`scripts/colour-coverage.mjs`** (new, `npm run colour:coverage`) — coverage plus the top
unmapped suffixes. The evidence tool, re-runnable after any refresh, since coverage is a
property of the catalogue and the catalogue moves nightly (§10.35).

**`lib/compactCatalogue.ts`** — a `colours` dictionary in canonical order plus a
`rows.colourIdx` integer column, mirroring `hijabTypeFilters` / `hijabTypeFilterIdx` exactly.
Derived at encode time, so Invariant 16 is untouched: no field on `Product`, no string on a row
or a card, and no re-scrape needed for a vocabulary change (contrast §10.12, where a correct
fix to `normalize.ts` changed nothing for weeks).

**`components/IndexPanel.tsx`** — `FilterDropdown` options take an optional `swatch` and draw a
bordered dot. The border is on *every* swatch, not only the pale ones: white and cream vanish on
parchment without it, and applying it selectively would shift those labels by a pixel.

**`components/FilterableGrid.tsx` / `components/DirectoryBrowser.tsx`** — the Colour chip, on
every lane page and on `/directory`. They duplicate the plumbing deliberately: the Brand filter
is already byte-identical across them, so matching it is consistency, not new duplication.

## Verification

**Coverage, measured 2026-08-29 via `npm run colour:coverage`:**

```
published rows : 18908
with a family  : 13632  72.1%
```

**Tests:** 93 passing across `lib/colour.test.ts` and `lib/compactCatalogue.test.ts`; 988 in the
full suite. `npx tsc --noEmit` and `npm run lint` both exit 0.

**Payload:** `/directory`'s RSC payload 627,318 B → 650,838 B, **+23,520 B over 9,487 rows =
2.48 bytes per row** — arithmetically one small integer, which a per-row string could not match
(≥8 B). The plan's "within 2%" gate was written against a stale denominator: an earlier columnar
pass had already cut `/directory` from ~2.36 MB to ~627 KB, so a fixed ~23.5 KB column is a
larger share of a much smaller payload. The absolute figure is what the plan predicted.

**Touch:** `npm run audit:interaction` passes 0 problems, 4 widths × 2 engines, plus a bespoke
probe written for this feature that taps the Colour chip and confirms it opens and filters
(16 rows, 15 swatches, 9,487 → 529 on `/directory`) in both engines. §10.25 is exactly this
control on exactly these pages; the check is what turns "should still work on touch" into
"does".

**Cards:** ten cards inspected per surface with Green selected. `/modest-dresses` was 10 of 10.
`/directory` surfaced the two honest classes in "Known imprecisions" below.

**On staging** — `https://themodestyhouse-staging-production.up.railway.app`, deploy `76e63ca`,
driven with Playwright and looked at:

```
chromium desktop  /directory        opened on click: 16 rows, 15 dots, first "ALL COLOURS"
                                    SHOWING 24 OF 9524  ->  24 OF 530   chip "Green"
                                    back to All:        ->  24 OF 9524  chip "Colour"
chromium phone    /modest-dresses   opened on TAP:   16 rows, 15 dots
                                    SHOWING 24 OF 2031  ->  24 OF 110   chip "Green"
                                    back to All:        ->  24 OF 2031  chip "Colour"
```

Six cards inspected in the Green grid: five are unmistakably green (Sage polo dress, LB94 Dress
Dark Green B5, an olive abaya, a sage skirt, an emerald embroidered abaya). The sixth is
"Olive Chiffon Co-ord Set" — the mis-photographed product described below, reproduced live.
`x-robots-tag: noindex, nofollow, noarchive` confirmed on staging.

**A note on the marker, because it cost 13 minutes.** The first deploy check polled for the
string "All colours", found nothing, and read as "not deployed" — while the deploy had in fact
landed. "All colours" lives inside the Base UI popup, which is portalled and only mounted when
the menu opens, so it is never in server-rendered HTML. §10.47 rule 3 says to prove a marker is
a discriminator: it was confirmed ABSENT on production but never confirmed PRESENT where the
change is, which is the half that matters. The honest markers are `>Colour<` (the chip trigger)
and `colourIdx`, both server-rendered, both 1 on staging and 0 on production, and `/directory`
at 893,429 B against production's 869,479 B.

## Two bugs in the plan, both found by review rather than by its author

1. **A `null` override was ruling out the product, not the suffix.** The plan spec'd an
   immediate return, which also suppressed the body pass — so 64 rows lost a colour their own
   title states (`Luxury Black Cascade Four Piece Abaya Set - LIMITED EDITION` → nothing).
   A null means "this *suffix* is not a colour". Corrected; +64 rows.
2. **A switched-off weak word was abandoning its whole family.** `continue` moved to the next
   family, and `re.exec` had already consumed the first match, so `"rose": null` cost 16 rows
   titled "Rose Pink …" their pink entirely. A suppressed word must cost only itself.
   Corrected; +16 rows.

Both were in the plan's own code blocks. Neither was caught by writing them; both were caught
by a reviewer measuring what the code did to the real catalogue.

## Known imprecisions, stated rather than hidden

- **27.9% of products carry no colour** and filter out of every chip except "All colours". Same
  contract the shipped `dressSubtypeIdx` filter already runs at 80% unclassified — but a
  shopper's prior for "Black" is stronger than for "Type", so it is worth Tina knowing.
- **Two-tone titles land on whichever family sorts first.** 20 rows carry an explicit `x` / `&`
  marker — "Classy Liquid F25 – Black x Red" → Red, "Fiona in Black x Green" → Green. 0.1% of
  the catalogue, documented at `lib/colour.ts:70-75`, left alone deliberately: reordering
  `RULES` moves hundreds of classifications.
- **One product is shown in the wrong colourway by its own brand.** "Olive Chiffon Co-ord Set"
  is photographed in white (`…/OliveSetWhite1._Resized.jpg`), so a cream set appears on the
  Green grid. Nothing downstream of the feed can see this — the classifier reads the title by
  design and `pickImage` chooses the photograph.
- **A misspelt family in `data/colour-overrides.json` now throws at build time**, naming the
  file. It previously put `null` into a `number[]` column and silently dropped those products
  from every chip — the exact opposite of the edit's intent, and invisible on staging because CI
  runs only on `main` while the house protocol verifies on staging first.


## The 4,263 with no colour — measured, and deliberately left

Tina, 2026-08-30, asked to stop here. Recorded so nobody re-derives it.

**3,949 of the 4,263 have no colour anywhere in the title** — no colourway suffix
and no colour word. The title is a pure style name ("Aaliyah Dress"). The other
314 carry a suffix that was judged not to be a colour at all: a garment, a
fabric, or a product code.

It is concentrated in houses that simply do not name colours:

```
Ria Miranda       263 of  266   99%
Glow Modesty      127 of  161   79%
Modesty in Style  230 of  295   78%
Bait Hanayen      109 of  140   78%
The Golden Dune   107 of  140   76%
Aeon Abaya        501 of  690   73%
Touché Privé      156 of  213   73%
MERRACHI          243 of 1064   23%
Aab               199 of  666   30%
```

For these the photograph is the only source, and there is no shared NAME to key
an answer on — each product would be its own decision. That means a per-PRODUCT
override map rather than the per-term one, and unlike a term entry, a product
entry does not survive a house deleting and re-adding an item. That maintenance
property, not the accuracy, is the reason this was left.

Two routes remain open if it is ever worth it:
- machine-read all 4,263 at the measured 74% per photograph (~1 hour of compute,
  ~1,100 landing on a neighbouring shade), on the argument that 74% shown beats
  0% shown;
- or read them by eye on contact sheets — 142 sheets at 30 per sheet.

## How wrong is what shipped, measured

400 products sampled, each photograph read independently and compared to the
chip the site puts it on:

```
photo agrees exactly    68.4%
adjacent disagreement   22.5%   beige/cream, blue/grey - not noticed
far disagreement         9.1%   the set a shopper would call broken
```

**The 9.1% is an upper bound, not the answer.** The photo reader is itself only
74% accurate, so a disagreement only says one of the two is wrong. Reading all
25 far-disagreement examples by hand: **24 of 25 are the reader erring, not the
site** — "Elastic Waist Wide Leg Trousers - Navy Blue" filed navy and read as
beige, "Fuchsia" filed pink and read as grey, "Celia Denim Skirt" filed blue and
read as white. In nearly every case the brand states the colour in its own title
and the site has it right; the reader is thrown by a white top, a flat-lay or a
busy background.

The genuinely-wrong-and-visible rate is therefore around **1%**, not 9%.

## Notes / follow-ups

- **`colour-review.html` is waiting for Tina.** 858 terms; skipping is a valid answer and the
  page says so. Her answers go in `data/colour-overrides.json` and raise coverage without any
  code change.
- The vocabulary rejected `linen`, `satin`, `natural`, `smoked` and `mink` — fabrics and
  finishes, not colours. That rejection list is the most valuable thing in `lib/colour.ts`,
  because it is what stops the next person adding them back.
- Executed with subagent-driven development: 8 tasks, 21 subagents, 6 review cycles, 15 commits.
  The full ledger, including every deferred Minor finding, is in `.superpowers/sdd/progress.md`.
