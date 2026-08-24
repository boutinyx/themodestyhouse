# Phone-specific hero photo via <picture>/<source>
**Date:** 2026-08-22 · **Status:** done

## Goal
Following up on "what is the size of the hero on phone" / "is 3:4?" / "which one
is better" (9:16 recommended over 3:4 — much closer to the phone hero box's own
0.46:1 ratio, ~18% width cropped vs ~38%), Tina supplied a genuine 9:16 portrait
shot: `/Users/tina/Downloads/pikaso-creations/magnific__adjust__65041.png`
(1728×3072, same two models/setting as the desktop `hero-home-10.jpg`) and asked
to use it for mobile.

## What changed
- `public/hero-home-mobile.png` — the supplied source, copied in.
- `scripts/optimise-images.mjs` — new job for it: widths `[640, 828, 1080, 1290]`
  (covers phone viewports up to ~430px CSS at 3x DPR), quality 88. Ran the script;
  generated `hero-home-mobile-{640,828,1080,1290}.webp` (11.2MB source → 74–367KB
  per variant, ~97-99% smaller).
- `app/page.tsx` — hero `<img>` wrapped in a `<picture>` with a
  `<source media="(max-width: 767px)">` serving the new mobile srcset; the
  existing `hero-home-10` srcset stays as the `<img>` fallback for ≥768px
  (matches the Tailwind `md:` breakpoint already used elsewhere on this page).
  `style={{ display: 'contents' }}` on the `<picture>` so it doesn't affect the
  `<img>`'s existing absolute/object-cover layout.

## Verification
Playwright: `img.currentSrc` at 390×844 resolves to `hero-home-mobile-640.webp`;
at 1512×944 resolves to `hero-home-10-1920.webp` — confirmed the breakpoint
swap works both ways. Screenshotted both — phone now shows a genuine portrait
composition (both faces visible, no left/right over-crop, no upscale past
source resolution); desktop unchanged.
