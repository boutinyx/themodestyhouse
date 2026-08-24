# Hero: dial the top-crop way back, no zoom
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina, after seeing `hero-home-8.jpg`'s 732px top-crop live: "thats too much
and doont zoom in."

## What changed
- `public/hero-home-9.jpg` — `hero-home-6.jpg` (5461×3072) cropped by only
  **250px off the top** (5461×2822, aspect 1.9352 — nowhere near 21:9, and
  not aiming to be one; picked by rendering the crop and looking at it, the
  same way every hero crop this week was chosen, not by targeting a ratio).
- `scripts/optimise-images.mjs` — registered `hero-home-9.jpg` with the
  same quality/widths as `hero-home-8.jpg`'s job; marked `hero-home-8.jpg`'s
  comment as superseded.
- `app/page.tsx` — hero `<img>` repointed at `hero-home-9-*.webp`. No
  `objectPosition` or `transform` override — "don't zoom in" covers both
  the earlier CSS zoom hack (already removed) and the crop amount itself,
  so this stays close to the original framing rather than reaching for
  another aggressive trim.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run --exclude ".claude/**"` — 722/722 passing, 44/44 files.
- Screenshotted at 1999×900 and 390×844 (mobile): visibly less aggressive
  than the 732px version — both chandeliers fully in frame, no zoomed-in
  feel, full figures and floor intact.

## Notes / follow-ups
- `hero-home-8.jpg` (732px crop) stays on disk, registered, unreferenced.
