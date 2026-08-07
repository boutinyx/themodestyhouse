# Designers: vetted row, seal only there, paged every six rows

**Date:** 2026-08-07 · **Status:** done

## What changed

`app/designers/page.tsx`:

- **The index leads with the vetted houses.** There are exactly five badged
  houses, and a row is five, so they fill the first row on their own.
- **The seal shows in that row only.** Everywhere else the chip repeated what
  the row already says, and it was the one thing breaking the grid's rhythm.
- **Six rows to a page** — 30 tiles — with real `?page=` links.

## The duplication this forced a decision about

The founder's pick and the vetted set overlap: Tina picked Veiled and Aab, both
of which are verified. Putting all 58 houses in the index made **four** of the
five picks appear twice on page one — Inayah and Glow Modesty sit inside the
first twenty-five by catalogue order.

So the pick is held out of the index's tail. Veiled and Aab still appear twice,
in the pick and in the vetted row, because they genuinely belong to both
selections. Index is 55: five vetted, then fifty.

```
page 1   founder's pick 5  +  index 30   (row 1 = the five vetted, sealed)
page 2   index 25
```

## Pagination is links, not state

Each page is its own URL. Nearly the whole catalogue is currently unreachable by
a crawler because grids render a slice and reveal the rest client-side (§8) —
this page does not add to that.

**Trade-off:** reading `searchParams` makes the route dynamic. It was `○` static
and is now `ƒ`, rendered per request. On Railway that is a long-running Node
server rather than a serverless function, so the cost is a render, not a cold
start. Static pagination would need a `/designers/page/[n]` segment, which
changes the URL shape.

Out-of-range and non-numeric `?page=` clamp to a valid page rather than erroring.

## Verification

```
npx tsc --noEmit     clean
npx vitest run       366 passed (366)
npx eslint           clean
npm run build        Compiled successfully · /designers is now ƒ
```

Served pages:

```
/designers          35 tiles   5 seals   33 distinct  (Veiled + Aab repeat, by design)
/designers?page=2   25 tiles   0 seals   25 distinct
/designers?page=99  clamps to page 2
```

## Notes / follow-ups

- `components/BrandMarquee.tsx` and `components/BrandCard.tsx` are both
  unreferenced now, and the marquee keyframes are still in `globals.css`.
