# Flyout sub-item disappearing before click — widened the close grace window

**Date:** 2026-08-16 · **Status:** done, root cause not 100% pinned down — see below

## Goal
Tina: "when i hover over and want to click onn one of the sub catagories it
dissapears" — this is the same class of bug `components/NavMenu.tsx`'s own
extensive comment history documents fixing three times already (the
`navValue`/`pointerRelevant`/`elementFromPoint` mechanism exists specifically
because of an earlier version of this exact complaint: "when i stand on one
of the sub catagories the box just dissepears before i can click").

## Investigation
Reproduced ONCE with Playwright, using a realistic multi-step mouse
trajectory (not an instant jump) from the "Hijabs & Scarves" row toward the
"Undercaps" sub-item, followed by a fresh `locator.click()`. Immediately
re-ran the identical script 3 more times — all 3 succeeded. Built a second,
more deliberate stress test that paused the pointer for 180ms in the visual
gap between the row and the flyout (simulating a person hesitating/aiming)
and ran it 8 times in a row — all 8 succeeded. Also confirmed no unrelated
JS errors were involved (checked console output during the one failing run).

**Honest conclusion: this is a genuine but narrow timing race, not a
structural bug, and I could not reliably reproduce it on demand.** The
existing mechanism's `closeTimer` grace window was 150ms — short enough that
a real trackpad (coarser, less continuous pointer events than a mouse, and
than Playwright's synthetic linear interpolation) or a moment of dev-server
render latency could plausibly exceed it during an ordinary aim-then-click
pause, without needing any deeper flaw in the `elementFromPoint`-based
liveness check itself.

## Fix
Widened the grace window from 150ms to 400ms in the same `useEffect` that
already handles this — no structural change to the mechanism (still
`elementFromPoint`-based, still an active pointermove-driven check, still
handles the click case immediately and separately). Low-risk given the
history: only a constant changed, not the logic three prior attempts already
fought hard to get right.

## Verification
- `npx tsc --noEmit` — clean.
- `npx vitest run --exclude '**/.claude/**'` — 694/694 passing.
- `npx eslint components/NavMenu.tsx` — clean.
- Re-ran the original repro script 3x after the change — all 3 succeeded
  (was already inconsistent before the change, so this alone isn't proof,
  just a sanity check).
- **Confirmed no regression on the original 2026-08-15 bug this mechanism
  exists for**: hovered Hijabs & Scarves (flyout opens) → moved to a
  completely different row, Modest Dresses → waited 700ms (past the new
  400ms window) → confirmed the Hijabs flyout actually closed (not stuck
  open) AND the outer Products panel stayed open and usable. The wider
  window does not turn into "never closes."

## Notes / follow-ups
- If this recurs, the next step should be a hardware-accurate repro — either
  Playwright's CDP-level trackpad/touchpad gesture support if available, or
  asking Tina to note her input device (mouse vs. trackpad) and roughly how
  she moves before clicking, since that's the one variable this session
  couldn't simulate with real fidelity.
