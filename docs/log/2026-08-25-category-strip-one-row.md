# The category strip fits a phone in one row
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina, with a screenshot of the strip: *"i want this to be next to one another
make it smaller to fit phones"*.

## Third layout for this strip in one day, so the history matters

1. **Horizontal scroller.** Four `min-w-[150px]` tiles in one row. At 390px that
   measured `scrollWidth 600 > clientWidth 390`, with tiles at x = 0/150/300/450
   — Hijabs entirely off-screen, Sets half cut. Tina: *"in my iphone the
   catagories are in one big line can we fix that"*.
2. **2x2 grid on phone.** Fixed the hiding, but stacked the strip into a 245px
   block and put the four categories on two lines.
3. **One row at every width, sized down** — this change.

The failure mode to avoid is obvious once the sequence is written out: **going
back to (1)**. Four tiles in one row only works if the contents actually shrink,
which is why the new sizes are responsive rather than fixed. That is now said in
the component itself.

## What changed — `components/CategoryQuickLinks.tsx`

`grid grid-cols-2 lg:flex` → `flex`, and everything inside it gained a
phone/desktop pair:

| | phone | desktop (lg+) |
|---|---|---|
| icon | 18px | 26px (unchanged) |
| label | 10px / 0.06em | 13px / 0.14em (unchanged) |
| arrow | 10px | 12px (unchanged) |
| gap | 6px | 12px (unchanged) |
| padding | `py-4 px-1` | `py-8 px-6` (unchanged) |

Sizes are Tailwind classes rather than this file's usual inline `style`, because
an inline style cannot be responsive. Colour stays inline, per §6. Tailwind's
`w/h` beat an SVG's own `width`/`height` attributes, so the icon keeps its
desktop `size` prop and the classes override it below `lg`.

The divider logic went back to the simple form — one row everywhere means "a
right border on all but the last" again, replacing the three per-breakpoint
booleans the 2x2 needed.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · build clean.

Overflow is the whole risk, so it was measured at four widths in **both** engines
(an iPhone is WebKit — §10.24), with the HSTS/CSP headers stripped for WebKit
over plain-http localhost:

```
            width   row    scrollW  overflow  tiles          rows
chromium    320     320    320      false     4 x 80x71      1
chromium    360     360    360      false     4 x 90x71      1
chromium    390     390    390      false     4 x 98x71      1
chromium    430     430    430      false     4 x 108x71     1
webkit      320/360/390/430 — identical to chromium at every width
```

**320px is the tightest phone still in use, and `scrollWidth === clientWidth`
there.** Nothing is hidden behind a gesture, which is exactly what layout (1)
got wrong.

Block height 123px → **71px** on a phone; 245px → 71px against the 2x2.
Desktop measured 360x122, i.e. unchanged. Tap target 98x71, far past the 44px
floor.

`npm run audit:mobile`, both engines:

```
chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
```

## A probe that lied first — §10.26

The first measurement returned `rowW 0, scrollW 0`, ten tiles, all `0x0`, at
every width in both engines. That is not a site defect: the selector was
`[...document.querySelectorAll('a')].find(a => /ABAYAS/i.test(a.innerText))`,
which matched a **hidden** nav link in the collapsed mobile menu before it
reached the strip. A `display:none` element reports a zero rect.

Fixed by selecting structurally — `a[href="/modest-abayas"]`, filtered to a
non-zero width and to the one containing an `<svg>`. Recorded because "all
zeroes at every width in both engines" is the shape of a finding that gets
believed, and a whole category failing at once is precisely the signal to
suspect the harness first.
