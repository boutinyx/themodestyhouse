# Add "Active" nav group (Swimwear + Activewear)
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina: "I want a new catagory called active" → clarified via two rounds of
questions: a brand-new top-level header trigger, not a rename; and nav-only —
Modest Swimwear and Modest Activewear stay two separate pages/lanes, just
grouped under one new trigger instead of sitting inside the Clothing panel.

## What changed
- `components/Nav.tsx` — `CATEGORY_LANES` filter feeding the Clothing panel
  now also excludes `modest-swimwear`/`modest-activewear` (same shape as the
  existing Hijabs/Basics exclusion). New `activeItems` array and a new
  `NavGroup` entry ("Active", no `href` since there's no merged lane page)
  inserted between Basics and Designers.
- No changes to `lib/lanes.ts`, routing, sitemap, or either lane's `match()`
  — both pages, their URLs and their product sets are unchanged.
- Mobile nav (`components/MobileNav.tsx`) intentionally untouched: it already
  lists every category flat under one "Category" heading (Hijabs/Basics
  aren't split out there either), so Active needed no mobile-specific work.

## Verification
Playwright against `next dev`:
```
nav triggers: [ 'Clothing', 'Hijabs', 'Basics', 'Active', 'Designers', 'Editorial', 'About' ]
Clothing panel items: [ 'All Clothing', 'Modest Dresses', 'Abayas', 'Skirts', 'Tops',
  'Trousers', 'Co-ord Sets', 'Blazers & Vests', 'Cardigans & Sweaters', 'Jackets & Coats' ]
Active panel items: [ 'Modest Swimwear', 'Modest Activewear' ]
swim href /modest-swimwear
activewear href /modest-activewear
```
`npx tsc --noEmit` clean.

## Notes / follow-ups
None — explicitly the smaller of two options Tina was offered; the merged
single-page "Active" lane (with Swim/Activewear as `?type=` sub-filters) is
still on the table if she wants it later.
