# The homepage category strip wraps to 2x2 on a phone
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"in my iphone the catagories are in one big line can we fix that."*

## What was actually wrong
Measured before changing anything, at 390px in **both engines** (an iPhone is
WebKit, §10.24):

    row scrollWidth 600 > clientWidth 390
    tiles at x = 0 / 150 / 300 / 450, each min-w-[150px]

So `Hijabs` sat entirely off-screen and `Sets` was half cut. It was a horizontal
scroller — which is what reads as "one big line", and it hid half the categories
behind a gesture nobody knows to make. Chromium and WebKit agreed exactly, so
this was never engine-specific.

## What changed
`components/CategoryQuickLinks.tsx` — the row is `grid grid-cols-2` up to `lg`,
and the original single flex row from `lg` up.

The version being replaced argued in its own comment that staying one row at
every width was what kept the "border-right on all but the last" divider logic
simple. That was true, and it is why the borders are now computed per breakpoint
instead of as one inline style:

    phoneRight  = i % 2 === 0            // left column only
    phoneBottom = i < ITEMS.length - 2   // every row but the last
    wideRight   = i < ITEMS.length - 1   // all but the last tile

Borders use Tailwind side/width utilities with the **colour supplied inline** from
`--hairline`, because an inline style cannot be responsive and §6 says colour is
never a Tailwind class here.

## Verification
Both engines, four widths, measuring the strip **by structure** (the only
container holding exactly four `<a>` children) rather than by "first visible
abaya link" — an earlier probe used that and silently measured the header's
Products dropdown instead, reporting ten 128px tiles:

| width | display | rows | tile widths | h-overflow |
|---|---|---|---|---|
| 390 | grid | 2 | 195 × 4 | none |
| 820 | grid | 2 | 410 × 4 | none |
| 1024 | flex | 1 | 256/256/256/255 | none |
| 1440 | flex | 1 | 360/360/360/359 | none |

Chromium and WebKit identical at every width. Desktop is unchanged — single row,
equal quarters, three dividers and no trailing one; confirmed by screenshot.
`npx tsc --noEmit` clean, `npm run lint` clean, 781 tests pass.

## Notes / follow-ups
- Built and served from a **detached git worktree on port 3213**, after the
  shared `.next` was wiped mid-measurement three times by a concurrent session
  (§10.28 rule 4). The stylesheet assertion caught each one rather than letting a
  CSS-less page produce numbers. `cp -al` for the node_modules clone, not a
  symlink — Turbopack panics on a symlinked node_modules pointing outside the
  project root (§10.38).
- The `lg` breakpoint (1024px) means a 820px tablet also gets the 2x2. That is
  deliberate: at 820 a single row would give 205px tiles, tighter than the phone's
  195px two-up.
