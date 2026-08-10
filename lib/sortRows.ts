// Comparators for the site-wide Sort control (IndexPanel). Shared by
// DirectoryBrowser.tsx and FilterableGrid.tsx so the two grids can never
// drift on what "Newest" or "Price: Low to High" means.
import type { CompactCatalogue } from './compactCatalogue';
import { convert, type CurrencyPreference } from './fx';

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'oldest';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
];

/**
 * The value a price comparison uses for one row. Mirrors lib/fx.ts's own
 * displayPrice() fallback exactly, so a sort can never disagree with what's
 * on screen: converted amount when a display currency is chosen and a rate
 * exists, native amount otherwise.
 */
function comparablePrice(cat: CompactCatalogue, row: number, preference: CurrencyPreference): number {
  const price = cat.rows.price[row];
  if (!preference) return price;
  const nativeCurrency = cat.brands[cat.rows.brandIdx[row]].currency;
  const converted = convert(price, nativeCurrency, preference);
  return converted ?? price;
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
