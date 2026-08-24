# Hero candidates round 2 — sunglasses back in, pose opened up, backgrounds pared back
**Date:** 2026-08-20 · **Status:** partial (awaiting Tina's pick)

## Goal
Follow-up on `2026-08-20-new-hero-direction-lifestyle-group-shot.md` (round 1, phone-selfie
group shots). Tina's feedback on round 1: wants sunglasses back — the style device from the
*old* solo-portrait hero (batch 5-8), which she liked on its own terms; her complaint there
was the lone moody portrait not luring anyone in, not the sunglasses themselves. Also: the
pose doesn't have to be the phone-selfie, "it could also be something editorial else," and
explicitly "dont make it too busy" — round 1's multi-prop trio shots (phone + bag + coffee +
jewelry stacked at once) read as cluttered. Asked for 10 examples.

## What changed
- `scripts/gen_hero.py` — added `STYLE_10` / `CONCEPTS_10` (10 fresh concepts, per
  `dont-reuse-y2k-prompt-scaffold` — not round 1's phone/bag scaffold carried forward):
  `solo-walk`, `duo-laugh`, `solo-profile`, `duo-armin`, `solo-lean`, `duo-glance`,
  `solo-seated`, `duo-doorway`, `solo-crop`, `duo-crop2`. Every concept: sunglasses, one
  simple pose/gesture, a single plain uncluttered backdrop, at most one small detail — no
  stacked props, no trios (a third body was reliably where round 1's clutter crept in).
  Refactored `main()` to a `BATCHES` dict (`{9: (CONCEPTS, 38), 10: (CONCEPTS_10, 43)}`) +
  a `--batch` flag, so each day's concept list stays reproducible by number instead of
  being overwritten — round 1 (`--batch 9`) still runs exactly as it did. Also fixed the
  results-file name, which was hardcoded to `-b8.json` regardless of which batch actually
  ran (now `-b{args.batch}.json`).
- Generated via `./.venv-style/bin/python scripts/gen_hero.py --batch 10 --ratio 16:9 --res 1080p`.
  All 10 saved to `public/hero-gen/hero-16x9-{43..52}-*.jpg`.
- `public/hero-gen/preview12.html` — new comparison page, same pattern as `preview11.html`
  (each candidate dropped into the live hero treatment: scrim, headline, search pill),
  with an honest per-image note and an inline flag on the one (`duo-glance`, #6) that's
  visually striking but has both subjects mostly turned away from camera — worth knowing
  before picking it. Links back to `preview11.html` in case round 1 stays in the mix.

## Verification
- Reviewed all 10 raw generations directly before writing notes (not from the prompt
  text). All ten came back clean per the "not busy" brief — plain single backdrops, one
  gesture each, no accessory pile-ups — a real difference from round 1's trio shots.
- Confirmed via Chrome against a `next dev` server (`http://localhost:3000/hero-gen/preview12.html`
  — `public/` is served directly by Next, no separate static server needed this time)
  that the page renders correctly, headline/search overlay reads legibly against every
  background including the two solid-color close crops.

## Notes / follow-ups
- Nothing is live yet. Once Tina picks (round 1 number, round 2 number, or a mix — the
  footer note on `preview12.html` explicitly invites mixing, e.g. "2 but crop tighter like
  9"), next step is the same as always: crop/upscale to the four responsive
  `public/hero-home-*.webp` sizes, swap in, bump the cache-buster.
- Cost: 10 generations at Soul-standard rates (~0.12 credits each) — negligible.
