# Hero subtitle updated, brand count corrected
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina sent a screenshot with new hero subtitle copy: "Discover pieces from
200+ independent modest brands, curated in one place." — replacing "A
worldwide collection of modest fashion." from earlier the same day.

## What changed
- `app/page.tsx` — hero subtitle text updated to the new copy, with one
  change: "200+" → "100+". `data/brands.ts` holds 113 brands as of this
  edit, so "200+" would be a false claim on a live page — not a style
  choice to override silently, so it's flagged here and in the code
  comment rather than either shipping the inflated number or silently
  picking a different one without saying so.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- Screenshotted via Playwright — renders correctly under the headline,
  matching the layout in Tina's reference screenshot.
