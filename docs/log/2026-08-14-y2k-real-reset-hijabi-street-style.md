# Y2K series — real reset: hijabi street-style, not paparazzi Y2K club wear

**Date:** 2026-08-14 · **Status:** in progress, first test clean

## Goal
Tina said the whole series direction was wrong and to start over. She sent 13 real
hijabi OOTD/street-style reference photos plus a "Layering Toolkit" styling doc and
asked to build outfits the way a real stylist would -- varied real coverage garments
(cardigans, ponchos, belted jackets, tie-neck blouses), not a repeated invisible
bodysuit under everything.

## What the 13 references actually show (not paparazzi, not Y2K)
Genuine layered outfits over wide-leg trousers, jeans, or maxi/midi skirts, muted
earthy palette (browns, olives, taupe, cream, dusty pink) with one statement piece
(pattern, texture, or color), natural daylight, real city locations (streets, canals,
stone steps, parking lots, ornate doorways). Roughly half candid street-style
(photographed by someone else) and half mirror selfies (phone visible, real
bedroom/fitting-room/bathroom). This fully supersedes the earlier "Y2K paparazzi
night-event flash" framing from earlier the same day -- that framing was wrong from
the start, not just under-executed.

## What changed (scripts/y2k_generate.py)
- Dropped `Y2K_PAPARAZZI_NOTE` -> `STREET_STYLE_NOTE`: real OOTD content, explicitly
  not tabloid/paparazzi, not studio editorial.
- Split `POSE`/`FRAMING` into `POSE_CANDID`/`FRAMING_CANDID` and
  `POSE_SELFIE`/`FRAMING_SELFIE`, selected via new `--shot-type candid|selfie` flag,
  matching the real mix seen in the references.
- Default lighting is daylight now (was auto-defaulting toward flash/night framing
  language before).
- Aspect ratio reverted to 2:3 (see below).
- `LAYERING_RULES` (from the 2nd revision, unchanged) stays the mechanism for
  coverage: outfit briefs must specify real, visible garments, no implied hidden
  base layer.

## 16:9 aspect ratio tried and reverted
Tina asked for 16:9 mid-session to get a wider candid frame. One test showed a real,
reproducible failure: the model rotated the entire photo 90° to fit a standing human
figure into a landscape canvas, rather than composing a genuine wide standing shot.
Reverted to 2:3 per Tina's own call once she saw it. Not investigated further --
if revisited, treat "why does a landscape aspect ratio rotate a portrait subject" as
its own root-cause question, not a wording tweak.

## First test under the new methodology: clean on the first try
`streetstyle-olive-1.png` -- olive belted oversized jacket over a black turtleneck,
olive satin midi skirt, sheer black tights, silver ankle boots, olive hijab, candid
shot beside an iron railing. Inspired directly by one of Tina's 13 references.
**Fully covered, no exposed skin anywhere, on the raw generation -- no edit pass
needed.** This is the first single-pass clean result in this series' entire history.
Confirms the hypothesis from the 2nd revision: coverage failures were being caused by
asking the model to render an invisible implied layer, not by anything about hijab
styling or outfit color. Real, visible garments that structurally close every gap
(turtleneck under an open jacket, tights under a midi skirt) just work.

One remaining rough edge: the model rendered this as a 2-panel contact sheet (two
crops of the same look side by side) unprompted, and the background stayed fairly
plain/indoor rather than the described outdoor stone building with an iron railing.
Not investigated yet -- flagging, not fixing blind.

## Notes / follow-ups
- This is the methodology to continue with. Do not revert to a bodysuit-first
  approach even if a future outfit's coverage fails -- write the outfit brief with
  more/better real layering pieces instead (per Tina's Layering Toolkit doc), and use
  `y2k_fix_coverage.py` as the fallback, same as before.
- Tina is sending more reference photos for pose/outfit ideas; more outfit variations
  should be designed directly from those references, not invented from scratch.
