# Nav reorder: Hijabs and Basics promoted next to Clothing
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Tina: "i want the catagory hijabs to be next to hijabs and next to that
layering basics is going to be basics" — ambiguous enough (which "hijabs"
next to which?) that I asked a clarifying question with a preview rather
than guess again after the header session's earlier costly mis-reads.
Confirmed: move Hijabs to sit right after Clothing (it was after Designers),
and promote "Layering Basics" out of the Clothing dropdown into its own
top-level trigger renamed "Basics", sitting right after Hijabs.

## What changed
- `components/Nav.tsx`:
  - `categoryItems` (Clothing's panel) now filters out both
    `modest-hijabs` and `layering-basics` from `CATEGORY_LANES` — previously
    only Hijabs was excluded. 10 items now (was 11): "All Clothing" + 9
    categories, 5+5 split.
  - New `basicsItems`: `{ href: '/layering-basics', label: 'All Layering
    Basics' }` + the same `LAYERING_SUBTYPES` that used to be a nested
    flyout inside Clothing's Outerwear-style row — same pattern already used
    for Hijabs.
  - `navItems` reordered: `Clothing, Hijabs, Basics, Designers, Editorial,
    About` (was `Clothing, Designers, Hijabs, Editorial, About`).
  - Clothing's `activeWhen` also picked up `path.startsWith('/outerwear')`,
    a pre-existing gap unrelated to this ask: `/outerwear` and
    `/layering-basics` never start with `/modest`, so Clothing's own
    underline was already not lighting up on those pages before this
    change. Fixed in passing since I was already touching this exact
    condition for Layering Basics's removal.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright (see the header log entry from earlier
  today for why this is now the default, not curl/manual-check): nav order
  is `Clothing / Hijabs / Basics / Designers / Editorial / About`; Basics
  opens a clean compact dropdown ("All Layering Basics" bold + its 7
  subtypes: Neck Covers & Dickeys, Sleeve Extenders, Shirt Extenders,
  Base-Layer Tops, Cropped Body Shirts, Under-Dresses, Prayer Sets);
  Clothing's panel confirmed down to 9 categories, Hijabs and Layering
  Basics both absent from it.

## Notes / follow-ups
- `components/MobileNav.tsx` was NOT touched — its Category list still
  shows Hijabs & Scarves and Layering Basics inline with their own
  disclosure rows, matching the precedent set when Hijabs was first split
  out on desktop (that session's reasoning: the phone panel is a
  full-screen list, a different enough UI that the desktop header's
  structure wasn't assumed to carry over without being asked). If Tina
  wants mobile to mirror the same Clothing/Hijabs/Basics split, that's a
  separate, explicit ask.
