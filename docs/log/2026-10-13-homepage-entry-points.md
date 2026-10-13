# Homepage entry points: category strip above the fold, abaya subtype links, two pinned articles
**Date:** 2026-10-13 · **Status:** partial (branch `home/entry-points`, not yet on staging)

## Goal
Pulse, Sep 4 - Oct 12: the homepage takes 41% of entries and holds them worst of any page
(26 s, 49% scroll), 67% on mobile. Give the first screen a way into the catalogue, link the
abaya subtype pages, and link the two best Search Console articles, which the homepage did
not link at all. In the existing visual language, no new copy.

## What changed
- `app/globals.css`, `components/CategoryQuickLinks.tsx` — new `--quicklinks-height` token
  (72px below 1024px, 0 above). `.hero-vh` subtracts it and the strip takes it as its fixed
  height, so on phones and tablets the existing Abayas / Dresses / Sets / Hijabs strip sits
  inside the first screen. Desktop unchanged. Chosen over a new chip scroller because the
  strip already existed and Tina explicitly rejected a horizontal scroller for it (2026-08-25).
- `app/page.tsx` — under "Our picks on abayas.", four underlined text links to
  `/modest-abayas?type=open|kimono|butterfly|closed`, labels from `lib/laneSubtypes.ts`
  (Open / Kimono / Butterfly / Closed Abayas). Text links, not `.chip`s: Tina removed a
  subtype chip row from the lane pages on 2026-08-26.
- `app/page.tsx` — `HOME_PINNED_POSTS` (`best-abaya-brands-price-tiers`,
  `where-to-buy-hijabs-online`) lead the three-story side column; the feature is still the
  newest post and the third slot is the newest remaining one. Ghost content untouched.
  Consequence: `what-is-maison-merrachi` and `abayas-under-100-that-dont-look-it` drop off
  the homepage (still on /editorial).

No new user-visible strings: every label is an existing lane or subtype name.

## Verification
- `npm run build` (with Ghost credentials) exit 0; `next start -p 3291` confirmed listening.
- Playwright, chromium + webkit: at 390x844 hero bottom 772, strip 772-844 = inside the fold
  (both engines); at 1440x900 hero bottom 900, token 0px (unchanged). scrollWidth = viewport.
  Subtype links and stories `[abaya-guide…, best-abaya-brands-price-tiers,
  where-to-buy-hijabs-online, meet-farheen…]` present in both engines.
- `audit:visual ROUTES=/`: 0 overflow / 0 aspect / 0 img / 0 no-css. The new links were first
  flagged as 21px tap targets; fixed with `py-2`, after which none are flagged. Remaining
  findings are pre-existing (nav panel overlap, `.btn-pill` contrast, "See our picks" taps).
- tsc 0, lint 0. vitest: 3 failures, all data assertions (colour-leads, fall-essentials
  picks, a size-floor pin) over files this change does not touch.

## Notes / follow-ups
- On a 667px-tall phone the hero's 560px min-height wins, so the strip sits ~5px under the fold.
- Not verified on staging yet (§1).
