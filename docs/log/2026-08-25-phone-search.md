# Phone search — a magnifier in the header, opening a full-width bar beneath it
**Date:** 2026-08-25 · **Status:** done

## Goal
Tina: *"were missing a search on phone and i want it to open like this"*, with a
screenshot of aabcollection.com's phone header — hamburger and magnifier on the left,
and, once the magnifier is tapped, a full-width cream bar directly under the header
carrying a close cross on the left and one wide `SEARCH…` field across the rest.

There was genuinely no search on a phone at all: `HeaderSearchTrigger` /
`HeaderSearchField` are both `hidden lg:flex`, and `MobileNav`'s panel carries currency
and navigation but no field. The only phone-reachable search was `HeroSearch`, on the
homepage, below the fold.

## What changed
**`components/HeaderSearch.tsx`** — two new exports:
- `MobileSearchTrigger` — the 24px magnifier, sized to match the hamburger beside it.
  Carries `aria-expanded`, which is the whole reason it is a component rather than
  inline JSX: `Header`'s MutationObserver reads that attribute to set
  `data-menu-open`, and that is what forces the over-hero header back to solid
  parchment so the bar below reads as one continuous block rather than a cream slab
  hanging off a transparent bar.
- `MobileSearchRow` — the bar. `absolute top-full inset-x-0`, **not** a second row in
  the header's flow. That is load-bearing: `--header-height` is measured off the
  header's real rendered height by a ResizeObserver, and `.hero-vh` pulls the homepage
  photograph up by exactly that number — a row in the flow would yank the hero up 64px
  on every tap of search and drop it back on close. Measured with it open:
  `--header-height` is unchanged at `89px`.

  Submits to `/directory?q=` — the same destination as the desktop field and
  `HeroSearch`, so all three land on identical results. `type="search"` +
  `enterKeyHint="search"`; `fontSize: 16` rather than the desktop field's 14, because
  iOS Safari zooms the page when a focused input is under 16px and there is no way back
  out of that zoom except pinching.

**`components/Header.tsx`** — `mobileSearchOpen` as its OWN state, not the existing
`searchOpen` at a different breakpoint. A shared flag would mount both fields at once
(the desktop one is only `hidden lg:flex`, i.e. present in the DOM below `lg`) and both
focus on mount, so opening search on a phone would hand the caret to an invisible
field. Both states reset on the existing route-change adjustment.

**`app/globals.css`** — `@keyframes mobile-search-drop`, a `clip-path` reveal rather
than a `translateY`, so the bar appears to slide out from behind the header instead of
flying up through it (the header row is not painted above it). `animation`, not
`transition`, for the same reason the desktop field's is — a conditionally-rendered
element never transitions on its own initial mount. Reduced-motion opt-out.

Copy is one functional word, `Search…`, matching the reference's own bar (§10.18 — no
invented voice). The desktop field's longer `Search dresses, abayas, hijabs, brands…`
truncates mid-word at 390px.

## Verification
`npx tsc --noEmit` — clean. `npm run lint` — clean (exit 0). `npm test` — 48 files,
781 tests passed.

Playwright, Chromium, iPhone 13 (390x844, `hasTouch`), real `.tap()` on the trigger,
against the running dev server. Stylesheet-loaded assertion first (§10.24/§10.26):
`.site-header` computes `position: sticky` — CSS is up.

```
css loaded: true
formPresent  true
headerRect   [0, 40, 390, 89]
formRect     [0, 128, 390, 64]      <- flush under the header, full width
headerVar    "89px"                 <- UNCHANGED with the bar open
focused      true                   <- caret lands in the field
menuOpen     "true"   overHero "true"
headerBg     rgb(250,247,241)  formBg rgb(250,247,241)   <- one parchment block
elementFromPoint(200, bar centre)   header-search-input|INPUT
elementFromPoint(28,  bar centre)   button[aria-label="Close search"]
```

`elementFromPoint` rather than a Playwright visibility check, per `MobileNav`'s own
note: Playwright auto-scrolls before tapping, which hides exactly the failure a real
finger hits.

Screenshot at 390x844 matches the reference's arrangement.

### On staging — BOTH engines
`https://themodestyhouse-staging-production.up.railway.app/`, commit `264cbea`
(asserted an ancestor of `origin/staging` with `git merge-base --is-ancestor`, not just
a clean push exit code — §10.17 rule 2). 390x844, `hasTouch`, real `.tap()`:

```
chromium css: true  triggers: 1
{"formPresent":true,"headerBottom":129,"formTop":128,"formW":390,"formH":64,
 "focused":true,"headerHeightVar":"89px","headerBg":"rgb(250, 247, 241)",
 "formBg":"rgb(250, 247, 241)","inputFontSize":"16px",
 "atInput":"INPUT.header-search-input","atClose":"Close search"}
chromium submitted -> .../directory?q=linen%20dress | bar gone: true

webkit   css: true  triggers: 1
{"formPresent":true,"headerBottom":129,"formTop":128,"formW":390,"formH":64,
 "focused":true,"headerHeightVar":"89px","headerBg":"rgb(250, 247, 241)",
 "formBg":"rgb(250, 247, 241)","inputFontSize":"16px",
 "atInput":"INPUT.header-search-input","atClose":"Close search"}
webkit   submitted -> .../directory?q=linen%20dress | bar gone: true
```

WebKit matters here specifically, not as box-ticking: every iPhone browser is WebKit
(§10.24), and §10.25's hover-only dropdown is the standing example of a header control
that worked everywhere except the device it was for. `headerBottom: 129` /
`formTop: 128` is the bar sitting flush under the header with the 1px border between
them; `headerHeightVar` unchanged at `89px` in both engines is the hero-shift concern
measured, not assumed.

WebKit could NOT be verified locally — against `next dev` it loops on `element was
detached from the DOM, retrying` (HMR reloading under it, the documented §10.24 trap),
and a local production build was off the table because two other sessions are live on
this working tree and `.next` is shared (§10.28 rule 4). Staging is what settled it,
which is the protocol working as intended rather than a workaround.

## Follow-up, same day — icon size and left-cluster spacing (`6f7f08d`)
Tina: *"make the icon a bit smaller like the heart and put it a bit more to the left
giving some space to the hamburger"*.

The size half is unambiguous: 24 -> **20**, the literal number `favourites(20)` uses on
this row, so the two utility glyphs at either end of the phone header now match.

The spacing half is not — "more to the left" and "space to the hamburger" pull opposite
ways, since the hamburger is what sits to the left of the magnifier. Rather than guess
(§10.29: when a request admits two readings, name them and ask), she was shown three
concrete arrangements and picked **hamburger nearer the edge AND a wider gap**:
`-ml-1.5` on the cluster plus `gap-1` -> `gap-4`. The negative margin is on the CLUSTER,
not the row's `px-4`, so the favourites heart at the other end keeps its 16px gutter.

The search bar's close cross moved with it (`marginLeft` -10 -> -16). Those two numbers
are one decision written in two files; the comment in each now says so.

Measured on staging, 390px, **both engines, identical**:

```
chromium css: true {"hamburger":{"x":10,"w":24},"search":{"x":52,"w":20}}
chromium open: {"closeX":10,"hamburgerX":10,"formTop":128,"formH":64,"focused":true}
webkit   css: true {"hamburger":{"x":10,"w":24},"search":{"x":52,"w":20}}
webkit   open: {"closeX":10,"hamburgerX":10,"formTop":128,"formH":64,"focused":true}
```

Hamburger glyph 16px -> 10px from the edge, magnifier 44px -> 52px, and the close cross
lands on the hamburger's exact x — the two rows share one left edge.

**Harness note (§10.26):** the same probe reported the favourites heart at a zero-width
rect, which read like the heart had vanished. It had not. `document.querySelector` takes
the FIRST match, and the desktop `favourites(17)` instance precedes the mobile one in
DOM order — it is `display: none` below `lg`, hence the zero rect. The heart is plainly
present in the screenshot. Nothing about it was measured by this run, and nothing about
it changed.

## Second follow-up, same day — the hamburger back on the row's gutter
Tina, on the commit above: *"the burger is a bit to close to the left edge can you fix
that look at the heart on the right"*. The `-ml-1.5` came off; `gap-4` stayed.

The instruction names the heart as the reference, and the two are **different Phosphor
glyphs**, so box symmetry is not ink symmetry and matching the boxes would have been the
wrong measurement. Measured from the viewBoxes rather than guessed:

- `Heart` draws x=24..232 of a 256 viewBox — ~1.9px of inset at 20px. Its SVG box ends
  18px from the right edge, so its INK stops **19.88px** in.
- `List` draws its bars x=40..216 of 256 — ~3.75px of inset at 24px. On the row's plain
  `px-4` gutter its box starts at 16px, so its ink starts **19.75px** in.

0.13px apart. That is why the answer is "remove the negative margin", not "nudge it a
bit": the untouched gutter already matches the heart optically, and any hand-tuned
offset would have moved it AWAY from her reference.

Verified on staging, **both engines, identical**:

```
chromium {"burgerBoxX":16,"heartBoxInsetRight":18,"burgerInkLeft":19.75,
          "heartInkRight":19.88,"magnifierX":58,"gapBetweenGlyphs":18}
chromium open: {"closeX":16,"hamburgerX":16,"formTop":128,"formH":64,"focused":true}
webkit   {"burgerBoxX":16,"heartBoxInsetRight":18,"burgerInkLeft":19.75,
          "heartInkRight":19.88,"magnifierX":58,"gapBetweenGlyphs":18}
webkit   open: {"closeX":16,"hamburgerX":16,"formTop":128,"formH":64,"focused":true}
```

The close cross followed the hamburger back (`marginLeft` -16 -> -10) and lands on
x=16, the same left edge.

## Notes / follow-ups
- `scripts/interaction-audit.mjs` has no check for this yet. It should get one —
  "tap the phone magnifier, assert the bar exists below the header and the input is
  focused" — with a negative control run first (§10.28 rule 1).
