# Nav flyout row: real fix — click the row itself, not a new "All X" link

**Date:** 2026-08-15 · **Status:** done, corrects the previous attempt

## Goal
Follow-up on `2026-08-15-nav-flyout-all-x-link.md`. Tina, after seeing that
fix: "you did it wrong all i wanted you to do is make it able to click on
this and being able to open all" — pointing at the "HIJABS & SCARVES >" row
itself. The previous commit (b7fba57) added a separate "All X" entry inside
the flyout instead of making the row clickable. Technically functional, but
not what she asked for — she wanted the row, not an extra menu item.

## Why this needed care, not a quick revert
`components/NavMenu.tsx` has a documented history here (§10.34-style, right
in the file's own comments): a 2026-08-13 attempt to render this row as a
`Link` caused a real touch bug — `Menu.Trigger` has no native "tap opens
first" handling the way `NavigationMenu.Trigger` (used for "Products") does,
so a touch tap both navigated immediately AND left the flyout open on top of
the new page. That's why the row was made a non-Link trigger in the first
place. Simply reverting to a Link would reintroduce that exact bug.

## Fix
Kept the row as a `Menu.Trigger` (not a `Link` — no default browser
navigation exists for a tap to trigger). Added:
- `lastPointerType` ref, set from the trigger's existing `onPointerDown`
  (same handler already used for the "mouse-press swallow" that keeps
  hover-then-click from getting stuck open).
- A new `onClick` on the trigger: if `lastPointerType.current === 'mouse'`,
  closes the panel and `router.push(it.href)` to the bare lane page. If the
  last pointer activity was touch, does nothing extra — the flyout already
  opened via the existing tap-handling, unchanged.

This sidesteps the 2026-08-13 bug entirely: touch taps still have no default
navigation to race against, since the element was never an `<a>`. Only a
mouse click gets the new explicit navigation.

Also reverted `components/Nav.tsx`'s "All X" flyout entries from the
previous commit — redundant now that the row itself navigates, and removing
them makes this match how "Products" itself already works (click navigates,
hover previews, no redundant "all" link inside the panel).

`components/MobileNav.tsx` was NOT touched — its row is a disclosure toggle
by explicit, separate design (2026-08-13, Tina: tapping used to navigate
straight to `/outerwear` with no way to reach the subtypes at all), and its
own "All X" link (added in the previous commit) is the correct behavior
there, not a mistake to undo.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint` — clean.
- **Real browser, both pointer types**, against a local `next dev` build:
  - Mouse: hover Products → hover Hijabs & Scarves (flyout previews
    correctly) → click the row → lands on `/modest-hijabs`, flyout panel
    confirmed closed (not left open behind the new page).
  - Mouse sub-item: hover Hijabs & Scarves → click "Undercaps" in the
    flyout → lands on `/modest-hijabs?type=undercap` (unchanged from
    before).
  - Touch (1366px viewport + `hasTouch`, the documented iPad-hybrid case):
    tap Products → tap Outerwear row → stays on `/directory`, flyout opens
    with "Coats" visible (no premature navigation) → tap "Coats" → lands on
    `/outerwear?type=coat`.

## Notes / follow-ups
- This is the second attempt at the same request in one evening. The lesson
  worth keeping: "make X clickable" from Tina means the exact element she's
  pointing at, not a functionally-equivalent addition elsewhere — ask
  "which specific element" if a screenshot doesn't make it obvious, rather
  than solving the underlying need a different way.
