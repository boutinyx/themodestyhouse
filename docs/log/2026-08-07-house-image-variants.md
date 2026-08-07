# A house no longer shows the same photograph everywhere

**Date:** 2026-08-07 · **Status:** done

## The problem

`firstImageByBrand()` took each house's **first** product and every surface used
it: the homepage "Newly verified" rail and the designers grid always showed the
identical photograph for a given house. The median house has **111 products**;
we were using one of them.

Worth being precise about what was *not* wrong: all 58 houses already had
distinct images from each other. The repetition was across pages, not within one.

## What changed

`lib/houses.ts` — `houses(variant = 0)`. The pool is now every product image a
house has, and `variant` picks a different one per surface. The designers page
takes variant 1; the homepage rail keeps variant 0, so the two no longer echo.

**Deterministic, seeded on the slug** — not random. A picture that changed under
the reader would feel broken, and would differ between the server render and the
client. It is stable across builds and across a refresh.

`HERO_OVERRIDE` still outranks the variant everywhere: a hand-picked hero is an
explicit editorial choice, so Nasiba stays pinned on all surfaces.

## A bug caught in verification

The first implementation offset the index by a stride: `(hash + variant * 37) %
n`. That collides whenever a house's product count divides the stride, and
`sistrs` has **exactly 37 products** — so variant 1 landed straight back on
variant 0's picture. Seeding the hash per variant (`hash(slug:variant)`) removes
the whole class of collision rather than moving the stride to another unlucky
number.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       366 passed (366)
npx eslint           clean
npm run build        Compiled successfully
```

- variant 0 vs 1: 56 of 58 houses now differ. The two that do not are Nasiba
  (pinned override, deliberate) and Madiha (a chance hash collision on a small
  pool — not systematic).
- 58 of 58 distinct within variant 1; identical across repeated calls.
- **All 58 new URLs fetched and rendered to a contact sheet before shipping.**
  Every one loads, and the mix is markedly more on-body than the old first-product
  picks. Three or four are weak (a hanging rack, a flat cutout) — those are
  candidates for `HERO_OVERRIDE` if Tina wants them pinned.

## Notes / follow-ups

- `getProducts()` is uncached and re-read per call (§8); this builds one pool per
  call rather than one per house, so it adds no extra read.
