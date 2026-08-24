# Sliding underline on hover, and plain nav links now close open panels
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Two more follow-ups on the same nav work:
1. Tina: "you see the stripes hat appear under the subcatagories when i
   hover over them i want that too" — a hover effect on aab's own
   subcategory links, then "line needs to be a tiny bit lower" once she saw
   the first pass live.
2. Tina: "when i stand on one of the catagories without sub cataorie like
   editorial it doesnt close the header" — a real gap: plain top-level
   links (Designers/Editorial/About) never interacted with the open/close
   state at all.

## What was researched (Playwright against the live aab site)
Inspected a subcategory link's computed style before/after hover: the
"stripe" is a `background-image: linear-gradient(currentColor, currentColor)`
(a solid-colour "fake border" — the classic trick for something a real
`border-bottom` can't do, animate its own length) at `background-size: 0%
1px` → `100% 1px` on hover, `background-repeat: no-repeat`,
`transition: background 0.2s`. Confirmed the SAME effect on the bold "All
Clothing" header link too, not just the regular category rows underneath —
it's a blanket rule on every `.link`, not something special-cased for one
row style.

## What changed
- `app/globals.css` — new `.mega-row-label` class carrying the underline
  mechanics, plus `.mega-row:hover .mega-row-label` /
  `[data-highlighted]` / `[data-active="true"]` variants to grow it to
  100%. Deliberately a nested SPAN around just the label text, not the
  `.mega-row` row itself: the row is `width:100%`, so its own background
  would stretch the stripe across the whole column regardless of how short
  the word is — aab's stripe hugs just the word. The hover trigger is
  still the PARENT row, not the span's own `:hover`, so a row wider than
  its text (Outerwear's chevron row, a short word in a wide single-column
  panel) lights up across its whole tappable area, matching the existing
  colour-change rule. Position tuned from the measured `0 85%` to `0 100%`
  after Tina saw the first pass live ("line needs to be a tiny bit lower").
- `components/NavMenu.tsx` — wrapped every `.mega-row`'s label text in
  `<span className="mega-row-label">` (the plain category links, the
  Outerwear-style subItems trigger, and the subItems flyout's own items).
- `components/NavMenu.tsx` — plain top-level links (Designers/Editorial/
  About) now call `closeAll()` on `onPointerEnter` AND `onClick`. They're
  not `NavigationMenu.Trigger`s, so hovering one never touched Base UI's
  own open/value tracking, and the pointermove closer's `stillRelevant`
  check treats anywhere inside `<header>` as fine (deliberately, so the
  pointer can travel from a trigger down into its own panel) — hovering an
  unrelated plain link never counted as "having left". A group's panel
  could sit open indefinitely while the visitor's attention had clearly
  moved on to Editorial, and clicking it navigated without ever closing
  the stale panel behind it.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright:
  - `background-size` on a category link goes `0% 1px` → `100% 1px` on
    hover, matching aab's own measured mechanics exactly.
  - Hovering "Editorial" while Clothing's panel is open closes it
    (`panel count` 1 → 0).
  - Clicking "Editorial" while a panel is open navigates to `/editorial`
    AND the panel is confirmed closed on the destination page.

## Notes / follow-ups
- None outstanding from this round.
