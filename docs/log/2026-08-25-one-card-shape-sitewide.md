# One card treatment across the whole site
**Date:** 2026-08-25 · **Status:** done (staging)

## Goal

Tina: *"you see the ratio of the products on the homepage. like the images ratio
we changed. i want that across the whole website and also the size of the icon
like the heart etc and the background i want the same across the whole page"*.

The homepage rails (`components/PopularShowcase.tsx`) were taken to a 2:3 box,
32px buttons and no border earlier the same day. Every other surface was left
behind.

## Measured the gap on the LIVE site before changing anything

| | homepage rail | everywhere else |
|---|---|---|
| ratio | **0.667** (2:3) | 0.750 (3:4) |
| object-fit | cover | cover — *already the same* |
| background | `#fff` | `#fff` — **already the same** |
| border | none | 1px `--hairline` |
| corner radius | 0 | 2px |
| button | **32x32** | 40x40 |
| eye icon | 20px | 20px — *already the same* |
| heart icon | **20px** | 22px |

**The background was never the difference.** Both were already `#fff`. What
reads as a different background is the hairline border and the rounded corner —
worth writing down, because "make the background the same" would otherwise send
the next person looking at a colour that was never wrong.

## What changed

Four surfaces, all following `ProductCard`:

- **`components/ProductCard.tsx`** — the one that matters: it is what
  `DirectoryBrowser`, `FilterableGrid`, `ProductGrid`, the edit pages and
  `/favourites` all render. `aspect-[3/4]` → `aspect-[2/3]`, border and radius
  dropped, both buttons `w-10 h-10` → `w-8 h-8`, heart 22px → 20px.
- **`components/EditMoreTile.tsx`** — `3/4` → `2/3`. This number exists only to
  track ProductCard's photo box so the "Want more?" tile lines up beside the
  cards, so it moves with it.
- **`components/EditorsRail.tsx`** — the rail on the product detail page. Border
  and radius dropped, background `--bone` → `#fff`, and the fixed height 300 →
  **345**, because the card is a fixed 230px wide and 230/345 is 2:3.
- **`app/product/[brandSlug]/[shopifyId]/page.tsx`** — the detail image,
  `3/4` → `2/3`, radius dropped.

Dropped the border rather than adding one to the rails: the rails are the
surface Tina approved.

### The one real trade-off, flagged not buried

`ProductCard`'s buttons were **40px on purpose**. The 2026-08-13 marketing audit
flagged 32px there as sitting in the tap path of the card's own primary action —
the full-card outbound anchor underneath at `z-10` — and recommended 40–44px.

Going to 32px trades that **recommendation** for the site-wide consistency Tina
asked for. It does **not** breach anything: 32px clears the 24px floor in
WCAG 2.2 SC 2.5.8 with room to spare, and `npm run audit:mobile` reports **0
a11y violations** with the new size and does not flag the buttons. The reason
for the original 40px is now written at the declaration so nobody reverses it
without knowing what it cost.

## Verification

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · `npm test` → **48 files, 781
tests** · build clean.

Every card surface measured in a real browser after the change — the whole point
was that they match, so the check is that the numbers are identical, not that
each is individually plausible:

```
HOMEPAGE RAIL  ratio 0.667  cover  #fff  border 0px  radius 0px  btns 32x32  icons 20
DIRECTORY      ratio 0.667  cover  #fff  border 0px  radius 0px  btns 32x32  icons 20
LANE           ratio 0.667  cover  #fff  border 0px  radius 0px  btns 32x32  icons 20
EDIT PAGE      ratio 0.667  cover  #fff  border 0px  radius 0px  btns 32x32  icons 20
PRODUCT PAGE   hero 0.667  radius 0px      rail cards 6 @ 0.667
console errors: 0
```

`npm run audit:mobile`, both engines:

```
chromium  overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
webkit    overflowing 0/9 | a11y 0 | stacked text 0 | broken aspect 0
```

A full-page grid screenshot showed many blank cards, which looked like broken
images. It was not: they are `loading="lazy"` and never entered the viewport
during the capture. Confirmed by scrolling the page and re-counting —
**24 total, 24 loaded, 0 broken** — rather than by assuming (§10.26: ask what
the harness would have to be doing wrong before believing a finding).

I also broke the build once on the way, with a JSX comment missing its closing
`}`. Same family as §10.27: the comment explaining a change is code too.

## Not changed — flagged for a decision

- **`app/designers/page.tsx`** still uses `3 / 4`. Those are **brand** cards,
  not product cards, and Tina's ask named "the ratio of the products". Left
  alone deliberately; say if the designers grid should match too.
- **`components/QuickView.tsx`** is a modal with a large single image, not a
  card. Untouched.
- `EditMagazine`, `VerifiedSpotlight` and `ProductGrid` all still carry 3/4 but
  have **zero renderers** — confirmed by grep. Not worth changing dead code;
  worth knowing they are dead.
- `ProductCard` still has an outbound-cue arrow bottom-right that the rails do
  not. It is a deliberate a11y/marketing affordance from the same 2026-08-13
  audit, and Tina asked about the ratio, icons and background — not this. Left.
