# Y2K series — minidress-over-trousers outfit, framing distance fix (partial)

**Date:** 2026-08-14 · **Status:** done, one open item

## Goal
Tina sent a Polyvore-style flat-lay collage (taupe draped poncho cape + pearl
necklace, pink spaghetti-strap mini dress, snake-print flared trousers, grey heels,
grey bag, gold bangles, sunglasses) and asked for it combined into one worn outfit:
the pink mini dress as a short top layered over the trousers, hem ending at the top
of the hip (per her own wording, "where the vagina sits" -- i.e. right at the hip
crease, not shorter), full leg coverage from the trousers underneath. Also flagged
that every shot this session has the camera too close -- both candid and mirror
selfies -- and asked for more distance, using variation 9 (the ornate-door polka-dot
shot) as the reference for "far enough back."

## What changed (scripts/y2k_generate.py)
- `FRAMING_CANDID` and `FRAMING_SELFIE` both strengthened: explicit "more distance
  than a normal fashion photo," "visible empty space above her head and on both
  sides," "she occupies well under half the frame's height." Selfie framing also
  fixed the "phone held too high" issue -- now specifies chest/shoulder height, not
  a high downward angle.

## First attempt failed on scene AND framing
The full outfit description (dress + cape + necklace + trousers + bag + bangles +
sunglasses, all in one clause) reproduced the exact bloat problem already documented
earlier the same day: scene collapsed to a flat studio backdrop, and framing stayed
close despite the new instructions. Consistent with the standing finding all session
-- a dense outfit description competes with scene/framing for the model's attention.

## Second attempt: trimmed outfit, scene restored
Cut the outfit description down to the essential coverage-defining pieces. Result:
real ornate-door background rendered correctly, the pink bustier top came out fully
opaque (no chest cutout, unlike most other outfits this session), and the top's hem
correctly ends at the hip with the snake-print trousers providing full coverage
below, matching Tina's brief exactly. Framing pulled back further than the first
attempt, though possibly still not as distant as variation 9 -- not fully resolved.

Final file: `streetstyle-minidress-v2-1.png`.

## Open item, not resolved
Framing distance is improved but may not fully match what Tina asked for. Also
noted but not conclusively verified: a shadowed gap between the two flared trouser
legs near the upper thigh that could not be confirmed as fabric shadow vs. skin from
visual inspection alone -- flagging rather than asserting either way.

## Notes / follow-ups
- The "dense outfit description breaks scene rendering" pattern is now confirmed on
  a 3rd independent case (garment detail block, LEG_COVERAGE/OPACITY/VOID blocks,
  now a long multi-accessory outfit clause). When translating a multi-piece
  reference (like a flat-lay collage) into an outfit brief, keep the --outfit string
  to the coverage-defining pieces and drop secondary accessories if the scene stops
  rendering.
