# Y2K series — actual fix for camera distance: outpainting, not prompting

**Date:** 2026-08-14 · **Status:** done

## Goal
Tina asked repeatedly across this session for the camera to be further back --
full body AND head visible with real breathing room, not a tight/elevated crop.
Every prompt-wording attempt (a leading `DISTANCE_LEAD` sentence, extreme wording,
moderate wording, different poses, different scenes, different outfits -- 6+
generations across 2 different outfits) landed back at the same tight, elevated
framing. Per systematic-debugging, that many identical failures on the same axis
means the problem isn't in the wording -- it's a real bias in how `text2image_soul_v2`
composes a "candid photo of a person," and no more prompt tuning was going to fix it.

## The actual fix
Higgsfield has a dedicated `outpaint` model (`npx @higgsfield/cli higgsfield model
get outpaint`) -- not the coverage-fix's `nano_banana_pro` (which edits pixels in
place), but a true canvas-extension model: give it one source image and a target
aspect ratio, and it generates new, consistent scene content OUTSIDE the original
image's borders, keeping the original pixels untouched at their original scale.

Ran it on two already-approved generations (correct outfit, correct coverage,
already-real background, just too tight): `streetstyle-v6-1.png` (patchwork tunic,
canal) and `streetstyle-v9-1-fixed.png` (polka-dot blouse, ornate door), both
outpainted from 2:3 to 9:16. Result on both: her full body (previously cropped at
the knee/thigh) is now completely visible including feet/shoes, PLUS substantially
more of the real environment (the canal scene revealed more of the building,
railing, and sky; the door scene revealed the door's full height and more floor).
She now reads as a genuinely smaller figure in a larger real place -- exactly what
was being asked for all session, achieved in one call with zero prompt engineering,
because the original generation already had the correct content -- outpainting just
gave it more room to exist in.

## What changed
- New script `scripts/y2k_outpaint.py` -- takes a finished generation and outpaints
  it to a taller (or wider) aspect ratio via the `outpaint` model. This is now the
  standard second (or third, after the coverage-fix pass) step for any generation
  where the outfit/coverage/background are already right but framing is too tight.
- Final files: `outpaint-test-1.png` (canal), `streetstyle-v9-farback.png` (door).

## Why this works when prompting didn't
The two problems were never actually related. Getting the outfit, coverage, and a
real background right in ONE generation is a composition problem the model is
already good at (once the prompt is short enough -- see the earlier root-cause log).
Getting the CAMERA DISTANCE right in that same single shot was fighting against the
model's own default composition instinct for "candid photo of a person," which
biases toward tighter framing regardless of instruction. Outpainting sidesteps that
entirely -- it never has to decide "how close should the subject be," it only has to
extend a scene it can already see. Two different problems need two different tools;
no amount of prompt rewording on the first one was ever going to fix the second.

## Notes / follow-ups
- Going forward: generate normally (short prompt, correct outfit/background per the
  established methodology), run the coverage-fix pass if needed, THEN run
  `y2k_outpaint.py` if the framing is still tight. Don't keep trying to solve
  distance via `DISTANCE_LEAD` wording changes -- that path is closed.
- 9:16 was used for both tests and worked well for a standing full-body subject.
  Not yet tested: whether a milder ratio (e.g. 4:5) gives a smaller, more
  proportionate boost for cases that only need a little more room.
