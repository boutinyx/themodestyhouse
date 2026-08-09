# Currency switcher: hover drives it, a click no longer pins it open
**Date:** 2026-08-09 · **Status:** done

## Goal
Tina: *"when i click the currency button it stayes. thats not what is smart lets so just hover
bottun only"*.

## The bug
`Menu.Trigger` carries `openOnHover`. Base UI distinguishes a **hover-opened** menu from a
**click-opened** one: the first closes when the pointer leaves, the second is pinned open until
an outside click or Escape. Pointing at the dollar and then clicking it — the obvious thing to
do — silently promoted the menu to click-opened, and from then on moving the pointer away did
nothing. That is the "it stays".

## Why it is not literally hover-only
A hover-only trigger would repeat §10.25 — the filter dropdowns that were unreachable on every
Apple device for as long as they existed. `CurrencySwitcher` renders inside `hidden lg:flex`
(`Header.tsx`), so a phone never sees it and `MobileNav` carries its own currency rows. But an
**iPad in landscape is 1366px**: it gets the full desktop header and has no hover at all.

So the press is swallowed only when `pointerType === 'mouse'`. A tap reports `'touch'` (a stylus
`'pen'`) and passes through, so tap-to-open still works. On a mouse the menu is never promoted:
hover opens, moving away closes, the click is inert — the behaviour asked for.

## What changed
- `components/CurrencySwitcher.tsx` — `onPointerDown` guard on the trigger; refreshed the stale
  comment that described a "Styles" menu removed earlier today.
- `scripts/interaction-audit.mjs` — three fixes, below.

## A rejected first attempt, recorded so it is not retried
Controlled `Menu.Root`, dropping any close whose `details.reason === 'trigger-press'`. It made
the click harmless but left the menu **click-promoted**, so hovering away still would not close
it — i.e. it preserved the exact complaint while passing a naive "does the click close it?"
check. The probe caught it. Do not go back to it.

## Three defects found in the audit harness itself
1. **The currency check had never run.** Its locator was `header button` filtered by
   `hasText: /GBP|USD|EUR|Native|Brand/`. The trigger renders `{preference ?? null}`, so on the
   default "As listed" setting it has **no text**; the filter never matched and the section
   logged `skipped (not present at this width)` at every width, on every run. Now matched on
   `aria-label`, which exists in both states.
2. **The reporter could not see a failing check.** It builds its output from a hard-coded list
   of keys and prints `ok` when none match — so the new assertions, which set `PROBLEM`, passed
   silently on code that had the bug. Verified: the first negative control reported `ok` on the
   unfixed component. A generic `if (r.PROBLEM) bits.push(r.PROBLEM)` now surfaces any check.
   This is §10.26 — the harness lying — reproduced inside the harness built to catch it.
3. **No viewport covered touch at >=1024px.** `tablet-819` is touch but below the `lg`
   breakpoint, so the desktop header is not there; `desktop-1440` is >=1024 but not touch. The
   iPad-landscape combination that §10.25 is *about* was untested. Added `ipad-1366`
   (1366x1024, touch).

## Verification

Negative control — old component, fixed reporter:
```
currency-menu-open   desktop-1440  chromium  CLICK CLOSED IT — hover and click are fighting
```
Positive control — new component, both engines:
```
currency-menu-open   ipad-1366     chromium  ok
currency-menu-open   desktop-1440  chromium  ok
currency-menu-open   ipad-1366     webkit    ok
currency-menu-open   desktop-1440  webkit    ok
```

Standalone probe (kept in the session scratchpad as `currency-probe.mjs`), against a production
build in an isolated worktree:
```
PASS  desktop: menu starts closed
PASS  desktop: hover OPENS the menu
PASS  desktop: click does not close it
PASS  desktop: after a CLICK, moving away still closes it (not pinned)
PASS  desktop: plain hover-out closes it
PASS  ipad/webkit: trigger present at 1366px
PASS  ipad/webkit: TAP opens the menu (§10.25 guard)
7/7 passed
```
The same probe on the unmodified component: `5/7`, failing *after a CLICK, moving away still
closes it* with `PINNED OPEN — this is the reported bug`. Note the two harnesses characterise
the same root cause slightly differently (the audit sees the click close it, the probe sees it
pinned); both fail on the old code and pass on the new.

`npx tsc --noEmit` exit 0 · `npx eslint components/CurrencySwitcher.tsx scripts/interaction-audit.mjs` exit 0.

## Notes / follow-ups
- **Not committed** — awaiting Tina.
- **The first probe run was worthless and looked authoritative.** `npx next start -p 3177`
  failed with `EADDRINUSE` (another session owns that port), so the probe drove *that* server,
  whose `.next` this session's `npm run build` had just overwritten — chunks came back 500 with
  `text/plain`, React never hydrated, and all six assertions "failed" against a page with no
  JavaScript. Two lessons, both already in §10: check the thing you started actually started,
  and assert the page is *interactive* before believing an interaction result. The probe now
  refuses to report unless a known-good control (the Products nav menu) opens on hover.
- **This session's `npm run build` in the shared checkout probably disrupted the other
  session's dev server**, since both share `.next`. All later builds were done in a separate
  worktree with hardlinked `node_modules`. Worth treating as the default for any build here
  while a second session is live.
- The added `ipad-1366` viewport makes `npm run audit:interaction` 33% longer (4 viewports x 2
  engines). Reasonable for closing the §10.25 blind spot, but worth knowing.
