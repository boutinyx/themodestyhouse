# Designer Discovery band — built (Option A)
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina, after reviewing the three mockups
(`docs/log/2026-08-25-designer-discovery-three-directions.md`): *"lets build a but i
want the 01 Europe 56 / 02 North America 27 … boxes to be bigger in length and want
to be able to see what brand in what thing is."*

Two changes from the mockup: the region rows get the **full page measure** instead
of a narrow third column, and each row **opens to reveal the houses in it**.

## What was built

**`scripts/gen-world-dots.mjs`** (new) — generates the dotted world map. Fetches
`world-atlas@2/land-110m`, decodes the delta-encoded quantised TopoJSON arcs,
projects equirectangular clipped to 83°N–56°S (Antarctica costs a third of the
height and holds no brands), and ray-casts point-in-polygon on a 3.2° grid.
A generator rather than a checked-in blob because nobody can review 1,477
`<circle>`s by eye or regenerate them at another density without it.

**`public/world-dots-v1.svg`** (new) — 1,477 dots, 49.9 KB raw, **4.5 KB gzipped**.
A static asset, not inline SVG: inline it would be 50 KB of markup on the busiest
page on the site, re-sent every request and parsed on the main thread. Versioned
filename per §6 — `public/` is not fingerprinted and Railway caches it for four
hours, so it is never replaced in place.

**`lib/brandRegions.ts`** (new) — the geography. `Brand.city` is the only location
data the catalogue has and it mixes granularity badly, so all 39 distinct values are
mapped by hand to `[lon, lat, region, approx]`. Exports `regionsWithCounts()`,
`brandsInRegion()`, `pins()`, `unmappedCities()` and the projection helpers.

**`lib/brandRegions.test.ts`** (new) — 12 tests. The load-bearing one is
`unmappedCities()` must be empty: a brand added with an unmapped city would
otherwise silently vanish from the band with no error and no zero, just a smaller
number. Also asserts the counts sum to `BRANDS.length`, that the projection agrees
with the generator script, and that known cities land in the right hemisphere.

**`components/DesignerDiscovery.tsx`** (new, client) — copy + map on top, then
full-width region rows. A row is a real `<button>` with `aria-expanded`; opening it
lists that region's houses and lights that region's pins while dimming the rest.
Hover pre-lights the map without opening anything, tracked separately from the open
row so a touch device (which never hovers) still highlights from the tap.

**`app/page.tsx`** — mounted between "By category" and the seal band, so the page
reads *browse the clothes → see who makes them → are you a house? apply.*
The brand list is **flattened on the server** to `{name, city, href, external}`.
`DesignerDiscovery` is a client component, so everything it receives is serialised
into the page, and `Brand` carries `description` — several hundred words each for
the sealed houses. Same rule as `CardProduct` vs `Product` (§8, Invariant 15).

**`lib/outbound.ts`** — new `'designer-discovery'` surface. The internal/external
split matches `app/designers/page.tsx` exactly: a house with a description links to
its page of ours; one without goes to its storefront with
`rel="noopener noreferrer sponsored"` and a `withUtm()` href (§6).

## The data is real
Computed from `data/brands.ts`, never placed: **Europe 56, North America 27,
Middle East 20, Asia 5, Oceania 5**, and **Africa 0**.

Africa is deliberately **not rendered as a row**. It is genuinely zero, and a row
reading "Africa 0" is a statement about the catalogue that Tina has not made.
Documented in the module and asserted by a test.

## Verification
```
$ npx tsc --noEmit                                        TSC=0
$ npx eslint <the six files>                              LINT=0
$ npm test                          Test Files 47 passed · Tests 753 passed
```

Behaviour, in **both engines at three widths, against a PRODUCTION build** served on
:3199 from a throwaway worktree (the main `.next` is held by another session's dev
server — §10.28 rule 4). Each run asserts the stylesheet loaded before measuring
anything:

```
chromium phone-390     ok  {opened:true, label:"03Middle East20", links:20, rows:5, rowH:60,  rowW:326,  smallTaps:0, overflow:false}
chromium tablet-820    ok  {… rowW:756 …}
chromium desktop-1440  ok  {… rowH:62, rowW:1156 …}
webkit   phone-390     ok  {… rowW:326 …}
webkit   tablet-820    PROBLEM (overflow — not this component, see below)
webkit   desktop-1440  ok  {… rowW:1156 …}
```

- **"Bigger in length" is measured**: a row is **1156px wide × 62px tall** at 1440,
  against the ~200px-wide column in the mockup.
- **"See what brand is in what"**: opening Europe renders **exactly 56** links,
  matching the 56 in the row — 2 internal, 54 external, and every external one has
  `rel~="sponsored"` and a `utm_source` in its href.
- Every brand link clears the 24px tap-target floor (`smallTaps: 0`).
- Zero console errors.

### The WebKit 820 overflow is pre-existing, not this band
Diagnosed rather than assumed (§10.38 rule 1). It is present **before anything is
opened**, and every one of the 513 offenders is `.marquee-row` and its spans —
`inDesignerDiscovery: false` on all of them. `BrandMarquee` is a deliberately
wider-than-viewport scrolling row that leaks 145px past the viewport in WebKit at
820 (`scrollWidth 965 vs innerWidth 820`). Untouched here; noted as a follow-up.

### A first WebKit run lied, in exactly the documented way
The initial probe reported "tap does not open the row" and "page overflows". Both
were false: the site sends HSTS and `upgrade-insecure-requests`, WebKit honours them
over plain-http localhost, and the page rendered with **no CSS at all** — the
console was full of `A TLS error caused the secure connection to fail`. This is
CLAUDE.md §10.24 verbatim, and the fix is the header-stripping block
`scripts/interaction-audit.mjs` already carries. Every measurement above is now
gated on a stylesheet assertion, so a repeat cannot read as a product defect.

## Notes / follow-ups
- **Touché Privé appears twice** in the Middle East list. Not a rendering bug —
  `data/brands.ts:169-170` holds two records (`touche-prive` int and
  `touche-prive-eu`), deliberately, for currency reasons, and they are the only
  duplicate name in the catalogue. It reads as a mistake to a visitor. Deduping
  would make the list disagree with the count, so it is left truthful and raised
  with Tina instead of silently merged.
- **Britain is four overlapping pins** (`UK` 11, `United Kingdom` 9, `London` 4,
  `Birmingham` 1 = 25 houses). Fixing it means normalising place names in
  `data/brands.ts` — a data change, not a rendering one.
- **69 of 113 brands are plotted at a country/continent centroid** because their
  record names no country-level city. Tracked by `approxBrandCount()`. Fine as
  texture; would be dishonest if the map were ever presented as precise.
- The projection constants exist in **two** places — `MAP` in `lib/brandRegions.ts`
  and the same numbers in `scripts/gen-world-dots.mjs`. Changing one without the
  other slides every pin off its continent, silently. A test pins the projection,
  but nothing can compare it to the generator; noted here because that is the
  §10.29-class trap (a reference the compiler cannot see).
- `npm run audit:visual` / `audit:interaction` not run — both need a production
  build on the shared `.next`. The worktree run above covers the same two engines
  at three widths for this band specifically.
