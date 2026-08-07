# Mobile + accessibility audit, and the fixes it found
**Date:** 2026-08-07 · **Status:** done

## Goal
"I need the page optimized for mobile" — then "I meant for the whole website".

I had been reasoning about mobile from source, badly: I spent part of a turn making
`BrandMarquee` responsive before noticing Tina had rewritten `/designers` herself and that
the component is no longer rendered anywhere. That work was reverted. Her suggestion —
use Playwright — replaced guesswork with measurement.

## What was added
**`scripts/mobile-audit.mjs`** + `npm run audit:mobile`. Headless Chromium at iPhone 13 size
over 9 routes, reporting the two things source-reading cannot establish:

- **Horizontal overflow**, and *which* elements cause it — every box is measured against the
  viewport, and anything inside an `overflow-x` container is excluded so scroll rails are not
  reported as page defects.
- **axe violations** (wcag2a/2aa, wcag21a/21aa), plus tap targets under the 24×24 CSS px
  floor in WCAG 2.2 SC 2.5.8.

Screenshots and `report.json` land in `.audit/` (gitignored). `BASE=…` points it at
production instead of localhost. Playwright and `@axe-core/playwright` are **devDependencies**
— nothing ships to production.

## Findings and fixes

| | before | after |
|---|---|---|
| pages overflowing horizontally | **0 / 9** | 0 / 9 |
| distinct axe violations | **20** | **0** |
| smallest tap target | **12 px tall** | ≥ 20 px |

**Nothing overflowed.** The site was already mobile-first — `.product-grid` is 2 columns by
default, the category mosaic collapses at 820px, and the viewport meta is correct. The static
audit had suggested as much; Playwright confirmed it rather than leaving it a guess.

**1. `aria-allowed-attr` (critical, all 9 pages).** Base UI's `NavigationMenu.List` renders
`<ul aria-orientation="horizontal">`, and `aria-orientation` is not permitted on a list. Fixed
by overriding the prop to `undefined` — verified in the rendered HTML, since props do not
always win over a library's internals.

**2. `nested-interactive` (serious, 24 nodes per grid page).** `ProductCard` was a
`div[role="button"][tabindex=0]` with the favourites `<button>` inside it — a control nested
in a control, which no screen reader can announce reliably. The two are now siblings: a
transparent button covers the photograph, the heart sits above it on a higher z-index. The
hand-rolled `onKeyDown` for Enter/Space went too, because a real `<button>` does that.

**3. `color-contrast` (serious, 9–41 per page).** `--muted` was `#8a7d6b` = **3.76:1** on
parchment, below the 4.5:1 AA floor, and it is the label colour for the whole site. Darkened
to `#796e5e` — the lightest value on the same hue that clears AA on both parchment (4.67:1)
and bone (4.78:1), so the look moves as little as the standard allows.

Three follow-on causes the audit then exposed:
- `Footer.tsx` **hardcoded `#8a7d6b`** in four places instead of using the token, so it never
  picked the change up.
- Fixing that made the footer **worse**: it sits on `--ink`, where the label colour must go
  *lighter*, not darker (`#8a7d6b` was 4.16:1 there; `#796e5e` was 3.34:1). Added
  **`--muted-on-dark: #a89b8a`** (6.14:1), mirroring the existing `--brass` /
  `--brass-on-dark` split.
- The homepage seal numerals used `--brass` **on the aubergine band** (4.42:1) where
  `--brass-on-dark` exists for exactly that (6.08:1).

**4. Tap targets.** `.nav-link` sets `line-height: 1` on 12px type, so every nav item was a
12px-tall target — half the WCAG 2.2 minimum. `min-height`/`min-width: 24px` grows the hit
area without adding padding that would also stack onto menu rows (which already carry `py-2`).

## Verification
```
$ npm run audit:mobile
pages overflowing: 0/9 | distinct a11y violations: 0

$ npx vitest run   366 passed (16 files)
$ npm run typecheck  clean
$ npm run lint       clean
$ npm run build      Compiled successfully
```

## Notes / follow-ups
- Remaining tap targets sit at 20–23px: footer links, lane chips, a 23px-tall form input.
  All are close to the floor and none were flagged by axe; worth a pass but not a defect.
- `BrandMarquee.tsx` and `IndexBar.tsx` are **dead code** — neither is rendered. They should
  be deleted or wired up; left alone here rather than widening this change.
- The audit runs against localhost by default. Pointing it at production after a deploy
  (`BASE=https://themodestyhouse.com npm run audit:mobile`) would catch regressions that only
  appear with real data.
- This is not a substitute for a real device: it measures layout, contrast and ARIA, not how
  something *feels* to use.
