# Fix: Price sort compared raw numbers across currencies
**Date:** 2026-08-11 · **Status:** done

## Goal
A Reddit user asked for a price filter; Tina added the existing "Price: Low to
High"/"Price: High to Low" sort and replied "the products are a bit messed up
because of it… but it works!" Investigate and fix.

## What was wrong
`lib/sortRows.ts::comparablePrice()` only converted currency when the visitor
had picked an explicit display currency (`preference`). The site's default is
"As listed" (`preference === null`, ADR-0002 — no conversion, exact native
price shown). In that default state the sort compared raw numbers regardless
of currency: a £15 item sorted below a $900 item purely because 15 < 900,
with no relation to actual value. Every visitor who never touches the
currency switcher — i.e. almost everyone — got a nonsense price order.

## Fix
`comparablePrice()` now always converts to a single reference currency before
comparing: the visitor's display preference if one is set, `FX_BASE` (USD)
otherwise. Falls back to the raw native amount only when a currency has no
FX rate (existing behavior, mirrors `displayPrice()`'s own fallback). Display
is untouched — cards still show each brand's native price exactly, per
ADR-0002 — only the sort *order* now uses a comparable basis.

## Files changed
- `lib/sortRows.ts` — `comparablePrice()`.
- `lib/sortRows.test.ts` — the two price-sort tests documented the old
  (buggy) native-only behavior as intended; updated to assert the converted
  order, including a fixture whose order actually flips under conversion
  (£60 vs $70) so the test can't pass against a no-op comparator.

## Verification
```
$ rm tsconfig.tsbuildinfo && npx tsc --noEmit
(clean)
$ npx vitest run
Test Files  27 passed (27)
     Tests  480 passed (480)
```
`sortRowIndices(flipCat, [0,1], 'price-asc', null)` now returns `[1, 0]`
(USD-first) instead of `[0, 1]` (raw-number GBP-first) — the exact defect
reported.

## Notes / follow-ups
Shared by both grids (`DirectoryBrowser.tsx`, `FilterableGrid.tsx`) via one
comparator, per the file's own header comment — no per-grid drift possible.
