# A price range slider on every grid — and the three ways it looked like it worked when it did not
**Date:** 2026-09-05 · **Status:** done (verified on staging; NOT merged to main)

## Goal

Tina, after the abayas editorial surfaced that `/modest-abayas` cannot answer a price
question: *"yes i want to implement something actually a slider filter eevrywhere"*.

Two decisions she made when asked: **two handles**, not a single "under $X"; and **client
state only** — nothing in the URL, nothing shareable. That deliberately gives up the
`/modest-abayas/under-100` landing page that started the conversation.

Spec: `docs/superpowers/specs/2026-09-05-price-range-filter-design.md`
Plan: `docs/superpowers/plans/2026-09-05-price-range-filter.md`

## What changed

| file | why |
|---|---|
| `lib/sortRows.ts` | `convertedRowPrice` extracted and exported — the private `comparablePrice` returns the RAW native amount when a currency has no rate, which is right for a sort and wrong for a filter |
| `lib/priceFilter.ts` (new) | `priceBounds`, `withinPrice`, `clampRange` — pure, 14 tests |
| `components/PriceRange.tsx` (new) | Base UI `Slider` with two indexed thumbs |
| `app/globals.css` | `.price-thumb` and its `:has(input:focus-visible)` focus ring |
| `components/FilterableGrid.tsx`, `components/DirectoryBrowser.tsx` | the wiring — every lane, designer, edit and `/new-in` |
| `scripts/interaction-audit.mjs` | `price-slider-drag` and `price-slider-keyboard` |

**The track stops at the 95th percentile and a parked top handle means "and up".** Measured,
not chosen: prices are heavily right-skewed, and on `/modest-hijabs` — which runs $1–$243 —
three quarters of the catalogue sits inside the FIRST 13% of a linear track to the maximum.
Capping at p95 moves that 75% into 43% of the track. Re-measured during the build: min $1.00,
max $243.43, p75 $32.00 (13.1% of max), p95 $74.97 (p75 is 42.7% of p95). Nothing is hidden —
`openTop` admits the tail.

**A piece whose currency has no exchange rate is always included**, whatever the range. A
filter must not remove a product because the site could not price it.

## Four defects, and none was visible to a passing test

**1. My plan's percentile arithmetic was wrong.** Nearest-rank indexing lands exactly on the
cluster boundary in a skewed set, so `min === max` and the track collapses to zero width. The
plan's own required test caught it; fixed with linear interpolation. The reviewer re-derived
it by hand and also showed the obvious `ceil`-instead-of-`floor` patch fails by a different
mechanism, so this was not an off-by-one.

**2. The keyboard focus ring could never paint — by two independent mechanisms.** Base UI
gives the styled thumb `<div>` `tabIndex: -1`, so it cannot receive focus at all; and the
element that does, a nested `<input type="range">`, is clipped by `clip: rect(0 0 0 0)`, which
eats any outline drawn on it. `focus-visible:ring-2` was dead on arrival. Fixed with a
`.price-thumb:has(input:focus-visible)` rule in `globals.css` — and the thumb's inline
`boxShadow` halo had to move into that class too, because an inline style beats a stylesheet
rule and would have silently killed the fix. As a bonus that Tailwind class was itself a §6
violation: `ring-2`'s colour comes from `--tw-ring-color`, a stray blue, never a token.

**3. My plan passed the wrong value to the filter, and it defeated the feature.**
`bounds.openTop` is a static catalogue fact — "a tail exists above the cap" — not "the top
handle is parked at the maximum". Wired as written, `v <= hi || openTop` is unconditionally
true on any lane with a tail, so **dragging the top handle down did nothing at all**. Every
unit test passed either way, because `withinPrice`'s contract was never wrong; the call site
was. Found only because the plan required a real drag against a production build. Fixed to
`bounds.openTop && effectivePrice[1] >= bounds.max`, which is byte-identical to the condition
`PriceRange` already uses to decide whether to print the `+`.

**4. The audit check I wrote could not see the feature work.** Two faults in one check:

- It located thumbs with `[role="slider"]`. Base UI's slider carries that role **implicitly**,
  via a native `<input type="range">` with no `role` attribute in the markup, so a CSS
  attribute selector matched **zero** elements on a real page carrying a real working slider —
  and reported `FEWER THAN TWO THUMBS`, which is indistinguishable from the genuine
  negative-control failure on production. Now `.price-thumb`.
- It counted `[data-surface="product-card"]`. The grid only ever renders the first 24 cards,
  so a filter thinning 3,781 rows to 588 still shows 24 and the check read "CHANGED NOTHING".
  Now the `Showing N of M` counter — and read with `textContent`, not `innerText`, because
  `.brand-label` sets `text-transform: uppercase` and the rendered text is `SHOWING 24 OF 3781`.

## Verification

**Negative control first, against PRODUCTION, which has no slider** (§10.28 rule 1):

```
price-slider-drag      × 5 viewports   PRICE SLIDER HAS FEWER THAN TWO THUMBS
price-slider-keyboard  × 5 viewports   FEWER THAN TWO PRICE THUMBS FOR KEYBOARD TEST
```

Re-run after the check was amended — still fires. A check that cannot fail is not a check.

**Against staging, 5 viewports × 2 engines:**

```
price-slider-drag      mobile-390 / tablet-819 / ipad-1024 / ipad-1366 / desktop-1440   ok
price-slider-keyboard  same five, chromium AND webkit                                   ok
20/20, no PROBLEM line anywhere in the run
```

**Filtering, measured on the deployed page:**

```
/modest-abayas   3781 -> 588 raising the min handle (tail still admitted)
                 588  -> 3   then lowering the max handle
                 Reset price restores 3781
/new-in          161 -> 54 after filtering, then Load more clicked to exhaustion:
                 2 clicks, Showing 54 of 54, 54 cards rendered — nothing stalls
```

**The focus ring, proven on a real page in WebKit** — the thing Task 3 could not verify:

```
unfocused box-shadow: rgb(250, 247, 241) 0px 0px 0px 6px
focused   box-shadow: rgb(250, 247, 241) 0px 0px 0px 6px, rgb(68, 25, 67) 0px 0px 0px 8px
:focus-visible match: true
```

`rgb(68, 25, 67)` is `--aubergine`.

**Safari excludes `<input type="range">` from Tab order by default, and that is a platform
setting, not a defect here.** Established rather than assumed: a focus-walk of 60 Tab presses
on staging reaches `a`, `button` and `input[email]` in WebKit but never `input[range]`, while
the same walk in Chromium reaches the thumb. Since buttons and text inputs ARE reachable, this
is specific to range inputs and applies to every one on the web; a Safari user with Full
Keyboard Access on does reach it. The check therefore falls back to focusing the input
directly and goes on to assert the two properties that are ours — the ring paints, the arrows
filter — rather than asserting Safari's default. Both hold in WebKit:
`3781 -> 588 -> 3` across the two handles, identical to Chromium.

**Suite / typecheck / lint:** `1131 tests passed`. `npx tsc --noEmit` clean apart from two
pre-existing `.next/types/validator.ts` errors naming the `/directory` route deleted on
2026-09-01 — another session's stale build output. `npm run lint` exit 0.

## Notes / follow-ups

- **The phone layout needed a fix that only a screenshot could show.** At 390px the slider and
  the Colour chip ended up shoulder to shoulder — thumb right edge at x=478, chip left edge at
  x=485 — so the chip read as sitting on the end of the track. Nothing overflowed, so no audit
  check could see it. The control now takes its own row below `md`.
- **`/designers/<slug>` and `/edits/<slug>` were not individually click-tested.** They render
  the same `FilterableGrid` as the lanes, and the two grid components were verified textually
  identical, but that is an inference rather than a measurement.
- **Still open, and worth more than this was:** `/modest-abayas` has no crawlable price view.
  Every result Google returns for "abayas under $100" is a filtered grid — Aab's is literally
  called "Shop Under $100" — and this filter is deliberately invisible to search engines.
