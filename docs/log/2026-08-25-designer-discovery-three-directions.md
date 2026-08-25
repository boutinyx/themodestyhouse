# Designer Discovery band — three directions, mocked up
**Date:** 2026-08-25 · **Status:** done (exploration — nothing shipped)

## Goal
Tina, with a reference screenshot of a "Designer Discovery" band (copy left,
dotted world map centre, numbered region list with counts right): *"i want to
implement something like this. can you give me 3 examples of how we can make it
look and also how it will look on phone."*

## What was made
`designer-discovery.html` at the repo root — untracked, matching the existing
mockup convention (`about-layouts.html`, `hero-ideas.html`, `callout-designer.html`).
Three directions, each shown at **desktop 1440 and phone 390 side by side**, in the
real tokens and the real three fonts (Bodoni Moda / Marcellus / Jost).

- **A — The Atlas.** The reference, rebuilt in house style. Copy left, dotted world
  centre, ranked regions right.
- **B — The Aubergine Band.** Map demoted to texture at 16% behind the type on
  `--aubergine`; counts as a rule-separated row. A dark beat between two parchment
  sections.
- **C — The Ledger.** No map. Bodoni numerals at display size with a hairline
  proportion bar. No new asset, no map geometry to ship, and the only one that
  stays honest about a lopsided distribution.

## The data is real
Every number is computed from `data/brands.ts`; nothing is placed. §1 forbids
shipping invented data as though it were real, and a "designer discovery" panel is
exactly the surface where that would be tempting.

`city` exists on all 113 brands (39 distinct values), so region counts are
derivable:

| region | houses |
|---|---|
| Europe | 56 |
| North America | 27 |
| Middle East | 20 |
| Asia | 5 |
| Oceania | 5 |
| **Africa** | **0** |

**The reference invents its numbers** — it shows Africa 18, and six regions each
between 8 and 42. The real shape is nothing like that: Europe alone is half the
index and Africa is empty. Any design that implies even global spread will be
lying, which is why option C exists.

### Two data problems a real build has to solve first
1. **The same place is stored several ways.** Britain is four separate `city`
   values — `UK` 11, `United Kingdom` 9, `London` 4, `Birmingham, United Kingdom`
   1 — so it plots as four overlapping dots totalling 25. Same for
   `USA`/`United States` and `Australia`/`Sydney`. Needs normalising.
2. **69 of 113 brands have no city, only a country or continent** (`USA`, `UK`,
   `Europe`). Those pins are country centroids, not real locations. Fine as
   texture, dishonest if the map is ever presented as precise.

## How the map was made
No world map existed in `public/` and Phosphor has none. Fetched
`world-atlas@2/land-110m` (TopoJSON, 55 KB), decoded the delta-encoded quantised
arcs by hand, projected equirectangular clipped to 83°N–56°S, and emitted both a
solid path and a **2,261-point dot matrix** (ray-cast point-in-polygon over the
land rings at 2.6° spacing). The dot matrix is what all three options use — it is
the reference's own aesthetic and it renders as plain `<circle>`s.

## Verification
Rendered every artefact and looked at it rather than assuming:

- The generated map was screenshotted on its own **before** being used — continents
  are recognisable and correctly placed. A path/dot generator that is subtly wrong
  produces something that still *looks* like a map, so this was checked first.
- All three options screenshotted at desktop and phone. **Two real bugs found and
  fixed this way**, both invisible in the source:
  - Option C's phone ledger rendered as a **bulleted `<ul>`** — the row styles were
    written as `.C .lrow`, and the phone frame is a different container, so none of
    it applied. Same for option B's phone stat labels. Both are now unscoped.
  - Option B's phone grid is 2-up with 5 regions, leaving an **empty sixth cell**.
    The last cell now spans the full row.
- Claim checked before it shipped: the Option A caption originally said "the big
  one over the UK is 25 houses". False — that is four overlapping pins. The largest
  *single* pin is USA at 14. Caption corrected, and the overlap is now called out
  in the mockup itself.

## Notes / follow-ups
- **Hit CLAUDE.md §10.27 again**, in a new file: wrote a CSS comment containing
  backticks inside a JS template literal, which closed the string and broke the
  generator. The block now carries the same warning `VerifiedSpotlight.tsx` does.
- Nothing was committed or pushed — this is a decision aid, not an implementation.
- Open question for Tina before any build: **Africa at 0**. Show five regions and
  say nothing, show six and let the zero stand, or drop the geography angle.
- If A or B is chosen, the ~30 KB of dot geometry needs a home. It is static, so it
  belongs in a `public/` SVG (with a NEW filename, §6) or a server component that
  renders it once — never per-card, and never on `Product` (Invariant 15).
- Option B's brass eyebrow on aubergine is low contrast in the mockup; it would
  want lightening to `--parchment` if B is chosen.
