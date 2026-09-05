// Comparators for the site-wide Sort control (IndexPanel). Shared by
// DirectoryBrowser.tsx and FilterableGrid.tsx so the two grids can never
// drift on what "Newest" or "Price: Low to High" means.
import type { CompactCatalogue } from './compactCatalogue';
import { convert, FX_BASE, type CurrencyPreference } from './fx';

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'oldest';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

/**
 * A row's price in the visitor's display currency, or null when that row's
 * native currency has no rate.
 *
 * Exported because the price FILTER needs the null and the price SORT must not
 * have it. A sort has to place every row somewhere, so comparablePrice below
 * falls back to the raw amount; a filter that did the same would compare a
 * ZZZ 500 piece against a dollar range as though the numbers were commensurate.
 * One reader of the price column, two policies on top of it — rather than the
 * duplicated-logic trap CLAUDE.md §8 records for the exclusion rules.
 */
export function convertedRowPrice(
  cat: CompactCatalogue,
  row: number,
  preference: CurrencyPreference,
): number | null {
  const price = cat.rows.price[row];
  const nativeCurrency = cat.brands[cat.rows.brandIdx[row]].currency;
  return convert(price, nativeCurrency, preference ?? FX_BASE);
}

/**
 * The value a price comparison uses for one row. ADR-0002 keeps DISPLAY in
 * each brand's native currency by default, but a sort has no such option —
 * an order has to pick one unit. With no display preference, comparing raw
 * native amounts mixes currencies as if they were equal (£15 sorting below
 * $900), which is not a price order at all. So ordering always converts to
 * a single reference currency — the visitor's display preference when one
 * is set (keeping order consistent with what's on screen), FX_BASE
 * otherwise — and only falls back to the raw amount when no rate exists for
 * that row's currency.
 */
function comparablePrice(cat: CompactCatalogue, row: number, preference: CurrencyPreference): number {
  return convertedRowPrice(cat, row, preference) ?? cat.rows.price[row];
}

export function sortRowIndices(
  cat: CompactCatalogue,
  rowIndices: number[],
  sort: SortKey,
  currencyPreference: CurrencyPreference,
): number[] {
  if (sort === 'featured') return rowIndices;

  const withKeys = rowIndices.map((row) => ({
    row,
    price: sort === 'price-asc' || sort === 'price-desc' ? comparablePrice(cat, row, currencyPreference) : 0,
    day: sort === 'newest' || sort === 'oldest' ? cat.rows.firstSeenDay[row] : 0,
  }));

  switch (sort) {
    case 'price-asc':
      withKeys.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      withKeys.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      withKeys.sort((a, b) => b.day - a.day);
      break;
    case 'oldest':
      withKeys.sort((a, b) => a.day - b.day);
      break;
    default: {
      // Exhaustiveness guard. Adding a SortKey without a case here is a compile
      // error rather than a silent fall-through to featured order — which would
      // look like a working control that simply never sorts.
      const _exhaustive: never = sort;
      throw new Error(`sortRowIndices: unhandled sort key ${String(_exhaustive)}`);
    }
  }

  return withKeys.map((k) => k.row);
}
