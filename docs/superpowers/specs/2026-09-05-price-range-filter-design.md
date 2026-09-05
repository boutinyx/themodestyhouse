# Price range filter — design
**Date:** 2026-09-05 · **Status:** approved, not yet implemented

## Context

Tina, after the abayas post surfaced that `/modest-abayas` cannot answer a price question:
*"yes i want to implement something actually a slider filter eevrywhere"*.

Two decisions she made when asked:

1. **Two handles, a range** — not a single "under $X" and not preset chips.
2. **Client state only, no URL** — nothing in the query string, nothing shareable, refresh
   resets it. This deliberately gives up the SEO opportunity that prompted the conversation;
   `/modest-abayas/under-100` as a landing page is explicitly **out of scope** and stays on
   the backlog.

## What already exists, and is why this is small

- **`rows.price`** is already a column in the compact catalogue payload
  (`lib/compactCatalogue.ts:456`) — an integer per row, already on the client.
- **`comparablePrice(cat, row, currencyPreference)`** already exists in `lib/sortRows.ts`.
  It converts a row's native price into the visitor's display currency, and it was written
  for exactly this hazard: ADR-0002 keeps DISPLAY native, so comparing raw numbers across
  currencies is not a price order at all. The filter reuses it rather than re-deriving it.
- **Base UI ships a Slider** (`@base-ui-components/react/slider`) whose value is
  `readonly number[]` with indexed thumbs — a two-handle range with native pointer and
  keyboard support. Using it is the house pattern: §10.25 records that hand-rolling a
  dropdown instead of reusing the Base UI primitive is what made the filters unreachable on
  every iPhone.

So the work is a pure module, one component, and one predicate added to two existing filter
chains.

## The measured problem a naive slider would have

Prices are heavily right-skewed. Measured across the published catalogue on 2026-09-05:

```
lane                  median     p95     p99     max   share of a LINEAR track
                                                        holding 75% of the pieces
modest-dresses         $90    $212    $390    $537            24%
modest-abayas         $129    $486    $543    $545            36%
modest-hijabs          $21     $75     $94    $243            13%
modest-skirts          $55    $118    $204    $369            22%
modest-tops            $60    $177    $406    $510            17%
modest-trousers        $53    $241    $322    $510            16%
```

On `/modest-hijabs` a linear slider running to the true maximum puts **three quarters of the
catalogue inside the first 13% of the track**. Every adjustment a real shopper wants to make
happens within a few pixels, and the remaining 87% of the travel separates a handful of
outliers from each other. That is not a working control, and it would have looked correct in
every screenshot.

**Decision: the track ends at p95, and the top handle at its maximum means "and up".** On
hijabs that moves 75% of the pieces from 13% of the track to 43% of it. The pieces above p95
are never hidden — a top handle parked at the end has no upper limit — so this changes the
control's resolution, not the catalogue's visibility.

**Decision: bounds come from the rows on THAT page, not the catalogue.** Hijabs run $1–$243
and abayas $14–$545; one global range would make both pages useless. Recomputed whenever the
visible row set or the display currency changes.

## Design

### `lib/priceFilter.ts` — new, pure, unit-tested

```ts
priceBounds(cat, rows, currency) -> { min: number; max: number; step: number; openTop: boolean }
withinPrice(cat, row, currency, range: [number, number], openTop: boolean) -> boolean
```

- `priceBounds` converts every row with `comparablePrice`, sorts, takes `min` and the 95th
  percentile, then rounds **outward** to a step chosen from the span (1 / 5 / 10 / 25) so the
  ends read as round numbers rather than `$7.32`. `openTop` is true whenever p95 is below the
  true max, i.e. whenever the top handle needs to mean "and up".
- `withinPrice` is the predicate. A row whose price cannot be converted is **included**, never
  excluded — a filter must not delete a product because we could not price it, which is
  Invariant 9's reasoning one layer out.
- Both are pure functions of `(cat, rows, currency)` so they can be tested without a DOM,
  which is where the actual risk in this feature lives.

### `components/PriceRange.tsx` — new, `'use client'`

Base UI `Slider.Root` with `value={[lo, hi]}` and two `Slider.Thumb index={0|1}`. Label reads
`$40 — $120`, or `$40 — $486+` when the top handle is parked and `openTop` is true, formatted
through `formatPrice()` — the single source of truth for money on this site (ADR-0002), never
a template literal with a `$` in it.

Styling follows §6: Tailwind for layout, `var(--token)` inline styles for every colour, no new
raw `<style>` block.

### Wiring — `components/FilterableGrid.tsx` and `components/DirectoryBrowser.tsx`

Both already compose predicates over `shownRows`; this adds one more, and renders
`<PriceRange>` inside `IndexPanel` beside the existing Brand and Colour dropdowns. That covers
every lane, every `/edits/<slug>` and `/new-in`.

**NOT `/designers/<slug>`, and that is deliberate.** Those pages pass
`showConsole={false}` — Tina asked for the whole filter block gone from them on 2026-08-26 —
and the price control renders inside that block. This spec claimed designer coverage until
the final review MEASURED it: 0 thumbs and 0 `.index-panel` on `/designers/inayah` and
`/designers/aab`, against 2 thumbs on a lane. Put to Tina on 2026-09-05 as a genuine
collision between two of her own instructions ("a slider everywhere" vs "that block gone from
designer pages"); she chose to leave designer pages without it. A designer page is one
house's work and reads as a portfolio rather than a search tool.

### Edge cases, each with a decided answer

| case | behaviour |
|---|---|
| every row on the page is the same price | control is not rendered — same rule `cat.colours.length > 1` already uses for Colour |
| fewer than ~8 rows | not rendered; a slider over five items is worse than no slider |
| visitor changes display currency | bounds recompute, handles clamp into the new band proportionally |
| a row's currency has no FX rate | row is INCLUDED regardless of the range |
| range excludes everything | existing empty state, plus a "Reset price" link inside `PriceRange` that hands back the full span — shown only once a handle has moved |
| `Load more` after filtering | `DirectoryBrowser` fetches extra cards **by row index**, and §10.32's Load-more bug came from exactly that coupling. The filter changes which indices are shown, not what the indices mean, so the existing `source`/`rowCount` guard still holds — but this needs a real click-through-to-the-end test, not an assumption. |

## Testing

`lib/priceFilter.test.ts`, negative controls run BEFORE any of it is trusted (§10.28 rule 1):

- bounds round outward to a clean step, and never inside the real data
- p95 capping fires only when p95 < max, and `openTop` is set exactly then
- a top handle at maximum with `openTop` admits a row above p95
- an unconvertible row survives every range, including one that excludes everything
- a same-price page reports bounds that tell the caller not to render
- clamping across a currency change keeps the handles inside the new bounds

`scripts/interaction-audit.mjs` gets `price-slider-drag`: at phone width in **both engines**,
drag a thumb and assert the visible card count changes. Plus the §10.50 case — stub
`(hover: none)` to FALSE and tap-drag, because a Playwright touch context always reports it
true and the commonest real tablet configuration is unreachable otherwise. The negative
control is the un-wired component: the drag must fail to change the count before the wiring
lands.

## Out of scope

- Any URL parameter, canonical, or `noindex` handling — Tina chose client state only.
- `/modest-abayas/under-100` style landing pages. Still the bigger SEO opportunity; still on
  the backlog.
- Changing the Sort control, which already offers price ascending and descending.
