# Y2K series — background finally renders, hijab point fixed, second outfit clean

**Date:** 2026-08-14 · **Status:** done

## Goal
Continue the hijabi street-style reset. Tina flagged three things on the first
outfit under the new methodology: background still a stiff plain backdrop, hijab
had an unnatural pointed peak on top of her head, and asked for another outfit.

## Landscape aspect ratio: confirmed dead end, not pursued further
Tried 4:3 as a middle ground between 2:3 and the earlier failed 16:9. Same failure:
the whole photo rendered rotated 90 degrees to fit a standing figure into a landscape
canvas. 2/2 landscape ratios now reproduce this. Reverted to 2:3 for good -- this is
a structural limitation of the model with a full-body standing subject, not a wording
problem, and isn't worth further attempts without a different underlying approach
(e.g. generating landscape via outpainting/compositing rather than direct generation).

## What actually fixed the background
Not the aspect ratio. Trimmed `LAYERING_RULES`, `POSE_CANDID`, `NATURAL_LOOK`, and
`FRAMING_CANDID` down to roughly a third of their previous length each -- same
information, far fewer words. This matches the standing finding across this whole
series: total prompt length competes with background rendering, not any one
specific block. `FRAMING_CANDID` also now explicitly says "camera far enough back
that her full body is small in frame" and "a photo of a place with her in it, not a
close-up portrait" -- both the brevity AND that explicit framing direction likely
contributed; not isolated further, moving on since it worked.

Result: `streetstyle-leopard-1.png` -- a real, detailed parking garage background
(concrete pillars, parked cars, a building and greenery through the opening) rendered
correctly. First real environment in this whole series' history.

## Hijab point fixed
`hijab_note()` now explicitly says the fabric "drapes smoothly... NO pointed peak, NO
cone shape" and follows the round shape of her head. Confirmed fixed on the very next
generation -- smooth rounded drape, no peak, on both this outfit and the 4:3 test
before it.

## Second outfit under the new methodology
Leopard-print cropped cardigan over a red peplum top, wide-leg jeans, black flats,
quilted black bag, black hijab -- based directly on one of Tina's 13 references
(the parking-garage phone-call photo). Raw generation had a moderate chest cutout.

**The generic coverage edit pass made it WORSE this time** -- turned a small cutout
into full sheer exposure across the whole torso. Same failure mode already logged
once before (2026-08-14 elegant-variations log). Discarded that result immediately
rather than layering more generic edits on top. A second, precisely targeted edit
call on the ORIGINAL raw image ("fill this exact triangular gap with red fabric
matching the top, nothing else") fixed it cleanly on the first try.
**Rule reconfirmed: when the generic edit pass makes things worse, don't iterate on
its output -- go back to the raw generation and write a specific instruction for
exactly what's wrong.**

Final: `streetstyle-leopard-1-final.png`. Fully covered, real background, full body,
smooth hijab, natural expression.

## Notes / follow-ups
- Both outfits generated so far under this methodology (`streetstyle-olive-v3`,
  `streetstyle-leopard-1-final`) are clean. Continue designing outfits directly from
  Tina's 13 reference photos.
- 2:3 is the aspect ratio going forward. Don't retry landscape without a genuinely
  different generation approach.
