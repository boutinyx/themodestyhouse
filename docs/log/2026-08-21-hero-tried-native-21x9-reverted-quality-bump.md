# Tried Tina's own 21:9 photo, reverted; bumped hero quality
**Date:** 2026-08-21 · **Status:** done

## Part 1 — hero-home-7.jpg, tried and reverted
Tina found and supplied her own 21:9 photo (a different shot from the
existing set, natively 3063×1313, verified 2.3328 ≈ 21:9 exactly — no crop
needed) with three asks: use it, darken the background but not the women,
and don't zoom in.

- Saved as `public/hero-home-7.jpg`, registered in
  `scripts/optimise-images.mjs`, variants generated.
- `app/page.tsx`: swapped the hero `<img>` to it, switched to
  `object-fit: contain` per "dont zoom in" (same fix as the 2026-08-20
  `contain` episode), and recentred the inverse-spotlight overlay to this
  photo's own composition — measured at 74%/55% by cropping a small square
  at the candidate centre and confirming it landed on satin fabric before
  committing to the number, not eyeballed.
- Mid-verification, Tina: "nevermind revert back." Reverted `app/page.tsx`
  to the prior `hero-home-6.jpg` / `object-cover` / 68%/40% spotlight
  configuration exactly. `hero-home-7.jpg` and its variants are left on
  disk, registered, unreferenced — same "cheap to keep" call as every other
  hero file this week.

## Part 2 — "i want better quality"
Right after the revert, Tina asked for better image quality on the (now
active again) `hero-home-6.jpg`.

- `scripts/optimise-images.mjs`: hero-home-6's WebP `quality` raised
  78 → 92. 78 was the ORIGINAL hero job's setting (`hero-home.jpg`,
  quality-insensitive content) and had just been inherited by every hero
  file swap since without being reconsidered — this file specifically holds
  close-up faces and satin/silk texture, where compression banding is more
  visible than on the original photo.
- Added a 2400w variant to the `widths` array. The previous ceiling (1920)
  is only the correct resolution at 1x; a ~1200px-wide crop on a 2x retina
  display needs ~2400px of real source pixels to render sharp instead of
  the browser upscaling the 1920 file.
- `app/page.tsx`: added `/hero-home-6-2400.webp 2400w` to the `srcSet`.
- File size cost, for the record: 1920w webp went from 78KB → 288KB (3.7×);
  the new 2400w is 464KB. Both are still small relative to typical hero
  imagery and load once, but worth having said out loud rather than left
  silent.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run lib/shopifyImage.test.ts lib/staticImage.test.ts` —
  78/78 passing.
- Playwright at 1999×900 with `deviceScaleFactor: 2`: read the `<img>`'s
  live `currentSrc` and confirmed the browser actually selected
  `hero-home-6-2400.webp` at 2x DPR (not just that the file exists).
  Screenshotted the result — visibly sharper satin detail than the
  pre-quality-bump version.

## Notes / follow-ups
- Only `hero-home-6.jpg`'s job was bumped to quality 92 + a 2400w variant.
  The other, now-unused hero jobs (`hero-home.jpg` through `hero-home-5.jpg`,
  `hero-home-7.jpg`) are still at quality 78 / max 1920w — if any of them
  comes back into use, its own quality/width should be reconsidered the
  same way, not assumed fine because a sibling file was fixed.
