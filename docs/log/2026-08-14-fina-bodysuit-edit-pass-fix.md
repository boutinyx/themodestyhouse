# Fina — bodysuit coverage fix via edit-pass (not prompt engineering)
**Date:** 2026-08-14 · **Status:** done

## Goal
The bodysuit coverage rule (docs/fina/style-rules.md) was unreliable in single-shot
generation — deep-V/open-front tops beat the instruction in roughly 8-9 of 11+ generations
across 5 different prompt wording/ordering attempts. Tina asked to research a real fix
rather than keep rewording the same prompt.

## What changed
Researched Higgsfield's own toolset (not just generic web advice) and found
**`nano_banana_pro`** — an image-EDITING model (Google's Gemini image-edit family) exposed
through the same `higgsfield` CLI already in use. It takes an existing image +
`image_references` + a natural-language edit instruction and modifies only what's described,
leaving the rest of the image untouched. This reframes the problem: instead of hoping one
giant text-to-image prompt gets every clause right simultaneously, generate normally, then
run a second, narrowly-scoped edit pass only on images that actually show a coverage miss.

New `scripts/fina_fix_coverage.py <path-to-image>`: uploads the flawed image, runs the edit
prompt (add opaque nude mock-neck bodysuit layer filling the exposed gap, everything else
unchanged), downloads the result as `<name>-fixed.png`.

## Verification
Ran on two different real failures from the same session:
- `y2k-original-2.png` (worst case: fully bare chest + midriff) → `edit-test1.png`.
  Coverage added cleanly; face, hijab, pose, jewelry, bag, background all identical to the
  source on visual comparison.
- `y2k-original-1.png` (smaller keyhole cutout at the chest) →
  `y2k-original-1-fixed.png`, via the actual `scripts/fina_fix_coverage.py` script (not a
  hand-typed command) — confirms the wrapper script itself works end to end, not just the
  underlying CLI call. Cutout filled with the mock-neck layer, everything else unchanged.
- 2/2 real test cases fixed correctly.

## Notes / follow-ups
- Not wired into `fina_generate.py` as an automatic step yet — still a manual follow-up
  after visual QA catches a miss (QA-then-fix, same pattern as the rest of this project's
  "check every single time" ethos). Could be automated later (e.g. run every image through
  a vision check + auto-fix) if the manual step becomes a bottleneck.
- Given this works reliably as a fix-up pass, it may be worth defaulting to *always* running
  it on necklines flagged as deep-V/open-front (per the workflow.md caution added earlier
  today), rather than treating those outfits as a coin-flip at generation time.
