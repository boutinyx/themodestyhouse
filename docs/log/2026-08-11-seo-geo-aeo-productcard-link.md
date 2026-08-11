# ProductCard becomes a real outbound link
**Date:** 2026-08-11 · **Status:** done

## Goal
The single largest remaining gap from the same-day SEO/GEO/AEO analysis
(`docs/seo-geo-aeo-plan.md`): `components/ProductCard.tsx` had no `<a>`/`<Link>` at all —
the whole card was a `div` with an overlay `<button onClick>` that opened the `QuickView`
modal. A crawler (or a shopping agent) cannot follow a button. Put to Tina as a three-way
choice; she picked "card → outbound link, QuickView demoted to secondary."

## What changed
**`components/ProductCard.tsx`** — root element is now `<div className="group relative block
text-center">`. Direct children, in order:
1. `<a href={p.url} target="_blank" rel="noopener noreferrer sponsored" data-brand data-garment data-surface="product-card" className="absolute inset-0 z-10">` —
   covers the entire card (image + brand/title/price text below it), empty of visible content,
   named via `aria-label`. Same `rel="sponsored"` token the existing `OutboundTracking`
   delegated listener already matches on, so outbound-click tracking picked this up with zero
   wiring (`lib/pulse.ts` / `components/OutboundTracking.tsx` — the listener is
   `document`-level and selector-based, not per-component).
2. The image container, now holding the `<img>` plus **two** sibling buttons at `z-20`:
   quick view (new: `Eye` icon, top-left) and the favourites heart (unchanged position,
   top-right).
3. The brand/title/price text, unchanged, now sitting *underneath* the anchor rather than
   outside it — the anchor's `inset-0` on the `relative` outer wrapper stretches to cover
   this too.

Quick view's button kept its exact `aria-label={\`Quick view: ${p.title} by ${p.brandName}\`}`
prefix — `scripts/outbound-audit.mjs` and `scripts/interaction-audit.mjs` both locate it via
`button[aria-label^="Quick view"]`, so neither needed a change.

**Why siblings, not nesting:** the previous version of this file already went through an
accessibility rewrite (`2d9b1a1 fix(a11y): 20 axe violations to 0`, per git log) specifically
to stop nesting interactive controls — it used to be a
`div[role="button"][tabindex=0]` wrapping a `<button>`, which axe flags as
`nested-interactive` because a screen reader can't announce either control reliably. Putting
quick view and the heart back *inside* the new `<a>` would reintroduce exactly that
violation. They stay siblings, positioned above the anchor via `z-index` — the same
`z-10`-under/`z-20`-over relationship the file already had between the old overlay button and
the heart, just with the overlay itself upgraded to a real link and its coverage widened to
the whole card.

## Verification

```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npx vitest run
(all clean — 470/470 tests, same suite as before this change; no test file needed to change)
$ npm run build
(31 routes, unchanged)
```

Then a Playwright script against a `next start -p 4177` build (kept temporarily at
`scripts/.tmp-verify-productcard.mjs`, deleted after use — not left in the repo):

```
PASS: quick view opens modal, no navigation: true
PASS: heart toggles favourite, no navigation: true
```

The third assertion (click the price text, expect a popup) initially timed out — traced to
the test harness, not the component: `card.locator('.price').click()`'s internal scroll/click
sequencing didn't reliably land the synthetic click before the `waitForEvent('page')` timeout,
even though the click landed correctly. Isolated with two direct checks instead:

```
$ node debug script — elementFromPoint at the price text's on-screen position, after a real scroll:
{ tag: 'A', cls: 'absolute inset-0 z-10', href: 'https://niswafashion.com/products/...' }

$ node debug script — click the anchor directly, listen for context 'page' event:
anchor href: https://niswafashion.com/products/huda-gold-accent-dress-pink-copy-3
anchor target: _blank
POPUP EVENT FIRED: https://www.niswafashion.com/products/huda-gold-accent-dress-pink-copy-3
pages in context: 2
```

Both confirm: the anchor is the topmost element across the *entire* card including the text
area furthest from both corner buttons, and clicking it opens the correct outbound URL in a
new tab. This needed real browser stacking-context behaviour (z-index comparisons across a
`position: relative` wrapper with no explicit stacking context of its own) that a jsdom-based
unit test can't exercise, which is why this was verified with Playwright against a real build
rather than added to `lib/*.test.ts`.

## Notes / follow-ups
- `lib/schema.ts`'s `ItemList` entries already used `p.url` for `item.url` — that was already
  the outbound URL by necessity (no internal product page exists); it's now also literally
  what clicking the card does, so the schema and the page agree.
- CLAUDE.md §8 "Frontend" landmines updated: "Zero products are hyperlinked" is marked fixed
  with this structure explained. The 2.32%-of-catalogue-ever-rendered finding is unrelated and
  still open — linking the visible cards doesn't change how many cards are visible.
- Not done: extending the *visible* card count (still `STEP = 24` client-side reveal), and the
  Phase 2 items logged in `docs/seo-geo-aeo-plan.md`.
