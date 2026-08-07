# Filter menu: fade off at the bottom, and stop the scroll chaining to the page
**Date:** 2026-08-07 · **Status:** done

## Goal
Two bugs Tina hit on the Brand filter menu:
1. The bottom fade stayed lit after the list had ended, so it still read as
   "there is more below" and she kept scrolling at a list that had finished.
2. Once the list bottomed out, the **page** scrolled underneath the open menu.

## Root causes

**Bug 1 — the fade never knew where the scroll was.** `components/IndexPanel.tsx`
set `data-scrollable={options.length > 7}`. That is a **static** property: it answers
"can this list scroll at all", computed once from the option count. It can never answer
"have we reached the bottom", so the fade — whose entire meaning is *there is more below* —
stayed on at the last row. With ~50 brands the list is 1612px in a 288px window, so the
fade was lit for the whole journey including the end.

**Bug 2 — no `overscroll-behavior`.** `.menu-scroll-list` is a nested scroll container.
When a nested scroller reaches its limit the browser hands the leftover wheel delta to the
document — standard scroll chaining. Nothing in the codebase set `overscroll-behavior`
anywhere (verified by grep), so the page moved as soon as the menu bottomed out.

## What changed

**`components/IndexPanel.tsx`** — `FilterDropdown` now tracks the scroll position:
a `listRef` + `onScroll` handler sets `atEnd` when
`scrollTop + clientHeight >= scrollHeight - 1`, exposed as `data-at-end`. The 1px
tolerance matters: `scrollTop`/`scrollHeight` are fractional on HiDPI displays, so an exact
comparison never becomes true at the bottom. A list that does not overflow counts as
at-end, so no fade appears.

The menu is shown with CSS (`hidden group-hover:block`) and never unmounts, so it keeps its
scroll position between openings; `onMouseEnter`/`onFocus` on the panel re-measure as it
opens, otherwise a menu reopened at the bottom would show a stale value.

**`app/globals.css`**
- `.menu-scroll-list` gains `overscroll-behavior: contain`.
- The `::after` fade moved from `display: none` to `opacity` with a 0.18s transition, and is
  now switched off by **either** `data-scrollable='false'` (too short to scroll) or
  `data-at-end='true'` (already at the last row) — the two cases where "there is more below"
  is untrue. Opacity rather than display so it eases out instead of popping.

## Verification

Measured in headless Chrome against a real `next start` build: open `/directory`, hover the
Brand chip, read the computed `::after` opacity, scroll the list to its end, read again.

```
BEFORE  scrollTop 0     dataAtEnd=false  fadeOpacity=1  scrollHeight=1612 clientHeight=288
AFTER   scrollTop 1324  dataAtEnd=true   fadeOpacity=0  overscroll=contain

fade lit before bottom : true
fade off at bottom     : true
scroll chaining blocked: true
PASS
```

`1324 + 288 = 1612`, so the list was genuinely at its last row.

```
$ npm run lint → 0   $ npx tsc --noEmit → clean   $ npm test → 362 passed   $ npm run build → 34/34
```

Script: `scratchpad/verify-fade.mjs` (not committed).

## Notes

- The first verification run reported nonsense (`scrollHeight: 0`) because the probe used
  `document.querySelector('.menu-scroll')` — every `FilterDropdown` keeps its menu in the
  DOM and only the hovered one is displayed, so it was measuring a `display:none` element.
  Fixed by selecting the menu with `offsetParent !== null`. Worth remembering when probing
  hover menus: the first match is almost never the visible one.
- A second run failed with "site not reachable" because a concurrent session rebuilt `.next`
  out from under `next start`. Rebuilt and re-ran. Concurrent sessions in this repo can
  invalidate a running production server mid-verification.

## Follow-up

Only the Brand menu is long enough to scroll today, but this applies to every
`FilterDropdown` — the fix is in the shared component, so Category, Aesthetic and Occasion
inherit it if their option lists ever grow past the 18rem cap.
