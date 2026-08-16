# Nav flyout: the 400ms timers were a band-aid for occlusion; brought them back down

**Date:** 2026-08-16 · **Status:** done

## Goal
Tina, right after the column-occlusion fix (333fafe) shipped: "there is a
lagg when you hove on one and the other was open it freezes for about 2
seconds and then disspears, that too late."

## Investigation
Reproduced with Playwright, instrumented with a MutationObserver on every
`[data-nav-subflyout]` element plus a `PerformanceObserver` for long tasks
(none found — this isn't a JS-blocking freeze, just a slow state
transition). Measured wall-clock from pointer arrival at a new row to the
stale flyout actually clearing, across several scenarios (flyout → flyout,
flyout → plain link, same column and different column): consistently
~550–700ms. Not literally 2 seconds, but a real, measurable stall — long
enough to read as "frozen," not "responsive."

Root cause: both the outer `navValue` closeTimer and the inner
`Menu.Trigger`'s `closeDelay` were widened to 400ms earlier today
(`49dd5d8`, `20d2778`) as a reaction to the disappearing-flyout bug — but
that bug's real cause turned out to be column occlusion
(`333fafe`,`docs/log/2026-08-16-nav-flyout-column-occlusion.md`), not
timing. The 400ms widenings were compensating for a geometry bug by giving
misreads time to self-correct. They worked, but left every legitimate
hover-away with a ~550-700ms lag baked in, since 400ms (inner) + 150ms
(outer, running in parallel but not always overlapping cleanly) + the
100ms popup fade transition stack up in the worst case.

## Fix
Now that occlusion is fixed at the geometry level (`wideFlyoutOffset`),
neither timer needs to cover for it anymore. Reverted both back to 150ms —
the value originally sized for genuine pointer-transit imprecision (a real
trackpad's coarser steps vs. a mouse), independent of the occlusion bug.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint components/NavMenu.tsx` — clean.
- Re-ran the exact 9-scenario cross-flyout regression suite from the
  occlusion fix (Hijabs↔Layering Basics, Hijabs↔Outerwear, both
  directions, 5x repeat on the previously-failing case) — 9/9 still pass
  at 150ms. Confirms the occlusion fix, not the timer width, is what was
  actually holding the earlier bug closed.
- Re-measured the timing scenarios that showed ~550-700ms before:
  now ~310-430ms — roughly half. Not instant (150ms delay + ~100ms fade is
  an inherent floor), but no longer reads as a stall.

## Notes / follow-ups
- If Tina still sees this as slow, the next lever is the 100ms
  `Menu.Popup` fade transition duration, or dropping the delay further —
  but 150ms is the value this mechanism's own history already validated
  for real trackpad imprecision, so don't go lower without a specific new
  report to justify it.
