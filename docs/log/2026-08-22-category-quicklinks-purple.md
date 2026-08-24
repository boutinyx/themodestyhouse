# Category quick-links: blackberry tile blocks, white text/icons
**Date:** 2026-08-22 · **Status:** reverted — see 2026-08-22-revert-hero-zoom-and-category-band.md

## Goal
Tina, iterating on the icon strip under the homepage hero (Abayas/Dresses/Sets/
Hijabs/Occasion): first "can we make this brandcolor dark purple" (recoloured
icon/arrow only), then "no i meant the blocks" (tile backgrounds went aubergine,
text/icons parchment+brass-on-dark), then "dark purple like blackberry and make
the letters and icons white," then "black purple" (one more step darker), then
"get rid of the dividers."

## What changed
- `app/globals.css` — new token `--blackberry`, started at `#2a1029`, darkened to
  `#170a16` (near-black with a purple undertone) after "black purple" — documented
  inline as Tina's own reference, next to `--aubergine` (#441943).
- `components/CategoryQuickLinks.tsx` — section background → `var(--blackberry)`;
  label text, icon and arrow → literal `#fff` (she asked for white specifically,
  not the softer `--parchment`); the per-tile `borderRight` divider (originally
  `--hairline`, then a low-opacity white) removed entirely, and the now-unused
  `i` index param dropped from the `ITEMS.map`.

## Verification
Screenshotted the live homepage with Playwright at 1512×944 — tiles render as
deep near-black purple blocks with white icons/labels, clearly legible.
