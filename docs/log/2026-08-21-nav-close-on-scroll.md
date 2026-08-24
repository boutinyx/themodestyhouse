# Nav panel closes on scroll
**Date:** 2026-08-21 · **Status:** done, verified with Playwright

## Goal
Tina: "wehn i hover over it stayes like that its supposed to close when i
scroll down". Follow-up on the earlier change that made the wide panel not
close on hover-out at all (matching aab). Scrolling is the other obvious
"I've moved on" signal once that safety net is gone.

## What changed
- `components/NavMenu.tsx` — new effect: while `navValue !== null`, a
  `window` `scroll` listener (`{ passive: true }`) calls `closeAll()`.
  Applies to any open group, not just `wide` ones.

## Verification
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: clean.
- `npm test`: 1317/1319 (2 pre-existing stale-worktree failures, unrelated).
- Verified live with Playwright: hover Clothing → panel opens → `mouse.wheel(0, 300)` → panel closes.
