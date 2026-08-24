# Hero candidates round 3 — sunglasses dropped, desktop + real mobile crop shown side by side
**Date:** 2026-08-20 · **Status:** partial (awaiting Tina's pick)

## Goal
Second follow-up. Tina: "lets not do the glasses" (dropping round 2's sunglasses direction)
and "show me how it would look on phone" — she hadn't picked a candidate yet, so this
regenerates round 2's 10 poses with the one variable she called out removed, and adds a
mobile view of every candidate rather than asking her to imagine the crop.

## What changed
- `scripts/gen_hero.py` — added `STYLE_11`/`CONCEPTS_11` (batch 11, `#53`-`#62`): the exact
  same 10 poses/framing as batch 10 (`solo-walk` … `duo-crop2`), with "elegant sunglasses"
  replaced by "calm open expression" / "faces open" and "no sunglasses" added to the style
  string. Deliberately NOT a fresh concept set — isolating the one variable she flagged
  keeps this a controlled comparison rather than a re-roll that would confound pose changes
  with the sunglasses change. `BATCHES` dict extended with `11: (CONCEPTS_11, 53)`.
- Generated via `--batch 11 --ratio 16:9 --res 1080p`, all 10 saved to
  `public/hero-gen/hero-16x9-{53..62}-*.jpg`.
- `public/hero-gen/preview13.html` — new comparison page, structurally different from
  `preview11`/`preview12`: each candidate now shows a desktop 16:9 frame **and** a real-size
  phone mockup (390×844, iPhone 13 dimensions) side by side, both using the exact crop rule
  the live site applies (`object-fit: cover`, `object-position: center 45%`, same scrim,
  headline/search sized down to match `app/page.tsx`'s mobile rendering). Explains why this
  matters: the source images are landscape (2048×1152) but the mobile hero is full-height
  and narrow, so only the centre ~26% of the image's width is visible on phone.

## Verification
- Reviewed all 10 raw batch-11 generations directly (not from prompt text) before writing
  any notes — faces open, no sunglasses, same clean/uncluttered poses as batch 10.
- **Caught my own inaccurate claims before shipping them.** I first wrote the phone-crop
  notes from the ~26%-width math alone, predicting several duo shots would lose a subject
  entirely (#2, #5, #10). Instead of shipping that prediction, rendered `preview13.html` in
  a real browser (`next dev`, Chrome) and visually checked each phone frame:
  - #2 (`duo-laugh`) and #10 (`duo-crop2`): both women are closer to centre than the
    desktop framing suggests — the phone crop is tight (cuts into the hijab peaks) but
    keeps **both** faces. My first draft said one woman was lost/isolated; corrected to
    "very tight, not a loss."
  - #5 (`solo-lean`): she's close enough to centre that the phone crop keeps her fully in
    frame. First draft called this "off-centre, check the crop" as a soft warning;
    corrected to "holds up fine."
  - #6 (`duo-glance`) was the one case the math correctly predicted: the two women are
    deliberately spread wide with empty wall between them, and the phone crop is genuinely
    mostly bare wall. This is the only real failure in the batch.
  - Rewrote the intro and closing summary to reflect the corrected picture rather than the
    original (too pessimistic) width-math prediction.
- This is the concrete case for "verify before claiming" (CLAUDE.md §1): the plausible,
  math-derived claim was wrong for 3 of 4 flagged candidates, and would have told Tina to
  rule out perfectly good options had it shipped unchecked.

## Notes / follow-ups
- Nothing is live yet. Rule of thumb that came out of this batch, now in the page's footer:
  nearly everything survives the phone crop as long as the subject(s) sit near centre; only
  a deliberately wide-spread duo composition (#6) actually breaks. If the final pick ends up
  tight on mobile (#2, #10), a small `object-position` adjustment for the mobile `srcset`
  size would fix it — the codebase already has the responsive `srcset` plumbing
  (`public/hero-home-{640,1024,1440,1920}.webp`), just not a second, differently-cropped
  source image; that would be a small addition if ever needed, not a blocker.
- Cost: 10 generations at Soul-standard rates (~0.12 credits each) — negligible.
