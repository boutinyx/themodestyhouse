# Swap the homepage hero photo, twice, and fix the resulting zoom
**Date:** 2026-08-20 · **Status:** done

## Goal
Tina supplied a new hero photograph (two women in satin hijabs/abayas in an
ornate, chandelier-lit hallway) to replace the current one.

## First pass — hero-home-2.jpg
- Master saved as `public/hero-home-2.jpg` (PNG source, converted to JPEG;
  new filename, not a swap of `hero-home.jpg` itself — public/ is served
  with a 4-hour max-age and Next doesn't fingerprint these paths, CLAUDE.md
  §6/§10.21).
- Registered in `scripts/optimise-images.mjs`'s `JOBS` array (same shape as
  the existing hero job: widths 640/1024/1440/1920, quality 78) and ran it
  to generate the four WebP variants.
- `app/page.tsx`'s hero `<img>` repointed at the new file.
- The source's own filename said "exact-dark-overlay" — it already carried
  a baked-in dark wash. Rendered with the site's existing CSS overlay
  (`rgba(0,0,0,0.42)` + a radial gradient) still on top, it visibly
  double-darkened: the chandelier and warm wall lamps that were clearly
  visible in the reference all but disappeared. Removed both CSS overlay
  `<div>`s for this photo and re-screenshotted — much closer to the
  reference, and the headline/search stayed legible on their own (the h1
  already carries its own `textShadow`, and the search field is on its own
  frosted-glass background — neither depends on the page-level overlay).

## Tina's follow-up: "you zoomed in a little didnt you"
Correct diagnosis, confirmed by the numbers: `hero-home-2.jpg` is
1672×769 (≈2.17:1, a wide/short banner crop), and the hero container is
close to full viewport height. `object-fit: cover` has to scale the image
up until it covers that full height, and at this aspect ratio that forces a
heavy horizontal crop — worse the taller/narrower the viewport (mobile was
the extreme case: only a ~21% horizontal sliver of the photo was visible).
Repositioning wouldn't have fixed it — `object-position` only changes WHAT
gets shown, not how much gets cropped; the crop amount is fixed purely by
the container/image aspect-ratio mismatch. Asked which of three real fixes
she wanted (shrink the hero's height / accept the crop / get a taller
photo); her answer: a new photo is coming, don't crop it, apply a dark
overlay, and if the new one is also short, let it be short rather than
zooming to fill.

## Second pass — hero-home-3.jpg (what's live now)
- New photo (1851×850, same two models/setting, no baked-in darkening this
  time) saved as `public/hero-home-3.jpg`, registered the same way in
  `optimise-images.mjs`, variants generated.
- `app/page.tsx`: switched the hero `<img>` from `object-cover` (+ an
  `objectPosition` override) to `object-contain`, and removed the position
  override — `contain` never crops, it letterboxes instead, in the
  container's own `--aubergine` background wherever the photo doesn't fill
  the box. Restored the CSS dark overlay (this source has no baked-in
  darkening, unlike the first swap).
- Net effect: wide/short viewports show the photo nearly full-bleed with
  minimal letterboxing; a phone in portrait shows the same uncropped photo
  as a horizontal band with aubergine above and below — exactly the
  trade-off Tina asked for ("dnt zoom in if its too short thats the plan"),
  flagged here explicitly since it's a real, visible change on mobile.

## Verification
- `npx tsc --noEmit` — clean, both passes.
- `npx eslint app/page.tsx scripts/optimise-images.mjs` — clean.
- `npx vitest run lib/shopifyImage.test.ts lib/staticImage.test.ts` — 78/78
  passing (hero images aren't part of the `editorial` registry those tests
  cover, confirmed by reading `staticImage.test.ts` itself before assuming,
  so no new registration was needed there).
- Playwright screenshots at 1500×900, 1920×1000, and 390×844 (mobile) for
  the final `hero-home-3.jpg` + `object-contain` version: no cropping at
  any width, letterboxing scales from barely visible (wide) to a full band
  (mobile portrait), overlay + text legible throughout.

## Notes / follow-ups
- `hero-home.jpg` (original) and `hero-home-2.jpg` (first replacement) are
  left in place on disk with their generated variants, unreferenced. Not
  deleted — cheap to keep, reversible if either gets reused.
- Homepage OG/social-preview image (`/hero-poster.jpg`, `lib/seoCopy.ts`)
  was NOT touched — that's a separate, dedicated asset used site-wide as a
  fallback social card, not literally tied to the live hero photo, and
  wasn't part of what was asked.
