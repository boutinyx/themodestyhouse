# Colour grouping: the separator that excluded two brands, and an editorial choice of which colourway leads

**Date:** 2026-08-28 · **Status:** done

## Goal
Tina, with a link to `tala-premium-ribbed-knit-abaya-espresso`: *"we have multiple colors of
this one can you keep this one and as + more colors and cut the others"*, then the same for
`rana-stripe-abaya-set-taupe`.

The feature she is describing already existed — `lib/colorVariants.ts`, built 2026-08-27 from
her own earlier request, collapses a colour run into one card carrying `+N colours`. It was
not firing on these products, and the reason was punctuation.

## What was wrong
`splitColourSuffix` required whitespace on BOTH sides of the dash:
`/^(.*?)\s+[-–—]\s+([^-–—]{2,25})$/`. Lameera Moda and Zahraa write `"Tala premium Ribbed
Knit Abaya- Espresso"` — no space before the dash — so every one of their colour runs missed
the rule entirely and rendered as N separate near-identical cards.

The fix is `\s*` in place of `\s+`. **The space AFTER the dash stays required**, and that is
what still protects a hyphenated word: in `"Tie-Back Maxi Dress"` the dash is followed by
`B`, so there is no match either way. Both halves have a regression test.

## Measured before shipping (§10.11)
Across the published catalogue, comparing the old rule to the new one rather than only
checking the case that motivated it:

```
current : 1538 groups, 5279 duplicate cards collapsed
relaxed : 1585 groups, 5499 duplicate cards collapsed
delta   : +220 cards collapsed, across 56 groups
318 titles newly split — zahraa 137, lameera-moda 122, dignitii 13, summer-evenings 13, …
```

The failure this module explicitly fears is two *different garments* behind one card. It does
not occur here: every suffix the relaxed rule newly produces that is **not** a colour —
`"Final Sale"` (35 rows), `"maxi dress"`, `"Modal Hijab"` — lands in a group of **one**, so it
collapses nothing. Checked individually rather than asserted.

On the read side, `browseProducts()` goes **9,511 -> 9,468** rows and the cards carrying a
colour count go **1,097 -> 1,123**.

## The second half: which colourway fronts the card
Grouping alone would not have answered her, and this is the part worth keeping. The module
leads each group with whichever member the caller's order puts first — deliberate, and
measured at the time to be visually neutral (colourways are shot identically). But it is
**arbitrary editorially**, and here it disagreed with her: catalogue order puts *Forest green*
first, and she asked for *Espresso*.

So `data/colour-leads.json` — id -> title, the title purely for humans — names the member that
takes the lead slot. It changes **which** member leads, never **where** the group sits, so the
grid's ranking is untouched. Two listed members of one group is a contradiction resolved
deterministically (earlier wins) and caught by a test.

Offered as three options rather than assumed, since cutting the other colourways was her
literal wording and would have been destructive; she chose grouping with Espresso leading, so
nothing is cut and the other colourways stay in the catalogue with their own links.

## What changed
- `lib/colorVariants.ts` — `\s*` separator; `PREFERRED_LEADS` read from the new file; the
  swap keeps `out[at]`'s slot.
- `data/colour-leads.json` — new. Three entries: Tala Espresso, Rana Taupe, Palm Dusty Mauve.
- `lib/colorVariants.test.ts` — 6 new tests.
- `lib/colourLeads.test.ts` — new. Id shape and title presence always; three
  catalogue-dependent checks `skipIf(CI)` per §10.19 and the correction made to
  `lib/dressSubtypes.test.ts` the same day. One of them is worth naming: **a preference on a
  title this module cannot split can never take effect**, and would sit in the file looking
  applied while doing nothing.

**No republish.** `variantCount` is derived at read time and never written to
`data/products.json` (`lib/types.ts` says so). The data file is unchanged; this ships as code.

## Verification
Negative controls run BEFORE trusting the tests (§10.28 rule 1), each reverting one half:

```
old \s+ separator      -> 4 failed | 12 passed
lead override disabled -> 2 failed | 14 passed
both restored          -> 16 passed
```

Against the real catalogue through the actual read path, `browseProducts()`:

```
BEFORE                                              AFTER
Tala …- Forest green  variantCount=1                Tala …- Espresso   variantCount=4
Tala …- Espresso      variantCount=1                Rana …- Taupe      variantCount=3
Tala …- Blue Gray     variantCount=1
Tala …- Black         variantCount=1
Rana …- Koala Gray    variantCount=1
Rana …- Nude Pink     variantCount=1
Rana …- Taupe         variantCount=1
```

Seven cards become two, fronted by the colourways she picked. A third family followed
(`palm-linen-abaya-set-stormy`), 2 cards -> 1.

**Two things worth recording about that third one.** The handle she linked,
`palm-linen-abaya-set-stormy`, belongs to the product *titled* "Palm Linen Abaya Set- Dusty
Mauve" — Lameera renamed the colourway and kept the old URL, so the card's label and its link
disagree by the brand's own doing. And with the leads file emptied, Dusty Mauve **already**
led that group on input order, so this entry pins the existing outcome rather than changing
it. Recorded because an override that happens to agree with the default looks identical to
one that is working, and only one of them would survive a re-interleave:

Nine picks arrived in all. Measured with the leads file emptied and again with it in place,
through `browseProducts()`:

```
with NO leads (input order)              with the file
Tala …- Forest green   x4                Tala …- Espresso        x4   CHANGED
Rana …- Koala Gray     x3                Rana …- Taupe           x3   CHANGED
Naya …- Dusty Teal     x2                Naya …- Desert Sage     x2   CHANGED
Olivia …- Mint Gray    x3                Olivia …- Blush Pink    x3   CHANGED
Cara …- champagne      x2                Cara …- Dusty Rose Pink x2   CHANGED
Palm …- Dusty Mauve    x2                Palm …- Dusty Mauve     x2   no-op, pins it
Kaia …- Dusty Blue     x2                Kaia …- Dusty Blue      x2   no-op, pins it
Laura …- Blush Gold    x2                Laura …- Blush Gold     x2   no-op, pins it
Naomi …- Sage Green    x2                Naomi …- Sage Green     x2   no-op, pins it
```

**Five of the nine entries change the card; four agree with what input order already gave.**
Recorded because an override that happens to match the default looks identical to one that is
working, and only one of them would survive a re-interleave — `interleaveByBrand` rewrites
row order on every publish (§8), so today's accidental agreement is not tomorrow's.

**Two of the eight were resolved by URL handle, not by title, and had to be.** The handles
Tina sent — `palm-linen-abaya-set-stormy` and `laura-wrap-satin-dress-rose-gold` — belong to
products *titled* "Palm Linen Abaya Set- Dusty Mauve" and "Laura Wrap Satin Dress- Blush
Gold". Lameera renamed those colourways and kept the old URLs. Matching on the colour word in
the link would have found nothing, or worse, the wrong sibling.

`npx tsc --noEmit` clean. `npx vitest run` — 933 tests, 932 pass.

## Notes / follow-ups
- **One pre-existing failure, deliberately untouched:** `lib/edits.test.ts` "every hand-picked
  product id still resolves" fails on `zahraa:7389671391319` and `les-atelier:15725952008565`,
  both in `fall-essentials`, both removed by the size-floor rule earlier today. It is
  `skipIf(inCI)` and the remedy its own message prescribes — re-pick in `/staff/curate` — is
  Tina's taste, not something to invent. Flagged to her, left firing.
- The LEADING-colour pattern ("Chocolate Linen Cotton Wrap Top") is still deliberately out of
  scope, for the reason the module already documents: it needs a real colour vocabulary, and
  without one it merges style names like "Tulip"/"Batwing" as though they were colours.
- `data/colour-leads.json` is hand-edited today. If Tina wants to set the lead colour from
  `/staff/curate`, that is a pencil action writing to this file — the shape is already right
  for it.

## Production verification (appended after the merge)

`main` fast-forwarded `7dcc302..64e9a1c`, ancestry asserted. Origin confirmed serving the new
build BEFORE purging (§10.47 — purging first would have re-filled the edge with the old page
for another hour), then `purge_everything` → `success: true, errors: []`.

Canonical URL, real GETs, twice (§10.47 rule 4):

```
pass 1: /modest-dresses 200 | cf-cache-status MISS | age -  | 470,139 bytes
          chosen leads 5/5 | other colourways 0/5
pass 2: /modest-dresses 200 | cf-cache-status HIT  | age 0  | 470,139 bytes
          chosen leads 5/5 | other colourways 0/5
```

And the rendered cards on `https://themodestyhouse.com/designers/lameera-moda`, 110 cards
loaded, each family asserted to appear **exactly once** with the expected badge:

```
OK   Tala premium Ribbed Knit Abaya- Espresso     +3 colours
OK   Rana Stripe Abaya Set- Taupe                 +2 colours
OK   Olivia Wrap Satin Dress- Blush Pink          +2 colours
OK   Palm Linen Abaya Set- Dusty Mauve            +1 colour
OK   Naya Textured Chiffon Dress- Desert Sage     +1 colour
OK   Kaia Textured Maxi Dress- Dusty Blue         +1 colour
OK   Laura Wrap Satin Dress- Blush Gold           +1 colour
OK   Cara Folds Satin Dress- Dusty Rose Pink      +1 colour
OK   Naomi Pleated Skirt- Sage Green              +1 colour
problems: 0
```

**Why the lane page was the wrong place to look, and what it cost.** The first two attempts
at this check ran against `/modest-abayas` and reported the cards ABSENT — one of them after
157 "load more" clicks that left 48 cards on screen, which is not a number the site can
produce. That was the harness, not the site (§10.26): the click loop had no wait for the DOM
to grow and no check that the count moved, so it was clicking into a re-rendering grid and
counting mid-update. Fixed by waiting on
`document.querySelectorAll('[data-surface="product-card"]').length` to actually increase and
bailing when it stops. `/designers/lameera-moda` is also simply the right surface — 110 cards
rather than thousands, so the targets are reachable.
