# Y2K series — fixed "too modelish" vibe and corrected hijab drape

**Date:** 2026-08-14 · **Status:** done

## Goal
Tina rejected the previous elegant batch on two points, both referencing screenshots:
1. Too "modelish" — heavy glam makeup, sultry/serious model stare, not the normal,
   approachable, genuinely-smiling real-person feel of her reference paparazzi photo.
2. Hijab drape was wrong. Her first correction ("shoulder to shoulder") had been
   implemented as a SYMMETRIC two-tails drape; her actual reference (a second
   screenshot, a black fringed hijab) is an ASYMMETRIC one-shoulder drape -- fabric
   swept dramatically over one shoulder only, the other side staying close to the neck.

## What changed (scripts/y2k_generate.py)
- `hijab_note()` rewritten: one-shoulder asymmetric drape instead of symmetric.
- Stopped importing Fina's `SKIN_MAKEUP` block (heavy glam: defined mascara, glossy
  rose lips, dewy sheen). Added `NATURAL_LOOK`: light natural makeup, realistic skin
  texture, explicitly "not airbrushed... not a styled high-fashion editorial model."
- `POSE` rewritten to explicitly ask for a genuine warm smile ("like a real,
  relatable woman... NOT a serious, sultry, or aloof high-fashion model stare").
- Opening frame phrase changed from "Ultra-realistic editorial fashion photograph of"
  to "Ultra-realistic candid paparazzi photograph of" -- less "model editorial" bias.

## Result
Regenerated all 3 outfits from the previous batch (cognac leather/burgundy trousers,
emerald coat/black trousers, camel coat/burgundy ruffled skirt) through the updated
pipeline. Same coverage-fix process as before: generic edit pass first, and when that
under-corrected (2 of 3 needed it, same pattern as every prior batch), a second
targeted edit call naming the exact sheer/exposed area.

Final files (public/hero-gen/y2k/):
- `y2k-natural-test-1-fixed.png` (cognac leather, burgundy trousers)
- `y2k-natural-b-1-final.png` (emerald coat, black trousers)
- `y2k-natural-c-1-final.png` (camel coat, burgundy ruffled skirt)

Visually confirmed: genuine warm expression (not sultry/model-stiff) on 2 of 3,
natural-looking makeup on all 3, correct one-shoulder hijab drape on all 3, full
opaque coverage on all 3 after the edit pass(es).

## Still open
- Full-body framing (the reference's walking full-length shot) still not achieved --
  every generation crops to bust/waist regardless of explicit "full-length, whole
  outfit and shoes visible" wording. Flagged, not solved; needs its own investigation
  if Tina wants it pursued.
- `y2k-natural-b-1-final.png`'s expression reads more serious/intense than the other
  two -- the smile instruction didn't land as strongly on that one. Worth a re-roll if
  Tina wants B specifically.
