# Y2K series — eye-level camera angle: fixed via edit pass, then reopened by Tina

**Date:** 2026-08-14 · **Status:** tool built and works, but NOT accepted as final —
follow-up needed, don't treat this as closed

## Goal
Tina asked for "3 from a normal angle like before" — the generation had been
defaulting to an elevated/overhead OOTD angle instead of eye level.

## What was tried and failed (generation-time wording, 3 attempts)
1. Direct instruction: "shot straight-on at a normal eye level, camera NOT angled
   down from above" — still overhead, and coverage regressed (sheer torso).
2. Positive-only phrasing (avoiding the "NOT" negation, on the theory that naming
   the unwanted concept can reinforce it): "photographed from her eye height, a
   straight-on street-style photo" — still overhead.
3. Different pose, since "leaning against a door" specifically may correlate with
   an overhead angle in training data: "standing normally... a friend took this
   photo standing directly in front of her at the same height" — still overhead,
   and worse coverage regression (fully sheer torso).

3 consecutive identical failures on the same axis, wording varied each time —
same shape as the distance problem earlier this session.

## What worked
New script `scripts/y2k_fix_angle.py` — a `nano_banana_pro` edit pass, same family
as the coverage-fix and asked to literally "change the camera angle/perspective...
to eye level... re-render the whole scene and her body from this new... perspective."
Run on `streetstyle-chiffon-eyelevel-b-1.png` (good coverage, good outfit, overhead
angle) → `streetstyle-chiffon-eyelevel-b-1-anglefix.png`: genuinely eye-level,
full body, real street background, first try.

## Tina's reaction — reopen this, don't treat as done
Immediately after seeing the result: "now the blouse is too long and you did it
fucking close again nevermind." Two things she flagged, not yet addressed:
1. The blouse read as too long/oversized in this specific result (the angle-fix
   edit pass may have changed proportions when it re-rendered the body/perspective
   — worth checking whether angle-correction edits distort garment length as a
   side effect).
2. Still reads as "close" to her despite being full-body and eye-level — the
   camera-distance complaint from earlier may not be fully resolved by outpainting
   alone, or the angle-fix pass may have undone some of the outpaint distance gain
   (this specific image was NOT outpainted before the angle fix — angle-fix was
   run on the tight/un-outpainted version, so it never got the distance treatment
   at all).

She said "nevermind" — stopped the thread rather than asking for another fix
immediately. Do not present `y2k_fix_angle.py`'s output as the final answer next
session without re-checking these two complaints first.

## Notes / follow-ups
- `y2k_fix_angle.py` itself is a real, working tool — keep it. The open question is
  ordering/interaction with the other two fixes (coverage, outpaint) and whether
  running angle-fix on a NOT-yet-outpainted image is why "close" persisted. Try the
  full chain in order next time: generate → coverage-fix → outpaint → angle-fix,
  and check blouse proportions after the angle-fix step specifically.
- Do not reopen this line of work proactively — wait for Tina.
