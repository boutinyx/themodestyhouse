# Brand banner replaces the category icon strip under the hero
**Date:** 2026-08-23 · **Status:** done, then SUPERSEDED the same day —
the band moved above the header, went near-black and became phone/tablet-only within
hours. See `docs/log/2026-08-23-brand-band-above-header.md`. The decision this entry
records (the category icon strip goes, the brand strip replaces it) still stands.

## Goal
Tina, with a screenshot of the tall icon row under the hero (ABAYAS / DRESSES / SETS /
HIJABS…, each a Phosphor icon over a label with an arrow): *"i want this to be a skinny
banner with the brands"*.

## What changed

**`components/HeroBrandStrip.tsx`** — gained a `tone` prop. This is the strip that lived
ON the hero photograph from 2026-08-21 until she asked for it off the same night ("can
you get rid of the banner with the brands"); it was left on disk un-imported precisely so
it could come back cheaply, and it has.

- `tone="hero"` (default) — byte-for-byte the old behaviour: dark-to-clear wash,
  `rgba(251,250,246,0.5)` text, a text-shadow. Untouched, so putting it back over the
  photo stays a one-line change.
- `tone="band"` — parchment fill, hairline top and bottom, `var(--muted)` text, no
  shadow, `11px` vertical padding instead of `13px`. The wash and the shadow aren't just
  unnecessary in a band, they're wrong: both exist only to hold near-white text against
  an unpredictable photograph.

Shared and deliberately NOT re-tuned: the doubled name list, the 260s duration, the edge
mask and the brass ✦. Those are values she moved by eye over four rounds (48s → 110s →
180s → 260s, opacity 0.85 → 0.5); rebuilding rather than reusing would have thrown them
away.

**`app/page.tsx`** — `<CategoryQuickLinks />` out, `<HeroBrandStrip tone="band" />` in,
same position directly under the hero. `components/CategoryQuickLinks.tsx` is left on
disk un-imported, the same convention this file already used for `HeroBrandStrip` itself
and `lib/vibes.ts`.

Nothing is lost by dropping it: the "All categories" section further down the same page
already links every lane as a card, so the icon row was a second route to the same
places.

## Verification

The repo **cannot be built right now** — `components/PopularShowcase.tsx` is mid-write in
another session and does not parse (`./components/PopularShowcase.tsx:212:1 Unexpected
token`), and `app/page.tsx` imports it. I did not touch that file (§10.37).

So this was verified in a throwaway rsync'd copy of the tree under the scratch dir, with
`node_modules` hardlinked (`cp -al`, per §10.38 — a symlinked `node_modules` makes
Turbopack panic) and `PopularShowcase` replaced by a `return null` stub in the COPY only.
`✓ Compiled successfully`, served on :3222, driven with Playwright at 1440x900 with the
stylesheet asserted loaded first:

```
height: 42            (the icon strip it replaced was ~130)
background: rgb(250, 247, 241)      -> --parchment
borderBottom: 1px rgb(228, 221, 207) -> --hairline
nameColor: rgb(121, 110, 94)         -> --muted
textShadow: none
animation: 260s
firstNames: Haute Hijab, Vela Scarves, Veiled, …   (real, from data/brands.ts)
heroBottom: 900   stripTop: 900      (flush under the hero, no gap)
```

And the old strip is genuinely gone, not just visually replaced:
`occasionLabelCount: 0`, no icon-strip section in the DOM. The one remaining
`/modest-wedding-guest` link on the page is in the footer at y=4904.

Screenshots (band alone, and in context under the hero) confirm it by eye.

`npx tsc --noEmit` on the two files I changed: clean — the only error in the project is
`PopularShowcase.tsx(107,17) Cannot find name 'scroller'`, the same unfinished file.
`npx eslint app/page.tsx components/HeroBrandStrip.tsx`: 0 errors. The one warning it
prints, `102:12 Unused eslint-disable directive`, is on the `<picture>` hero swap — also
another session's in-flight edit, not this change. It matters because `npm run lint` runs
with `--max-warnings 0`, so it will fail the lint job until whoever wrote it clears it.

`npm test` — 1313 passed, 2 failed, both in `.claude/worktrees/jiggly-hugging-honey/`.

The scratch copy was deleted afterwards.

## Notes / follow-ups

The band shows brand NAMES as plain text, not links — same as the version she approved on
the hero. Names moving past at 260s are a poor click target, and every house is already
linked from `/designers`. Worth revisiting only if she wants it to be navigation rather
than a signal of scale.

`CategoryQuickLinks.tsx` is now dead code on disk. Left deliberately (see above), but it
is the third file kept this way — if that list keeps growing it is worth a decision about
whether "keep it un-imported" is still the right convention or just accumulating.
