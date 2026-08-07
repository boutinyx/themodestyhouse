# Six new pieces in the Style-It picker

**Date:** 2026-08-07 · **Status:** partial — pieces are live, brand attribution outstanding

## Goal

Add six garments Tina supplied as photographs to the Style-It outfit picker: two
wide-leg trousers and four tops. The picker takes flat cutouts on transparency,
so each photo had to be lifted off its studio backdrop first.

## What changed

**`public/style-it/`** — six new cutouts: `bottom_7`, `bottom_8`, `top_7`,
`top_8`, `top_9`, `top_10`.

**`lib/stylePieces.ts`** — six entries; `brand` made optional (see the open
question below).

**`components/StyleIt.tsx`** — caption and `alt` omit the brand and its middot
when a piece has none, rather than rendering a caption hanging off a stray dot.

### How the cutouts were made

No `rembg` or equivalent in `.venv-style`, so the matte is built from the images
themselves. Three decisions were forced by measurement, each after the previous
attempt visibly failed:

1. **Border-connected flood, not a colour threshold.** The cream linen trousers
   are only 55 levels off their own backdrop. Any "this pixel looks like the
   background" rule eats them. Flooding inward from the border cannot reach
   inside a garment.

2. **Per-image tolerance.** These photos carry a soft drop shadow that is 20–40
   levels off the backdrop — *less* separated than the cream cloth is. No single
   constant clears every shadow and spares every garment, so the tolerance is
   swept upward per image and the last safe value taken.

3. **"Safe" measured against the garment's interior, not against area.** The
   first leak test compared flooded area between steps and accepted anything
   under a 3% jump. The flood seeped through a bright fold into the pink tee a
   few percent at a time and gashed it. The test now establishes the interior at
   a tolerance nothing here approaches, erodes it 30px past the shadow band, and
   rejects any tolerance that reaches it.

Tolerances chosen, and where each one stopped:

```
bottom_7  grey trousers    tol 130   no breach at any swept value
bottom_8  cream linen      tol  52   60 floods 98% of the frame — straight through the cloth
top_7     olive satin      tol 112   130 breaches
top_8     pink tee         tol  44   52 breaches 33,520px
top_9     yellow ruffle    tol  36   44 breaches
top_10    leopard          tol  70   82 breaches
```

A hard cut leaves the edge aliased and a ramp leaves a pale rim, so the alpha is
binary, feathered 0.8px, then colour-decontaminated — solving
`observed = a·true + (1-a)·bg` for `true` removes the backdrop mixed into the
edge band. Without it the grey trousers' hems and the leopard blouse carried a
visible light outline.

### Weight

Capped at 620px tall (the slots are 138×184, so this covers a 3× screen) and
quantised to a 256-colour palette:

```
3.51 MB -> 0.34 MB   (90% off)
```

`public/style-it/` is 8.2 MB → 8.6 MB. Adding these unoptimised would have taken
it to 11.7 MB. The directory's existing weight is untouched and still an open
item — `bottom_4.png` alone is 3.4 MB.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       362 passed (362)
npx eslint           clean
npm run build        Compiled successfully
```

Cutouts were checked by compositing on `--aubergine` (shows halos and holes that
are invisible on a light page) and again at the true 138×184 slot size. Both
rounds of failure above were caught this way and only this way.

## Notes / follow-ups

- **The six pieces have no brand.** The photographs carry no source metadata and
  the garments are not identifiable from the images with any confidence, so
  nothing is attributed rather than something invented — a wrong brand under
  someone's photograph is worse than none. Labels are plainly descriptive
  ("Oversized Tee", "Linen Wide-Leg"), not styled names. **Asked Tina for the
  six brand names.**
- `Piece.color` is populated for these, consistent with every existing row, but
  nothing in the codebase reads it.
- The cutout script lives in the session scratchpad, not the repo. If more pieces
  are added by hand it is worth promoting to `scripts/`.
