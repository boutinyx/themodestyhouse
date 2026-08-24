# Replace StyleIt mix-and-match picker with "Popular items" showcase
**Date:** 2026-08-23 · **Status:** done

## Goal
Tina: "instead of our 'Every modest brand, in one house.' block with the
outfit picker... a showcase like this [reference screenshot] with popular
items... call it something like 'popular items from brands'... picture to
the edge and the text centered in the middle." Follow-up: hand-picked items
(a long-sleeve sweater, a polka dot piece, something with lace), mostly
affordable prices with a couple of pricier ones mixed in; no sold-out badge
needed.

## What changed
- **New:** `components/PopularShowcase.tsx` — full-bleed horizontal rail
  (`width: 100vw; margin-left: calc(50% - 50vw)` breakout), no border/radius
  on the cards so photos butt against each other and the screen edges. Heart
  (favourite) + eye (quick view) on each card, same accessible pattern
  `ProductCard.tsx` already established: the outbound `<a>` covers the whole
  card at z-10, the two buttons are siblings at z-20, never nested inside
  the anchor. Rail arrows reused from `EditorsRail`'s `.rail-arrow` CSS, but
  with three overrides specific to being full-bleed: `left`/`right: 12px`
  instead of the class's default `-10px` (which would sit the arrow past the
  real viewport edge and force a horizontal scrollbar), `z-index: 30` so the
  arrow wins over the end card's own z-10 anchor once it scrolls underneath
  the arrow's fixed position, and `top` measured live off the first card's
  actual rendered image height (via `ResizeObserver`) rather than a
  hand-picked pixel, since these images are `aspect-[3/4]` and fluid instead
  of EditorsRail's fixed 300px.
- **New:** `lib/popularItems.ts` — 8 hand-picked real product ids. Looked up
  against the live catalogue in `app/page.tsx` (not duplicated as literal
  title/price/image), so a cut or delisted id just drops out of the rail
  instead of showing stale data.
- **`app/page.tsx`** — swapped `<StyleIt />` for the new section; heading
  ("Popular items *from brands.*") is centered, unlike every other homepage
  section heading here, per her explicit ask.
- **Deleted** `components/StyleIt.tsx`, `lib/stylePieces.ts`,
  `lib/stylePieces.test.ts` — the mix-and-match picker they built is fully
  unused now. Side benefit: this removes the PrettyLittleThing (fast-fashion
  brand) landmine CLAUDE.md §8 had flagged in `lib/stylePieces.ts`.
- No sold-out badge and no discount/"% off" badge — the latter has no real
  data behind it anywhere in the catalog (no compare-at-price field), so it
  would have been fabricated. Sold-out was explicitly waved off by Tina
  before this shipped.

## Item selection
Searched `data/products.json` for `sweater`, `polka dot`, `lace` matches,
picked one real in-stock item per ask plus five more for price variety:

| item | brand | price |
|---|---|---|
| Siyah Sweater | Modesty in Style | $37 AUD |
| Brown Polka Dot Wrap Maxi Dress | iLoveModesty | $48 USD |
| Black Twill Top | Aab | $49 USD |
| Winter Flared Skirt Mink | Aab | $47.60 USD |
| Tencel Smocked Skirt - Almond | Veiled | $78.40 USD |
| Sumyah Leather Maxi Skirt | Inayah | £79 |
| Sena Pleat Abaya - Black | Lameera Moda | $120 USD |
| Oumira Lace Dress | Glow Modesty | $145 USD |

6 affordable ($37-$79), 2 pricier standouts ($120, $145), per "most of the
prices affordable and some expensive ones between."

## Verification
Playwright against `next dev` (localhost:3000):
- Section renders: 1 heading, 8 card anchors, `data-surface="popular-showcase"`.
- Full-bleed confirmed: first card `x: 0`, row `scrollWidth: 2880` vs
  viewport `clientWidth: 1440`.
- No horizontal page overflow (`document.documentElement.scrollWidth -
  clientWidth === 0`).
- Prices convert correctly across currencies (AUD/GBP → `≈ $`).
- Right arrow: 2 paced clicks reaches `scrollLeft: 1440` (the true max),
  then correctly disables (`pointer-events: none`). Left arrow symmetric.
- Heart click toggles favourite without navigating; eye click opens the
  QuickView modal ("Shop at" link present).
- `npx tsc --noEmit` clean; no console/page errors during the whole flow.

## Notes / follow-ups
Found and fixed one real bug during verification: with the arrows moved
inside the true viewport edge (required for a genuinely full-bleed row),
the end-of-rail card's own outbound link sits directly under the arrow's
fixed screen position once scrolled there — without an explicit `z-index`
higher than the card anchors' `z-10`, a click could land on the product
link instead of the arrow. Caught via a first Playwright pass that (after
ruling out a wrong-selector false positive from `CategoryQuickLinks.tsx`
sharing the same `.rail-arrow`/`.no-scrollbar` classes) reproduced with
`document.elementsFromPoint`; fixed with `z-index: 30` on both arrows.

## Follow-up 1 — smaller photos, then a peek layout matching aab
Tina: "big smaller the photo this is too big" → card width narrowed from
25% to 20% (5 visible instead of 4), `sizes` attribute updated to match.

Then: "give bit of spacing and i want you to show 2 and a half so people
know there is more and end you make that half a little trasparent for the
spacing look at the aab one." Checked aab's own site live (Playwright,
desktop AND mobile viewports — their homepage "SALE MOST WANTED" rail
matches the "2.5 visible" ratio on a 390px phone viewport specifically, one
full card between two half-cropped neighbours; their crop is plain, no
fade). Implemented:
- Card width → uniform `w-[38%]` (drops the old per-breakpoint scaling —
  a flat percentage keeps ~2.5 visible at any viewport width automatically)
  with a `gap-3` (12px) between cards for "give bit of spacing."
- The "half a little transparent" edge fade reuses the site's existing
  `.scroll-fade`/`useScrollFade` system (`components/useScrollFade.ts`,
  `app/globals.css`) rather than a one-off opacity hack — that system was
  vertical-only with a comment explicitly inviting a horizontal variant
  ("Adding an x axis is a second pair of rules..."); added `.scroll-fade-x`
  in globals.css as that generalization. `useScrollFade('x')` also now
  drives the rail-arrows' enabled/disabled state (replacing a hand-rolled
  `canLeft`/`canRight` scroll-listener), so the fade and the arrows can
  never disagree about whether there's more to scroll.
- Verified live: `data-fade` correctly cycles `end` → `both` → `start` as
  the row scrolls from the start to the end.

## Follow-up 2 — native image-drag mistaken for "the row moving"
Tina: "i see that its moving fix that the showcase." Checked scroll
position over 2s with no interaction first (ruled out any auto-scroll/
drift). Asked which specific movement she meant; her answer — "i can move
the row up and down" — pointed at the browser's own default: an `<img>`
(and an `<a>`) is natively draggable with no attribute needed, so
click-and-drag anywhere on a card started the OS-level "drag this image"
ghost-preview gesture, which follows the cursor in any direction. Confirmed
by dispatching a real `dragstart` at the image and observing it fired
uncancelled. Fixed with `draggable={false}` on both the image and the
full-card anchor. Every other card on the site (`ProductCard.tsx`,
`EditorsRail.tsx`) has this same gap — not fixed here, since this row was
the only one reported and is uniquely easy to trigger it on (edge-to-edge,
no card padding to click instead of the photo) — worth doing sitewide if
it comes up again.

## Follow-up 3 — swapped in Tina's own 8 picks
Tina sent 8 real product URLs directly ("these are the items that i
want"), replacing the earlier hand-searched selection. Matched each to its
catalogue id by brand + URL handle rather than trusting the pasted URL as
the stored one:
- `mariam-col.com`'s link was locale-prefixed (`/nl-eu/…`) and didn't match
  our stored (English-default) URL for the same product — found instead by
  grepping `data/raw-products.json` for the SKU in the URL (`MS433`), then
  confirmed the id publishes in `data/products.json`.
- `losyana.nl` has TWO published rows for "Emirate abaya" in pink
  (`-pink` and `-pink-1`, presumably a duplicate/resize listing on their
  end) — picked the one whose URL exactly matches what she sent
  (`…/emirate-abaya-pink`, no suffix).
- `https://jennah-boutique.com/` was only their homepage, no specific
  product. Asked her which item; she said skip it — the rail is 7 items,
  not 8.

Final 7: Bemu (polka dot maxi skirt), Mariam's Collection (lace-trim satin
top), Eynaa Paris (essential long-sleeve tee), La Petite Parisienne
(knotted set), Glamberry (flounced maxi dress), HUM Clothing (butterfly
kaftan top), Losyana (pink abaya). Verified live: all 7 anchors render with
`data-brand`/`href` matching the real catalogue urls, `npx tsc --noEmit`
clean, no console errors.

## Follow-up 4 — card size tuning, then a real vertical-scroll bug
Several rounds of "its too big" / "on phone they can be a tiny bit bigger":
mobile card width went 38% → 42% (she confirmed phone was already right,
only desktop was oversized); desktop went 27% → 20% after she sent two
side-by-side screenshots — aab's own live "SALE MOST WANTED" row (4 full
cards + a peek) versus ours — making the actual target unambiguous instead
of guessing again. Verified live at 1440px: 5 cards visible now (was 3.7),
matching aab's ratio.

Then: "i can still scroll up and down in the cards use playwright to fix
that." Confirmed via `getComputedStyle` before touching anything:
`overflow-y` on the scroller read `auto` despite never being set anywhere
in this component. Root cause is a real CSS Overflow spec rule, not a
typo: setting `overflow-x` to anything other than `visible` while
`overflow-y` is left at its default (`visible`) forces the BROWSER to
compute `overflow-y` as `auto` too — so the row was quietly vertically
scrollable/draggable as an unintended side effect of the horizontal
`overflow-x-auto` this whole component depends on. `IndexPanel.tsx` had
already hit the mirror-image version of this exact trap (its
`overflow-y:auto` list needed `overflow-x-hidden` for the same reason).
Fixed with `overflow-y-hidden` on the scroller. Verified: a vertical
`mouse.wheel` no longer moves `scrollTop` at all (stays 0), a horizontal
one still moves `scrollLeft` normally.

## Follow-up 5 — the overflow-y fix also silently killed wheel-scrolling
Tina, immediately after follow-up 4 shipped: "when i stand the cards i cant
scroll." Checked with Playwright before touching anything: a PLAIN vertical
wheel gesture (deltaY only, what an ordinary mouse sends — no deltaX) now
moved neither `scrollLeft` nor the page at all. Root cause: some browsers
redirect a vertical wheel gesture to horizontal scrolling on an
`overflow-x:auto` element, but only when `overflow-y` is ALSO `auto` (i.e.
only as a side effect of the exact bug follow-up 4 just fixed) — removing
that bug also removed the only way most people were ever scrolling this
row with a mouse wheel. Fixed by doing the redirect explicitly instead of
depending on browser fallback behaviour: a `wheel` listener on the
scroller adds `e.deltaY` to `scrollLeft` whenever the gesture is dominantly
vertical (`abs(deltaY) > abs(deltaX)`), so a genuine horizontal trackpad
swipe still scrolls natively without being doubled up. Verified: vertical
wheel now moves `scrollLeft` (0→300) while `scrollTop` stays locked at 0
the whole time, and a horizontal wheel afterward still moves `scrollLeft`
further (300→600).

## Follow-up 6 — the redirect-to-horizontal idea itself was the bug
Tina: "when i scroll on the page i works i can scroll not until i hit the
cards with popular items. then im stuck and cant scroll anymore on the
page use playwright to find everything out." Reproduced exactly as
described — NOT by hovering the row first (every earlier test did that),
but by starting the mouse over plain page background and scrolling
continuously DOWN, the way an actual person scrolls: `window.scrollY`
froze for 2 ticks the instant the cursor crossed onto the row, then
resumed.

Root cause was the whole "redirect vertical wheel to horizontal scrollLeft"
feature from follow-up 5 — never something Tina asked for; it was this
component's own addition on top of her real request (fix the vertical
DRAG bug). Two things were tried and DISPROVEN live before landing on the
real fix, not assumed:
1. Keep the redirect, chain to `window.scrollBy` at the row's start/end
   boundary. Reproduces her exact complaint — the row still "eats" 1-2
   scroll ticks turning itself sideways before releasing the page.
2. Remove the wheel listener entirely, trusting native page-scroll to
   take back over. Reproduced live that this is WORSE: `scrollY` froze
   PERMANENTLY the instant the cursor touched the row and never recovered
   for the rest of the test. `overflow-x: auto` alone (even paired with
   `overflow-y: hidden`) makes Chromium treat the element as the wheel
   event's target with no valid axis to apply it to, and it does not
   chain the unhandled event up to the page on its own.

Actual fix: the wheel handler now unconditionally hands every dominantly-
vertical gesture to `window.scrollBy(0, e.deltaY)` and never touches the
row's own `scrollLeft` — vertical always means page, full stop. The row
is reachable by the arrows and by a genuine horizontal gesture
(shift+wheel / a trackpad's sideways swipe, which produces real `deltaX`
and needs no JS help at all). Verified with a full continuous scroll from
`scrollY` 0 to 4800 across 15 ticks, mouse held still the whole time: zero
stuck ticks anywhere, including the tick where the cursor was confirmed
over the row. Vertical drag still blocked (`scrollTop` 0→0) and the
arrows still move the row (`scrollLeft` → 648) — neither regressed.
