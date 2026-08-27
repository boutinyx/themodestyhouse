# The desktop header was shown 242px below the width it needs
**Date:** 2026-08-27 · **Status:** done

## Goal
Follow-up to `2026-08-27-nav-tap-on-hover-capable-tablets.md`, whose "Notes / follow-ups"
recorded a horizontal overflow at 1024px found while measuring the nav fix. Tina: *"do what
is important."* This is that.

## What was wrong

The header row was rendered from `lg` (1024px). **It needs 1266px.**

Measured by summing the three groups at a width where none of them is compressed, plus
gaps plus padding:

```
                          logo   nav   utility   gap  pad   MIN VIEWPORT
shipped                    163   741     234      24   80      1266px
```

So it had been shown up to 242px below its own minimum, on every tablet in landscape.
Two distinct symptoms, and the second is why it went unnoticed:

1. **1024–1143: the row overflowed.** `document.documentElement.scrollWidth` was 1144 at a
   1024 viewport — 120px of sideways scroll, with search, favourites and the currency
   switcher pushed off the right edge.
2. **1024–1265: the wordmark absorbed the difference.** Flex compressed the logo link from
   163px to 92px, at which point "The Modesty" wrapped a second time and **painted 34px
   outside its own box, over the word "Clothing"** — a 10px overlap. Nothing overflowed, so
   no overflow check could see it; the glyphs were simply drawn outside their parent.

That second one is the interesting failure. Above 1143 the page looked fine by every
automated measure precisely *because* an element was being crushed, and the crushing is
what kept the total inside the viewport.

## What changed

**A breakpoint of its own for the header** — `--breakpoint-hdr: 1152px`, in the `@theme`
block of `app/globals.css`. Not `lg`, because this is a different question from every other
`lg:` on the site: "does this row physically fit" is measurable, not chosen. 1152 rather
than 1122 leaves 30px of slack, so a font that loads slightly wide or a label that gains a
character cannot silently put the row back into the compressed state.

**Tightened spacing below `xl`**, which is what brings the minimum down from 1266 to 1122:

```
                          logo   nav   utility   gap  pad   MIN VIEWPORT
shipped                    163   741     234      24   80      1266px
with the <xl tightening    163   669     234       8   40      1122px
```

`px-5` / `gap-2` on the row, `gap-4` on the nav list, `gap-3` on the utility cluster —
each restored to its shipped value at `xl` (1280px), so the desktop header Tina designed is
byte-identical from 1280 up. Only 1152–1279 runs tightened.

**The wordmark can no longer be compressed** — `shrink-0` on the logo link, plus
`whiteSpace: nowrap` on the span. The `<br />` still makes the two lines; nothing else may.

**Four things that were keyed to the same 1024 decision moved with it**, because each one
describes the header rather than merely sharing a number:

- `components/Header.tsx` — all nine `lg:` on the header row → `hdr:`.
- `components/MobileNav.tsx` — the `matchMedia('(min-width: 1024px)')` that closes the
  drawer on the way up → 1152. Its own comment already said the two are one decision in two
  places; this is the third time it has moved and both halves went together.
- `components/HeroBrandStrip.tsx` + the `@media` in `globals.css` that zeroes
  `--band-height` and sets `--header-height: 89px`. Left at 1024, the band would have
  vanished at 1024 while the phone header it belongs to ran to 1151, and `.hero-vh` would
  have pulled the homepage photograph up by a desktop header's height across that whole
  band.
- `components/HeaderSearch.tsx` — the `MobileSearchRow`. **This one was missed on the first
  pass and caught by the audit**; see below.

**Deliberately NOT moved:** `.hero-h1`'s size clamp, the hero overlay split in
`app/page.tsx`, and `.edit-story-text` / `.edit-rail-item` all break at 1024 too. Those are
hero and editorial typography decisions that happen to share the number; none of them is
about which header is shown.

## What the audit caught, that I had missed

Adding `ipad-1024` to `scripts/interaction-audit.mjs` — the width whose behaviour this
change alters — immediately reported, in **both** engines:

```
header-search-typed        ipad-1024     chromium  SEARCH FIELD DID NOT OPEN
header-search-typed        ipad-1024     webkit    SEARCH FIELD DID NOT OPEN
```

`MobileSearchRow` still carried `lg:hidden` while the magnifier that opens it had moved to
`hdr:hidden`. From 1024 to 1151 the trigger was visible, tapping it set the state, and the
row it opens was `display: none`. A trigger and the thing it opens are one decision; the
grep that found the other four `lg:` occurrences was over `components/Header.tsx` and this
one lives in a different file.

Two viewports were added in this commit, both at widths the change creates:
`ipad-1024` (interaction audit — the only viewport there that exercises the drawer at a
tablet width) and `desktop-1152` (visual audit — nothing else sat between 1024 and 1280, so
the entire band where the header runs on its tightened spacing was unrendered).

## Verification

**A dedicated header harness, 15 widths × 2 engines**, asserting four things per width: no
horizontal overflow, the correct nav for that width, the wordmark inside its own box, and
the wordmark on exactly two lines.

```
local build (fixed)      ALL HEADER CHECKS PASSED
production (unfixed)     24 FAILED
```

The production failures are the defect, stated by the same harness:

```
FAIL chromium 1024  no horizontal overflow (got 120px)
FAIL chromium 1100  no horizontal overflow (got 44px)
FAIL chromium 1133  no horizontal overflow (got 11px)
FAIL chromium 1152  wordmark inside its own box, not over "Clothing" (overhang=10px)
FAIL chromium 1152  wordmark on exactly 2 lines (got 3)
FAIL chromium 1180  wordmark inside its own box, not over "Clothing" (overhang=10px)
```

**Two of that harness's own checks were wrong first, and both read as site defects**
(§10.26). `desktopNav` used a bare `querySelector`, which finds the desktop nav at 390px
because `hidden hdr:flex` leaves it in the DOM — so it reported "drawer not shown" at every
mobile width. And the line counter counted `Range.getClientRects()` rects, which returns
one per text node plus a zero-width one for the `<br>` — three rects for two visible lines,
at every width including 1920 where the wordmark has always been two lines. 30 failures,
none of them real. Both were fixed and only then did the negative control above mean
anything.

**`npm run audit:interaction`** — 5 viewports × 2 engines: **0 problems**.

**`npm run audit:mobile`** — `overflowing 0/9 | stacked text 0 | broken aspect 0` in both
engines. One `color-contrast` violation, which **the identical run against production also
reports**, so it predates this and is not chased here.

**`npm run audit:visual`** — 286 renders, 8 viewports, both engines: **`overflow 0`
everywhere**, `aspect 0`, `img 0`, `no-css 0`.

Desktop reports `overlap` and `a11y` counts, and they are pre-existing. Like-for-like at
`desktop-1440 / chromium`: **production 198 overlap / 23 a11y, this build 176 / 23** — no
worse, slightly better. They are the four `wide` nav panels, which are all mounted at once
at the same position and cross-fade on `opacity` (deliberate, documented in `NavMenu.tsx`);
the collision check compares rects and cannot see that three of the four are transparent.
One `errors 1` in the full parallel run did not reproduce in an isolated re-run of the same
viewport and engine — a harness artifact under five parallel contexts, §10.26 again.

`npx tsc --noEmit` exit 0 · `npx eslint` exit 0 · `npm test` 901 passed.

## Notes / follow-ups

- **CLAUDE.md §4's "CLEAN" claims for `audit:visual` and `audit:mobile` are stale** and are
  corrected in the same session. `audit:visual` has not been `0 overlap` since the
  always-mounted wide nav panels landed on 2026-08-21, and `audit:mobile` has one
  `color-contrast` violation on production today. Neither is a regression; both had been
  recorded as clean and left.
- **Devices this moves to the drawer:** iPad 9.7"/10.2" landscape (1024) and iPad mini
  landscape (1133). **Devices that keep the desktop header:** iPad Air 11" (1180), iPad Pro
  11" (1194), iPad 13" (1366), every desktop. The drawer is a complete nav, so nothing is
  unreachable either way — but 1152 is a number chosen from a measurement, and if Tina
  wants the header lower than that, the only way down is to spend the difference on the
  typography: the tightest gap-only profile still needs 1086px, and reaching 1024 needed
  `.nav-link` letter-spacing at 0.06em against its designed 0.14em.
