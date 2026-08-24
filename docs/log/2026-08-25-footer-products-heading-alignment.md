# Footer: the "Products" heading back over its own first link
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"products name should just be where it was"*. On the deployed footer the `PRODUCTS`
eyebrow sat over the GUTTER between its two sub-columns — 120px right of "Modest Dresses" —
while `EDITORIAL` and `THE HOUSE` sat flush above their own first link.

## What changed
`components/Footer.tsx`, the Products `<Col>` only.

The column had gained `md:text-center` earlier the same day, alongside `justify-center` on its
list, when the single Products column was split into two sub-columns (Tina then: *"put them
closr together center"*). Centring the pair is right; centring the heading with it is what put
the label over the gap.

- `md:text-center` removed. On its own that was NOT enough — measured, the heading went to the
  SPAN's left edge (429px) while `justify-center` held the list at 470px, i.e. 41px apart. A
  different wrong position, not the old one.
- `md:w-max md:mx-auto` added instead. The whole column shrinks to max-content and THAT is what
  centres in the two-track span, so the heading and the list move together and the heading lands
  exactly on its first link.
- The list's `md:text-left` is now inert (it existed only to undo `md:text-center`); left in
  place with a note, since left is what the rows want regardless.

Nothing else in the footer was touched — the two-sub-column flow, the 80px gutter and the
mobile single-column stack are all unchanged.

## Verification
Measured at three widths against a running server, heading left edge vs its first link's left
edge, which is the only thing that differs between "over the gap" and "over the list":

```
1440 Products 470/470 · Editorial 862/862 · The House 1078/1078   overflow:false
1024 Products 252/252 · Editorial 603/603 · The House  772/772    overflow:false
 390 Products  32/32  · Editorial 215/215 · The House   32/32     overflow:false
```
All three headings now agree with their own first link at every width, and no footer element
crosses the viewport edge. Stylesheet asserted before measuring (§10.24). Screenshot read back:
`PRODUCTS` sits directly above "Modest Dresses", the two sub-columns are still centred as a pair.

`npx tsc --noEmit` and `npx eslint components/Footer.tsx` clean.

## Notes / follow-ups
- The mobile numbers look identical for Products and The House (both 32) because below `md` the
  footer is a two-column stack and both start a row — not evidence of anything about the fix,
  which is `md:`-only. Included so the mobile case is on the record as unchanged.
