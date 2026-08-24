# Hero: rapid iteration on darkness, vertical position, and zoom
**Date:** 2026-08-21 · **Status:** done

## Sequence
Four quick asks in a row on the live hero, each addressed and reverified:
1. **"the left side is tooo dark"** — see the update to
   `2026-08-21-hero-overlay-steeper-contrast.md`: overlay's outer stops
   0.78/0.92 → 0.5/0.62.
2. **"it can be a little darker"** — 0.5/0.62 → 0.58/0.7. Same steep shape
   both times, only the ceiling moved.
3. **"move the women a lil bit more up wihtout moving background"** —
   `objectPosition` 62% → 72% (see `2026-08-21-hero-reposition-models-up.md`
   for why this is a crop-bias, not independent subject movement — a flat
   photo can't do the latter).
4. **"move the women a lil bit more up and zoom in on them wihtout moving
   background"** — `objectPosition` 72% → 78%, plus a new
   `transform: scale(1.18)` with `transformOrigin: '70% 35%'` (pinned near
   the models, not the image centre). Restated the flat-photo limit again
   in the code comment: scale enlarges the WHOLE frame — background
   included — clipped by the hero's existing `overflow-hidden`; there is no
   way to zoom only the subjects without actually re-editing the photo.

## What changed
`app/page.tsx`, the hero `<img>`:
- `style={{ objectPosition: 'center 78%', transform: 'scale(1.18)', transformOrigin: '70% 35%' }}`
- Overlay gradient outer stops: `0.58` / `0.7` (from the darker-again ask).

## Verification
- `npx tsc --noEmit` — clean after each step.
- `npx eslint app/page.tsx` — clean after each step.
- Final screenshots at 1999×900 and 390×844: models sit noticeably higher
  and larger in frame, heads not clipped at either width, background
  (chandeliers, lamps, hallway) scales and shifts along with them as one
  image — as it has to, being one flat photo — text stays legible.

## Notes / follow-ups
- Four consecutive nudges to the same two values (overlay darkness, crop
  position/scale) suggests these are closer to their right settling point
  now, but if more tuning is wanted, the pattern established here (small
  step, screenshot, re-verify) is the one to keep using rather than jumping
  straight to a big change.
- If "zoom in on just the women, background untouched" comes up again as an
  explicit requirement rather than an approximation, that needs actual
  photo editing (subject cutout + separate background fill), not a CSS
  transform — worth saying so again rather than re-attempting the same
  CSS-only approximation.
