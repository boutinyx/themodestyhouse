# Index console removed from the designer pages
**Date:** 2026-08-26 · **Status:** done

## Goal
Tina: *"for the map we had made seprate designer pages with exampelation i want
the search bar inside each of those things to be gone like the whole block the
search the filters."*

## What changed
`components/FilterableGrid.tsx` gains `showConsole` (default `true`), and
`app/designers/[slug]/page.tsx` passes `showConsole={false}`. Nothing else uses
it — the twelve lanes, `/directory` and `/edits/[slug]` are untouched.

**A whole-block flag rather than reusing the two that already existed.**
`searchable` and `showTypeFilter` were added for `/edits/[slug]` and each removes
one control. Either alone would have left the Brand dropdown standing, and on a
brand page that control is not merely unhelpful, it is **meaningless**: the
catalogue is one brand, so `brands` has exactly one entry and the dropdown offers
a choice between "All" and the house whose page you are already on.

**Nothing about the filtering is removed.** `q`, `brand`, `fabricType` and `sort`
still exist and still apply; only the controls that change them are gone. Same
shape as the Outerwear and Layering type dropdowns retired in August, where
`?type=blazer` still narrows the grid on arrival.

## Verification
Deployed to staging, then measured with a real browser:

| URL | `.index-panel` | search inputs | filter buttons | grid |
|---|---|---|---|---|
| `/designers/veiled` @1440 | **0** | 0 | none | Showing 24 of 792 |
| `/designers/veiled` @390 | **0** | 0 | none | Showing 24 of 792 |
| `/modest-dresses` @1440 | 1 | 0 | Brand, Sort | Showing 24 of 2,901 |
| `/directory` | 1 | — | — | — |
| `/edits/everyday-lace` | 1 | — | — | — |

The last three are the control: the change had to be invisible everywhere except
the brand pages, and it is. `tsc` clean, `eslint` clean, 789 tests pass.

## The SEO/AEO question she asked with it
Answered from the live page rather than from memory:

- **The pages themselves are the strongest SEO asset the site has added.** 91 of
  them, all 91 in `sitemap.xml`, one per house, targeting brand-name queries —
  which is the one class of query a directory can genuinely win. They went from 5
  to 89 on 2026-08-24 (`lib/brandPages.ts`, `MIN_PRODUCTS = 24`) and are now 91.
- **Removing the console costs nothing and helps slightly.** The block is
  client-side UI: no text, no links, nothing crawlable. A `<FilterDropdown>` is a
  Base UI menu, not an `<a>`, so no internal link equity passed through it. What
  goes is DOM and JS on a page that was already 489 KB of HTML.
- **For AEO it is a small positive.** Answer engines quote prose and structured
  data. `/designers/veiled` serves a real description, a `PIECES / PRICE RANGE /
  MOSTLY / BASED` fact row, and a JSON-LD graph carrying `Brand`,
  `CollectionPage`, `ItemList` (27 `ListItem`s), `BreadcrumbList` and
  `Organization`. None of that is touched; the controls were never citable.
- **The one thing to watch is unchanged and unrelated:** these pages are
  `CollectionPage`s over a grid, so their defensible content is the description
  and the fact row. Houses without a `description` in `data/brands.ts` fall back
  to measured facts only — that is the thin-content edge, not the search box.

Staging serves `x-robots-tag: noindex, nofollow, noarchive`, as it must; the
canonical correctly points at `https://themodestyhouse.com/designers/veiled`.
