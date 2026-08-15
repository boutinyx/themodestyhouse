# Nav flyout: the real root cause was column occlusion, not timing

**Date:** 2026-08-16 · **Status:** done

## Goal
Tina, after two timer-widening fixes (outer closeTimer 150→400ms, inner
closeDelay 120→400ms): "still not and something more omg the block closes
in slow motion" — the symptom persisted, just slower, which was the signal
that the previous fixes were treating a symptom, not the cause.

## Investigation
Per `systematic-debugging`: stopped tuning constants and traced the actual
DOM state during a failing cross-flyout hover (Hijabs & Scarves → Layering
Basics). `document.elementFromPoint()` at Layering Basics's row position
resolved to "Undercaps" — part of Hijabs & Scarves's still-open flyout —
instead of the Layering Basics row itself. Reproduced 5/5.

Root cause: the Products panel is a 2-column CSS grid (11 category lanes,
`flow: 'down'`, split 6+5). Hijabs & Scarves is item index 2 → column 1.
Its flyout opens `side="right" sideOffset={2}`, landing directly on top of
column 2 — where Layering Basics and Outerwear live at overlapping row
heights. Measured live via Playwright: column 1 ends at x≈758, column 2
spans x≈782–969. A 2px offset lands the flyout squarely inside column 2.

This also explains why the two earlier timer fixes never fully worked:
there was nothing wrong with the timing. Moving from Hijabs & Scarves
"down" toward Layering Basics/Outerwear meant the pointer visually landed
on the still-open Hijabs flyout, not the row underneath it — no amount of
grace-period widening fixes a pointer that's hitting the wrong element.

Also found: found and fixed, in the same investigation, a genuine
shared-ref bug — a single `flyoutPopupRef` was written to by all three
flyout `<Menu.Popup>` instances, so the "is the pointer still over the
flyout" liveness check could test against the wrong (stale) flyout's DOM
node. Replaced with a `data-nav-subflyout` attribute + live `closest()`
query, immune to instance-sharing.

## Fix
Added `wideFlyoutOffset?: boolean` to `NavItem` (`components/NavMenu.tsx`).
When set, the flyout's `Menu.Positioner` uses `sideOffset={230}` instead of
`2` — measured to clear column 2's right edge (x≈969) from column 1's right
edge (x≈758) with margin. Set `true` only on Hijabs & Scarves
(`components/Nav.tsx`) — the only column-1 row with subItems. Layering
Basics and Outerwear (column 2) keep the default 2px offset; there's no
column 3 for their own flyouts to collide with.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint components/NavMenu.tsx components/Nav.tsx` — clean.
- Real-browser Playwright, the exact previously-failing scenario: Hijabs &
  Scarves → Layering Basics → click "Base-Layer Tops", 5/5 succeeded
  (was 0/5 before this fix). Also verified Hijabs↔Outerwear both
  directions, and the direct same-flyout case — 9/9 total, all passing.
- Geometric check: with the Hijabs flyout open, its popup rect
  (`x=988, w=186`) does not overlap either visible column-2 row
  (`Modest Swimwear` at `x=782, w=187`; `Modest Activewear` at
  `x=782, w=187`) — confirmed by rect-intersection test, not just visually.
- Screenshot confirms a clean visual gap between the two panels.

## Notes / follow-ups
- The magic number (230px) is tied to the current label lengths and grid
  gap. If category labels or the grid gap change meaningfully, re-measure
  rather than assume it still clears column 2.
- If a THIRD column-1 flyout-owning category is ever added, it needs the
  same `wideFlyoutOffset: true` treatment.
