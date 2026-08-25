# Fall Essentials — the third edit
**Date:** 2026-08-25 · **Status:** partial (live on staging; hero and picks still open)

## Goal

A third `/edits/` page beside Everyday Lace and Jersey Hijabs, built from Tina's
12-panel moodboard (`flyingworm1376`) and her fall colour-palette card, both
supplied 2026-08-25.

Spec: `docs/superpowers/specs/2026-08-25-fall-essentials-edit-design.md`
Plan: `docs/superpowers/plans/2026-08-25-fall-essentials-edit.md`

## What it is

Read together, the moodboard and the palette describe something narrower than
"autumn clothing": **an outfit kit — a layer, a blouse, a bottom — in six
colours.** Gilet appears on 4 of 12 panels, "blouse pop of color" on 5, a striped
long sleeve on 2 more.

Tina's own additions, verbatim: *"The striped ones are really, really popular"* ·
*"coat cords, sets that are a little bit thicker in texture, thick trousers, and
pop-of-color blouses"* · *"Denim skirts, capes, and outerwear, but not too thick,
so you can think about trench coats, balloon skirts, and A-line skirts"*.

That last clause is a real constraint, not colour: this is a **transitional**
edit. Trench weight, not puffer weight.

## What changed

**`lib/edits.ts`** — all of it additive:

- `NOT_A_GARMENT` extended with `undercap` / `under-cap` / `underscarf` /
  `bonnet` / `hijab cap` / `cap grip`. Needed because this edit's hijab rule is a
  COLOUR rule, so "Velvet Cap Grip - Rust" and "Full Coverage Hijab Cap -
  Mulberry" reach it on their colour alone and nothing about fabric or garment
  stops them.
- `CAPE_SLEEVE`, `TOO_THICK`, `TSHIRT` — new guards.
- `FALL_PALETTE` — Tina's six colours as six families of the words brands
  actually write, plus `IN_FALL_PALETTE`.
- `FE_LAYER` / `FE_TOP` / `FE_BOTTOM` / `FALL_TROUSER` — the three buckets.
- The `fall-essentials` entry in `EDITS`.

**`lib/edits.test.ts`** — a `Product` factory matching `lib/specialty.test.ts`'s
convention, plus 17 new assertions across three describes.

The route, the homepage banner and the footer link all came free: every surface
iterates `EDITS`. No new component, route or CSS.

### The design decision worth keeping

**Two gates, not one.** Asked whether hijabs belong, Tina said: *"im gonna send
you a photo of the color pallate i want you to take that and take hijabs with
that vibe"*. So clothing is gated by the moodboard's garment vocabulary and
hijabs are gated by the palette. `includeHijabs` is set for a different reason
than the other two edits — not because the theme happens to include scarves, but
because the theme IS a colour story and the scarves are where a colour story
lives.

### Five false positives caught before shipping

Every rule here is an unanchored keyword over third-party titles — §10.10
territory. Checked against real titles, not assumed:

| rule | what it would have done |
|---|---|
| `\bcape\b` | 227 in-stock matches, almost all **cape-*sleeve*** dresses and abayas ("Crystal Beaded Waist Cape Sleeve Maxi Dress(MS499)", "Cape Swim Dress - Earth"). The edit's biggest bucket would have been dresses. |
| `\bcord\b` | "Long Neck Cover - Bungee Cord", "Cord Belt Detailed Lace Blouse". Only `corduroy` counts. |
| `almond` (camel) | "Almond green premium jersey hijab" — green. |
| `butter` (cream) | "Butter Yellow" — the spring colour. |
| `\bcap\b` | Tried as the cap guard and **rejected**: it kills every "Cap Sleeve" garment in the catalogue. Each term is spelled out instead. |

And one removed in the other direction: `quilted` was in `TOO_THICK` on the first
pass and took out the quilted wool gilet that is **panel 3 of Tina's own
moodboard**. A quilted gilet is the piece; a quilted parka is not.

## Verification

`npx tsc --noEmit` → exit 0.
`npm run lint` → exit 0, no output.
`npm test` → **47 files, 773 tests, all passing.**

The edit's own numbers, from `productsForEdit()` against the live catalogue:

```
total 3429 brands 83
{ hijab: 884, top: 1450, trousers: 526, dress: 157,
  skirt: 255, abaya: 107, set: 50 }
```

Palette coverage, measured over in-stock hijabs: olive 281 · chocolate 241 ·
cream 184 · burgundy 141 · camel 141 · rust 86. Union **1,060 of 5,031**.

### On staging

`git merge-base --is-ancestor HEAD origin/staging` → landed, `bcca6e5`. A clean
`push` exit code is not evidence (§10.17).

`https://themodestyhouse-staging-production.up.railway.app/edits/fall-essentials`
returned 404 for ~100s after the push and then 200 — i.e. the deploy had not
finished. Worth writing down because §10.23 is exactly this: check the boring
explanation before theorising.

Rendered in Chromium at 1440x1000 and at iPhone-13 size, and **looked at**, not
just probed (§10.22):

```
body bg (css loaded?): rgb(250, 247, 241)   <- --parchment, so the CSS really loaded
h1: "Fall Essentials"
h2s: ["How to build a fall outfit"]
cards: 24    imgs: 27    broken: []
storyLinks: /blazers-vests, /jackets-coats, /modest-skirts, /directory
console errors: 0
homepage edit links: /edits/jersey-hijabs, /edits/everyday-lace, /edits/fall-essentials
```

`x-robots-tag: noindex, nofollow, noarchive` confirmed on the new route.

The stylesheet assertion is there deliberately — §10.24 and §10.26 are both
"a render with no CSS still returns numbers".

**34 requests reported as failed** were Next's `_rsc=` route prefetches, cancelled
when the browser closed. Not page errors. Flagged rather than omitted, because a
count in a log that nobody explains is the kind of thing that gets cited as a
defect later.

## Notes / follow-ups

**1. The hero is a PLACEHOLDER.** It is the Everyday Lace pair, reused — so the
homepage currently shows the same photograph on two banners. That is deliberate:
a placeholder that could be mistaken for a finished choice is the more expensive
mistake. Tina's own shot replaces it.

To swap: replace `image`, `imageMobile`, `imageRatio`, `imageMobileRatio`,
`imageWidths`, `imageMobileWidths` and `imageAlt`. **Measure** the real pixel
ratios rather than rounding — the box takes the photograph's shape so nothing is
cropped, and a wrong ratio starts cropping silently instead of failing. Run
`node scripts/optimise-images.mjs` and list only the widths it actually
generated; that script never upscales, so an unavailable width is a 404 inside
the srcset. Give the files NEW names — `public/` is served with a 4h cache and is
not fingerprinted (§6, §10.21).

**2. `productIds` is not set** — the grid is the automatic fallback. Tina picks in
`/staff/curate`. On receipt: verify every id resolves and is in stock, reorder so
no house sits adjacent and hijabs are spread rather than bunched, and let
`lib/edits.test.ts` assert both rather than checking by eye.

**3. The styling copy is a DRAFT.** Assembled strictly from things Tina said on
2026-08-25 and marked as a draft in the file. §10.18: the mechanism is mine, the
voice is hers. It is deployed to staging so she can read it in place; that does
not make it approved.

**4. An activewear exclusion was considered and deliberately NOT added.** The
first card in the fallback is a sports hijab, which reads off-vibe. Both
candidate fixes were measured first (§10.31 rule 2 — a tightening rule deletes
products, so measure what stops matching):

- `!isActivewear(p)` removes **37**, including Niswa's "Tamara Knit Two Piece
  Matching Set - Chestnut", "Olivia Knit Trouser - Chocolate" and "Luna Textured
  Ridge Knit Two-Piece Set - Espresso" — precisely the "sets that are a little
  bit thicker in texture" Tina asked for, in palette colours.
- A narrow sport-word rule removes **16**, and still takes "Oversize Sports Cotton
  Trench Coat - Camel", which is a trench in camel, i.e. the brief.

Neither is a win. One sports hijab landing first is an ordering accident in a
fallback that hand-picks replace. Recorded so nobody re-derives it.

**5. Fall vs Autumn.** The title says *Fall*, the eyebrow says *Autumn 2026* to
match its two siblings. Flagged to Tina; unchanged unless she says so.

**6. SEO copy is not volume-backed.** The Jersey Hijabs `seoTitle` was written
against measured Google Trends comparisons. This one was written to the edit's
own vocabulary, and that difference should not be papered over — worth a Trends
pass before this reaches `main`.

**7. A plan expectation was wrong, not the code.** The plan said `npm run build`
should report 33 routes, one more than the documented 32. It does not:
`/edits/[slug]` is a dynamic route *pattern*, so adding an edit does not change
the route count. The build succeeds and the page serves; the expected output was
mine and was wrong.

## Not merged

`main` needs Tina's explicit approval, every time (§1). This is staging only.
