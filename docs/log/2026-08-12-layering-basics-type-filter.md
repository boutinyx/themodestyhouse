# Add a "Type" filter within Layering Basics
**Date:** 2026-08-12 · **Status:** done

## Goal
Tina asked for new categories within Layering Basics. The lane had grown to
146 items spanning five genuinely different kinds of piece (a neck cover and
a $245 under-dress have nothing in common except "worn under something
else"), with no way to narrow to just one kind. Confirmed with her: a filter
within the existing `/layering-basics` page (not separate URLs — some groups
are only 13-20 items, too thin for standalone pages), using the 5-group split
of the current catalogue: Neck Covers & Dickeys (17), Sleeve Extenders (20),
Base-Layer Tops (54), Cropped Body Shirts (13), Under-Dresses (42).

## What changed
- **`lib/specialty.ts`** — new `layeringSubtype(p): LayeringSubtype | null`.
  Always calls `isLayering(p)` first and returns `null` for anything that
  isn't a layering piece at all — this function only decides WHICH of the 5
  groups a confirmed layering item belongs to, never whether something
  belongs in Layering Basics to begin with (that's still `isLayering`'s job
  alone). The 4 non-catchall groups each reuse a slice of the exact
  vocabulary `LAYERING_RE`/`UNDER_DRESS_RE` were already built from
  (neck-cover, sleeve-extender, cropped-body-shirt, under-dress); anything
  left over falls through to `base-layer-top` (the base layer/body top/core
  top/singlet/ria-miranda's "Comfy" line — the catch-all group, and the
  largest one). `LAYERING_SUBTYPE_LABELS` fixes both the ids and the
  canonical dropdown order — independent of catalogue interleaving.
- **`lib/compactCatalogue.ts`** — extended `CompactCatalogue` with
  `layeringSubtypes: LayeringSubtype[]` (dictionary, canonical order, only
  ever non-empty when the catalogue being encoded contains layering items —
  in practice only ever populated for `/layering-basics`) and
  `rows.layeringSubtypeIdx: number[]` (-1 sentinel for "not applicable",
  same pattern as `firstSeenDay`'s -1-for-unknown). The dictionary needs a
  cheap pre-pass over `products` before the main encode loop, unlike
  `garments`/`occasions` which build lazily in first-appearance order — those
  have no canonical order to preserve, so a pre-pass would be pure overhead;
  this one does, so it isn't.
- **`components/FilterableGrid.tsx`** — new `type` filter state and a "Type"
  `FilterDropdown`, gated on `cat.layeringSubtypes.length > 0` — the same
  `.length > 0` pattern the existing Occasion dropdown already uses, so the
  filter can ONLY ever render on a lane whose catalogue actually contains
  layering items. Filtering itself is one more integer compare per row
  (`cat.rows.layeringSubtypeIdx[i] !== typeIdx`), same columnar-row-index
  approach as the brand/occasion filters — no decoding until a row is
  actually about to render.

## Verification
```
npx tsc --noEmit          # clean
npm test                   # 33 files, 575 tests passed (18 new)
npm run lint                # 0 errors (2 pre-existing unrelated warnings)
npm run build                # 38 routes, clean
```
A dedicated test asserts every currently-published `isLayering()` item gets
a non-null `layeringSubtype()` — a silent `null` would mean an item sits on
`/layering-basics` while being invisible to every option in its own "Type"
filter, which is worse than not having the filter (it would look like the
item simply isn't there). Ran it against `data/products.json`: 0 missing,
146/146 accounted for, matching the confirmed group sizes exactly (17 / 20 /
54 / 13 / 42).

Then verified against a real running production build, including actual
browser interaction (not just HTTP fetches):
- `/layering-basics`'s embedded catalogue carries all 5 subtypes in the
  correct canonical order; `/modest-dresses`'s carries none.
- Opened the Type dropdown in a real browser: all 5 options render in the
  right order, "All Type" first.
- Clicked "Neck Covers & Dickeys": grid re-filtered to "Showing 17 of 17",
  exactly the confirmed count, chip shows active state, visible cards are
  genuinely neck-cover-style pieces.
- Loaded `/modest-dresses` directly: filter row shows only
  Occasion/Brand/Sort — no Type dropdown, confirming the gate works both
  ways.

## Notes / follow-ups
- None of this touches which products are IN Layering Basics — purely a new
  way to narrow what's already there. `isLayering()`/`isSpecialty()` are
  unchanged by this pass.
