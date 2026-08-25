# Even footer column rhythm, a 2×2 tablet layout, and a real sideways overflow
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"now i want you to use playwright to center everything good"*. "Everything" had
several readings, so the candidates were named and she chose **even out the footer
columns** (§10.29 — ask when a request admits more than one reading).

## What was actually wrong — measured before touching anything
On staging at 1440, the gaps between column CONTENTS were **83 / 83 / 32px**. The footer
block itself was already centred correctly (142px margin either side), so the thing that
read as off was the rhythm, not the centring.

Cause: Products spanned two `1fr` tracks and was centred inside them (`md:w-max
md:mx-auto`), so it floated with ~50px of slack on each side, while Editorial and The
House sat on the bare 32px grid gap. **No `fr` template fixes this** — the slack comes
from content being narrower than its track, not from the track sizes.

## What changed — `components/Footer.tsx`
**lg and up is a flex row**: `lg:flex lg:justify-between lg:items-start lg:gap-x-12`.
Every column sizes to its content and the browser divides the leftover equally, which is
the definition of one rhythm. `gap-x-12` is a floor; free space is distributed on top.

**Products lost `md:w-max md:mx-auto`.** This is the trap worth knowing: an auto margin
on a flex item absorbs free space and takes precedence over `justify-content`, so one
stray `mx-auto` would have silently eaten the whole distribution. Nothing was lost by
removing it — a flex item sizes to its content, so the heading and the first link share a
left edge by construction rather than by a width trick. `justify-center` on the list
became `justify-start` for the same reason: there is no span left to centre inside.

**Tablet is a 2×2** — brand + Products, then Editorial + The House. Just the base
`grid-cols-2` carried up; every column was already `col-span-2 md:col-span-1`, so no md
template is needed at all.

## The bug found while measuring — a horizontal overflow, present before this change
At a 768 viewport, `documentElement.scrollWidth` was **824 in Chromium and 872 in WebKit
against a 768 clientWidth**. The page scrolled sideways.

Four columns across meant Products' two max-content sub-columns plus their 80px gutter
needed ~311px inside a ~213px span, and `fr` tracks floor at min-content — so the row
could not shrink and pushed The House past the container's right edge (box `765..824`
against a grid ending at `736`). **An iPad in portrait is 820 wide and was seeing 52px of
it.**

Four-across at md was tried first and does fit (0 overflow) if Products stacks into one
column — but 13 links in one column made it three times the height of everything beside
it and left the right half of the tablet footer empty. Half a 768 row is 336px, which
fits the sub-column pair at a 32px gutter with room to spare, so the 2×2 keeps the pair
AND the height sane.

## Verification
`npx tsc --noEmit` clean · `eslint components/Footer.tsx` clean.

Seven widths on staging, **both engines, byte-identical results**:

```
            overflow  gaps              footerH
390         0         (stacked)         1035
768         0         32 / wrap / 32     783
820         0         32 / wrap / 32     783
1024      120*        48 / 48 / 48       484
1280        0        112 / 112 / 113     484
1440        0        112 / 112 / 113     484
1920        0        112 / 112 / 113     484
```

The `wrap` entries at 768/820 are the 2×2's row break, not a defect — the raw number is
negative because the second row starts back at the left edge.

**\*The 120px at 1024 is NOT this change and NOT the footer.** Same probe run against
staging's *old* footer returned the identical 120px, and every offending element came
back `inFooter: false` (§10.38 rule 1 — establish whether it ever passed before assuming
you broke it). See the follow-up below.

## Notes / follow-ups
- **Open bug, raised with Tina, not fixed here: the desktop HEADER overflows at 1024.**
  `documentElement.scrollWidth` 1144 vs a 1024 clientWidth, in both engines, on staging
  both before and after this change. The offender is the header's own utility cluster
  (`div.hidden.lg\:flex.items-center.gap-6` — Search / favourites / divider / currency)
  running to x=1144. The desktop layout switches on at `lg` = 1024, and at exactly that
  width crest + wordmark + full nav + utility do not fit. It affects real devices — an
  iPad 10.2/Air in landscape is 1024 — and shows as the page scrolling sideways. Out of
  scope for "even out the footer columns"; needs its own decision (raise the desktop
  breakpoint, tighten the nav gap, or drop a label).
