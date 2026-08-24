# Y2K series — jewelry text in --outfit reliably suppresses background rendering

**Date:** 2026-08-15 · **Status:** done

## Goal
Tina asked for 8 new hijabi street-style posts built from 13 fresh Pinterest
references: cross-pollinate backgrounds between references, change garment colors,
add jewelry, and use the outpaint tool (not the angle-fix tool) for camera distance.

## What went wrong first
Generated all 8 with itemized jewelry appended to every `--outfit` string (e.g.
"...layered thin gold necklaces, small gold hoop earrings, a delicate gold ring").
**0 of 8 rendered the described background** — every one came back as a generic grey
parking-lot/pavement backdrop, including the very first test generation. Trimming the
jewelry down to a single short phrase per look and regenerating all 8 still produced
0/8 real backgrounds. A same-prompt retry round on the 6 failures also produced 0/6.

## Root cause (found in this repo's own prior-day history, not re-discovered)
`docs/y2k/HANDOFF.md` and three 2026-08-14 log entries
(`y2k-root-cause-and-fix.md`, `y2k-background-and-hijab-shape-fixed.md`,
`y2k-minidress-outfit-and-framing-distance.md`) already establish this exact
mechanism: **any extra descriptive clause in `--outfit` — jewelry included —
competes with the scene description for the model's attention and measurably
increases the odds the background collapses to a flat/generic backdrop.** HANDOFF's
own known issue #4 says accessories should be added via a second-pass edit, not the
generation prompt. This session's first two attempts (itemized jewelry, then
trimmed-to-one-phrase jewelry) both violated that already-documented rule.

## Fix
- Stripped jewelry entirely from all `--outfit` strings (coverage-defining garments
  only) and regenerated. Real backgrounds started appearing again (parking garage,
  interior stairwell, tiled doorway, stone archway) at roughly the same ~30-40% per-
  generation hit rate the 2026-08-14 session saw before framing/outpaint fixes were
  layered on — this remains genuinely stochastic per generation, not something a
  single wording change makes deterministic. Re-rolling the still-failing ones with
  the same jewelry-free prompt is the only lever, consistent with
  `docs/y2k/HANDOFF.md`'s "Known issues" section.
- New script `scripts/y2k_add_jewelry.py` — adds jewelry to an already-generated,
  background-confirmed image via a targeted `nano_banana_pro` edit pass (same
  mechanism as `y2k_fix_coverage.py`/`y2k_fix_angle.py`), so jewelry never has to
  compete with scene rendering again.

## Rule
**Never put jewelry/accessories in `y2k_generate.py`'s `--outfit` argument, at any
length.** Generate with coverage-defining garments only, confirm the background is
real, then add jewelry with `scripts/y2k_add_jewelry.py`. This was already the
documented rule as of 2026-08-14 (HANDOFF known issue #4) — re-logging it here
because it was violated twice in the same session before being caught, which means
the HANDOFF reference alone isn't loud enough. Consider promoting this to an explicit
line in `y2k_generate.py`'s own docstring/argparse help text next time it's touched.

## Notes / follow-ups
- Per-generation background hit rate without jewelry text: 2/6 first pass, checked
  live against Tina mid-session rather than assumed.
- Coverage-fix also still needed per-image (a deep-V/cleavage gap appeared on one
  jewelry-free regeneration that hadn't had the issue originally) — coverage and
  background success are independent axes, both need per-image visual QA before
  outpaint/angle-fix.
