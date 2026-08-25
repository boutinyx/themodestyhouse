# Removed the scrim from the "Apply for the seal" band
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina, immediately after the scrim was opened up: *"completely get rid of the
thing we had there before and only leave the image"*.

Read as: remove the aubergine wash sitting over the satin photograph, keep the
band's copy and CTA. Not as "remove the copy too" — "the thing we had there
before" is the purple layer that pre-dates the photograph, and deleting the
designer CTA is not something a request about the *background* implies.

## What changed
`app/page.tsx` — the `aria-hidden` gradient `<div>` is gone. The band keeps
`relative overflow-hidden`, the `<img>`, and `.aubergine-band` (which is now
purely the fallback colour if the image ever fails to load, plus the parchment
text colour). Nothing else on the page was touched.

The two comment blocks that described the scrim as load-bearing were rewritten
so the file does not contradict itself, and the new one records **why** there is
no scrim, so a future session does not "fix" it back silently.

## What it costs — measured, not estimated
Same harness as the two previous passes: live staging render, content hidden,
brightest pixel inside each text element's own rect, WCAG contrast against the
three colours actually used. Worst case across **390 / 820 / 1440**:

| | heading | steps | numerals | |
|---|---|---|---|---|
| **no scrim (shipped)** | **1.45** | **2.01** | **3.84** | **FAIL AA** |
| .88/.76/.05 @62% (previous) | 5.38 | 6.14 | 5.73 | pass |
| .95/.78/.50 @55% (first) | 7.74 | 6.24 | 5.87 | pass |
| *flat aubergine, no photo* | *13.40* | *10.46* | *6.34* | *baseline* |

Per width, no scrim: `390 h=2.24 s=2.01 n=3.91` · `820 h=3.36 s=6.61 n=3.84` ·
`1440 h=1.45 s=6.50 n=3.91`.

The failure is not uniform — it is wherever the bright diagonal fold runs behind
a glyph. At 1440 that is the right end of the heading line; at 390 the copy is
full-width so it is most of the block.

**This is a stated, accepted trade made by the owner, not an oversight.** Raised
with her with these numbers at the moment of shipping. If it needs fixing later
without bringing the wash back, the two cheap moves are a `text-shadow` on the
copy, or a wash behind the copy column only rather than the full band.

## Verification
- `npx tsc --noEmit` exit 0 · `npx eslint app/page.tsx` exit 0.
- Deployed to `staging` and confirmed on the live URL: the band's section has
  exactly one child `div` (the content), no `aria-hidden` overlay, and the
  satin `<img>` still resolves. Screenshotted at 1440 and 390.

## Notes / follow-ups
- `npm run audit:mobile` / `audit:visual` will not catch this: neither has a
  contrast check, and axe cannot evaluate text over a background image. So the
  numbers above are the only record — which is why they are in the file itself.
