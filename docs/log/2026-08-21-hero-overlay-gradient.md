# Hero overlay: flat wash → left-dark, right-light gradient
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "can you make the overlay darker at the left side and on the right
side lighter?" — the flat `rgba(0,0,0,0.52)` wash from the previous change
should instead fade across the photo.

## What changed
`app/page.tsx`, hero section: replaced the flat-colour overlay `<div>` with
`background: 'linear-gradient(to right, rgba(0,0,0,0.62), rgba(0,0,0,0.28))'`
— darker than the previous flat 0.52 on the left (where the empty hallway
and most of the headline/search sit), lighter on the right (where the two
models are, closer to the photo's own exposure). Left the radial gradient
underneath it unchanged — it's a separate, centred vignette behind the text
and doesn't fight with a left-right fade.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- Screenshotted at 1999×1178 (desktop) and 390×844 (mobile): the fade is
  clearly visible in both, satin detail on the models reads brighter on the
  right, and the headline/search stay fully legible since they sit in the
  darker left/centre band.
