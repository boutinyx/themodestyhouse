# Header runs over the hero — transparent, dark wash, faded bottom edge
**Date:** 2026-08-22 · **Status:** done

## Goal
Tina: *"make sure the hero image spans behind the header & it gets transparent
but make the header have a darker overlay so the buttons are visible. also, at
the bottom of the header, add a small fade in overlay so the overlay isn't sharp
at the bottom."*

This **supersedes** the standing decision recorded in `components/Header.tsx` on
2026-08-21 — *"i want the header like this allt hte time so no transparent"* —
for the top of the homepage only. The comment there was rewritten rather than
left contradicting the code.

## What changed

**The photograph now runs behind the header** (`app/globals.css`, `.hero-vh`).
The header is still `sticky`, so it still takes its own height out of the flow at
the top of the page; the hero is pulled up by exactly that height instead:

```css
height: 100svh;                                   /* was calc(100svh - var(--header-height)) */
margin-top: calc(-1 * var(--header-height));      /* new */
```

`sticky` was kept over `fixed` deliberately: this way the change is to one page's
first element, not to how every page's first element is positioned.

**Two header states, and the second is not optional.** A header that stayed
transparent everywhere would put near-white nav text on the parchment body of
every other page, and on the homepage the moment you scroll past the hero. So
`Header.tsx` carries `overHero`, true only while a `[data-hero]` element still
reaches past the bottom of the header:

- measured from the hero's own `getBoundingClientRect()` on scroll, **not**
  against a viewport-height constant — the hero is `100svh` with a `min-height:
  560px` floor, and those two disagree on a short window, which is exactly where
  a constant would flip the header at the wrong scroll position;
- rAF-throttled, passive listener;
- the first measurement is *scheduled*, not run inline: `setState` in an effect
  body fails `react-hooks/set-state-in-effect`, which is an error in this repo's
  lint config, and a frame's delay also lets layout settle after a client-side
  navigation;
- initial value is `pathname === '/'` **as a first-paint guess only** — starting
  `false` there put a solid parchment bar in the server HTML that flipped a frame
  later, a visible flash on the most looked-at surface. The effect overrules the
  guess immediately, so a hero added to another page still works.

**Colour flips through three custom properties, not a pile of overrides.**
`--header-fg` / `--header-muted` / `--header-rule` are declared on `.site-header`
and redefined under `.site-header[data-over-hero="true"]`. This shape is forced,
not stylistic: several of these colours are set **inline** in `Header.tsx` (§6's
own convention), and an inline declaration beats any stylesheet rule that is not
`!important` — so the only way CSS can flip them is for the inline value to be a
`var()`. The wordmark and the utility divider were changed to read them.

**The crest** is a single dark aubergine mark on transparency and vanished into
the photograph. `filter: brightness(0) invert(1)` under `[data-over-hero]` lifts
it to white — one filter rather than a second asset that could drift out of step
with the wordmark beside it.

**The wash and its fade.** The darkening layer is a separate absolutely
positioned child, **not** the header's background, because it has to extend below
the header's bottom edge and fade out there — a background cannot paint outside
its own box. `bottom: -28px` gives it that strip; the gradient holds its darkness
to 72% of its height (the header itself) and then runs to fully transparent
across the strip, so there is no visible edge. `pointer-events-none` and `z-0`
against the content row's `z-10`.

`HeaderSearch` already had a `dark` prop; it is now passed `overHero`.

Files: `app/globals.css`, `components/Header.tsx`, `app/page.tsx` (the hero div
gains `data-hero` — an attribute rather than an id or class so it cannot be
mistaken for a styling hook and quietly renamed, §10.29's rename trap).

## Verification
- `npx tsc --noEmit` → exit 0. `npm run lint` → exit 0 (it caught the
  `set-state-in-effect` error above, which was fixed rather than suppressed).
- Playwright, Chromium 1440x820: header transparent with the wash at the top of
  `/`; **solid parchment with dark text after scrolling 1200px**; **solid on
  `/directory`**, which has no hero. No console errors on any of the three.
- Chromium 390x844: hamburger, crest and heart all legible white over the photo.
- Geometry probed rather than eyeballed, at 390 and 1440:
  `--header-height` 53.5 / 89 exactly matching the real rendered header, hero
  `top: 0` and `height === window.innerHeight` at both.
- **WebKit** (iPhone 13) with HSTS + `upgrade-insecure-requests` stripped the way
  `scripts/mobile-audit.mjs` does — the first WebKit run rendered with no CSS at
  all, which is §10.24's trap, not a defect, and was confirmed as such by
  asserting the computed body font (`Jost…`, not Times) before trusting a single
  number. With CSS loaded: `data-over-hero="true"`, header top 0, hero height ===
  `innerHeight`. Hero top read -0.97px against Chromium's 0 — device-pixel
  rounding at DPR 3, i.e. one pixel of photograph clipped, not a gap.

## Notes / follow-ups
- `npm run audit:interaction` and `npm run audit:visual` were **not** run: both
  want a production build and `.next` is shared with another live session
  (§10.28 rule 4). Worth a pass before this ships, particularly
  `nav-dropdown-open`, since the header's colour now depends on scroll state.
- The scroll-driven solid/transparent switch is an addition Tina did not ask for
  in words. It is stated plainly in the reply to her; without it the nav is
  invisible on every non-hero surface.


## Second pass — reveal on hover
Tina: *"i want when you hver over header it becomes visile again."* The
transparent state is now `overHero && !hovered && !menuOpen`.

**Two independent reasons to reveal, tracked separately.** The first cut used a
single `revealed` flag that both the pointer and the menu wrote to, and it
**latched**: when the dropdown closed, that update could not tell whether the
`true` it was about to clear had come from the menu or from the pointer, so it
left the header solid forever. Caught before it shipped, but it is the same
shape as §10.34 — two state machines sharing one flag.

**Why the menu half is needed at all.** Base UI portals the nav popups to
`<body>`, so moving the pointer off "Clothing" and down into its own panel is a
`mouseleave` on the header. Without this the header would drop back to
transparent *underneath its own open dropdown*. Watched with a MutationObserver
on the header for the `aria-expanded` / `data-popup-open` attributes Base UI sets
on the TRIGGER — which is inside the header, so no portal chasing is needed
(contrast the pointer-geometry machinery §10.34/§10.36 required for the
Outerwear flyout, which genuinely had to reason about portalled DOM).

**Hover is gated on `(hover: hover)`.** On a touch screen `mouseenter` is
synthesised from a tap with no matching `mouseleave`, so the header would latch
solid on the first tap and never return — §10.25's lesson about pointer
affordances, applied before it could become another entry in that section.

`border-color` joined `background` in the transition: over the hero the hairline
arrives at the same moment the fill does, and fading one while hard-switching the
other reads as two separate events.

### Verification
Playwright, Chromium 1440x820, reading `data-over-hero` and the header's computed
`background-color` at each step:

| state | `data-over-hero` | background | trigger expanded |
|---|---|---|---|
| at rest, top of page | `true` | `rgba(0,0,0,0)` | — |
| pointer on the header | `false` | `rgb(250,247,241)` | — |
| pointer on "Clothing" | `false` | `rgb(250,247,241)` | `true` |
| pointer moved INTO the portalled panel, off the header | `false` | `rgb(250,247,241)` | `true` |
| pointer away, panel closed | `true` | `rgba(0,0,0,0)` | `false` |

The fourth row is the one that matters — it is the case the naive
`mouseenter`/`mouseleave` implementation gets wrong. No console errors; `tsc`
exit 0, `npm run lint` exit 0.


## Third pass — smoother, and rebuilt on CSS `:hover`
Tina: *"can you make it smoother"*, then *"https://aabcollection.com/ look at how
they have done it."*

### Smoother: the colours were not animating at all
Sampled mid-transition rather than trusted by eye. At 120ms into a 260ms fade the
header fill was 47% through and **the nav text had already snapped to its final
colour**. Cause: `--header-fg`/`-muted`/`-rule` were *unregistered* custom
properties. An unregistered custom property is an opaque token stream — changing
it recomputes everything downstream instantly, and `transition: color` on the
consumer never fires, because the consumer's own specified value
(`var(--header-fg)`) did not change.

Fixed by registering all three with `@property { syntax: "<color>"; inherits:
true }` and transitioning **the properties themselves** on `.site-header`. Now
the browser interpolates them, and every element reading them comes along for
free — including the ones that set colour INLINE in `Header.tsx`, which no
stylesheet transition can reach. `initial-value` has to be a literal
(`#441943`), not `var(--aubergine)`: a registered property's initial value must
be computationally independent.

Re-sampled at the same point, everything now moves together at ~55%:

| | rest | mid-flight | settled |
|---|---|---|---|
| header fill | `rgba(0,0,0,0)` | `rgba(250,247,241,0.553)` | `rgb(250,247,241)` |
| wash opacity | `1` | `0.448` | `0` |
| crest filter | `brightness(0) invert(1)` | `brightness(0.552) invert(0.448)` | `none` |
| nav link | `rgba(251,250,246,0.8)` | `rgba(172,165,154,0.91)` | `rgb(121,110,94)` |
| wordmark | `rgba(251,250,246,0.95)` | `rgba(148,123,145,0.976)` | `rgb(68,25,67)` |

The wash also stopped being conditionally rendered — a mount/unmount cannot be
transitioned, and it was the one part that snapped while everything around it
eased. It is now always present while there is a hero, and fades on `opacity`.

### Rebuilt on CSS `:hover`
The React `onMouseEnter` version worked in Chromium and **could not be verified
in WebKit at all**: a raw `mousemove` listener attached to the header saw *zero*
events while `elementFromPoint(700,44)` resolved correctly to the nav `<ul>`.
That is Playwright's headless WebKit not delivering synthetic mouse events, not a
site defect (§10.26: ask what the harness would have to be doing wrong) — but an
unverifiable mechanism is not one to ship when a verifiable one exists. Real
`:hover` needs no JS and no mechanism verification, guarded by
`@media (hover: hover)` so Safari's sticky tap-hover cannot latch the header
solid over the photo on a phone.

`menuOpen` stays in JS — a nav panel must reveal the header on TOUCH too, so that
selector lives outside the hover media query.

**One specificity trap, caught by measuring:** with the state styling moved to
CSS, the header still carried `style={{ background: 'var(--parchment)' }}`, which
outranks `.site-header[data-over-hero="true"] { background-color: transparent }`.
It measured as `data-over-hero="true"` with `backgroundColor rgb(250,247,241)` —
i.e. the transparent state silently did nothing. `Header.tsx` now sets **no style
prop at all**; fill, border and colour are entirely in globals.css.

### What aabcollection.com actually does
Inspected live rather than described from memory. Their `<sticky-header
class="header white">` wraps a `.header__main`:

| | `.header__main` background |
|---|---|
| at rest over the hero | `rgba(0,0,0,0)` — fully transparent |
| pointer on the nav row | `rgb(244,242,234)` — solid cream |

So the model Tina is pointing at is the one now built: transparent over the
photo, solid fill on hover, dark type. Two differences, both deliberate:

1. **They have no darkening wash.** Their hero carries a heavy red tint, so plain
   white type reads against it. Ours is a lit chandelier corridor with bright
   patches at the top, and Tina asked for the wash explicitly ("make the header
   have a darker overlay so the buttons are visible"). Kept.
2. **Their dropdown panel shares the header's fill** (`rgb(244,242,234)`), so bar
   and mega-menu read as one sheet. Ours is `#fff` against a `--parchment`
   header. Not changed — it would affect the dropdown on every page, which is
   outside this ask — but it is the one visible difference if she wants it
   matched.

### Verification
`tsc` exit 0, `npm run lint` exit 0. Chromium 1440x820, reading the header's
computed style at each step: rest `rgba(0,0,0,0)` / wash 1 / nav
`rgba(251,250,246,0.8)`; hovered `rgb(250,247,241)` / wash 0 / nav
`rgb(121,110,94)`; pointer away, back to rest exactly. No console errors.
