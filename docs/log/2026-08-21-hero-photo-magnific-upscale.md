# Swap the hero photo for its Magnific upscale
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "do this one," pointing at a Magnific-upscaled version of yesterday's
hero photo (same two models, same palace hallway) — 5504×3072, real detail
gain, not just a resize.

## What changed
- Master saved as `public/hero-home-4.jpg` (26MB PNG source flattened and
  re-encoded as JPEG, quality 90, 2.6MB) — new filename per CLAUDE.md §6/
  §10.21, not a swap of `hero-home-3.jpg`.
- Registered in `scripts/optimise-images.mjs`'s `JOBS` array, same shape as
  the last two hero entries (widths 640/1024/1440/1920, quality 78); ran it
  to generate the four WebP variants.
- `app/page.tsx`'s hero `<img>` repointed at `hero-home-4-*.webp`. Kept
  yesterday's `object-fit: contain` treatment and the CSS dark overlay
  unchanged — same reasoning as yesterday's log entry, this photo has no
  baked-in darkening either.

## Why this one letterboxes less
The new source is ≈1.79:1 (5504×3072) vs the previous crop's ≈2.17:1
(1851×850) — closer to typical viewport proportions, so under the same
`contain` treatment it fills more of a normal desktop window with less
aubergine letterboxing. Mobile portrait is effectively unchanged: a phone's
aspect ratio (~0.46:1) is so much taller than either photo that the
letterboxing there is dominated by the viewport, not the small aspect-ratio
difference between the two source images.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run lib/shopifyImage.test.ts lib/staticImage.test.ts` —
  78/78 passing.
- Playwright screenshots at 1500×900 and 390×844: desktop now shows the
  photo nearly full-bleed with a visibly crisper, more detailed image than
  yesterday's version; mobile still letterboxes, as expected and already
  accepted.

## Notes / follow-ups
- `hero-home.jpg`, `hero-home-2.jpg` and `hero-home-3.jpg` (and their
  variants) are all still on disk, unreferenced — same "cheap to keep,
  reversible" call as yesterday, not cleaned up.
