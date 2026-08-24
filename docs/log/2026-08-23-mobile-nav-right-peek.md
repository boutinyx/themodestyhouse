# Mobile nav panel: leaves a peek of the hero on the right, not a full takeover
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "fix up the hamburger open i dont want it to completely open and fill
the screen on phone and tablet but show a little space of the hero." First
attempt left a gap at the bottom — corrected immediately: "not on the buttom
i mean the side the right side."

## What changed
`components/MobileNav.tsx` — `Dialog.Popup`:
- `fixed inset-0` / `height: 100dvh` (full-screen takeover) →
  `fixed inset-y-0 left-0` / `height: 100dvh` / `width: calc(100% - 56px)` —
  full height restored, width reduced instead so a 56px strip of whatever's
  behind (the hero, on the homepage) stays visible on the right edge.
- Added `borderTopRightRadius`/`borderBottomRightRadius: 16` and a
  right-facing `boxShadow` so it reads as a sheet floating over the page,
  not a panel that's simply been cut short.
- Enter/exit transform: `translate-y-1` → `translate-x-1` (slides in from the
  left now, matching the new left-anchored shape, not up from below).

## "Update the categories"
Asked which categories she meant (the hamburger's own list, the homepage's
5-item quick-links strip, or something else) — confirmed the hamburger menu's
list. Checked it against `lib/lanes.ts`: `CATEGORY_LANES.map(...)` already
drives this list directly, so all 13 category lanes (Modest Dresses through
Jackets & Coats) render correctly and it isn't actually stale — confirmed by
scrolling the full panel open on a tablet screenshot. No changes made here;
flagging back to her in case there's a more specific complaint (content,
order, or style) I'm missing.

## Verification
Playwright screenshots at 390×844 (phone) and 820×1180 (tablet) — panel
stays full height, right edge stops short revealing the photo, rounded
corners and shadow on that edge.

## Follow-up, same day
Tina: "dont round out the cornres." Removed `borderTopRightRadius`/
`borderBottomRightRadius` — panel edge is square again, shadow alone carries
the "floating sheet" read.
