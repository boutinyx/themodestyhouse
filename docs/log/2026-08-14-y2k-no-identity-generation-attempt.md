# Y2K paparazzi-style generation, no identity lock — first batch failed

**Date:** 2026-08-14 · **Status:** reverted / needs rework

## Goal
Tina asked for more photos "like" a reference paparazzi-style Y2K screenshot (leather
jacket, turtleneck, ruffled satin skirt, night-out flash photo, candid walking pose,
string lights / candles in background) — explicitly **not** using the locked Fina
character. New Y2K outfits, different settings, full coverage (explicit void list:
no bare legs/knees/thighs, no cleavage, no sheer fabric, no short skirt without
layering underneath, no short sleeves without bodysuit coverage, no hair at the
hairline), one maximalist piece per outfit with the rest calm.

## What changed
Added `scripts/y2k_generate.py` — reuses the coverage-rule text blocks from
`scripts/fina_generate.py` (bodysuit note, awrah layer, hijab note, skin/makeup, film
look) but drops `custom_reference_id` entirely (confirmed optional via
`higgsfield model get text2image_soul_v2`) and swaps in the generic text-only anchor
from `docs/fina/character.md` instead of the Fina identity block. Added new blocks:
`LEG_COVERAGE_NOTE`, `OPACITY_NOTE`, `Y2K_PAPARAZZI_NOTE`, a paparazzi-specific
`POSE`/`FRAMING`, and an explicit `VOID_NOTE` restating Tina's banned-elements list.

Generated 3 outfits, 1 image each, all with `--lighting flash` (all three scenes were
night settings): `y2k-cyber-1.png`, `y2k-disco-1.png`, `y2k-emerald-1.png` in
`public/hero-gen/y2k/`.

## Verification
Read all three images. **All 3/3 failed, on two independent axes:**

1. **Coverage failure — cleavage visibly exposed in all three.** The "opaque
   mock-neck bodysuit" base layer rendered as a nude/tan **bustier/sweetheart-cut
   top** in every image, with a visible cutout or gap showing chest skin — the
   literal thing `BODYSUIT_NOTE` and `VOID_NOTE` both say not to show. This is a
   worse failure than the known bodysuit-reliability issue in `docs/fina/HANDOFF.md`
   (which is about the layer being skipped on deep-V tops ~70-80% of the time) — here
   the model actively drew a cutout garment shape into the "coverage" layer itself,
   on outfits that weren't even deep-V (a closed puffer shrug, a closed bomber, a
   blazer+turtleneck).
2. **Total scene loss — all 3 rendered as flat studio/gradient/white-cutout
   backdrops**, zero trace of the described settings (neon street, restaurant
   entrance, hotel valet). No paparazzi framing, no candid walking pose, no
   background people — they read as generic e-commerce catalog product shots, not
   the reference's candid night-out photo at all.

## Root cause (assessed, not yet fixed)
- Scene loss matches the already-characterized pattern in `docs/fina/HANDOFF.md`
  Known issue #3 (verbose prompt → background drops out) — this prompt is longer
  than Fina's, since it adds `LEG_COVERAGE_NOTE` + `OPACITY_NOTE` + `Y2K_PAPARAZZI_NOTE`
  + `VOID_NOTE` on top of the full Fina coverage stack.
- The cleavage failure is new and likely compounds it: with no `custom_reference_id`
  grounding the output, and a long instruction list, the model appears to be falling
  back on a generic fast-fashion catalog trope (cutout bodysuit under an open jacket)
  rather than following the coverage description literally.
- Not yet isolated which specific block(s) caused which failure — did not run
  controlled single-variable tests before reporting this to Tina, per
  `superpowers:systematic-debugging` (should have been used before more generation
  attempts, not after).

## Notes / follow-ups
- Do not treat these 3 images as usable. Not shown to Tina as finished output —
  shown as a failed first pass with root cause.
- Next step should be a trimmed/shorter prompt tested in small controlled steps
  (e.g., re-add blocks one at a time and check where the scene disappears and where
  cleavage starts showing), rather than another full 3-outfit batch at once.
- `fina_fix_coverage.py` exists as a coverage-only edit pass but was not run here —
  it doesn't fix scene loss, and doesn't make sense to patch coverage on images whose
  setting is already wrong.
