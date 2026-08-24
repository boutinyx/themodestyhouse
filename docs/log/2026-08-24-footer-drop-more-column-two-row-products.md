# Footer: "More" column removed, Products split into two rows
**Date:** 2026-08-24 · **Status:** done

## Goal
Tina, quoting the footer column back: *"More / Modest Wedding Guest / Modest
Summer Outfits — get these out of the footer and instead break produts into
2 rows."*

## What changed
`components/Footer.tsx` only.

- **Removed the "More" `<Col>`.** It rendered `LANES.filter(kind !== 'category')`,
  which is exactly the two lanes she named — `/modest-wedding-guest` (`occasion`)
  and `/modest-summer-outfits` (`season`). The now-unused `LANES` import went with
  it; `CATEGORY_LANES` is still imported and used.
- **Products now flows into two sub-columns** and takes over the grid track the
  removed column was using. `md:col-span-2` on the column, and the `<ul>` becomes
  `grid grid-cols-1 md:grid-flow-col md:grid-rows-7 gap-x-8 gap-y-2`.
  - `grid-flow-col` + a fixed row count fills **down** the first sub-column then
    down the second (7 then 6). Plain `grid-cols-2` would flow *across* — 1,2 /
    3,4 — interleaving the two halves and making the list unreadable.
  - **Mobile deliberately stays one column.** At 390px each half would be ~150px
    and "Cardigans & Sweaters" wraps to three lines.
- `Col` gained optional `className` / `listClassName` props, defaulting to exactly
  what it rendered before, so the other two columns are byte-identical in output.
  Its `<ul>` no longer hard-codes `space-y-2` — that utility targets adjacent
  siblings and is meaningless once the children are grid items, so an override
  supplies its own `gap-y-*`.
- The grid template `md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]` is **unchanged**: five
  tracks, and Products spanning two keeps the total at five. This is the same
  template whose track count once got out of step with its children and silently
  wrapped "The House" onto a second row (the "the footer is still fucked" bug) —
  worth not disturbing.

### Stale comment corrected in passing
The Products column's comment claimed "All 11 CATEGORY_LANES". The real count is
**13** (`npx tsx -e "…CATEGORY_LANES.length"` → `13`). It had already been wrong
once before as "9". Rewritten to stop asserting a number that goes stale every
time a lane is added — which is exactly why the code maps the array rather than
listing them.

## Known cost — raised, not buried
The "More" column existed for a reason. Measured 2026-08-19 when it was added:
`/modest-summer-outfits` had **zero** internal links anywhere on the site and
`/modest-wedding-guest` had **one**, against 25–35 for every category lane.
Removing the column returns both to that state.

Both are still routed and still in `sitemap.xml` — verified below — but per §8 a
sitemap entry only gets a URL crawled; internal links are what pass ranking
signal. If they should keep a link without their own column, the cheap fix is one
line each in "The House". Left as Tina's call rather than quietly re-adding what
she asked to remove; noted in the component where the column used to be.

## Verification
```
$ rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
TSC=0
$ npx eslint components/Footer.tsx
LINT=0
$ npm test
 Test Files  46 passed (46)
      Tests  741 passed (741)
```

Read out of a real Chromium render of the running dev server (Playwright), by
measuring each `<li>`'s x-position inside the Products list — so the two columns
are demonstrated geometrically, not asserted from the class string.

**1440x900:**
```
headings:    ["Products", "Editorial", "The House", "The Edit, in your inbox", …]
wedding:     false        <- /modest-wedding-guest no longer in the footer
summer:      false        <- /modest-summer-outfits no longer in the footer
productCount: 13
subColumnXs: [429, 693]   <- two distinct x-positions = two sub-columns
perColumn:
  429 -> Modest Dresses, Abayas, Hijabs & Scarves, Skirts, Tops, Trousers, Co-ord Sets   (7)
  693 -> Modest Swimwear, Modest Activewear, Layering Basics, Blazers & Vests,
         Cardigans & Sweaters, Jackets & Coats                                            (6)
```

**390x844:**
```
subColumnXs: [32]         <- ONE x-position = single column, as intended
productCount: 13
```

No heading named "More" survives at either width. Screenshotted both; the desktop
footer reads brand · Products (two rows) · Editorial · The House with no gap where
the removed column was.

The two lanes are untouched as pages:
```
/modest-wedding-guest      200
/modest-summer-outfits     200
sitemap.xml hits           2
```

Grepped `scripts/` for anything that reasoned about the removed column
(§10.32 rule 1 — deleting a feature silently disarms checks near it). Only hits
are `scripts/visual-audit.mjs`'s route list, which asserts the two lanes *render*,
not that they are linked from the footer; both still return 200, so it is
unaffected.

**Not run:** `npm run build`, and therefore not `npm run audit:visual` either.
Another session has `next dev` live on :3000 and a production build would
overwrite the shared `.next` under it (CLAUDE.md §10.28 rule 4).

## Notes / follow-ups
- Checked at 1440 and 390 only. The md boundary (768px) is where the one-column /
  two-column switch happens and is the width most worth a look on the next full
  `audit:visual` pass.

---

## Follow-up, 2026-08-25 — sub-columns pulled together and centred
Tina, on the result above: *"put them closr together center."*

The two sub-columns sat **262px apart** with a hole between them, left-packed
under the span. Now they are content-width, 40px apart, and the pair is centred
in the span with the "Products" eyebrow centred over it.

### What changed
`listClassName` on the Products column:
```
- grid grid-cols-1 md:grid-flow-col md:grid-rows-7 gap-x-8 gap-y-2
+ grid grid-cols-1 md:grid-cols-none md:grid-flow-col md:grid-rows-7
+ md:auto-cols-max md:justify-center md:text-left gap-x-10 gap-y-2
```
plus `md:text-center` on the column so the eyebrow centres over its own list.
`md:text-left` puts the row text back to left-aligned inside each sub-column —
centring the individual links leaves both edges ragged.

### The bit that did not work first time
`md:auto-cols-max` alone changed **nothing** — re-measured at an unchanged 262px.
`auto-cols-max` sets `grid-auto-columns`, which only sizes **implicit** tracks,
and the base `grid-cols-1` (there for mobile) leaves an **explicit** `1fr` first
column in force at every width. So sub-column one kept absorbing all the free
space and shoved sub-column two to the right. `md:grid-cols-none` clears the
template at md, making both tracks implicit so both take `max-content`. That
class is load-bearing, not tidying.

### Verification
Same Playwright measurement as above, before → after at 1440:

| | before | after |
|---|---|---|
| sub-column x positions | 429, 691 | **490, 630** |
| gap between them | 262px | **140px** (col 1 width + the 40px gutter) |
| list centre | 625 | 625 |
| heading centre | 625 | 625 |

`headingCentre === listCentre === 625` is the centring assertion — the eyebrow and
the pair share a centre line. At 900px the same holds (both 341). At 390px
`subColumnXs` is a single value (32), so mobile is still one left-aligned column.

```
$ npx tsc --noEmit   TSC=0
$ npx eslint components/Footer.tsx   LINT=0
$ npm test           741 passed (741)
```
Screenshotted at 1440, 900 and 390.
