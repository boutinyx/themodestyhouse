# Outerwear flyout: fix "the box disappears before I can click"

**Date:** 2026-08-13 · **Status:** done

## Goal

Tina, immediately after the flyout shipped: "when i stand on one of the sub catagories
the box just dissepears before i can click". Fix the hover-transit from "Outerwear" into
its Blazers/Vests/Cardigans/Coats flyout without regressing anything else about it.

## Root cause

Base UI's `NavigationMenu` (the Products dropdown's primitive) defaults to a 50ms close
delay once the pointer leaves the elements it tracks — its own Trigger and Popup/Viewport.
The flyout is a separate `Menu.Root`, portalled to `document.body`. Moving the pointer off
"Outerwear" into the flyout reads, to NavigationMenu, as having left entirely, so it starts
closing before the flyout is reachable.

## Three attempts, in order, each disproven live rather than assumed

1. **Veto every auto-close while the flyout is conceptually open** (a plain
   `onOpenChange` boolean on the nested `Menu.Root`, checked in the outer's
   `onValueChange`). Fixed the original bug — confirmed by transiting the ~2px gap and
   clicking a sub-item successfully. But NavigationMenu decides to close *exactly once*
   per pointer-leave, and once vetoed it does not retry: nothing ever asks it to close
   again. Confirmed live — moved the pointer fully away and waited 2+ seconds, the panel
   just sat open.
2. **Add an active pointermove-driven closer, gated on the same flyout-open boolean.**
   Reasoned this would force the close once the flyout's own state said "closed." Still
   broke: `closeOnClick` on the sub-item closes the flyout (and tears down the listener,
   since the effect is gated on that same boolean) at essentially the same moment
   navigation starts — so by the time the pointer next moved, the thing meant to notice
   had already unmounted. Confirmed directly via the DOM: `[role="menu"]` count 0 (flyout
   genuinely closed) while the outer trigger still read `aria-expanded="true"`.
3. **Key the closer off `navValue !== null` instead (runs for as long as the outer panel
   is open, not tied to the flyout's lifecycle) + an explicit `onClick` force-close on
   each sub-item link, for the click case specifically.** This fixed both the original bug
   and attempt 2's regression — but a THIRD bug surfaced under further testing: the veto
   in `onValueChange` was still keyed to the flyout's `open` boolean. The moment the
   flyout closed — for ANY reason, including simply moving from the flyout back into a
   *different, still-legitimate* row like "Modest Dresses" — the veto lifted and let
   through whatever close NavigationMenu had already queued from the original
   leave-the-trigger event, closing the *entire* Products panel out from under a pointer
   that was still hovering it. Confirmed live with a full transit test (flyout → back
   across into Modest Dresses): panel closed, trigger included.

## What actually holds

The veto is now keyed to a **live** ref (`pointerRelevant`), updated by the same
`pointermove` handler the active closer uses — "is the pointer *currently*, right now,
over the header, the outer popup, or the flyout" — computed via `document.elementFromPoint`
and `.contains()` checks (works across the portal boundary; portals are still real DOM
under `document`), not via either primitive's own notion of "inside," and not via a
boolean that can go stale between the moment a decision is queued and the moment it's
applied. A 150ms grace timer on the active closer absorbs momentary boundary crossings
during transit. The click case is handled directly and immediately at each sub-item's
`onClick`, rather than relying on "the pointer will eventually move again" — it might not,
if someone clicks and then just reads the destination page.

Verified against three scenarios, each run multiple times live (not just once) given how
each prior attempt looked fixed on a single pass and wasn't:
- Transit trigger → flyout → click a sub-item: survives, lands pre-filtered, closes
  immediately.
- Transit trigger → flyout → move away without clicking: closes within the grace window,
  every time.
- Transit trigger → flyout → back across into a *different* row (Modest Dresses), no
  click, no leaving: stays open, correctly, every time (3/3 in a row).

## Files changed

- `components/NavMenu.tsx` — the fix described above. Debug instrumentation
  (`window.__navDebug`) used to catch attempt 3's residual bug was added and removed in
  the same session, never shipped.

## Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — clean (pre-existing unrelated warning only).
- `npx vitest run lib/devOnly.test.ts --exclude ".claude/**"` — 33/33 (real repo root;
  `.claude/worktrees/**` is a different concurrent session's workspace, not this repo's
  own tests — see the previous log entry for the same false-positive pattern).
- `npm run build` — clean.
- `scripts/interaction-audit.mjs`, both engines, all four viewports, full suite (not just
  the new checks): zero `PROBLEM` anywhere. `outerwear-flyout` / `outerwear-flyout-navigate`
  both `ok` at ipad-1366 and desktop-1440 in both Chromium and WebKit.
- Manual, live, via real mouse movement through several intermediate points (not a
  teleporting hover) — the three scenarios above, each repeated to rule out flakiness.

## Notes / follow-ups

Proposed a CLAUDE.md §10 addition for this — the "vetoed once, never retried" shape is
generic to any controlled Base UI open-state and worth having on record before it's
rediscovered the hard way again.
