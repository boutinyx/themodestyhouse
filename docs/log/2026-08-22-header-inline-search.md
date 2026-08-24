# Header search: inline in the header row, not a floating pill
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina, with a screenshot of the header's "SEARCH" control: *"when you lcik searchbar
i want it to not be the pill anymore and instead show up inside the header"*.

The control opened a 260px rounded pill panel, absolutely positioned under its own
trigger with a drop shadow — an object floating over the page. She wants the field to
be part of the header row itself.

## What changed

**`components/HeaderSearch.tsx`** — rewritten. One default export became two:
- `HeaderSearchTrigger` — the icon+label control in the utility cluster. It now
  toggles, swapping to an X + "Close" while open, so there is a visible way out on a
  touch device (Escape is not discoverable).
- `HeaderSearchField` — the field itself, a plain `<form role="search">` with the
  magnifier, a borderless input and a "Go" submit. No `position`, no border-radius, no
  box-shadow, no portal. A single `1px solid var(--header-rule)` underline is all the
  chrome it has.

The old outside-`pointerdown` closer is gone — the field is part of the row rather
than an overlay, and a pointerdown closer would have raced the toggle button's own
click and reopened it. Escape and the toggle are the two ways to close.

The input is uncontrolled (read from the ref on submit) rather than `useState` per
keystroke: the header carries the scroll listener, the ResizeObserver, the
MutationObserver and the whole nav, so re-rendering it on every character was worth
avoiding once the field moved inside it.

The `dark` prop is gone. Text and rule now use `var(--header-fg)` /
`var(--header-rule)`, which the over-hero mode already drives.

**`components/Header.tsx`** — owns the open state, because the two halves live in two
different places in the row: trigger on the right, field in the nav's slot in the
middle. The field **replaces** the nav rather than stacking under it, which is what
keeps the header's height unchanged — `--header-height` is what `.hero-vh` pulls the
homepage photograph up by, so a header that grew on open would shove the hero every
time it was used.

A route change closes it, written as a during-render state adjustment rather than an
effect on `pathname`: eslint's `react-hooks/set-state-in-effect` fails the build on the
effect version (confirmed — see Verification).

**`app/globals.css`** — one rule, `.site-header .header-search-input::placeholder`.
It exists only because `::placeholder` cannot be set from an inline style; it uses
`currentColor` so it tracks `--header-fg` in both header modes.

## Verification

`npx tsc --noEmit` — exit 0. `npx eslint components/Header.tsx components/HeaderSearch.tsx`
— exit 0 (it failed first on the effect version of the route-change close; the
during-render form is what made it pass).

`npm run build` — 32 routes, clean. Served on :3211 and driven with Playwright at
1440x900 (stylesheet asserted loaded first — `.site-header` computed `position: sticky`
— before any measurement, per §10.24/§10.26):

```
home  hasInput true  focused true  formInsideHeader true
      formPosition static   formBorderRadius 0px   formBoxShadow none
      inputColor rgb(68, 25, 67)   navVisible false
      headerRect height 89   --header-height 89px
home after submit -> /directory?q=linen%20dress   searchStillOpen= false
dir   (identical)
escape closes = true
toggle closes = true
```

So: no pill (radius 0, no shadow), not positioned (`static`), genuinely inside the
header element, header height unchanged at 89px open or closed, and over the hero the
text resolves to aubergine rather than near-white — the trigger's `aria-expanded` is
what `menuOpen` watches, so the header has already gone solid by the time the field
renders.

Element-scoped header screenshots at 1440 confirm it by eye: closed row unchanged
(crest, nav, Search/heart/USD), open row is crest + underlined full-width field +
GO + CLOSE + heart + USD.

`npm test` — 1317 passed, 2 failed. Both failures are in
`.claude/worktrees/jiggly-hugging-honey/` (another session's worktree —
`aboutStats.test.ts`, `devOnly.test.ts`), untouched by this change.

## Notes / follow-ups

**`npm run audit:interaction` has three checks that are currently dead, and none of
them are about this change** — established before blaming it (§10.38 rule 1), by
probing the running build directly:
- `nav-dropdown-open` and `outerwear-flyout` both locate the header's dropdown by the
  text **"Products"**. The nav groups were renamed to Clothing / Hijabs / Basics /
  Designers on 2026-08-21. Measured: `header Products text count 0`, actual labels
  `['Clothing','Hijabs','Basics','Designers','Editorial','About', …]`. Both report
  `skipped (desktop nav hidden at this width)` at desktop-1440, where the nav is
  plainly visible — the exact §10.32 shape, third occurrence.
- `hero-search-typed` clicks `.glass-search input` and times out at every viewport in
  both engines. Measured on the homepage: `glass-search count 0` — `HeroSearch` is not
  rendered there at all any more. The check has nothing to click.

All three point at UI that other in-flight work on this branch removed or renamed.
Fixing them is a separate job from this one and is left open deliberately rather than
folded in silently; flagging it here so it is not mistaken for a regression from the
header search.

Also seen: `HORIZONTAL OVERFLOW` at `tablet-819` in WebKit across several checks. Not
this change either — the field is `hidden lg:flex`, so at 819px it does not render.

**Mobile is untouched.** Search on phones still lives inside `MobileNav`'s own panel;
this control has always been `lg:` only.
