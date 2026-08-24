# Category quick-links: thinner, pinned onto the hero's bottom edge
**Date:** 2026-08-22 · **Status:** reverted — see 2026-08-22-revert-hero-zoom-and-category-band.md

## Goal
Tina: "can we make the band a bit thinner and showing it on the hero? now its
between hero and the page under." The blackberry tile band was rendering as its
own full section after the hero, not overlapping the photo.

## What changed
- `app/page.tsx` — `<CategoryQuickLinks />` moved from a sibling `<section>` after
  the hero into the hero's own `[data-hero]` box, wrapped in `absolute inset-x-0
  bottom-0 z-10`. The hero div is already `relative overflow-hidden`, so the band
  now pins to its bottom edge without needing to know its own height in advance
  (no negative-margin measurement hack like the header's).
- `components/CategoryQuickLinks.tsx` — thinned for an overlay band: icon+label
  went from stacked (`flex-col`, 26px icon, `py-8`) to side-by-side (`flex-row`,
  20px icon, `py-4`).

## Verification
Playwright screenshots at 1512×944 and 390×844 — band sits directly on the
photograph at the hero's bottom edge on both, no overlap with the headline/CTA
above it, horizontal scroll still works on mobile.
