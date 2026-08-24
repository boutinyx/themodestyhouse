# Hero: shift the crop so the models sit higher in frame
**Date:** 2026-08-21 · **Status:** done

## Goal
Tina: "can you move the women a lil more up without moving the background."

## Reality check, stated plainly
`hero-home-6.jpg` is one flat photograph, not layered artwork — there's no
way to move the two models independently of the hallway behind them
without actually re-editing the photo itself (outpainting the canvas and
recompositing), which a CSS change can't do. What CSS *can* do is change
which slice of that one photo `object-fit: cover` crops to fit the hero
container — and since the models sit above vertical-centre in the source
image, biasing that crop toward the photo's bottom makes less ceiling show
and more floor show, which reads as the models moving up within the frame.
The hallway/chandelier don't change size or proportion relative to each
other — just how much of the top vs. bottom gets cropped off.

## What changed
`app/page.tsx` — added `style={{ objectPosition: 'center 62%' }}` to the
hero `<img>` (previously unset, i.e. default `50% 50%`, perfectly centred
crop).

## Verification
- `npx tsc --noEmit` — clean.
- `npx eslint app/page.tsx` — clean.
- Screenshotted at 1999×900: models visibly higher in frame vs. the prior
  screenshot — more of their torsos down to the hip-tie now visible, less
  ceiling/chandelier above them.
- Screenshotted mobile (390×844): unchanged, and correctly so — on a narrow
  tall viewport `cover` is already constrained by HEIGHT (the image scales
  to fill the container's height, cropping only left/right), so there's no
  vertical crop for `objectPosition`'s Y value to affect there at all.
