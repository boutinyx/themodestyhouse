# Satin background on the "Apply for the seal" band
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina, with `~/Downloads/pexels-karola-g-4863034.jpg`: *"you know the Are you a
modest fashion house? Apply for the seal. i want this satin as background but you
have to flip the picture thi—"* (message truncated).

## What changed

**The flip was confirmed, not guessed.** Her sentence cut off, and "flip" has
three readings. Her file is 3927x5891 **portrait**; the band is wide and short,
so upright it would show a narrow vertical slice rather than the folds. Asked,
and she chose rotate 90° — which is also the only reading that makes "you *have
to*" true, since mirroring an abstract satin texture is invisible.

- `public/seal-band-satin.jpg` (5891x3927) + five `.webp` variants at
  640/1024/1440/1920/2400, each generated in **one step** from her original file
  — no intermediate JPEG, the mistake logged in
  `2026-08-25-fall-essentials-hero-and-placement.md`. Registered in
  `scripts/optimise-images.mjs`.
- `app/page.tsx` — the band is now `relative overflow-hidden` with an
  `aria-hidden` `<img>` behind the content. **Applied to this instance only, not
  to `.aubergine-band`**: `app/about/page.tsx` uses that same class and must not
  inherit a homepage photograph. The class's flat colour stays as the fallback
  underneath.

## The scrim — and why measuring it mattered

The three text colours on this band were each chosen against flat `--aubergine`,
and the numerals carry a comment stating a measured 6.08:1 that silently stops
being true the moment a photograph is behind them.

So the scrim was tuned by measurement, not by eye: render the band with the
content hidden, sample the **brightest** pixel behind each text element's own
rect, and compute WCAG contrast against the colours actually used. Worst case:

| scrim | heading | steps | numerals | |
|---|---|---|---|---|
| flat 0.62 | 5.32 | **4.06** | 5.26 | FAIL |
| flat 0.80 | 8.33 | 6.42 | 5.66 | pass |
| grad .88/.62/.40 | 5.17 | **4.15** | 5.66 | FAIL |
| grad .92/.70/.45 | 6.34 | 5.13 | 5.76 | pass |
| **grad .95/.78/.50** | **7.74** | **6.24** | **5.87** | **pass ← shipped** |
| *flat aubergine, no photo* | *13.40* | *10.46* | *6.34* | *baseline* |

**Flat 0.62 was my first attempt and it fails AA on the step text** — 4.06
against a 4.5 threshold. It looked completely fine in a screenshot, which is the
whole point of measuring. A left-weighted gradient beat flat 0.80 because it
passes by a similar margin while leaving the right-hand fold visible, and the
copy is all on the left. Same idea as `EditBanner`'s wash.

## Verification
- tsc clean · lint clean · build compiled.
- Contrast re-measured at **three widths** with the shipped gradient, since the
  copy is full-width on a phone and the ramp is horizontal:
  `phone-390 8.08 / 6.78 / 5.88` · `tablet-820 8.94 / 6.47 / 5.91` ·
  `desktop-1440 7.74 / 6.24 / 5.87` — all PASS.
- Band screenshotted at 1440 with the stylesheet-loaded assertion; serves
  `seal-band-satin-1440.webp` into a 1440x429 box.

## Notes / follow-ups
- The five variants total 897 KB. The band is well below the fold and the image
  is `loading="lazy"`.
- Masters are not committed, same call and same caveat as the fall hero: re-running
  `optimise-images.mjs` rebuilds the variants from the committed `.jpg` rather
  than from her original.
