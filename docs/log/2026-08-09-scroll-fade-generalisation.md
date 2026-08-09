# Scroll fade generalised, and given to the phone menu
**Date:** 2026-08-09 · **Status:** done (not committed)

## Goal
Tina: *"for the brand buttons with stroll was added a little fading on the ending so people know
you can scroll. i want that too for all the otuher buttons"*.

## What "all the other buttons" turned out to mean
The fade was never Brand-specific: `.menu-scroll` is in `globals.css` and every `FilterDropdown`
already shared it. It only *shows* on Brand because `data-scrollable` was the static guess
`options.length > 7` and Brand has ~59.

An inventory of every scrollable surface, adversarially verified, found that most candidates do
not scroll at all — `CurrencySwitcher` (no max-height, no overflow), the `NavMenu` Products
dropdown (a 5x2 grid of nine links), `HeroSearch` (no popup exists), the IndexPanel chip row
(`flex-wrap`, never a scroller), the QuickView zoom overlay (`overflow: visible`). Adding a fade
to any of them would signal hidden content that isn't there.

**Measured on production, both engines, iPhone 13 (390x844):**

| Surface | clientH/W | scrollH/W | Hidden | Buttons? |
|---|---|---|---|---|
| `MobileNav` phone panel | 756 | 1024 | **268px, ~5 rows** | yes — 18 rows |
| `EditorsRail` (homepage) | 326 | 3024 | 2698px | no — photographs |

So exactly **one** button surface was missing it: the phone menu, which overflows on every
phone, always, with the scrollbar invisible at rest on iOS.

## What changed
- **`lib/scrollFade.ts`** (new) — pure arithmetic, `{start, viewport, content} -> 'none' |
  'start' | 'end' | 'both'`. Pure because `vitest.config.ts` sets no environment: tests run in
  node with no jsdom, so a hook that measures a live element is untestable, while the decision
  it makes is. Also collapses two hand-rolled copies of this (IndexPanel at 1px tolerance,
  EditorsRail at 8px).
- **`lib/scrollFade.test.ts`** (new) — 9 cases, including the real filter-dropdown geometry and
  the measured MobileNav numbers.
- **`components/useScrollFade.ts`** (new) — the DOM glue. In `components/`, not `lib/`, because
  `lib/` is where the `fs`-backed modules live and Invariant 10 makes "can a client import
  this?" a live question there.
- **`app/globals.css`** — `.menu-scroll` -> `.scroll-fade` / `.scroll-fade-port`, with
  `--fade-to` for the ground colour and `data-fade` for state. Default `opacity: 0`, inverting
  the old rule which painted unconditionally and switched off through negative selectors — so
  every failure mode (JS unwired, attribute mistyped, pre-hydration) previously failed **lit**.
- **`components/MobileNav.tsx`** — a wrapper around the scrolling `<nav>`, `--fade-to:
  var(--parchment)`.
- **`components/IndexPanel.tsx`** — migrated onto the same hook. `data-edges="end"` keeps it
  fading only its bottom, and no `--fade-to` so it keeps the `#fff` default: visually identical.
- **`scripts/interaction-audit.mjs`** — one selector fix, below.

## Two real bugs found on the way
**1. The first version's fade never lit — anywhere.** The hook used a ref object plus an effect.
Both surfaces live inside a portal Base UI **unmounts while closed**, so the effect ran once, on
component mount, when `ref.current` was still null; it returned early and never subscribed.
`data-fade` stayed `"none"` forever. Nothing errored, and "always off" is indistinguishable from
"this list doesn't overflow". Fixed with a **callback ref**, so the subscription follows the
node rather than the component.

**2. Renaming the class silently broke the audit.** `scripts/interaction-audit.mjs:196` queried
`document.querySelectorAll('.menu-scroll')` to decide whether the filter panel opened. After the
rename it found nothing and reported **`PANEL DID NOT OPEN ON TAP` at all four viewports in both
engines**, on a dropdown that opens perfectly. My stale-reference grep had covered
`app components lib` and not `scripts/` — a selector in a script is a reference the compiler
cannot see.

## Verification

`npx tsc --noEmit` exit 0 · `npx eslint components lib` exit 0 · `npm test` **21 files, 416
tests** (was 20/407 — the 9 new ones).

Behavioural probe against a production build in an isolated worktree, both engines
(`scroll-fade-probe.mjs` in the session scratchpad):

```
chromium/webkit  phone menu: fade wrapper exists            PASS
chromium/webkit  at top    -> data-fade="end"               PASS
chromium/webkit  bottom strip is painted                    PASS
chromium/webkit  strip does not eat taps (pointer-events)   PASS
chromium/webkit  fade colour is parchment, not white        PASS
chromium/webkit  at bottom -> data-fade="start"             PASS
chromium/webkit  bottom strip goes dark at the end          PASS
chromium/webkit  mid-scroll -> data-fade="both"             PASS
chromium/webkit  no console/page errors                     PASS
desktop  brand filter: long list -> data-fade="end"         PASS
desktop  brand filter: no TOP fade (data-edges=end)         PASS
desktop  brand filter: bottom fade lit                      PASS
desktop  brand filter: still fades to WHITE                 PASS
22/22 passed
```

Full `interaction-audit.mjs` against the same build, 4 viewports x 2 engines: `mobile-menu-open
ok`, `filter-dropdown-after-tap panel opened (190px)` everywhere, no `PROBLEM` rows. Screenshots
of the panel at top and bottom confirm it reads as intended rather than merely measuring right.

Colour syntax checked rather than assumed: `CSS.supports('background', 'rgb(from #fff r g b /
.5)')` is **true in both engines**, and a white->`transparent` ramp measures
`rgba(125,125,125,.49)` at its midpoint — it darkens through grey, which is why the rule this
replaced spelled out `rgba(255,255,255,0)` and why `rgb(from …)` is used rather than the
`transparent` keyword.

## Notes / follow-ups
- **Not committed.**
- **Two things deliberately left out, pending Tina's call:** `EditorsRail` (a horizontal rail of
  photographs — always scrolled, but not buttons, and it already has arrow controls) and the
  `QuickView` text column (its `overflow-y-auto` pane can clip the "Shop at" pill on short
  phones — a real defect, but a different one from what was asked for). The CSS is vertical-only
  for now; a horizontal axis is a second pair of rules with left/right/width in place of
  top/bottom/height.
- `options.length > 7` was also **wrong**, not just static: a 30px `nowrap` row in a 272px
  content box overflows at 10 rows, i.e. 9 options, so it fired one list early. Now measured.
- Closed an accidental scroller while in there: `overflow-y: auto` makes a `visible` overflow-x
  compute to `auto`, and `.menu-row` is `nowrap`, so a long brand name made the filter list
  horizontally scrollable with the scrollbar hidden and no fade on that axis.
  `overflow-x-hidden` now closes it. Letting the names *wrap* instead is probably the better
  product answer, but it changes how the Brand menu looks, so it is Tina's call.
