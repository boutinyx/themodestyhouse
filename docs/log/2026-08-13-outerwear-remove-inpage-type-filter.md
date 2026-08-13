# Remove Outerwear's in-page Type filter

**Date:** 2026-08-13 · **Status:** done

## Goal

Tina, with a screenshot of the "All type / Blazers / Vests / Cardigans / Coats" dropdown
on `/outerwear`: "i dont want this filter anymore i only want to be able to filter using
the products -> outerwear -> choose" — the header's hover flyout should be the only route
to a filtered Outerwear view; the in-page dropdown duplicating it should go.

## What changed

- `components/FilterableGrid.tsx` — the `types` list that feeds the "Type" `FilterDropdown`
  now only ever comes from `cat.layeringSubtypes`, never `cat.outerwearSubtypes`. Since the
  dropdown is gated on `types.length > 0`, it simply doesn't render on `/outerwear` any
  more (that catalogue's `layeringSubtypes` is always empty — the two columns are mutually
  exclusive by construction). `/layering-basics` is untouched: it has no header flyout
  equivalent, so pulling its dropdown too would have left it with no way to filter by
  subtype at all — not asked for, so left alone.
- The actual FILTERING by outerwear subtype is unchanged — `typeIdx`/`usingOuterwearTypes`
  still read `cat.outerwearSubtypes` and still narrow the grid when `type` state was seeded
  from `initialType` (i.e. the flyout's `?type=blazer` link). Only the in-page control to
  pick or change it is gone; picking a different subtype now means going back to the
  header and choosing again.
- Removed the now-unused `OUTERWEAR_SUBTYPE_LABELS` import.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing unrelated warning only).
- `npx vitest run lib/devOnly.test.ts lib/aboutStats.test.ts --exclude ".claude/**"` — 41/41.
- `npm run build` — clean.
- `scripts/interaction-audit.mjs` (Chromium) — zero `PROBLEM`.
- Manual, via Playwright against the production build:
  - `/outerwear` (bare): chip row reads `Brand, Sort` — no `Type` chip.
  - `/outerwear?type=blazer`: same chip row (still no `Type`), but "Showing 24 of 153" and
    every visible title actually contains "Blazer" — the flyout's pre-filter still works,
    it's just not adjustable in-page any more.
  - `/layering-basics`: chip row still reads `Type, Brand, Sort`, unaffected.
