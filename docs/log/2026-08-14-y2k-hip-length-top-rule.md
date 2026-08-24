# Y2K series — top length rule: cover the hip, no crotch-seam visibility

**Date:** 2026-08-14 · **Status:** done

## Goal
Tina flagged the outpainted door photo (`streetstyle-v9-farback.png`): the
cropped polka-dot blouse ended right at the waist, leaving the cream trousers'
front seam/waistband visible right where it sits over the hip/pelvic area (what
she called a "cameltoe" line). Asked for tops to run longer, covering the hip, and
for this specific image to be fixed while keeping everything else the same.

## What changed
- Targeted `nano_banana_pro` edit pass on `streetstyle-v9-farback.png` (not a
  regeneration, to guarantee "everything else the same" per Tina's request):
  extended the blouse's hem a few inches past the hip line, same pattern/fabric/
  tie-front detail, face/pose/hijab/trousers/shoes/bag/background/lighting
  untouched. Saved as `streetstyle-v9-farback-longtop.png`.
- `LAYERING_RULES` in `scripts/y2k_generate.py` updated: any top layer must fall to
  at least hip length, never cropped at the waist, specifically so it fully covers
  the waistband/seam of whatever's underneath. This is now a standing rule for
  every future `--outfit` string, not a one-off fix.
- `docs/y2k/HANDOFF.md` updated with this as locked rule #10.

## Verification
Compared `streetstyle-v9-farback-longtop.png` against the source: top now extends
past the hip fully covering the trouser waistband/seam, and face, pose, hijab,
background, bag, shoes are all visually identical to the source image.

## Notes / follow-ups
None outstanding — straightforward fix, folded into the standing methodology.
