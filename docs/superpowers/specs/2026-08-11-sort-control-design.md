# Sort control — Price low/high, Newest, Oldest

**Date:** 2026-08-11 · **Status:** approved, proceeding straight to implementation (Tina's call)

## Goal

Add a "Sort" dropdown to the shared index console (`IndexPanel`), used on `/directory` and
every lane page. Options: **Featured** (default, today's order, unchanged) · **Price: Low to
High** · **Price: High to Low** · **Newest** · **Oldest**.

## UI

New `FilterDropdown` in `IndexPanel`, identical pattern to Category/Occasion/Brand (Base UI
`Menu.RadioGroup`, single-select). Lives in both `DirectoryBrowser.tsx` and
`FilterableGrid.tsx`. Sorting composes with existing filters/search: applied to
`filteredRows` before the `visible` slice. Unlike a filter, changing sort does **not** reset
`visible` — the same items stay loaded, just reordered.

## Data flow — `firstSeen` reaches the published catalogue

`firstSeen` exists on raw rows (`lib/lifecycle.ts`) but `stripLifecycle()` currently deletes
it before `products.json` is written (comment: "~5k rows... ~150 KB"). It needs to survive to
power Newest/Oldest, but must not bloat the RSC payload the way the comment warns about
(§8 landmine, Invariant 15).

1. **`lib/types.ts`** — add `firstSeen?: string | null` to `Product`.
2. **`lib/lifecycle.ts`** — remove `'firstSeen'` from `LIFECYCLE_KEYS` (the strip list keeps
   `lastSeen`/`delistedAt`/`filteredAt`/`filterReason` — none of those have a reader). Update
   the doc comment on `stripLifecycle` and the `Lifecycle` interface accordingly.
3. **`scripts/build-data.mjs`** — no change needed to `kept`/`interleaveByBrand`/
   `demoteGarment`; they pass objects through by reference/spread, so `firstSeen` already
   survives to `published`. Update the comment above the `writeFileSync(U('products.json')...)`
   line — it currently says lifecycle bookkeeping is raw-only, which stops being fully true.
4. **`lib/compactCatalogue.ts`** — this is where size is actually controlled. Add
   `rows.firstSeenDay: number[]` — an integer day-count, NOT the ISO string. Never decoded
   into `CardProduct` (nothing displays a date), same treatment as `occasionMask`.
   - Epoch: days since `2026-01-01T00:00:00Z` (`Math.floor((Date.parse(p.firstSeen) -
     EPOCH) / 86_400_000)`).
   - Missing `firstSeen` (`null`/`undefined`, ~36% of raw today, i.e. rows that pre-date
     lifecycle tracking) → sentinel `-1`. This is an honest value, not a fabrication: every
     dated row is dated ≥ 2026-08-05, so "older than any dated row" is true of an undated one
     whether or not its real age is known.
5. **`lib/compactCatalogue.test.ts`** — round-trip test: a product with a real `firstSeen`
   encodes to the correct day count; a product with `firstSeen: null`/absent encodes to `-1`.

## Price sort × currency

Reuses `lib/fx.ts` directly, no new conversion logic:

- Comparator value per row = `convert(price, brand.currency, preference) ?? price` — same
  fallback `displayPrice()` already uses, so a sort never disagrees with what's on screen.
- `preference` comes from `useCurrency()` (`CurrencyProvider`), already available to any
  client component.
- "As listed" (`preference === null`): compares native price as-is (no conversion attempted).

## Sort comparators (in `DirectoryBrowser.tsx` / `FilterableGrid.tsx`, or a shared helper if
the logic is identical in both — likely `lib/sortRows.ts` to avoid duplicating it)

- **Featured**: no-op, current order.
- **Price low→high / high→low**: numeric compare on the currency-aware value above.
- **Newest**: `firstSeenDay` descending (sentinel `-1` rows sort last — least recently
  confirmed).
- **Oldest**: `firstSeenDay` ascending (sentinel `-1` rows sort first — confirmed longest ago,
  which is true).

Ties (equal price or equal day) keep existing relative order (stable sort — `Array.prototype
.sort` is stable per spec, no extra tiebreaker needed).

## Testing

- `lib/compactCatalogue.test.ts`: `firstSeenDay` encode/decode, including the `-1` sentinel.
- A new `lib/sortRows.test.ts` (or co-located with wherever the comparator lives): price sort
  with a currency preference set and with `null` (native); Newest/Oldest ordering including
  sentinel rows; stability on ties.
- Existing `lib/lifecycle.test.ts` — extend/verify `stripLifecycle` still drops the other four
  keys and now keeps `firstSeen`.

## Out of scope

- No change to `Featured` ordering logic (`interleaveByBrand`/`demoteGarment`).
- No new brand-facing data — this only reuses `firstSeen`, which already exists.
- Not retrofitting `firstSeen` onto the ~36% of raw rows that pre-date tracking — they get the
  honest sentinel, and coverage improves naturally as `npm run refresh` touches more brands.
