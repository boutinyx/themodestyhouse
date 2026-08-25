# New drape photograph on the seal band, copy centred, dark overlay
**Date:** 2026-08-25 · **Status:** done

Third and fourth photographs on this band in one evening. Earlier passes are in
`2026-08-25-seal-band-satin-background.md`, `-more-visible.md` and
`-scrim-removed.md`; this entry covers everything after Tina replaced the image.

## Goal
1. *"use this one and put the text in middle"* — with
   `~/Downloads/Satijngolven in aubergine, bessen en lila.png` (1672x941), her own
   generated image: drapery framing a bright cream centre.
2. *"make the banner a bit tinner and put a darker overlay on it"*.

## What changed

**Assets.** `public/seal-band-drape.jpg` + `.webp` variants at 640/1024/1440/1672,
generated in **one step** from her PNG rather than via the committed JPEG.
Registered in `scripts/optimise-images.mjs`. 1672 is the source's own width and
this script never upscales, so there is no point asking for more.

**Layout.** Copy is `max-w-[46ch] mx-auto text-center` rather than `max-w-2xl`
left — the clear cream area is about 42% of the frame and a 672px column at 1440
spills onto the right-hand drape. Band is `min-h-[340px] md:min-h-[440px]`, down
from 440/560.

**The overlay is flat `rgba(68,25,67,0.75)`.** Flat rather than a ramp because
the copy is centred now, so there is no side to weight it towards.

## Why 0.75, which is high

The picture's middle is a bright cream wall, so a light overlay parks the band in
the **mid-tones — the one place where neither dark nor light type works.**
Measured on the live render at 390/820/1440, worst pixel inside each text
element's own rect, heading / steps:

| overlay | light copy | dark copy | |
|---|---|---|---|
| 0.00 | 1.15 / 1.01 | 8.37 / 7.83 | dark only |
| 0.40 | 2.62 / 2.27 | 4.08 / 3.86 | **both fail** |
| 0.60 | 4.37 / 3.70 | 2.69 / 2.61 | neither |
| **0.75** | **6.64 / 5.50** | 1.87 / 1.83 | **light ← shipped** |

So "darker" had to mean dark enough to reverse the copy back out. Shipped:
`heading 6.64 · steps 5.33 · numerals 7.11` worst case across the three widths,
all above the 4.5 AA threshold.

## The casualty: the gold numerals

`--brass-on-dark` is 6.08:1 on **flat** aubergine, which is what the band used to
be. Over this photograph the residual cream keeps the background too light and it
**never reaches AA at any overlay this side of erasing the picture** — 2.19 at
0.60, 3.23 at 0.75, 3.69 at 0.80. A centre-heavy radial (`.92/.70/.40`) only gets
it to 4.29 and costs the phone (heading 4.95).

They are `--parchment` now: an existing token, rather than a new lighter brass
invented for one band. **`#e8d3ac` measures 5.20 and is the fix if the gold is
wanted back** — that is Tina's call, and she was told rather than left to notice.
The italic serif is what still separates a numeral from its step text.

## The intermediate bright version, and its three defects

Between the two instructions the band shipped bright, with dark copy. Worth
recording because all three faults were found by measuring, and none of them was
visible in a screenshot:

1. **Phone heading 1.03:1** — dark ink on dark satin. `object-cover` on a short
   band crops the **width**, so at 324px the phone showed only the middle 68% of
   the frame and the top-left drape ran straight through the heading. A *taller*
   phone band shows *less* width and more clear centre: 324 → 1.03, 400 → 7.23,
   460 → 7.32. **This is the opposite of the rule that held for the previous
   photograph**, where taller meant more picture — the constraint flips with the
   aspect ratio.
2. **Numerals in `--brass` at 1.60:1** on cream, barely above white-on-white.
   `--plum` 3.62, `--aubergine` 7.05.
3. **The CTA's brass pill at 1.28:1 against the photograph** — the control's edge
   did not separate from its background (WCAG 1.4.11 wants 3:1 for a boundary).

Both colour decisions inverted again when the overlay landed, which is the honest
summary of the whole evening: **every colour on this band is a function of what is
behind it, and it changed four times.**

## Verification
- `npx tsc --noEmit` exit 0 · `npx eslint app/page.tsx` exit 0 · 781 tests pass.
- Contrast re-measured on the deployed staging page after each push, with the
  stylesheet-loaded assertion, at 390 / 820 / 1440. Final: **6.64 / 5.33 / 7.11**.
- Screenshotted at 1440 and 390.

## Notes / follow-ups
- **The harness lied once, in the familiar direction.** The measuring script hid
  every `:scope > div` in the band to expose the background — which hid the new
  overlay too, so the first run after adding it reported `1.15 / 1.01 / 1.35 FAIL`
  against a background of `(242,230,221)`, i.e. bare cream. A whole category
  failing at once is the §10.26 signal; the fix was to skip `[aria-hidden]`
  children. Nothing was wrong with the site.
- The previous `seal-band-satin*` assets are still committed and now unused.
  Left in place deliberately — three of today's four versions are one commit
  revert away, and the images are the expensive part.
