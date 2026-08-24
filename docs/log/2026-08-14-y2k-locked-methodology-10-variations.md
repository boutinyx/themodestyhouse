# Y2K series — locked methodology, first 10-variation batch

**Date:** 2026-08-14 · **Status:** done

## Goal
Tina approved `streetstyle-leopard-1-final.png` as the target look (real background,
full body, smooth non-pointy hijab drape, natural expression) but flagged one more
issue -- a sliver of hair visible at the top-center hairline. Asked to lock this
configuration and generate 10 variations across scenery, pose, outfit, and camera
angle, sourced from her remaining reference photos.

## What changed
- `hijab_note()` strengthened again: explicit instruction to check the top-center of
  the head specifically (where the hijab begins) for any sliver/wisp of hair, not
  just the general hairline. This is the third tightening of this note this session.
- Confirmed this is the locked baseline going forward: no identity lock, 2:3 aspect
  ratio, real-garment layering (no invisible bodysuit), `NATURAL_LOOK` (not glam),
  `STREET_STYLE_NOTE` + `POSE_CANDID`/`POSE_SELFIE` + `FRAMING_CANDID`/`FRAMING_SELFIE`
  per `--shot-type`.

## The 10 variations
Each built directly from one of Tina's remaining reference photos, varying shot type,
location, pose/angle, and outfit:

1. Floral kimono duster + blue turtleneck + cream maxi skirt -- bathroom mirror selfie
2. Grey turtleneck + denim A-line skirt + boots -- candid, sitting on a park bench
3. Chartreuse ruffled blouse + cream trousers -- fitting-room mirror selfie
4. Sage poncho + white top/trousers -- candid, outdoor stairs, low angle
5. Sheer blue ruffle blouse + jeans -- bedroom mirror selfie
6. Patchwork tunic + black trousers -- candid, canal-side railing, 3/4 angle
7. Red cardigan + lace cami + jeans -- candid, cobblestone riverside
8. Peach chiffon blouse + cream trousers -- candid, sitting on stone steps, low angle
9. Brown polka-dot blouse + cream jeans -- candid, ornate wooden door, eye level
10. Brown plaid poncho + olive trousers -- candid, parking lot, elevated angle

## Coverage-fix pattern held up, with two new lessons
- 5 of 10 raw generations were clean on the first try (1, 3, 4, 6, 10) -- no edit
  pass needed.
- 4 of 10 needed the standard coverage edit pass for a chest/neckline gap (5, 7, 8,
  9); 2 of those 4 needed a second, precisely targeted pass after the generic one
  under-corrected (7, 8) -- consistent with the pattern already logged twice before.
- **New lesson from variation 2:** running the generic coverage-fix pass on an image
  that does NOT actually have a coverage problem is actively harmful -- it replaced
  a perfectly fine grey sweater with a plain nude bodysuit-look top, destroying the
  outfit, because the edit model found *something* to "fix" even though the real
  issue was only a few hair strands at the hairline. **Rule: only run the coverage
  edit pass when there is an actual visible skin/sheer exposure. For anything else
  (a hairline touch-up, a small styling fix), write a narrow, specific edit prompt
  instead of reaching for the generic coverage-fix script.**

## Final files (public/hero-gen/y2k/)
`streetstyle-v1-1.png`, `streetstyle-v2-1-final.png`, `streetstyle-v3-1.png`,
`streetstyle-v4-1.png`, `streetstyle-v5-1-fixed.png`, `streetstyle-v6-1.png`,
`streetstyle-v7-1-final.png`, `streetstyle-v8-1-final.png`,
`streetstyle-v9-1-fixed.png`, `streetstyle-v10-1.png`.

## Verification
Visually inspected all 10 at full resolution for the void list (cleavage, midriff,
hip/thigh skin, sheer fabric, hairline exposure) plus the hair-at-crown issue
specifically. All 10 clean on that basis. Not verified: whether variation 2's denim
mini skirt has a bare-knee gap above the boots -- the frame crops right at that
point and it could not be confirmed either way. Flagging rather than assuming it's
fine.
