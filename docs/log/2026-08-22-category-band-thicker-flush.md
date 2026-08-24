# Category band: thicker, and flush with the true bottom of the screen
**Date:** 2026-08-22 · **Status:** reverted — see 2026-08-22-revert-hero-zoom-and-category-band.md

## Goal
Tina: "thats too thin and its too high the whole banner now" (screenshot showed
a visible strip of parchment background below the band, before the next
section). Asked her to confirm which of two readings — the band itself being
too small, or a gap below it — was the actual complaint. She confirmed: the
gap below the band, caused by the hero being shorter than the viewport (88svh,
from the earlier "zoom out" request) while the band pins to the hero's own
bottom edge rather than the true fold.

## What changed
- `app/globals.css` — `.hero-vh` height back to `100vh`/`100svh` (from `88svh`).
  This is a direct trade-off against the earlier zoom-out fix
  (`2026-08-22-hero-zoom-out-88vh.md`): there is no way to have both a shorter
  hero AND a band flush with the true bottom of the screen, since the band is
  positioned relative to the hero box. Confirmed and chosen by Tina.
- `components/CategoryQuickLinks.tsx` — thickened again: `py-4`/icon 20 →
  `py-6`/icon 24, gap 2 → 2.5.

## Verification
Measured with Playwright at 1512×944: hero bottom now equals the viewport
height exactly (944px, was 830.7px), band is 72px tall (was 52px) and flush
with the true fold — no gap. Screenshotted desktop and 390×844 mobile, both
confirm no strip of background visible below the band.
