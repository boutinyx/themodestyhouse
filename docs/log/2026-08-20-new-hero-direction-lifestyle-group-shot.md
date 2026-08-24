# 5 new homepage hero candidates — lifestyle group shot instead of solo editorial crop
**Date:** 2026-08-20 · **Status:** partial (awaiting Tina's pick)

## Goal
Tina: the current hero (a single moody aubergine-coat crop, batch 5-8 of
`scripts/gen_hero.py`) is "too editorial" and doesn't "lure the viewer in" or show what
the site does at a glance. She supplied a reference photo — three women in a white-column
boutique, phones raised over their faces (mirror-selfie pose), iced drinks and designer
bags, mauve/pink/cream silk with gold lace — and asked for that vibe, on-brand (aubergine /
plum / brass), still elegant/editorial, 5 examples to start from.

## What changed
- `scripts/gen_hero.py` — replaced the `STYLE`/`CONCEPTS` batch (was 5 aubergine-coat
  jewelry crops, `jewel-a`..`jewel-e`, #33-37) with a new batch 9: `duo-select`,
  `trio-hall`, `duo-atelier`, `trio-walk`, `duo-crop` (#38-42). Per
  `dont-reuse-y2k-prompt-scaffold`, these are fresh prompts built from the new brief, not
  the old jewel-crop constraint stack. Adapted from the reference: same phone-over-face
  pose (also sidesteps needing one consistent AI face across every generation), same
  white-marble boutique energy, on-brand aubergine/plum/brass gold instead of the
  reference's blush-pink-cream.
- Generated at `--ratio 16:9 --res 1080p` (the hero's actual format/max resolution) via
  `./.venv-style/bin/python scripts/gen_hero.py`. All 5 saved to `public/hero-gen/`:
  `hero-16x9-38-duo-select.jpg` … `hero-16x9-42-duo-crop.jpg`.
- `public/hero-gen/preview11.html` — new comparison page, following the established
  `preview*.html` pattern in this folder. Each candidate is dropped into the *actual* live
  hero treatment (same dark scrim + radial gradient, same "The archive for everything
  modest." headline, same search glass pill from `app/page.tsx`) rather than shown as a
  bare photo, plus an honest per-image note on what didn't match the brief.

## Verification
- Confirmed via Chrome against a throwaway `python3 -m http.server 8931` in
  `public/hero-gen/` (file:// is blocked by the browser extension) that the page renders
  correctly — including catching and fixing a missing `<meta charset="utf-8">` that was
  showing every em dash as `â€”` under the plain http.server (Next's own static serving
  sets charset automatically, which is presumably why the earlier `preview*.html` files in
  this folder never surfaced the bug — added the meta tag here regardless, since it's
  correct either way).
- Visually reviewed all 5 raw generations before writing the notes in the preview page,
  not just described from the prompt:
  - `duo-select` (#1): only one phone raised — the other woman's face is fully visible,
    smiling. Not the anonymised-face pose asked for, but the warmest/most "come in and
    shop" of the five.
  - `trio-hall` (#2): closest literal 3-up of the reference, but the model gave the left
    woman a black lower-face covering instead of a raised phone — reads as a mask, not a
    fashion moment. Flagged as needing a regenerate before use.
  - `duo-atelier` (#3): both phones up, both faces hidden, gold hardware, blurred garment
    rack behind them — closest match to the brief of the five.
  - `trio-walk` (#4): candid walking shot, different mood (motion, not posed selfie);
    faces are visible (not hidden), and there's a stray cropped figure at the right frame
    edge. Flagged.
  - `duo-crop` (#5): tight waist-up crop on a solid aubergine wall — most graphic/
    brand-saturated, but loses the boutique/shopping context the others carry.

## Notes / follow-ups
- Nothing is live yet — this is a candidate review, not a swap. Once Tina picks (a
  straight number, or a mix like "3's rack + 5's crop"), the next step is cropping/
  upscaling to the four responsive sizes the homepage actually serves
  (`public/hero-home-{640,1024,1440,1920}.webp`), swapping them in, and bumping the
  `?v=` cache-buster — same procedure as every prior hero swap in this file's history.
- If `trio-hall` or `trio-walk` end up the pick, they need a regenerate first (mask /
  stray figure respectively) — noted inline in the preview page so the choice is informed.
- Cost: 5 generations at Soul-standard rates (~0.12 credits each per prior measurement)
  — negligible.
