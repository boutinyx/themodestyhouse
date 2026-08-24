# Y2K no-identity generation — root cause found, working pipeline delivered

**Date:** 2026-08-14 · **Status:** done

## Goal
Follow up on the failed first batch (`docs/log/2026-08-14-y2k-no-identity-generation-attempt.md`)
per systematic-debugging: find the actual root causes of the coverage exposure and the
scene loss, fix them, and don't come back until the pipeline reliably produces clean
Y2K paparazzi-style outfit photos matching Tina's void list, with no locked character.

## Investigation (Phase 1–3, systematic-debugging)
Ran 6 controlled single-variable tests (`test-a` through `test-f` in
`public/hero-gen/y2k/`) varying one thing at a time: identity lock on/off, opening
frame phrase ("street-style" vs "editorial fashion photograph"), outfit top garment
type (turtleneck vs crew-neck), open vs. theoretically-closed outer jackets, and
presence/absence of the `GARMENT_DETAIL` prompt block.

**Root cause 1 — scene loss (CONFIRMED, fixed).** `GARMENT_DETAIL` ("render every
garment detail with precision -- embroidery, beading, fabric texture, sheen, and
trim") competes with the background/scene instructions for the model's generative
attention. Test E (this block present) → flat white studio backdrop despite an
explicit concrete scene description. Test F (only change: block removed) → full,
correct scene (hotel entrance, lanterns, blurred interior, correct flash/ambient
light mismatch) on the very next generation. Confirmed again on redeploy: the
production script with `GARMENT_DETAIL` removed but 4 other blocks still present
(`LEG_COVERAGE_NOTE`/`OPACITY_NOTE`/`Y2K_PAPARAZZI_NOTE`/`VOID_NOTE`) still lost the
scene — so it's not just that one block, it's overall prompt length competing with
scene fidelity. Fix: dropped `GARMENT_DETAIL` entirely from `y2k_generate.py`, and
also dropped `LEG_COVERAGE_NOTE`/`OPACITY_NOTE`/`VOID_NOTE` (they weren't measurably
reducing coverage failures either — see below — so they were pure cost with no
benefit). The prompt is now close to Fina's own proven length. Scene rendered
correctly in every regeneration after this (cyber, disco, emerald all show real
paparazzi-style settings, not studio backdrops).

**Root cause 2 — coverage exposure (CONFIRMED as a model limitation, not a prompt
bug — architecture question resolved per the Iron Law).** 7 independent tests, each
changing one variable (identity lock, framing phrase, garment-type wording, "closed"
vs "open" jacket instructions), all produced the same failure shape: a cutout/sweetheart
opening at the chest, sometimes extending to a bare hip/thigh gap. This happened
regardless of whether the outfit even described an open garment — one test explicitly
said "fully zipped-up... zipped all the way up to a high collar" and the model still
rendered it open with the same cutout. This matches (and is a more severe version of)
the already-documented `docs/fina/HANDOFF.md` known issue #1: the model does not
reliably follow single-shot coverage instructions on fitted/going-out-style outfits.
Per the debugging skill's Iron Law (3+ fixes failing on the same shape of problem
means stop guessing and question the architecture), this was treated as confirmed
after test D/E, not re-litigated further. The already-accepted fix for the identical
problem in the Fina pipeline is the right one here too: a mandatory second-pass image
edit, not more prompt engineering.

## What changed
- `scripts/y2k_generate.py` — removed `GARMENT_DETAIL`, `LEG_COVERAGE_NOTE`,
  `OPACITY_NOTE`, `VOID_NOTE`. Opening frame phrase aligned to the proven
  "Ultra-realistic editorial fashion photograph of" wording. Added comments
  explaining why, pointing here, so nobody re-adds them and reintroduces scene loss.
- `scripts/y2k_fix_coverage.py` — new script, same mechanism as
  `scripts/fina_fix_coverage.py` (Higgsfield `nano_banana_pro` image-edit pass) but
  with a broader edit prompt covering the y2k series' wider void list: chest/midriff
  (Fina's original scope) plus hip/thigh cutouts, sheer/see-through fabric, and
  hairline exposure — none of which the Fina-only edit prompt addressed.
- Generated final outfits: `y2k-cyber-v2-1-fixed.png`, `y2k-disco-v3-1-final.png`,
  `y2k-emerald-v4-1-final.png` in `public/hero-gen/y2k/`. All three visually verified:
  no cleavage/midriff/hip/thigh skin, no sheer fabric, hair/hairline fully covered,
  legs fully covered, and a real rendered paparazzi-style night scene (not a studio
  backdrop) in every one.

## The edit pass is not one-shot reliable either — worth knowing
The coverage edit pass fixed the chest cutout cleanly on the first try for 2 of 4
attempts (cyber, one emerald pass). On the other 2 it needed a second, more specific
edit call (disco needed a second pass with an explicit "fill this exact cutout with
matching fabric" instruction after the generic edit prompt did nothing visible;
emerald needed a second targeted pass after the first pass fixed the chest but left a
waist/hip gap — and a naive second call with the *generic* edit prompt made that
specific case *worse*, inventing a thong-shaped cutout that wasn't there before).
**Rule for next time:** run the generic edit pass first; if a visible flaw survives,
don't just re-run the same generic prompt — look at exactly what's still wrong and
write a specific instruction for that exact gap (which fabric color it should match,
which direction to extend it). Re-running the generic prompt blind on an
already-mostly-fixed image risks it "finding" a new place to invent an opening.

## Outfit-writing lesson (not a code fix, a brief-writing one)
Every outfit that included a jacket/blazer worn **open** over another top produced
catastrophic exposure (full sheer torso, hip-to-thigh cutout) that the edit pass could
not reliably salvage — worth discarding and regenerating rather than chasing with more
edit passes. Outfits built as **one long-line/complete garment** (a single top that
extends past the hip, or a full-length dress/skirt with no separate open outer layer)
produced only a small localized chest cutout, which the edit pass fixes reliably. For
this series specifically: avoid open jackets/blazers/shrugs as the outfit's outer
layer; use closed silhouettes or cropped-short layers instead, even though the
reference photo itself has an open jacket — the reference is a real photo, not a
generation constraint the model can currently honor.

## Verification
Visually inspected all 3 final images at full resolution: no exposed skin beyond
face/neck/hands, no sheer fabric, hijab fully covers hair/hairline/ears in all three,
legs fully covered in all three, and each has a real rendered environment (neon
street, restaurant-adjacent dusk setting, hotel valet entrance at night) with the
flash-vs-ambient light mismatch that matches Tina's reference photo's look.

## Notes / follow-ups
- `y2k_fix_coverage.py`'s edit prompt now covers the y2k series' full void list, but
  if a new exposure pattern shows up, extend it there rather than trying to prevent it
  in `y2k_generate.py`'s generation prompt — that path is a dead end, confirmed above.
- Test/scratch generations left in `public/hero-gen/y2k/` (test-a through test-f,
  intermediate cyber/disco/emerald versions) are diagnostic artifacts, not final
  outputs — the three files named above are the deliverables.
