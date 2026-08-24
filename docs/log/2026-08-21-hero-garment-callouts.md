# Hero garment callouts — "BRAND: <house>" leader lines on the homepage photo
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina sent a mockup of the hero carrying two annotation callouts — a label, a
hairline leader, and a dot on a garment ("KHAIR / Satin Silk Hijab", "HANAA
ATELIER / Draped Satin Abaya") — and asked to recreate them on the real hero:
*"you see the arrows that say hanna atielier i want you to recreate that but
maybe a differnt name and before we name the brand we say brand: ..."*, then
*"i want you to do it exactly the same as this one."*

## What changed
- **`components/HeroCallouts.tsx`** (new). Two callouts over the hero photo.
  - **Names are real houses from `data/brands.ts`** — Khair Archives and Ellem
    Atelier — not the mockup's invented "Hanaa Atelier". Same honesty standard
    `HeroBrandStrip` and the "100+ independent modest brands" subhead were held
    to. Flagged to Tina: the hero is a generated editorial image, so these read
    as "the kind of thing this house makes", not as a product credit. Swapping a
    name is a one-line edit to `CALLOUTS`.
  - Styling measured off the mockup at 4x crop rather than eyeballed:
    left-aligned label, house name in `--font-ui` (the mockup's label type is a
    geometric sans, NOT the site's usual Marcellus) at 12px / 0.22em tracking,
    piece name under it at 14px and softer, leader leaving the right of the
    house-name line, and a 7px solid white dot.
  - The upper callout **bends** once (horizontal, then diagonally down) because
    its dot does not sit on the label's own line — matching the mockup's upper
    callout; the lower one runs straight, matching the mockup's lower one.
  - **Geometry:** the hero `<img>` is `object-cover` and the source
    (5461x2472, 2.21:1) is wider than any real viewport box, so it is always
    height-constrained — the crop is horizontal-only and centred. A percentage
    of the hero BOX is therefore not a percentage of the PHOTOGRAPH. The
    component renders an inner div that reproduces the cover rectangle exactly
    (full height, source aspect ratio, centred), so every coordinate is a
    percentage of the photo and lands on the same pixel of satin at every width.
  - The leader is an `<svg>` in that same 0-100 space with
    `preserveAspectRatio="none"` + `vectorEffect="non-scaling-stroke"` (a
    hairline despite the non-uniform scale). The dot stays an HTML element — a
    `<circle>` in that space would render as an ellipse.
  - `pointer-events-none`, so it can never swallow a click meant for the
    headline's Shop/Designers links. `hidden lg:block` — on a phone the photo is
    cropped to a narrow centre strip and the labels would land on the headline.
  - Server component: static strings and CSS, no state.
- **`app/page.tsx`** — import + render, between the darkening overlay and the
  copy block.

## Verification
- `npx tsc --noEmit` → exit 0, no output.
- `npx eslint components/HeroCallouts.tsx app/page.tsx` → exit 0, no output.
- Playwright screenshot of `localhost:3000/` at 1440x820, then a 4x crop of the
  upper callout, to confirm each dot lands on the intended fabric rather than on
  a face, an earring or the gap between the two models. First pass put dot 1 in
  the gap between the women and dot 2 on the lilac dress instead of the plum
  cape; both were moved and re-shot. Final: dot 1 on the lilac hijab satin below
  the earring, dot 2 on the plum cape.
- Console at load: one pre-existing Base UI `nativeButton` warning (the nav /
  currency triggers), nothing from this change. That is what the dev overlay's
  "1 Issue" badge in the screenshots is.

## Notes / follow-ups
- Coordinates are hand-tuned to **this** hero photograph. Swapping
  `hero-home-10` for another image means re-tuning `dotX`/`dotY` — they are
  percentages of the photo, not of anything the layout derives.
- Not wired as links. The houses named are real and both have directory pages,
  so making each callout an internal link is available if Tina wants it; she
  asked for the mockup's treatment, which is static text.


## Second pass — measured, not eyeballed
Tina: *"dont listen to what i said i want you to do it exaclty thesame so
placmenet the color."* The first pass matched the mockup's idea but not its
numbers. Re-measured the screenshot with `sharp`, in full-resolution pixels
halved into CSS px (it is a 2x retina capture), and moved everything onto the
mockup's own figures.

Mockup hero box: x 203..2797, y 365..1825 full-res = **1297x730 CSS**, close
enough to the live hero (1440x724 at the width this was checked at) that its
horizontal label positions and leader heights transfer directly.

| | mockup (CSS, from hero's top-left) | applied |
|---|---|---|
| upper label x | 589 | 589 (was 672) |
| lower label x | 467 | 467 (was 672) — the two labels are **staggered**, not aligned |
| upper leader y | 150 | 150 (was 217 — it sat beside the headline; the mockup's is above it) |
| lower leader y | 516 | 516 |
| upper leader | 44px horizontal, then a bend down ~30° | same |
| lower leader | dead straight | same |
| dot | 9 full-res px = **5 CSS px** | 5 (was 7) |
| house name | 12px, 0.22em tracking | unchanged |
| piece name | 15px, 9px below | 15 (was 14) |

Colours were **sampled**, not chosen:
- leader reads `(135,115,100)` over a `(51,26,11)` background → white at **0.40
  alpha** (was 0.5).
- the piece line is **not** the same colour as the house name: it peaks at
  `(216,209,222)`, a light lilac (`#d8d1de`), against the house name's
  near-white `(248,247,245)`. The first pass had both as the same parchment.

**The one thing that cannot be copied:** the dot coordinates. The mockup's frame
holds the models further left than ours does, so its dot x (54.7% / 49.8% of the
hero) lands in the empty corridor here. Each dot is instead placed on the same
GARMENT at the same HEIGHT — 22.7% against the mockup's 22.45% for the hijab —
which is what makes the bend read the same. Verified by 4x crop: the dot sits on
the lilac satin above her brow, and the leader clears her face.

`npx tsc --noEmit` and `npx eslint components/HeroCallouts.tsx` both clean after
the change.

**Still carrying the `Brand:` prefix** she asked for in the first message, so the
labels read `BRAND: KHAIR ARCHIVES` rather than the mockup's bare `KHAIR`. That
is the one deliberate departure; flagged to her.


## Third pass — size, subject, and the prefix
Tina: *"no look at the size of the letters, and look they are only at the light
purple woman i said you can keep the "brand:" away see how they make one word
purple."* Four corrections, all of them things a numbers-only reading of the
mockup had missed:

1. **Type size.** Settled by cropping the same hero-relative box out of both
   images at a matched scale and stacking them, rather than by arithmetic —
   two earlier estimates disagreed with each other because the mockup's face is
   not Jost and cap-height maths does not transfer between typefaces. Side by
   side, the live text was **~18% too large**: house name 12px -> **11px**,
   piece name 15px -> **13px**, gap between them 9px -> **5px**. After the
   change "Satin Silk Hijab" is the same size in both crops.
2. **Both callouts belong to the FRONT model.** The mockup credits one woman's
   two garments — her hijab and her abaya — and never labels the model behind
   her. The lower dot moved off the plum cape onto the lilac satin (74% -> 54.25%
   of the photograph). Verified by 4x crop: it sits on the satin, not in the
   shadow beside it.
3. **`Brand:` prefix dropped** — the labels now read `KHAIR ARCHIVES` /
   `ELLEM ATELIER`, matching the mockup. Shortening them also lengthened both
   leaders, which is closer to the mockup's proportions.
4. **Piece colour pushed further lilac**, `#d8d1de` -> `#dcd6e9`, derived by
   taking the ratio of the mockup's piece-text peak `(216,209,222)` to its
   house-name peak `(250,249,243)` and applying it to white.

Re-checked at **1440, 1920 and 1280**: because the coordinates are percentages
of the photograph rather than of the hero box, both dots stay on the same satin
at all three. `tsc` and `eslint` clean.


## Fourth pass — stacked names, shorter leaders
Tina: *"same name how they are written shorter arrow."*

- **`brand` is now a `string[]`**, rendered one line per entry and stacked the
  way the mockup writes its own long label (`HANAA` over `ATELIER`): `KHAIR` /
  `ARCHIVES` and `ELLEM` / `ATELIER`. The leader attaches to the **last** name
  line, so the block hangs from `-(lines - 0.5) x 16px` rather than a fixed
  offset — 16px being the mockup's own name-line spacing (32px in its 2x
  capture).
- **Leaders shortened** to the mockup's lengths by moving both labels right,
  toward their dots: upper 200px -> **71px** (mockup 65), lower 200px -> **112px**
  (mockup 112). `labelX` 41.7 -> 53 and 34.1 -> 42.9; `lineStart` 49.9 -> 57.9
  and 41.8 -> 47.25. The dots did not move.

Verified by cropping the same hero-relative box out of the mockup and the live
render at a matched scale and stacking them (`cmp2big.png`): stacking, type
size, leader length and dot all line up. Re-checked at 1440, 1920 and 1280.
`tsc` and `eslint` clean.


## Fifth pass — where the dots actually go
Tina, with a zoomed crop of the mockup: *"look where they have placed the
arrowes. 1 next to the head one inside of the elbow. the names need to be like
the photo so khair and hanna."*

The dots were on the garments. In the mockup they are not — and both moved:

- **Upper: beside the head, in the dark, not on the hijab.** Scanned the
  mockup's own pixel row at the dot's height: the background runs dark out to
  x=1665 and the head silhouette begins at 1670, with the dot at 1622 — **23 CSS
  px clear of the head**. The same scan on the live hero puts our silhouette
  edge at x=833, so the dot sits at 805. (`dotX` 62.4% -> 55.19%.)
- **Lower: the inside of the elbow.** On the mockup the dot is on the sleeve's
  inner crease, 41.5 x 67.5 CSS px up-and-left of the waist knot. Scaled by 1.11
  (our hero is 1440 wide against its 1297) that is 46 x 75 from our own knot at
  (785, 715) — so (739, 640). (`dotX` 54.25% -> 51.06%, `dotY` 71.3% -> 76.24%.)
  Verified by cropping both images at the same place: the dot sits just inside
  the sleeve's leading edge with the knot below-right, in both.
- **Names written as the photo writes them**: `KHAIR` on one line (was `KHAIR` /
  `ARCHIVES`), `ELLEM` / `ATELIER` on two, matching the mockup's `KHAIR` and
  `HANAA` / `ATELIER`.

Labels followed their dots left, keeping the mockup's leader lengths (65px upper
with its bend, 112px lower, straight). `tsc` and `eslint` clean.

**Open question raised with Tina:** she wrote "khair and hanna". `Khair` is the
real house (`khair-archives`) shortened; **`Hanaa Atelier` is not a house that
exists**, so the second label used `Ellem Atelier` — a real one in the same
two-line shape. **Answered in the seventh pass below: she wants the mockup's
name.**


## Sixth pass — back to two rows
Tina: *"nvm 2 rows revert back."* Read as: undo the previous pass's shortening of
the house name to a single row. `KHAIR` -> `KHAIR` / `ARCHIVES` again, so both
labels are two-row names once more. The dot placements from the fifth pass (beside
the head, inside the elbow) are untouched — only the name and the label's own x
moved, 47.75% -> 46.2%, to keep the leader at the mockup's 65px now that the last
name line is wider. `tsc` and `eslint` clean.

Unrelated, noted rather than touched: the hero headline read "Everything modest."
in every screenshot above and now reads "Every modest brand." — another session's
edit to `app/page.tsx` landed mid-task. Left alone (CLAUDE.md 10.30).


## Seventh pass — the mockup's own names, at Tina's direction
Tina: *"it should be haana & stuff you need to change the names."* Asked after
being told plainly that Hanaa Atelier is not a real house, so this is her
decision, taken with that fact in hand:

- upper label: `KHAIR` (one row — the mockup's form; `Khair Archives` shortened,
  so this one is still a real house), `labelX` 46.2% -> 47.75%
- lower label: `ELLEM` / `ATELIER` -> **`HANAA` / `ATELIER`**, a name that exists
  nowhere in `data/brands.ts`. `labelX` unchanged at 39.7% — `ATELIER` is still
  the last row, so the leader length is untouched.

The component's docblock previously asserted "HOUSE NAMES ARE REAL"; that claim
is now false and was rewritten rather than left to rot, recording both what is
invented and whose call it was. `HeroBrandStrip` immediately below still scrolls
the real 113 names, so the hero is not wall-to-wall invented — but this is the
one label on the site that does not correspond to a house anyone can click
through to.

`tsc` and `eslint` clean.


## Eighth pass — brand banner removed, dev-overlay warning fixed
Two separate asks the same night.

**"can you get rid of the banner with the brands."** `HeroBrandStrip` is no
longer imported or rendered in `app/page.tsx`. The component file is **left on
disk un-imported**, the same way `lib/vibes.ts` was kept when the Aesthetic
filter came out — putting it back is one import and one line rather than a
rebuild. Nothing else referenced it.

**"cna you get rid of the lint."** `npm run lint` was already exit 0 — what she
was seeing is the Next dev overlay's "1 Issue" badge, which is a *console* error,
not a lint one:

> Base UI: A component that acts as a button was not rendered as a native
> `<button>` ... set the `nativeButton` prop on the component to `false`.

`NavigationMenu.Trigger` defaults `nativeButton = true`, and `components/NavMenu.tsx`
renders it as a `<Link>` (an `<a>`) for groups that carry an `href` — Clothing
points at /directory. Fixed with `nativeButton={!entry.href}`, tied to the same
expression that decides the `render` prop so the two cannot drift apart. Groups
without an href stay real buttons, which is what keeps them openable by tap
(CLAUDE.md 10.25).

Verified with Playwright, loading `/` and hovering the Products group to force
the triggers to mount: **NO console errors or warnings**. `tsc` and `eslint`
clean; `npm run lint` exit 0.


## Ninth pass — softened
Tina: *"can you make the things with the arrows a lil lighter."* Read as less
present against the photograph, not brighter (they were already near-white, so
brighter would have been a no-op). Everything drops roughly a quarter of its
weight while keeping the mockup's own relative hierarchy — name brightest, piece
a shade lilac and softer, leader softest:

| | was | now |
|---|---|---|
| house name | `rgba(251,250,246,0.98)` | `0.78` |
| piece name | `#dcd6e9` (opaque) | `rgba(220,214,233,0.68)` |
| leader | `rgba(255,255,255,0.4)` | `0.28` |
| dot | `#fff` | `rgba(255,255,255,0.8)` |
| text shadow | `rgba(0,0,0,0.65)` | `0.5` |

If she meant lighter LETTERFORMS rather than lighter tone, Jost is loaded as a
variable font (`app/layout.tsx` requests no fixed weight), so `fontWeight: 300`
on the two text rows is a one-line change. `tsc` and `eslint` clean.
