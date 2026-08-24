# Revert: hero zoom-out + all category-band exploration
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina: "okay revert all the way back to when i said to zoom out the hero." A long
back-and-forth exploration (hero height, category-strip colors, moving the strip
onto the hero, transparency) hadn't landed anywhere she wanted — she asked to
undo all of it back to the state right before the very first "zoom the picture
of the hero out" request.

## What was reverted
This undoes the combined effect of five prior log entries, all now marked
`reverted` and pointing here: `2026-08-22-hero-zoom-out-88vh.md`,
`2026-08-22-category-quicklinks-purple.md`, `2026-08-22-category-band-onto-hero.md`,
`2026-08-22-category-band-thicker-flush.md`, `2026-08-22-category-band-transparent.md`.

- `app/globals.css` — `.hero-vh` comment restored to its original wording (height
  was already back at `100svh`/`100vh` from the second-to-last iteration, so no
  functional change there). Removed the now-unused `--blackberry` token.
- `components/CategoryQuickLinks.tsx` — restored verbatim to its original content:
  parchment background, brass icon/arrow, ink label text, hairline divider between
  tiles, stacked icon-over-label layout, `py-8`/icon size 26, rendered as its own
  full-width `<section>` below the hero (not overlaid on it).
- `app/page.tsx` — `<CategoryQuickLinks />` moved back out of the hero's
  `[data-hero]` box to its original position as a sibling `<section>` immediately
  after the hero, matching pre-exploration markup.

## Verification
Screenshotted the live homepage with Playwright at 1512×944: full-height hero
with no band overlaid, and the quick-links strip below it rendering with brass
icons on parchment, dividers between tiles, stacked layout — matching the
original component content read at the start of this exploration.

## Notes / follow-ups
The reverted log entries stay on disk (marked `reverted`) rather than being
deleted — they're an honest record that this was tried and explicitly walked
back, per this repo's existing practice of keeping "tried and reverted" history
rather than erasing it.
