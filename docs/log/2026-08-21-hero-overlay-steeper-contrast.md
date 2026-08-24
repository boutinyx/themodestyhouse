# Hero overlay: steeper contrast to match the reference's "vibe"
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina, sending the same reference mockup again: "i want the vibe more like
this."

## Research
Sampled the reference image pixel-by-pixel with `sharp` rather than
eyeballing it. The background across roughly the left two-thirds reads as
RGB values of 8–30 — near-solid black, not just "darker" — with an abrupt
switch to full, undarkened brightness where the models are. That's a hard
editorial contrast, not the soft wide fade the previous overlay had.

## What changed
`app/page.tsx`, the inverse-spotlight overlay `<div>`: kept the same centre
and ellipse size (68%/40%, 60%/70% — already correctly positioned on the
models, confirmed in the prior log entry), only changed the gradient STOPS:
- Before: `rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.72) 100%` — a gradual ramp.
- After: `rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.78) 60%, rgba(0,0,0,0.92) 100%` — near-nothing through 35%, then a steep climb to near-black by 60%.

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- Screenshotted at 1999×900 (desktop) and 390×844 (mobile): the left side
  now reads as near-black, matching the reference's contrast, while the
  models stay fully bright and vivid; text stays legible on both.

## Follow-up, same day: "the left side is tooo dark"
The near-black outer stops (0.78/0.92) matched the reference exactly but
read as too dark live. Brought them down to 0.5/0.62 — same steep SHAPE
(still a hard edge into darkness, not a slow fade back to the gradual
version), just a lighter ceiling. The hallway's lamps and chandelier detail
are visible again on the left while the models still read clearly brighter.
Re-verified: `tsc`/`eslint` clean, screenshotted at 1999×900.
