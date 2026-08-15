# Found the actual second timer: the flyout popup has its own independent close clock

**Date:** 2026-08-16 · **Status:** done, one real fix landed — see honest caveat below

## Goal
Tina, after the previous fix (49dd5d8, outer close-timer 150ms -> 400ms):
"yeah still doe sit" — still happening.

## What the previous fix missed
`components/NavMenu.tsx` has TWO independent timers governing this flyout,
not one:
1. The OUTER `navValue`/`elementFromPoint` mechanism — governs whether the
   whole "Products" panel stays open. This is what got widened last time.
2. The INNER `<Menu.Root>`'s own `closeDelay` on its `Menu.Trigger` — Base
   UI's own built-in hover-close timer for THAT specific flyout popup,
   completely independent of #1. **This was still 120ms, untouched by the
   previous fix**, and is very likely the actual thing closing when the
   pointer crosses from the row into the flyout: the outer panel and the row
   can both stay open/visible (as confirmed in the previous session's
   verification) while this inner popup closes on its own separate clock.

Found by re-reading the component structure rather than guessing at a
bigger number for the same timer again — the two `Menu.Root`/`Menu.Trigger`
inner flyout and the outer `NavigationMenu.Root` are genuinely separate
open/close state machines, each with its own timing.

## Fix
Widened the inner `closeDelay` 120ms -> 400ms, matching the outer one.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint components/NavMenu.tsx` — clean.
- Real-browser Playwright checks, several distinct scenarios: sitting on the
  row for 600ms before moving (flyout stayed open), a slow 20-step transit
  into the flyout with a 250ms aim-pause before clicking (6/6 succeeded in
  one isolated repeat run), diagnostic confirmation that `elementFromPoint`
  at the click coordinates resolves to the correct `<a href="...">` every
  time in that run.

## Honest caveat — don't treat this as fully closed
One run, in a slightly different test script than the others, showed the
sub-item still VISIBLE right before a click, but the click itself landed
back on `/directory` instead of navigating — not a "disappears" failure, a
different "click doesn't register" failure. Immediately tried to isolate
that exact pattern (hover directly on the target, pause 250ms, click) with
6 repeats — all 6 succeeded, so it didn't reproduce in isolation either.
**This means: the inner-timer fix addresses a real, previously-unpatched gap
and is very likely a meaningful part of the real cause, but there may be a
second, rarer failure mode (a click not registering rather than the item
disappearing) that neither this fix nor the previous one directly explains.**
If Tina reports this again, ask specifically: did the sub-item visibly
vanish, or did it stay visible but clicking it did nothing/went nowhere —
those are two different bugs and worth telling apart this time.

## Notes / follow-ups
- If it recurs, the next real step (not more constant-tuning) is probably to
  make the inner flyout's open state fully CONTROLLED by the same
  `elementFromPoint`-based mechanism already proven for the outer panel,
  rather than trusting Base UI's own two independent built-in hover timers
  at all. Bigger change, not attempted yet since the smaller fix might be
  sufficient and hasn't been disproven.
