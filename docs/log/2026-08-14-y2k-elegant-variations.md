# Y2K series — elegant variations with shoulder-to-shoulder hijab drape

**Date:** 2026-08-14 · **Status:** done, one known limitation flagged

## Goal
Tina rejected the first fixed batch's vibe: wanted the hijab draped shoulder-to-shoulder
(like her reference screenshot, not Fina's tighter loose-around-the-neck style), more
elegant outfits (not neon/club Y2K), and the same full-body framing as her reference photo.
Asked for 3 variations to choose from.

## What changed
- `scripts/y2k_generate.py` — replaced the imported Fina `hijab_note()` with a
  y2k-specific one describing a shawl-style drape: both ends of the hijab fall forward
  and rest visibly on each shoulder, symmetrically framing the front, matching the
  reference photo's silhouette. Fina's own `hijab_note` is untouched — this is a fork,
  not a shared-function edit, since the two series now want different drapes.
- Designed 3 elegant outfit briefs (open coat/jacket + turtleneck + trousers-or-skirt,
  neutral/jewel-tone palette, gold jewelry) instead of the first batch's Y2K-club
  styling (metallic puffer, faux fur trim).
- Generated all 3, ran the standard coverage edit pass
  (`scripts/y2k_fix_coverage.py`) on each, and for 2 of the 3 the generic edit prompt
  under-corrected (left a sheer torso or a hip gap) and needed one additional targeted
  edit call spelling out exactly what was still wrong and where — consistent with the
  note already in `docs/log/2026-08-14-y2k-root-cause-and-fix.md` about the edit pass
  not being one-shot reliable either.

## Final deliverables (public/hero-gen/y2k/)
- `y2k-elegant-a-1-final.png` — cognac leather jacket, chocolate turtleneck, burgundy trousers
- `y2k-elegant-b-1-fixed.png` — emerald wool coat, black turtleneck, black trousers
- `y2k-elegant-c-1-final.png` — camel wool coat, ivory turtleneck, burgundy ruffled maxi skirt

All 3 visually verified: fully opaque coverage (no cleavage/torso/hip skin visible),
hijab drapes shoulder-to-shoulder as requested, hair/hairline/ears fully covered.

## Known limitation — NOT resolved, flagged rather than silently shipped
**Framing is a bust/waist crop in all 3, not the full-body walking shot in Tina's
reference.** Tried an explicit fix on variation B ("full-length wide shot... her whole
outfit and shoes visible") — no effect, still cropped the same way. Did not run a
controlled isolation test on this (time-boxed after the coverage investigation already
took 7+ tests) — root cause not identified. If Tina wants this pursued further, it
needs its own systematic pass rather than another guessed wording change.

## Verification
Visually inspected all 3 final files at full resolution for the void list (cleavage,
midriff, hip/thigh skin, sheer fabric, hairline exposure) — none present in any of the
3. Framing checked against the reference and confirmed NOT matching (see above).
