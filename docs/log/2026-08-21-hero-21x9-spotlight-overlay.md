# Hero: crop to 21:9, replace the flat overlay with a spotlight on the women
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "can you turn the photo into 21:9 i dont care if you need to cut off
the ending just cut it" then, immediately after — "listen closely to me i
dont want a full dark ooverlay. i only want it for the space around the
women. the women should be ligther than the rest."

## What changed

### 1. Crop to 21:9
`hero-home-4.jpg` (5504×3072, ≈1.79:1) doesn't reach 21:9 (≈2.333:1) by
adding width — cropping only removes pixels, so getting there meant
removing height, not width. Used `sharp`'s attention/saliency-based crop
(`position: sharp.strategy.attention`) rather than guessing an offset by
eye; it picked `cropOffsetTop: -713, cropOffsetLeft: 0` on its own — i.e.
kept the full top of the frame and trimmed the last ~713px, which is
exactly the marble floor below both models' hemlines. Both faces, both
full figures, and both chandeliers survived untouched. Saved as
`public/hero-home-5.jpg` (5504×2359, verified exactly 2.333 = 21:9),
registered in `scripts/optimise-images.mjs`'s `JOBS` array same as every
prior hero file, variants generated.

### 2. Spotlight overlay, not a flat wash
Replaced BOTH previous overlay `<div>`s in `app/page.tsx` — the left-to-
right linear gradient from the last revision, and a second radial vignette
left over from before that (centred on the TEXT, not the photo) — with one
radial gradient centred on the models themselves:
```
radial-gradient(ellipse 60% 90% at 68% 48%,
  rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.28) 45%,
  rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.72) 100%)
```
`68%/48%` is the models' approximate centre in `hero-home-5.jpg`'s own
crop (they run roughly 35%–95% horizontally, full height vertically).
Near-transparent directly over them, darkening outward into the empty
hallway on the left and into the corners. The headline and search bar sit
inside that darker zone (left-of-centre), so they still read clearly
against dark background rather than a wash over the whole photo — text
legibility now comes from where the darkening naturally falls plus the
h1's own `text-shadow`, not from flattening the whole frame.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run lib/shopifyImage.test.ts lib/staticImage.test.ts` —
  78/78 passing.
- Playwright screenshots at 1999×900, 2200×950, and 390×844 (mobile): the
  models read visibly brighter than the hallway/corners at every width
  tested; text stays legible; mobile's narrower crop (still `object-cover`,
  plain centre) lands close enough to the spotlight zone that the visible
  model is still the brightest part of the frame.

## Notes / follow-ups
- `hero-home-4.jpg` (pre-crop) is left in place, unreferenced, same
  "cheap to keep" reasoning as every earlier hero swap this week.
- The spotlight's `68%/48%` centre is calibrated to THIS specific crop —
  if the hero photo changes again, that position (and the radial's ellipse
  size) will need re-checking against the new composition, not assumed to
  still be right.
