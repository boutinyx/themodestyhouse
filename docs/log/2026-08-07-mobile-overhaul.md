# Mobile overhaul — full-screen phone menu, and 87% off the page weight
**Date:** 2026-08-07 · **Status:** done

## Goal
Tina: *"the mobile version of my website … works like absolute trash"*, and specifically
*"the dropdown menu of the navigator looks so fucking ugly opened up"*, plus the icons.
Asked for a full-page menu like the Victoria's Secret mobile site — tapping the menu opens
a panel that fills the whole screen.

## What was actually wrong

The existing `npm run audit:mobile` reported **0 pages overflowing, 0 axe violations**, so
nothing structural was broken. The two real faults were invisible to that audit:

**1. The phone menu was centre-aligned by accident.** `.nav-link` (`app/globals.css:247`)
sets `justify-content: center`, which is right for the horizontal desktop header row.
`MobileNav` reused the class for full-width rows in a vertical panel, so:

- all 16 rows rendered centred, reading as one undifferentiated wall
- the `pl-6` indent on sub-items **computed to 24px and then had no effect** — flex centring
  discards it — so the hierarchy (Products → categories → aesthetics → pages) never rendered
- rows were 35–36px, under the 44px comfortable-tap floor
- a 280px white panel opened from beneath a white header pill, merging into one shape
- 16 items did not fit; Editorial and About sat below a fold with no affordance

**2. Every page shipped ~7MB of images to fill one 390px screen.** Measured at iPhone 13:

| | `/` | `/directory` | `/modest-dresses` |
|---|---|---|---|
| images transferred | 7.08 MB | 6.69 MB | 6.15 MB |
| images missing `width`/`height` | 24/24 | 25/25 | 25/25 |
| images not lazy-loaded | 24/24 | 1 | 1 |

Causes: product photographs hotlinked from `cdn.shopify.com` at the resolution the brand
uploaded (a 3522px original was filling a 156px card); local PNG/JPEG assets never
optimised (`/logo.png` was 308KB to fill a **34px-wide** box, on every page); and the
homepage loading all 24 images eagerly.

## What changed

**The phone menu — `components/MobileNav.tsx`, rewritten**
- Base UI **`Dialog`**, not `Menu`: at full-screen size this is a takeover, and Dialog is
  what provides body scroll-lock, a focus trap, Escape, and a portal that cannot be clipped.
- Fills the viewport at `100dvh` (not `vh` — on iOS Safari `vh` is the URL-bar-collapsed
  height, which buries the last row), on `--parchment` so it separates from the white pill.
- **Rows follow the Victoria's Secret phone menu**, which Tina supplied as the reference
  after a first attempt in Bodoni Moda at 20–22px with indented sub-items. Her note:
  *"look how big the letters are and they are not centered to the left"*. Now:
  `--font-ui-stack` (Jost) at **17px**, every row **flush left on one edge** (measured: 17
  links, a single distinct left edge at 20px), uniform 55px rows, and a `CaretRight` at the
  right edge of each row so the chevrons align in a column.
  The serif read as a headline per row rather than as navigation, and the `pl-4` indent on
  sub-items was the "not centered to the left" complaint.
- `Category` and `Aesthetic` eyebrows kept — **reused verbatim from the /directory filter
  bar**, no new copy written (§10.18). With every row now flush left they are the only thing
  carrying the grouping, and 18 ungrouped rows is the wall this menu began as.
- **`.nav-link` is deliberately not used here.** The file styles its own rows, so fixing the
  phone menu cannot regress the desktop header.
- Closes via each link's `onClick`, not a `useEffect` on `path` — the effect form is a
  cascading render and `react-hooks/set-state-in-effect` fails the lint on it.
- `overscrollBehavior: contain`, so flicking past the end does not scroll the page behind.
- `Favourites` added to the last group — it is a real destination and the old menu omitted it.

**Image weight**
- New `lib/shopifyImage.ts` — asks the CDN for the size actually rendered. Verified against
  a real catalogue URL before it was written: `&width=400` took one image from
  **351176 → 36006 bytes** (9.75×), already WebP via `Accept` negotiation. Idempotent, and
  only ever touches `cdn.shopify.com`. 11 tests, including a look-alike-host rejection
  (`cdn.shopify.com.evil.test`) and the `?v=` cache-buster it must not corrupt.
- New `lib/staticImage.ts` — `-<width>.webp` variants for local editorial photographs, with
  a test that asserts **on disk** that every original has every variant, so a missing file
  fails the suite instead of 404-ing in a browser.
- New `scripts/optimise-images.mjs` — generates WebP variants with sharp. **Never overwrites
  an input; every output gets a new filename**, because `public/` is served with a 4-hour
  `max-age` and is not fingerprinted (§6, §10.21). Idempotent, `--dry` supported.
  Inputs 10574KB → outputs 946KB (−91%).
- `srcset`/`sizes` applied at every renderer: `ProductCard`, `EditorsRail`, `QuickView`,
  `BrandMarquee`, the homepage category grid, `/designers`, and both editorial pages.
  `VerifiedSpotlight` and `EditMagazine` use CSS `url()` backgrounds, which cannot carry a
  srcset, so the width is requested in the URL instead.
- The QuickView **zoom** image is deliberately left unresized — full resolution is the point,
  and it only loads on click. Commented so it is not "optimised" later.

**Icons (CLAUDE.md §6 — Phosphor, never a text glyph)**
- `StyleIt` `‹ ›` → `CaretLeft`/`CaretRight`; `QuickView` `×` → `X` (and a 44px target);
  `QuickView` and homepage `→` → `ArrowRight` / `ArrowUpRight`; `VerifiedSpotlight` `&rarr;`
  → `ArrowRight`.
- Remaining `✦` badge glyphs in `BrandCard`/`EditorsRail`/`StyleIt` were **left alone** —
  swapping a brand badge mark is a taste decision, not a bug fix. Flagged for Tina.

**Currency moved out of the phone header and into the menu** (Tina's call, following the
Victoria's Secret pattern of a region picker at the foot of the panel). The pill held crest +
wordmark + heart + currency + hamburger and two dividers in 390px, which is what crammed the
heart against the wordmark. Header now shows three controls on a phone
(`The Modesty House`, `Favourites`, `Open navigation`); **desktop is unchanged** and still has
the dropdown in the bar.

In the panel it is four chips, not the `<CurrencySwitcher>` dropdown — a Base UI Menu popup
opened from inside a Dialog is fiddly and costs a second tap, whereas the whole choice fits
one row at 390px. `CURRENCY_LABEL` / `NATIVE_LABEL` moved to `lib/fx.ts` so the two controls
cannot drift. Choosing does not close the panel: it changes prices behind it and a visitor may
want to try another.

Verified end-to-end on `/directory` at iPhone 13: prices `["$135","£81","$189"]` →
`["≈ £100","£81","≈ £140"]` after choosing GBP. The natively-GBP row keeps `£81` with no `≈`,
which is ADR-0002 behaving correctly — only converted prices are marked approximate. Survives
a reload.

**The mix-and-match pair is smaller on a phone, and STACKED.** It was briefly side by side;
Tina reverted that. The size is what mattered — the height came from the artwork, not the
orientation. Measured at iPhone 13:

| | picker card |
|---|---|
| stacked, full size (original) | 629px |
| side by side, `MIX_FRAME_SM` | 323px |
| **stacked, `MIX_FRAME_SM`** (current) | **437px** |

The arrows FLANK the artwork again at every width. They moved underneath only to make two
slots fit side by side; stacked, a 116px frame plus two 34px arrows and their gaps is 208px
inside a 270px column, so there was never a reason to move them.

`MIX_FRAME_SM = {w:116, h:128}` is derived, not picked: at 390px the section's `px-8` leaves
326, the card's 20px padding leaves 286, the column's `px-2` leaves 270, and a `gap-3` between
two slots leaves 129 each. The artwork cap is **scaled** by `116/170` per piece rather than
flattened to one number, so the equal-AREA sizing each top carries in `Piece.maxH` survives.

The arrows move UNDERNEATH the artwork below `md` — two flanked slots cannot fit side by side,
since the arrows alone are 92px of the 129px each slot gets. Done with
`flex-wrap` + `order` + `basis-full` on one set of markup, not a second copy: below `md` the
image claims the whole line so both arrows wrap beneath it; at `md` nothing wraps and `order`
restores prev / image / next. All responsive values go through CSS custom properties set
inline, because a `useMediaQuery` has no answer during SSR and the Tailwind class names have to
be static strings to be generated at all. **Desktop is byte-for-byte unchanged** — verified by
screenshot and by measuring the desktop slots.

**StyleIt on a phone shows the mix-and-match pair only** (`components/StyleIt.tsx`) — the
"Or a dress" column is `hidden md:flex`. It used to stack underneath on a phone, making the
picker card about twice the height of the screen. Hidden with CSS rather than removed from
the tree: a conditional render needs a viewport check that does not exist during SSR, so it
would either mismatch on hydration or flash the dress in before removing it. The Slot images
now carry `loading="lazy"`, and **a lazy image in a `display:none` box is never fetched** —
measured, not assumed:

| | dress column | dress images requested (6s, auto-shuffle running) |
|---|---|---|
| iPhone 13 | `display:none`, 0×0 | **0** |
| Desktop 1280 | `display:flex`, 297×512 | 3 |

The left-hand paragraph still reads "or find the dress". That is Tina's copy and was left
untouched (§10.18) — flagged to her rather than edited.

**VerifiedSpotlight captions were stacked on one point on a phone** — Tina's screenshot showed
"Veiled"/"Inayah"/"Glow Modesty"/"Aab" printed over each other. The `max-width:820px` query set
`.tmh-card{position:static}`, which removed the card as the containing block for its
absolutely-positioned `.tmh-cap`/`.tmh-badge`, so all four resolved against `.tmh-stage` and
landed on the same coordinates (measured: every caption at (54, 3018), cards correctly at
x=34/288/542/796). Now `position:relative` with `left:auto;top:auto`. → CLAUDE.md §10.22.

**The fanned card stack is now KEPT on a phone, scaled** (Tina's call, from the desktop
rendering). Mobile had been replacing it with a horizontally-scrolling row of upright cards,
which threw away the tilt, the overlap and the composition.

It could not scale before because the geometry was fixed pixels: a 560x500 stage holding
238px cards. `.tmh-stage` is now an aspect-ratio box (`width:100%; max-width:560px;
aspect-ratio:560/500`) and `.tmh-card` a percentage of it (`42.5%`), so the whole fan redraws
at whatever width it is given — the `p1–p4` offsets were already percentages and follow for
free. **Desktop is arithmetically identical**: the column is 586px, max-width caps the stage
at 560, and 42.5% of 560 = 238px. It also fixes a latent bug between 820 and 1220px, where the
two-column grid gave the stage under 560px while the cards stayed 238px and the fan spilled.

Only the absolute lengths needed a phone value — type, border, insets and the badge, which at
~40% of the desktop card would otherwise swamp it. Plus `translateX(12px)`: the cards span
0%–90.5% of the stage, so the leftover sits entirely on the right and the cluster reads
left-of-centre at 390px. A transform, not a margin, so the stage's layout box cannot push the
page into horizontal scroll.

Measured at iPhone 13: stage 358x320, cards ~152x203, no spill right or bottom, no document
overflow, four distinct caption positions.

**The audit was blind to that**, and had reported this page clean — its screenshots were
`fullPage: false` and it had no overlap check. `scripts/mobile-audit.mjs` now also writes
`<route>-full.png` and reports **stacked text**. Proven by reverting the CSS fix and
confirming it fires (`STACKED TEXT at 54,3018,197: Inayah… | Aab…`), then restoring.

**Section spacing halved on a phone.** Every homepage section carried `py-20` — 80px top AND
bottom, so 160px of empty space between each pair, on a 664px-tall screen. Now
`py-10 md:py-20` (and `my-10 md:my-20` on the aubergine band, 40px on VerifiedSpotlight), so
sections sit 80px apart. Desktop is unchanged. Page height 6564px -> 6052px.

**The category grid keeps its card height** (Tina's explicit instruction, with a screenshot).
`grid-auto-rows` was not touched: verified still `168px`, all five cards 168px, before and
after. The 80px that section lost is entirely its own padding.

**Tap targets** — footer links and the Privacy/Terms row grew from 15–20px to 32px boxes;
footer social icons to 44px squares. `scripts/mobile-audit.mjs` now ignores `tabindex="-1"`
and `aria-hidden` elements, which were reporting the newsletter/contact spam honeypots as
1×1 failures.

**`eslint.config.mjs`** — ignores `.audit/**` (gitignored audit output, was failing
`--max-warnings 0` on a throwaway measuring script).

## Verification

```
npm run lint      → LINT_EXIT=0
npx tsc --noEmit  → TSC_EXIT=0        (after rm tsconfig.tsbuildinfo)
npm test          → 19 files, 390 tests passed   (was 376; +14 new)
npm run build     → ✓ Compiled successfully, 34/34 static pages
```

Mobile audit, iPhone 13 (390px), all 9 routes — **before → after**:

```
pages overflowing:        0/9  →  0/9
distinct a11y violations:   0  →    0
undersized tap targets:    ~8 per page  →  0 across all 9 routes
```

Transferred bytes, same pages, same viewport:

| route | before | after | change |
|---|---|---|---|
| `/` | 7.14 MB | **0.94 MB** | **−87%** |
| `/directory` | 6.76 MB | **1.19 MB** | **−82%** |
| `/modest-dresses` | 6.22 MB | **1.49 MB** | **−76%** |

Full-screen menu asserted programmatically (`.audit/menu.mjs`): popup covers 390×664 against
a 390×664 viewport (`fullscreen: true`), `body` overflow `hidden`, 18 links, **0 rows under
44px**, panel scrolls internally, dialog gone after close.

## Notes / follow-ups

- **`/directory` still serves a 3.4MB HTML document.** This is the known RSC-payload landmine
  (§8) — the page passes the full product array into a client component. It is now the single
  largest transfer on that route, larger than all its images combined. Not attempted here:
  it is an architectural change, not a mobile fix. **This is the biggest remaining mobile
  problem.**
- **Unreferenced files still in `public/`**: `inbox-preview.png` (1.2MB), `hero-poster.jpg`
  (340KB), `header-poster.jpg` (70KB) are referenced nowhere in the codebase. Not deleted —
  that is Tina's call. The superseded `style-it/*.png` originals (8.6MB) and `logo.png` /
  `hero-home.jpg` are likewise still on disk, now unreferenced.
- One brand hotlinks from a WordPress host rather than Shopify (`1066px → 164px` on
  `/modest-dresses`), so `shopifyImage` cannot resize it. Only affects that brand.
- `sizes` values encode the current grids. If a grid's column count changes, the matching
  `sizes` must change with it — they are commented at each call site.
