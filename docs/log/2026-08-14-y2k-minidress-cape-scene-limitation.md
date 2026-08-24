# Y2K series — minidress+cape outfit: real limitation found, not resolved

**Date:** 2026-08-14 · **Status:** partial, honest limitation surfaced rather than
forced

## Goal
Fix three things Tina flagged on the previous minidress attempt: the cape had been
visually merged into the base layer instead of reading as a separate garment worn
over everything, accessories (sunglasses, bangles, bag) were missing, hair was
visible again, and the camera was still far too close to the face despite earlier
framing fixes.

## What changed (scripts/y2k_generate.py)
- Added `DISTANCE_LEAD`, a short framing directive placed as the FIRST sentence of
  the entire prompt (before identity/hijab/outfit), on the theory that a framing
  instruction buried near the end loses out to earlier, more detailed instructions --
  same mechanism already confirmed for `GARMENT_DETAIL` causing scene loss.
  `FRAMING_CANDID`/`FRAMING_SELFIE` trimmed down since `DISTANCE_LEAD` now carries
  the main framing weight.

## Result: distance fixed decisively, but a new trade-off appeared
`DISTANCE_LEAD` worked -- every generation after this point had genuinely good
full-body framing with real distance, a clear improvement confirmed across 4
consecutive generations. But this specific outfit (a fitted bustier top + a separate
loose flowing cape + patterned trousers + multiple accessories) could not be made to
render a real environment simultaneously, across 4 separate attempts with
progressively trimmed outfit text and scene text:
- `minidress-final-a`: good distance, cape correctly separate, pink top preserved,
  but strapless/exposed shoulders and no real background.
- `minidress-final-b`: merged distance+location instruction into `DISTANCE_LEAD`
  itself -- still no background, cleavage exposed.
- `minidress-final-c`: shortened `DISTANCE_LEAD` further, trimmed outfit to the
  essentials -- still no background.
- `minidress-final-d`: tried a much shorter scene phrase ("on a cobblestone street by
  a canal") to test whether scene TEXT length itself was the blocker -- ruled out,
  still no background, worse exposure.

This is 4 consecutive failures on the same specific axis (real environment) despite
varying every other variable -- per the systematic-debugging Iron Law, this is now
being treated as a genuine limitation of this outfit's complexity (3 distinct
garment layers + accessories, on top of the identity/hijab/framing text this script
already carries), not something to keep guessing at with more wording.

## Best available result
`minidress-final-a-1-fixed.png` -- ran the coverage-fix edit pass on the one
raw generation that had kept the pink color and correct separate-cape rendering.
Result: fully covered, correct cape-as-second-layer, excellent distance/full-body
framing. Still missing: real background (plain grey studio backdrop) and the
sunglasses/bangles/handbag accessories, which did not survive any of the 4 attempts.

## Notes / follow-ups -- decision needed from Tina, not guessed
Reported to Tina directly rather than continuing to iterate blindly: this dense,
multi-layer "flat-lay collage" outfit type may need either (a) a simpler outfit
translation with fewer simultaneous distinct pieces, (b) a two-pass approach --
generate the outfit accepting a plain background, then use a compositing/edit pass
to add the environment behind her (same tool, `nano_banana_pro`, already used for
coverage fixes) -- untried for backgrounds specifically, or (c) accept the plain
background for outfits at this complexity level. Not decided unilaterally.
