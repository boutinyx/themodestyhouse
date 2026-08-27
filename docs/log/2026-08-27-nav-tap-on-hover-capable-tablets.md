# The header menu was dead on any tablet whose browser claims it can hover
**Date:** 2026-08-27 · **Status:** done

## Goal
Tina, on a tablet in landscape: *"the dropdown menu doesnt work well it doesnt open. the
one that is above (not the one on the side like mobile)"* — i.e. the desktop header menu
(Clothing / Hijabs / Basics / Active), not the phone drawer.

## What was wrong

Every touch branch in `components/NavMenu.tsx` asked
`window.matchMedia('(hover: none)')`. That was §10.45's deliberate choice, over
`pointer: coarse` and `maxTouchPoints`, and its reasoning was sound for the case it was
written for: a hybrid laptop with a trackpad *and* a touchscreen reports `hover: hover`
and should keep the mouse behaviour.

The media query answers a question about the **device**. It says nothing about the
**gesture**. A tablet with a paired trackpad or keyboard — and every touchscreen laptop —
reports `hover: hover` while the thing on the glass is still a finger. On such a device
none of the touch branches ran:

- **Clothing / Hijabs / Basics** carry an `href`, so the Trigger renders as a `<Link>`.
  The tap fell through to `closeAllAndSuppressReopen()`, which set the veto that then
  swallowed the open Base UI's synthesised hover would have produced — and the `<Link>`
  navigated away. Tap "Clothing", land on `/directory`, never see the panel.
- **Active** has no `href`, so there was not even a navigation to show for the tap.
  Nothing happened at all.

Landscape is the only orientation where this is visible: the phone drawer is `lg:hidden`,
so below 1024px a tablet gets the drawer (which she confirmed works) and at or above it
gets this header.

## Reproduction, before any code changed

Against **production** (`https://themodestyhouse.com`), 1180x820, `hasTouch: true`, in
**both** engines. The only thing stubbed is `matchMedia('(hover: none)')` → `false`;
touch hardware and viewport are left exactly as Playwright reports them.

```
webkit   | as-is (hover:none)      | tap Clothing => panels=1 url=/            (works)
webkit   | as-is (hover:none)      | tap Hijabs   => panels=1 url=/            (works)
webkit   | as-is (hover:none)      | tap Basics   => panels=1 url=/            (works)
webkit   | as-is (hover:none)      | tap Active   => panels=1 url=/            (works)
webkit   | IPADOS-LIE (hover:hover)| tap Clothing => panels=0 url=/directory   (BROKEN)
webkit   | IPADOS-LIE (hover:hover)| tap Hijabs   => panels=0 url=/modest-hijabs
webkit   | IPADOS-LIE (hover:hover)| tap Basics   => panels=0 url=/layering-basics
webkit   | IPADOS-LIE (hover:hover)| tap Active   => panels=0 url=/            (nothing at all)
chromium | … identical on all eight rows …
```

`panels` is `document.querySelectorAll('[data-nav-wide-panel]').length` — the marker that
predates this change and is exactly 0 or 1 by construction.

## What changed

**`components/NavMenu.tsx`** — the discriminator is now the gesture, not the device.

- New `lastPointerType` / `lastTouchAt` refs, fed by a capture-phase window `pointerdown`
  listener. Compatibility mouse events synthesised after a `touchend` are mouse *events*,
  not pointer events, so they cannot forge a `pointerdown` and flip the state behind a tap.
- `isTouchGesture()` returns true for `pointerType` `touch` or `pen`, and falls back to
  `matchMedia('(hover: none)')` **only** before any gesture has been observed (a keyboard
  user, or a hover arriving before the first `pointerdown`). Gesture evidence always wins.
- A mouse-typed `pointermove` promotes the state back to `mouse`, gated on a second having
  passed since the last touch — that window is what tells a real trackpad move apart from
  the single stale compatibility move every `touchend` emits (§10.45).
- The three `matchMedia('(hover: none)')` call sites — the `onValueChange` veto, the
  `pointermove` hover-out closer, and the Trigger's `onClick` — now call `isTouchGesture()`.

§10.45's hybrid property is preserved and sharpened: a mouse click on such a machine still
reports `mouse` and still gets hover behaviour, and now a finger tap on the *same* machine
gets tap behaviour, which is what it could never do before.

**`scripts/interaction-audit.mjs`** — new check `nav-tap-on-hover-capable-tablet`.

The existing `nav-dropdown-open` check could not have caught this: Playwright's `hasTouch`
contexts report `hover: none`, so it only ever exercised the branch that already worked.
The new check builds its own context with the `(hover: none)` stub in place before first
paint, then taps all four groups, including "Active" — the one trigger with nowhere to
navigate, where a broken tap produces no visible effect at all. It asserts the stub took
(`throw` if it did not, rather than reporting a meaningless pass) and finds the open panel
**structurally** (a visible absolutely-positioned block of links), not by any marker this
fix introduced (§10.32 rule 2). Below 1024 all four triggers are genuinely absent, so that
reports `skipped` with the reason, matching `nav-dropdown-open` at the same two viewports.

## Verification

**Negative control first (§10.28 rule 1)** — the new audit check, against **production**,
which does not have the fix:

```
nav-dropdown-open               ipad-1366  chromium  ok
nav-tap-on-hover-capable-tablet ipad-1366  chromium  TRIGGERS DID NOT OPEN ON TAP —
  Clothing:navigated to /directory, Hijabs:navigated to /modest-hijabs,
  Basics:navigated to /layering-basics, Active:nothing happened
```

Note `nav-dropdown-open` reads `ok` on the same run. The old check is not blind by
accident — it is blind by construction, which is the reason the new one exists.

**Then the fixed build** (`npm run build` + `next start -p 3188`), 48 assertions, 4 modes ×
2 engines, every one of them with a stylesheet assertion first (§10.24):

```
  ok   chromium/webkit TOUCH + hover:none        — 4 groups open, 4 inner rows navigate
  ok   chromium/webkit TOUCH + hover:hover       — 4 groups open, 4 inner rows navigate
  ok   chromium/webkit MOUSE                     — hover opens, moving away closes,
                                                    clicking Clothing navigates to /directory
  ok   chromium/webkit HYBRID                    — finger tap opens; after a real mouse move
                                                    past the 1s window, hover works again
ALL CHECKS PASSED
```

The same harness pointed at production fails on its first `hover:hover` assertion
(`panels=0 path=/directory`), so it discriminates rather than merely passing.

**Full interaction audit** against the fixed build, 4 viewports × 2 engines:
`0` lines matching `PROBLEM|DID NOT|error` in 83 lines of report. The same grep on the
production run returns 1.

`npx tsc --noEmit` exit 0 · `npx eslint` exit 0 · `npm test` 55 files, **901 passed**.

## Notes / follow-ups

**Separate, unfixed, found while measuring: the header overflows horizontally at 1024px.**
At a 1024-wide viewport `document.documentElement.scrollWidth` is **1144** — 120px of
sideways scroll, with the utility cluster (search / favourites / currency) pushed off the
right edge. The wordmark is squeezed from 163px to 92px, wraps to three lines, and its
text paints 34px past its own box, so "The Modesty" overprints "Clothing" by 10px. Measured
in both engines at 1024, 1100 and 1180; clean from 1194 up. That is the standard iPad
9.7"/10.2" landscape width. Not touched here — the row needs ~1210px for its current
contents, so closing it means either raising the `lg` breakpoint at which the desktop
header appears (a decision about which devices get the drawer) or tightening the row's
spacing between 1024 and 1200. Both are Tina's call, not a mechanical fix.
