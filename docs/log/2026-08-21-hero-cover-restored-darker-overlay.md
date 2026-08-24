# Back to full-bleed cover for the hero, darker overlay
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina, screenshotting the live `contain`-fit hero from yesterday: "i still
see purple border. and make the overlay a bit ddarker." The thin
`--aubergine` letterbox bars from `object-fit: contain` were visible at her
actual window size, and she wants them gone; separately, the dark overlay
should read a bit stronger.

## What changed
`app/page.tsx`, hero section:
- `object-fit: contain` → `object-cover`, no `objectPosition` override
  (plain centre crop). `contain` was adopted yesterday specifically because
  the then-current photo (1851×850) forced a heavy, quality-losing crop
  under `cover`. That reasoning doesn't hold for `hero-home-4.jpg`: it's a
  5504×3072 Magnific upscale with real detail to spare, at a closer aspect
  ratio (≈1.79:1) to typical viewports, so `cover`'s crop on this
  particular photo is mild rather than the aggressive one that prompted
  the switch in the first place.
- Overlay opacity `rgba(0,0,0,0.42)` → `rgba(0,0,0,0.52)`. Left the radial
  gradient underneath it at its existing 0.30 — that's a separate vignette
  centred on the text, and bumping the flat wash alone already answers "a
  bit darker" without also concentrating extra darkness in the middle.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- Playwright screenshot at 1999×1178 (matching Tina's actual browser window
  size from her screenshot) — no letterbox bars, full-bleed edge to edge,
  visibly darker than before.
- Screenshotted mobile (390×844) too — also full-bleed now, no border,
  darker overlay.

## Notes / follow-ups
- This reverses yesterday's `contain` decision, but only because the photo
  itself changed underneath it (much higher native resolution, closer
  aspect ratio) — not a contradiction of "don't zoom in if it's too short,"
  just that trade no longer applies to this specific image. If a future
  hero photo goes back to a very wide/short crop, the crop-vs-letterbox
  trade-off from the 2026-08-20 log entries is worth re-checking rather
  than assuming `cover` is always right now.
