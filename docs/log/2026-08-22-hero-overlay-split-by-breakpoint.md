# Hero overlay: flat/even on mobile+tablet, radial spotlight kept on desktop
**Date:** 2026-08-22 · **Status:** done

## Goal
Two prior overlay changes today were both wrong turns and got reverted:
1. Hiding the overlay entirely below `md:` for the new mobile photo ("no
   darker overlay").
2. Making it flat/uniform with no breakpoint split at all ("the dark overlay
   should be for the entirety of the hero. not too dark tho").

Tina then stated it explicitly: "revert 2 and listen to me i want a dark
overlay for the whole hero on mobile and tablet so not the desktop fade that
left is darker etc no i want the whole hero to be evenly dark." Two distinct
treatments by breakpoint: desktop keeps its existing radial spotlight
(darker at the edges/left, "the desktop fade that left is darker"); mobile
and tablet get a different, flat/even tint across the whole photo instead.

## What changed
`app/page.tsx` — the single overlay div is now two:
- `hidden lg:block` — the original radial-gradient spotlight (unchanged from
  its 2026-08-21 tuning), desktop only (≥1024px).
- `lg:hidden` — new flat `rgba(0,0,0,0.25)` tint, mobile + tablet (<1024px).

Split at `lg` (1024px) rather than `md` (768px) so tablet groups with phone,
not with desktop — matches the `md:`/`lg:` padding tiers already used on this
hero's copy block (`px-6 md:px-16 lg:px-24`).

## Verification
Screenshotted with Playwright at 390×844 (phone), 820×1180 (tablet, using the
desktop photo since the `<picture>` source swap is still at 767px but now
with the flat overlay), and 1512×944 (desktop) — phone and tablet both show
uniform, even darkening; desktop shows the original spotlight shape restored
exactly.

## Follow-up, same day
Tina: "darker." Mobile/tablet overlay opacity bumped `0.25` → `0.42` (desktop
spotlight untouched). Verified with a fresh Playwright screenshot at 390×844.
