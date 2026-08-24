# Hero: zoom the photo back out after the transparent-header change
**Date:** 2026-08-22 · **Status:** reverted — see 2026-08-22-revert-hero-zoom-and-category-band.md

## Goal
Tina: "zoom the picture of the hero out to how it was before we implemented the
transparent header." The photo felt more zoomed-in/dominant since the hero started
spanning behind the transparent header.

## Investigation
Measured the live page with Playwright rather than guessing from screenshots
(`hero.getBoundingClientRect()`, `getComputedStyle`). Confirmed the `margin-top:
calc(-1 * var(--header-height))` hack added for the transparent header does **not**
change the `object-cover` crop/scale at all — box height was still `100svh` before
and after, so the browser computes an identical crop either way; the margin only
repositions the box. Screenshotted the hero with the margin removed (dev-only DOM
edit, not committed) and it was pixel-identical in crop to the current version, just
shifted down by the header's height.

The actual cause: before, the header took real flow space and the photo only ever
filled ~90% of the viewport below it (855/944px at a 1512×944 viewport). Now the
photo runs the full 100% of the viewport edge-to-edge under a transparent header,
which reads as more dominant/zoomed even though the crop math is unchanged.

Asked Tina whether she wanted a full revert to a solid header (losing the
spans-behind-header effect from earlier today) or to keep that effect but shrink the
photo. She chose the latter.

## What changed
`app/globals.css` — `.hero-vh` height dropped from `100vh`/`100svh` to `88vh`/`88svh`.
`margin-top` (the transparent-header mechanism) is untouched, so the header still
reads `data-over-hero="true"` and sits transparently over the photo.

## Verification
Playwright at 1512×944: hero box height went from 944px to 830.7px (~88%), header
still measured `data-over-hero="true"`. Screenshot shows visibly more of the room
(chandeliers, floor) and the category-quick-links strip now peeking in at the
bottom of the fold — matches the pre-transparent-header proportion (~90% of
viewport) without giving up the transparent-header effect. Checked at 390×844
mobile viewport too, no regressions.

## Notes / follow-ups
`hero-ideas.html` (untracked, repo root) is a separate, unrelated scratch file from
earlier the same session — 5 comparison mockups for "what's missing from the hero"
(stat strip, secondary CTA, category chips, verified-seal badge, bottom brand strip
+ scroll cue). Still on disk for Tina to review; not part of this change.
