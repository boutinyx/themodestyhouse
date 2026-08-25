# Fall Essentials — the third edit

**Date:** 2026-08-25 · **Status:** design, approved in outline · **Owner decision-maker:** Tina

## Goal

A third entry in `EDITS` (`lib/edits.ts`), slug `fall-essentials`, alongside
`everyday-lace` and `jersey-hijabs`. It gets `/edits/fall-essentials`, a homepage
banner slot and a footer link for free — the route, the components and the SEO
plumbing already exist and this spec adds no new ones.

## What the edit is

Tina supplied a 12-panel moodboard (`flyingworm1376`) plus a fall colour palette
card. Read together they describe something narrower than "autumn clothing":

**An outfit kit — a layer, a blouse, a bottom — in six colours.**

The moodboard's recurring vocabulary, counted across all twelve panels:

| piece | appearances |
|---|---|
| gilet / oversized vest | 4 |
| blouse, usually "pop of color" | 5 |
| striped long sleeve | 2 (+ Tina: "the striped ones are really, really popular") |
| sweater — V-neck, long, oversized cardigan, chunky turtleneck | 4 |
| jeans | 3 |
| trousers — wide, thick, brown | 2 |
| skirt — A-line, satin maxi, denim, balloon | 3 |
| cape | 1 |
| coat / trench / corduroy | 2 |
| pop-of-colour shawl | 1 |

Tina's own additions, verbatim:

> The striped ones are really, really popular.
> What can be really good for fall are coat cords, sets that are a little bit
> thicker in texture, thick trousers, and pop-of-color blouses.
> Denim skirts, capes, and outerwear, but not too thick, so you can think about
> trench coats, balloon skirts, and A-line skirts.

Note the constraint hiding in the last line: **outerwear, but not too thick.**
This is a *transitional* edit — trench weight, not puffer weight. Teddy, sherpa,
padded and puffer pieces are deliberately out even though the catalogue has them.

### The palette

From Tina's palette card, "the shades that make any outfit look expensive this
season": **Burgundy · Chocolate · Olive · Camel · Cream · Rust.**

## Design decisions

### 1. Flat grid, not grouped

One continuous run of pieces with layers, blouses and bottoms interleaved —
identical to the other two edits. Tina chose this over a grouped
"The layer / The blouse / The bottom" layout.

Why it matters: grouping would mean new component work in `EditStory` and would
make this edit structurally different from its two siblings for no reader
benefit. A flat grid reads as a mood; a grouped one reads as a checklist.

### 2. Two different gates for two kinds of piece

Tina, asked whether hijabs belong: *"im gonna send you a photo of the color
pallate i want you to take that and take hijabs with that vibe"*.

So the `match` predicate is **not** one rule:

- **Clothing** is gated by the moodboard's garment vocabulary (gilet, knit,
  trench, blouse, stripe, wide-leg, A-line, balloon, satin, denim…).
- **Hijabs** are gated by the *palette* — any hijab whose title names a colour in
  one of the six families.

`includeHijabs: true`, for the reason the flag's own doc comment gives: an edit is
a theme, and here the theme explicitly reaches the scarves. Invariant 5 stands for
mixed *category* grids; this is the documented per-edit exception.

### 3. Colour families, not literal colour names

Brands do not write "burgundy" — they write mulberry, fig, damson, wine. Each
palette colour is therefore a family of the words brands actually use, derived by
reading real catalogue titles rather than from a colour theory list.

Measured against the live catalogue (in stock, 2026-08-25):

| family | terms | hijabs | brands | all garments |
|---|---|---|---|---|
| Olive | olive, khaki, sage, moss, forest, pistachio, army, fern | 281 | 40 | 999 |
| Chocolate | chocolate, cocoa, espresso, coffee, mocha, walnut, chestnut, truffle | 241 | 34 | 700 |
| Cream | cream, ecru, ivory, oatmeal, bone, milk, vanilla, off-white | 184 | 41 | 799 |
| Burgundy | burgundy, bordeaux, merlot, maroon, wine, cherry, plum, aubergine, fig, mulberry, berry | 141 | 33 | 541 |
| Camel | camel, caramel, toffee, tan, honey, biscuit, latte, cappuccino | 141 | 32 | 353 |
| Rust | rust, terracotta, brick, copper, cinnamon, burnt orange, amber, clay, ochre, sienna, auburn | 86 | 31 | 197 |

**Union: 1,060 of 5,031 in-stock hijabs.**

### 4. False positives found and excluded

Every rule here is an unanchored keyword over third-party titles, which is
CLAUDE.md §10.10 territory. Checked before shipping, not after:

- **`cape` is a trap.** 227 in-stock matches, and almost all are *cape-sleeve*
  dresses and abayas ("Crystal Beaded Waist Cape Sleeve Maxi Dress", "Cape Swim
  Dress"), not the outerwear cape in the moodboard. Excluded via
  `cape[-\s]?sleeve|cape (dress|abaya|top|maxi)|butterfly cape`.
- **`cord` is a trap.** 35 matches include "Long Neck Cover - Bungee Cord",
  "Elegant Waistcoat with Waist Cord", "Cord Belt Detailed Lace Blouse". Only
  `corduroy` counts.
- **`almond`** dropped from the camel family: "Almond green premium jersey hijab"
  is green.
- **`butter`** dropped from the cream family: "Butter Yellow" is the spring
  colour, not cream.
- **Caps, grips and undercaps** reach the palette rule and are not hijabs —
  "Velvet Cap Grip - Rust", "Full Coverage Hijab Cap - Mulberry", "Adjustable Tie
  Underscarf". `NOT_A_GARMENT` currently catches `\bgrip\b` only; it needs
  `undercap`, `under-cap`, `underscarf`, `cap grip`.
- **Thickness ceiling.** `teddy|sherpa|borg|puffer|padded|quilted` excluded, per
  "outerwear, but not too thick".

### 5. Trousers need a fall signal

The naive trousers bucket is 1,392 pieces — effectively every trouser in the
catalogue, summer linen included. It is narrowed to titles carrying a fall
signal: wide-leg, pleated, tailored, corduroy, wool, denim, thick.

## The match predicate (fallback only)

```
fallEssentials(p) =
     !NOT_A_GARMENT(p.title)
  && !TOO_THICK(p.title)
  && (
       // hijabs: gated by palette
       (p.garment === 'hijab' && PALETTE(p.title))
       // clothing: gated by moodboard vocabulary
    || (LAYER(p) || TOP(p) || BOTTOM(p))
     )
```

This is the **fallback**, not the shipped grid. Both existing edits ship
`productIds` — Tina's own picks from `/staff/curate` — and `match` exists so the
page is never empty and so a new edit has something to start from.

Bucket sizes as specified (in stock, 2026-08-25):

| bucket | count | brands |
|---|---|---|
| Gilets & vests (garment top/set) | 222 | 21 |
| Knits, cardigans, sweaters, turtlenecks | 737 | 45 |
| Trench, corduroy, real capes, ponchos | 271 | 42 |
| Blouses, stripes, long sleeves (not t-shirts) | 831 | 53 |
| Trousers & jeans (before the fall-signal narrowing) | 1,392 | 55 |
| Skirts — A-line, balloon, satin, denim | 170 | 31 |
| Hijabs in palette | 1,060 | ~50 |

## Curation

Tina picks in `/staff/curate` and sends the list. On receipt:

1. Every id is verified to resolve against the live catalogue and be in stock.
2. Reordered so **no two pieces from the same house sit adjacent** — the greedy
   interleave used for the jersey edit.
3. Hijabs **spread rather than bunched**, the rule she gave for the lace edit
   ("mix the hijabs up dont put them all next ot eachother"). Unlike Jersey
   Hijabs, that rule *is* satisfiable here, because this edit is mostly clothing.
4. Both properties asserted in `lib/edits.test.ts`, not checked by eye.

## Hero

**Placeholder for now**, at Tina's choice — the page gets built and reviewed with
a temporary hero, and her own shot is swapped in before it goes live.

When the real pair arrives it needs, per the `Edit` type's own doc comments:
a desktop landscape *and* a separate portrait crop for phone (not the landscape
squeezed), their real measured pixel ratios, and the srcset widths
`scripts/optimise-images.mjs` actually generated. New filenames on every
replacement — `public/` is served with a 4h cache and is not fingerprinted
(CLAUDE.md §6, §10.21).

## Copy

`title: 'Fall Essentials'` — Tina's words, chosen over three proposed alternatives.

`eyebrow: 'The Edit · Autumn 2026'`, matching both siblings. Noted: the title says
Fall and the eyebrow says Autumn. Left as-is for consistency with the existing
edits; Tina's call if she wants them aligned.

The **styling block is drafted, not authored.** CLAUDE.md §10.18: brand copy is
Tina's product, and nothing ships in her voice that she has not approved. The
draft is built only from things she has actually said — striped is popular,
texture over thickness, trench-not-puffer, pop-of-colour blouse — plus facts that
change a buying decision, in the ~150-word shape she cut the jersey block down to
("nobody is reading that shit i want you to only write what people will care
about").

`seoTitle` / `seoDescription` written to the query the page is for, once the
term sizing is checked — not assumed.

## Out of scope

- No new route, component or CSS. If this edit seems to need one, that is a
  signal the design drifted.
- No grouped/sectioned grid (decided against above).
- The shared glossary of "structure / proportion / silhouette" that Tina raised
  during the lace edit is still unbuilt and still out of scope here.

## Verification

- `npx tsc --noEmit` clean
- `npm test` — including `lib/edits.test.ts`: every picked id resolves and is in
  stock; no adjacent same-house pair; hijabs spread
- `npm run lint` clean
- Negative controls for each new regex: a known-good positive *and* a known-good
  negative, run through the real entry point rather than the regex alone (§10.31)
- Rendered on **staging** (`https://themodestyhouse-staging-production.up.railway.app/edits/fall-essentials`),
  not localhost, per the §1 ship protocol
