# Hijabs and Basics get the same flush full-width panel as Clothing
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Tina: "can i get the same thing for clothing for hijabs basics?" — the
flush, full-width "extension of the header" panel built for Clothing
earlier today, applied to the Hijabs and Basics triggers too. Previously
those two kept the original compact floating-card dropdown (small, rounded
corners, shadow), which is inconsistent now that all three sit side by side
in the nav.

## What changed
- `components/Nav.tsx` — added `wide: true` to both the Hijabs and Basics
  `NavGroup` entries. That's the only change: `NavGroup.wide` already
  existed and already drove NavMenu.tsx's choice between the old Base-UI
  floating Popup and the plain-CSS full-width panel (see
  `2026-08-21-header-clothing-hijabs-and-mega-menu.md`), so no NavMenu.tsx
  changes were needed — this was flipping a flag two of the three triggers
  hadn't opted into yet.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright: Hijabs opens flush/full-width with "All
  Hijabs & Scarves" bold + its 3 subtypes, left-aligned, no card chrome;
  Basics does the same with "All Layering Basics" + its 7 subtypes; moving
  the pointer away from either closes it cleanly with nothing left behind.
