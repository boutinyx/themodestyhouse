# Sort Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sort dropdown (Featured / Price Low→High / Price High→Low / Newest / Oldest) to `/directory` and every lane page, backed by a `firstSeen` field that now survives publish as a compact day-index.

**Architecture:** `firstSeen` stops being stripped before publish (`lib/lifecycle.ts`), flows through `products.json` unchanged, and gets compressed into `rows.firstSeenDay: number[]` in `lib/compactCatalogue.ts` (never decoded into a card — sort-only, like `occasionMask`). A new pure comparator module (`lib/sortRows.ts`) is shared by `DirectoryBrowser.tsx` and `FilterableGrid.tsx`, both of which gain a `sort` dropdown wired through `IndexPanel`.

**Tech Stack:** TypeScript, Next.js App Router client components, Vitest, existing `lib/fx.ts` for currency conversion.

## Global Constraints

- Product id format, currency-comes-from-brand, and all other CLAUDE.md invariants are untouched by this work.
- `firstSeen` on `Product` is optional (`string | null | undefined`) — most existing fixtures across the test suite don't set it and must keep passing.
- No bulk/string date field may leak into `CompactCatalogue` — only the numeric `firstSeenDay` column (Invariant 15 concern from the spec).
- Every new/changed function needs a test before being trusted; run `npx tsc --noEmit` and `npm test` clean before each commit.
- `npm run build:data` is NOT run as part of this plan — no re-publish happens; this is a schema/UI change only. A plain `npm run build:data` is what populates `products.json` with real `firstSeen` values (NOT `npm run refresh` — no feed fetch is needed, the dates are already on the raw rows; the `postbuild:data` translate hook still runs and does hit the network when `.venv-style` exists, so this is "no feed fetch", not "fully offline"). Measured 2026-08-11: 17,033 of the 23,142 currently published rows (73.6%) already carry a `firstSeen` in `data/raw-products.json` and would get a real date from that publish; the other 6,109 pre-date lifecycle tracking and stay `null`.

---

### Task 1: Stop stripping `firstSeen`, add it to `Product`

**Files:**
- Modify: `lib/types.ts` (add field to `Product`)
- Modify: `lib/lifecycle.ts` (stop stripping `firstSeen`, update comments)
- Test: `lib/lifecycle.test.ts`

**Interfaces:**
- Produces: `Product.firstSeen?: string | null` — ISO date string, or `null`/`undefined` if never tracked. Read by Task 3 (`encodeCatalogue`).

- [ ] **Step 1: Write the failing test**

Open `lib/lifecycle.test.ts`. Find the `describe('stripLifecycle', ...)` block (search for `stripLifecycle` — it currently asserts all of `firstSeen`/`lastSeen`/`delistedAt`/`filteredAt`/`filterReason` are removed). Replace that block's body with:

```typescript
describe('stripLifecycle', () => {
  it('keeps firstSeen but drops the rest of the lifecycle bookkeeping', () => {
    const row: LifecycleRow = {
      ...product('inayah:1'),
      firstSeen: '2026-08-05',
      lastSeen: '2026-08-10',
      delistedAt: null,
      filteredAt: null,
      filterReason: undefined,
    };
    const stripped = stripLifecycle(row) as Product & { lastSeen?: unknown; delistedAt?: unknown; filteredAt?: unknown; filterReason?: unknown };
    expect(stripped.firstSeen).toBe('2026-08-05');
    expect('lastSeen' in stripped).toBe(false);
    expect('delistedAt' in stripped).toBe(false);
    expect('filteredAt' in stripped).toBe(false);
    expect('filterReason' in stripped).toBe(false);
  });

  it('keeps firstSeen: null (pre-dates tracking) rather than dropping it', () => {
    const row: LifecycleRow = { ...product('inayah:2'), firstSeen: null, lastSeen: '2026-08-10' };
    const stripped = stripLifecycle(row) as Product & { firstSeen?: string | null };
    expect(stripped.firstSeen).toBeNull();
  });
});
```

If an old `describe('stripLifecycle', ...)` block exists elsewhere with different assertions (e.g. checking `firstSeen` IS dropped), delete it — this replaces it.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/lifecycle.test.ts`
Expected: FAIL — `stripped.firstSeen` is `undefined`, not `'2026-08-05'` (current `LIFECYCLE_KEYS` still deletes it).

- [ ] **Step 3: Update `lib/types.ts`**

Find the `Product` interface. Add one field, after `id`/near the other bookkeeping-adjacent fields — place it right after `inStock: boolean;`:

```typescript
  inStock: boolean;
  /** ISO date first ingested by the refresh pipeline. `null` = confirmed
   *  present but pre-dates lifecycle tracking (before 2026-08-05); absent on
   *  any row a script constructs without lifecycle data (e.g. most test
   *  fixtures) — treat both as "unknown, at least as old as tracking start."
   *  Powers the Newest/Oldest sort (lib/sortRows.ts). Never stripped before
   *  publish as of 2026-08-11 — see lib/lifecycle.ts. */
  firstSeen?: string | null;
```

- [ ] **Step 4: Update `lib/lifecycle.ts`**

Change the `LIFECYCLE_KEYS` line (around line 27) from:

```typescript
const LIFECYCLE_KEYS = ['firstSeen', 'lastSeen', 'delistedAt', 'filteredAt', 'filterReason'] as const;
```

to:

```typescript
const LIFECYCLE_KEYS = ['lastSeen', 'delistedAt', 'filteredAt', 'filterReason'] as const;
```

Update the `stripLifecycle` doc comment (around line 170-175) from:

```typescript
/**
 * Drops lifecycle bookkeeping before publish. Rows carrying delistedAt/filteredAt
 * never publish anyway, but firstSeen/lastSeen on ~5k published rows would add
 * ~150 KB to products.json AND to every RSC payload — which §8 names as the real
 * scaling ceiling of this site.
 */
```

to:

```typescript
/**
 * Drops lifecycle bookkeeping before publish, EXCEPT firstSeen — that one is now
 * a published field (it powers the Newest/Oldest sort, lib/sortRows.ts). Rows
 * carrying delistedAt/filteredAt never publish anyway. lastSeen on ~5k published
 * rows would add real weight to products.json AND every RSC payload — which §8
 * names as the real scaling ceiling of this site — so it stays stripped; the
 * compact catalogue only ever needs firstSeen compressed to a day-index
 * (lib/compactCatalogue.ts), never the ISO string, for the same reason.
 */
```

Also update the `Lifecycle` interface doc comment on `firstSeen` (around line 14-15) — it currently says "Lives on raw rows ONLY — stripped before publish" in the interface-level comment. Change:

```typescript
/** Lifecycle bookkeeping. Lives on raw rows ONLY — stripped before publish. */
export interface Lifecycle {
  /** ISO date first ingested. `null` = pre-dates tracking; absent = never stamped. */
  firstSeen?: string | null;
```

to:

```typescript
/** Lifecycle bookkeeping. `firstSeen` is published (see stripLifecycle below);
 *  the rest lives on raw rows ONLY and is stripped before publish. */
export interface Lifecycle {
  /** ISO date first ingested. `null` = pre-dates tracking; absent = never stamped.
   *  PUBLISHED — also declared on Product itself (lib/types.ts). */
  firstSeen?: string | null;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/lifecycle.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (0 errors). `Product` now has an optional field, which is backward compatible with every existing object literal typed as `Product`.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/lifecycle.ts lib/lifecycle.test.ts
git commit -m "$(cat <<'EOF'
feat(lifecycle): stop stripping firstSeen before publish

firstSeen now survives to products.json so the sort control (Newest/
Oldest) has real data to work with. Nothing else in the strip list
changes — lastSeen/delistedAt/filteredAt/filterReason still never
publish.
EOF
)"
```

---

### Task 2: `firstSeenDay` in the compact catalogue

**Files:**
- Modify: `lib/compactCatalogue.ts`
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: `Product.firstSeen?: string | null` (Task 1).
- Produces: `CompactCatalogue.rows.firstSeenDay: number[]` — one entry per row, aligned by index with every other `rows.*` array. Real dates encode to `Math.floor((Date.parse(firstSeen) - EPOCH_MS) / 86_400_000)`; missing/null encodes to `-1`. `FIRST_SEEN_EPOCH` exported as `'2026-01-01T00:00:00.000Z'` for tests. Read by Task 4 (`lib/sortRows.ts`).

- [ ] **Step 1: Write the failing test**

Add to `lib/compactCatalogue.test.ts`, after the existing `describe('encodeCatalogue / decodeCard', ...)` block:

```typescript
describe('firstSeenDay encoding', () => {
  it('encodes a real firstSeen date as days since the epoch', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: '2026-08-05' }], [BRAND]);
    // 2026-01-01 -> 2026-08-05 is 216 days (31+28+31+30+31+30+31+4).
    expect(cat.rows.firstSeenDay[0]).toBe(216);
  });

  it('encodes firstSeen: null as the -1 sentinel', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: null }], [BRAND]);
    expect(cat.rows.firstSeenDay[0]).toBe(-1);
  });

  it('encodes a missing firstSeen (absent field) as the -1 sentinel', () => {
    // PRODUCT (defined above, shared by every test in this file) has no
    // firstSeen field at all — exactly the "never stamped" case.
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.rows.firstSeenDay[0]).toBe(-1);
  });

  it('does not add firstSeen to the decoded card', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, firstSeen: '2026-08-05' }], [BRAND]);
    const card = decodeCard(cat, 0);
    expect('firstSeen' in card).toBe(false);
    expect('firstSeenDay' in card).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: FAIL — `cat.rows.firstSeenDay` is `undefined` (property doesn't exist yet), so `[0]` throws / assertion fails.

- [ ] **Step 3: Implement in `lib/compactCatalogue.ts`**

Add the epoch constant near the top of the file, after the imports:

```typescript
/** Reference point for the compact day-index — see rows.firstSeenDay below. */
export const FIRST_SEEN_EPOCH = Date.parse('2026-01-01T00:00:00.000Z');

/** A product with no firstSeen (pre-dates lifecycle tracking, ~36% of raw rows
 *  as of 2026-08-11) sorts as older than every dated row — a true statement,
 *  since 2026-08-05 is the earliest date tracking can produce. */
const FIRST_SEEN_UNKNOWN = -1;

function encodeFirstSeenDay(firstSeen: string | null | undefined): number {
  if (!firstSeen) return FIRST_SEEN_UNKNOWN;
  const ms = Date.parse(firstSeen);
  if (Number.isNaN(ms)) return FIRST_SEEN_UNKNOWN;
  return Math.floor((ms - FIRST_SEEN_EPOCH) / 86_400_000);
}
```

Add `firstSeenDay: number[]` to the `CompactCatalogue['rows']` type (in the `rows: {...}` block of the `CompactCatalogue` interface), right after the `occasionMask` line:

```typescript
    /** Bit i set iff `occasions[i]` is in the product's occasion list. */
    occasionMask: number[];
    /** Days since FIRST_SEEN_EPOCH, or -1 if unknown. Sort-only — never
     *  decoded into CardProduct, same treatment as occasionMask. */
    firstSeenDay: number[];
```

In `encodeCatalogue`, add `firstSeenDay: []` to the `rows` initializer object (next to the other empty arrays), and add the push inside the main `for (const p of products)` loop, next to the other `rows.*.push(...)` calls (after `rows.occasionMask.push(mask);`):

```typescript
    rows.occasionMask.push(mask);
    rows.firstSeenDay.push(encodeFirstSeenDay(p.firstSeen));
```

Do NOT touch `decodeCard` — `firstSeenDay` is intentionally not part of `CardProduct`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "$(cat <<'EOF'
feat(catalogue): add firstSeenDay column to the compact catalogue

Compact integer day-index, not the ISO string, so the sort control's
Newest/Oldest data doesn't repeat the RSC-payload bloat that firstSeen
being on Product would otherwise cause. Sort-only — never decoded into
CardProduct.
EOF
)"
```

---

### Task 3: `lib/sortRows.ts` — the comparator module

**Files:**
- Create: `lib/sortRows.ts`
- Test: `lib/sortRows.test.ts`

**Interfaces:**
- Consumes: `CompactCatalogue` (Task 2's `rows.firstSeenDay`, plus existing `rows.price`, `rows.brandIdx`, `brands[].currency`); `lib/fx.ts`'s `convert(amount, from, to): number | null` and `CurrencyPreference` type (`DisplayCurrency | null`).
- Produces:
  - `export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'oldest';`
  - `export const SORT_OPTIONS: { value: SortKey; label: string }[]` — for the dropdown, in display order: Featured, Price: Low to High, Price: High to Low, Newest, Oldest.
  - `export function sortRowIndices(cat: CompactCatalogue, rowIndices: number[], sort: SortKey, currencyPreference: CurrencyPreference): number[]` — returns a new array (does not mutate `rowIndices`); `'featured'` returns `rowIndices` unchanged (same array reference is fine, no copy needed since it's a no-op).

Read by Task 4 (`DirectoryBrowser.tsx`) and Task 5 (`FilterableGrid.tsx`).

- [ ] **Step 1: Write the failing test**

Create `lib/sortRows.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { encodeCatalogue } from './compactCatalogue';
import { sortRowIndices, SORT_OPTIONS } from './sortRows';
import type { Product, Brand } from './types';

const GBP_BRAND: Brand = {
  slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.co', feedUrl: 'https://inayah.co/products.json',
  community: 'hijabi', currency: 'GBP', category: 'Modest dresses', city: 'London', vibe: 'elegant',
};
const USD_BRAND: Brand = {
  slug: 'aab', name: 'Aab', homepage: 'https://us.aabcollection.com', feedUrl: 'https://us.aabcollection.com/products.json',
  community: 'hijabi', currency: 'USD', category: 'Modest & abayas', city: 'London', vibe: 'elegant',
};

const base: Omit<Product, 'id' | 'brandSlug' | 'brandName' | 'currency' | 'price' | 'firstSeen'> = {
  title: 'Item', image: 'https://cdn.shopify.com/a.jpg', url: 'https://x.com/products/a',
  inStock: true, garment: 'dress', community: 'hijabi', occasion: [], season: [], activity: [],
};

const products: Product[] = [
  { ...base, id: 'inayah:1', brandSlug: 'inayah', brandName: 'Inayah', currency: 'GBP', price: 100, firstSeen: '2026-08-06' }, // idx 0
  { ...base, id: 'aab:1', brandSlug: 'aab', brandName: 'Aab', currency: 'USD', price: 50, firstSeen: '2026-08-08' },           // idx 1
  { ...base, id: 'inayah:2', brandSlug: 'inayah', brandName: 'Inayah', currency: 'GBP', price: 30, firstSeen: null },          // idx 2, unknown date
];

const cat = encodeCatalogue(products, [GBP_BRAND, USD_BRAND]);
const allRows = [0, 1, 2];

describe('SORT_OPTIONS', () => {
  it('lists featured first and both price directions before newest/oldest', () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(['featured', 'price-asc', 'price-desc', 'newest', 'oldest']);
  });
});

describe('sortRowIndices', () => {
  it('featured leaves order untouched', () => {
    expect(sortRowIndices(cat, allRows, 'featured', null)).toEqual([0, 1, 2]);
  });

  it('price-asc sorts by native price when no currency preference is set', () => {
    // native: inayah:1=£100, aab:1=$50, inayah:2=£30 -> compared as raw numbers 100, 50, 30
    expect(sortRowIndices(cat, allRows, 'price-asc', null)).toEqual([2, 1, 0]);
  });

  it('price-desc is the exact reverse of price-asc', () => {
    expect(sortRowIndices(cat, allRows, 'price-desc', null)).toEqual([0, 1, 2]);
  });

  it('price-asc converts to the selected display currency before comparing', () => {
    // Both GBP rows convert to whatever GBP->USD is; aab:1 is already USD ($50).
    // We don't assert exact converted numbers (fx-rates.json can change) — only
    // that the comparison is internally consistent: whichever of the two GBP
    // rows is cheaper stays cheaper relative to each other regardless of
    // conversion, and the result is a permutation of all three rows.
    const result = sortRowIndices(cat, allRows, 'price-asc', 'USD');
    expect(result.slice().sort()).toEqual([0, 1, 2]);
    // inayah:2 (£30) must sort below inayah:1 (£100) either way — conversion
    // is monotonic per currency.
    expect(result.indexOf(2)).toBeLessThan(result.indexOf(0));
  });

  it('newest sorts by firstSeenDay descending, unknown dates last', () => {
    // idx1 (2026-08-08) newest, idx0 (2026-08-06) next, idx2 (unknown/-1) last
    expect(sortRowIndices(cat, allRows, 'newest', null)).toEqual([1, 0, 2]);
  });

  it('oldest sorts by firstSeenDay ascending, unknown dates first', () => {
    // idx2 (-1, unknown) is treated as oldest, then idx0, then idx1
    expect(sortRowIndices(cat, allRows, 'oldest', null)).toEqual([2, 0, 1]);
  });

  it('does not mutate the input array', () => {
    const input = [0, 1, 2];
    sortRowIndices(cat, input, 'price-asc', null);
    expect(input).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/sortRows.test.ts`
Expected: FAIL — `Cannot find module './sortRows'`.

- [ ] **Step 3: Implement `lib/sortRows.ts`**

```typescript
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
  }

  return withKeys.map((k) => k.row);
}
```

Note: `Array.prototype.sort` is stable per the ECMAScript spec (guaranteed since ES2019, and both V8/Node and every evergreen browser honor it), so ties keep their incoming relative order with no extra tiebreaker code needed — this satisfies the spec's "ties keep existing relative order" requirement.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/sortRows.test.ts`
Expected: PASS, all tests green. If the `price-asc converts to the selected display currency` test fails because `fx-rates.json` has no GBP or USD rate in this environment, check `data/fx-rates.json` exists and has both keys (`node -e "console.log(require('./data/fx-rates.json').rates)"`) — it's a committed file, not fetched live, so it should always be present in a checkout.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/sortRows.ts lib/sortRows.test.ts
git commit -m "$(cat <<'EOF'
feat(sort): add sortRowIndices comparator module

Shared by DirectoryBrowser and FilterableGrid so both grids agree on
what Featured/Price/Newest/Oldest mean. Price comparison reuses
lib/fx.ts's own conversion + fallback so a sort can never disagree
with what's rendered on the card.
EOF
)"
```

---

### Task 4: Wire the Sort dropdown into `IndexPanel` + `DirectoryBrowser`

**Files:**
- Modify: `components/DirectoryBrowser.tsx`
- Test: manual verification via `npm run dev` (no dedicated component test exists for these grids today — `FilterDropdown`/`IndexPanel` have no test file, and this task follows that existing convention; the logic under test, `sortRowIndices`, is already covered by Task 3).

**Interfaces:**
- Consumes: `sortRowIndices`, `SortKey`, `SORT_OPTIONS` from `lib/sortRows.ts` (Task 3); `useCurrency()` from `components/CurrencyProvider.tsx` (already exists, already used by `ProductCard.tsx`).

- [ ] **Step 1: Modify `components/DirectoryBrowser.tsx`**

Add imports at the top (after the existing `IndexPanel` import):

```typescript
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { useCurrency } from './CurrencyProvider';
```

Add state, right after the existing `useState` declarations (after `const [visible, setVisible] = useState(STEP);`):

```typescript
  const [sort, setSort] = useState<SortKey>('featured');
  const { preference } = useCurrency();
```

After the `filteredRows` `useMemo` block (which currently ends with `return rows; }, [cat, garmentIdx, brandIdx, occasionBit, query]);`), add a second memo that applies sort on top:

```typescript
  const sortedRows = useMemo(
    () => sortRowIndices(cat, filteredRows, sort, preference),
    [cat, filteredRows, sort, preference],
  );
```

Update the `useEffect` that resets `visible` — sort must NOT trigger this reset (per spec: reordering shouldn't discard what's loaded), so leave its dependency array (`[garment, occasion, brand, q]`) exactly as-is — do not add `sort` to it.

Replace every subsequent reference to `filteredRows` that represents "the rows to actually show" with `sortedRows`, while keeping `filteredRows.length` for the "no matches" check and the "Showing X of Y" count (the count is unaffected by sort order, so either array works for `.length` — use `sortedRows` throughout for consistency since they're always the same length):

```typescript
  const shownRows = sortedRows.slice(0, visible);
  const shownCards = useMemo(() => shownRows.map((i) => decodeCard(cat, i)), [cat, shownRows]);
```

And further down, change:

```typescript
      <div className="brand-label mt-8 mb-4">Showing {shownCards.length} of {filteredRows.length}</div>
      {filteredRows.length === 0 ? (
```

to:

```typescript
      <div className="brand-label mt-8 mb-4">Showing {shownCards.length} of {sortedRows.length}</div>
      {sortedRows.length === 0 ? (
```

And:

```typescript
          {visible < filteredRows.length && (
```

to:

```typescript
          {visible < sortedRows.length && (
```

Finally, add the dropdown itself to the `IndexPanel` — in the JSX, change:

```tsx
      <IndexPanel q={q} onQ={setQ}>
        <FilterDropdown label="Category" value={garment} options={garments} onSelect={setGarment} />
        <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
      </IndexPanel>
```

to:

```tsx
      <IndexPanel q={q} onQ={setQ}>
        <FilterDropdown label="Category" value={garment} options={garments} onSelect={setGarment} />
        <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        <FilterDropdown
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onSelect={(v) => setSort(v === 'all' ? 'featured' : (v as SortKey))}
        />
      </IndexPanel>
```

Two things about this dropdown that differ from Category/Occasion/Brand, both deliberate:

1. **`options={SORT_OPTIONS}` includes `'featured'` itself**, unlike the other three dropdowns whose `options` never include their own "unset" state. `FilterDropdown` always injects a synthetic `{ value: 'all', label: 'All sort' }` row above whatever `options` you pass it (see `components/IndexPanel.tsx`). That synthetic `'all'` is a real, clickable option here too — the grid will show "All sort" above "Featured" — matching how Category shows "All category" above "Dresses". This is existing `FilterDropdown` behavior, not a new inconsistency.
2. **`onSelect` maps `'all'` to `'featured'`** because `'all'` isn't a member of `SortKey` — clicking that synthetic top row must still resolve to a valid, real default (Featured), not an invalid state.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/directory`.
- Click the new "Sort" chip — confirm the panel opens (Base UI menu, same as Category/Occasion/Brand) and shows: All sort, Featured, Price: Low to High, Price: High to Low, Newest, Oldest.
- Select "Price: Low to High" — confirm the grid re-renders with visibly ascending prices among the first ~24 cards (open a couple of cards' QuickView to read exact prices, or read prices directly off the cards).
- Select "Price: High to Low" — confirm it's the reverse.
- Combine with the existing "Category" filter (e.g. pick "Dresses") — confirm Sort still applies within the filtered set.
- Switch the currency preference (header currency switcher, e.g. to USD) while "Price: Low to High" is active — confirm the order can change (since comparison now uses converted amounts) and nothing crashes.
- Select "Newest" then "Oldest" — confirm the grid reorders (exact correctness of dates isn't visible in the UI without opening dev tools, but confirm no crash and the "Showing X of Y" count is unchanged by switching sort).
- Confirm changing Sort does NOT reset the "Load more" count (scroll down, click Load more once, then change Sort — the same number of cards should still be showing, just reordered) — this is the one behavior that deliberately differs from every other filter on this page.

- [ ] **Step 4: Commit**

```bash
git add components/DirectoryBrowser.tsx
git commit -m "$(cat <<'EOF'
feat(directory): add the Sort dropdown to DirectoryBrowser

Featured/Price low-high/Price high-low/Newest/Oldest, via the shared
lib/sortRows.ts comparator. Sort composes with the existing filters
and does not reset the load-more count (unlike every other filter,
reordering doesn't need to hide already-loaded cards).
EOF
)"
```

---

### Task 5: Wire the same Sort dropdown into `FilterableGrid` (lane pages)

**Files:**
- Modify: `components/FilterableGrid.tsx`

**Interfaces:**
- Consumes: same as Task 4 — `sortRowIndices`, `SORT_OPTIONS`, `SortKey` from `lib/sortRows.ts`; `useCurrency()`.

- [ ] **Step 1: Modify `components/FilterableGrid.tsx`**

Apply the identical change as Task 4, adapted to this file's variable names (it has `brand`/`occasion`/`q` state, no `garment` state — lanes are already one category). Add imports:

```typescript
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { useCurrency } from './CurrencyProvider';
```

Add state after `const [visible, setVisible] = useState(STEP);`:

```typescript
  const [sort, setSort] = useState<SortKey>('featured');
  const { preference } = useCurrency();
```

After the `filteredRows` `useMemo` (ends `return rows; }, [cat, brandIdx, occasionBit, query]);`), add:

```typescript
  const sortedRows = useMemo(
    () => sortRowIndices(cat, filteredRows, sort, preference),
    [cat, filteredRows, sort, preference],
  );
```

Leave the `visible`-reset `useEffect` dependency array (`[brand, occasion, q]`) unchanged — sort must not trigger it, same reasoning as Task 4.

Change:

```typescript
  const shownRows = filteredRows.slice(0, visible);
```

to:

```typescript
  const shownRows = sortedRows.slice(0, visible);
```

Change:

```tsx
      <div className="brand-label mb-4">
        Showing {shownCards.length} of {filteredRows.length}
      </div>

      {filteredRows.length === 0 ? (
```

to:

```tsx
      <div className="brand-label mb-4">
        Showing {shownCards.length} of {sortedRows.length}
      </div>

      {sortedRows.length === 0 ? (
```

Change:

```tsx
          {visible < filteredRows.length && (
```

to:

```tsx
          {visible < sortedRows.length && (
```

Add the dropdown to the `IndexPanel` JSX:

```tsx
      <IndexPanel q={q} onQ={setQ} className="mb-8">
        {occasions.length > 0 && (
          <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        )}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        <FilterDropdown
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onSelect={(v) => setSort(v === 'all' ? 'featured' : (v as SortKey))}
        />
      </IndexPanel>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open a lane page, e.g. `http://localhost:3000/modest-dresses`.
- Repeat the same checks as Task 4 Step 4 (Sort chip opens, price-asc/desc reorders, combines with Brand/Occasion filters, survives a currency switch, Load More count survives a sort change).
- Additionally check a lane with no `occasions` (if one exists — the `{occasions.length > 0 && ...}` guard means some lanes render fewer chips) to confirm Sort still renders correctly when Occasion is absent.

- [ ] **Step 4: Commit**

```bash
git add components/FilterableGrid.tsx
git commit -m "$(cat <<'EOF'
feat(lanes): add the Sort dropdown to FilterableGrid

Same lib/sortRows.ts-backed control as DirectoryBrowser, so every
lane page (and /directory) offers identical sort behavior.
EOF
)"
```

---

### Task 6: Full suite + lint + docs log

**Files:**
- Create: `docs/log/2026-08-11-sort-control.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `lib/lifecycle.test.ts`, `lib/compactCatalogue.test.ts`, and `lib/sortRows.test.ts` assertions from Tasks 1-3.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean (per CLAUDE.md §4, this is a CI job — treat any new finding as a regression to fix, not a pre-existing one to ignore, since `.venv-style`/`.cache`/`conversations` are already excluded).

- [ ] **Step 3: Full typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean. (Removing `tsconfig.tsbuildinfo` first because `incremental: true` can mask a repeat run — CLAUDE.md §4.)

- [ ] **Step 4: Write the docs/log entry**

Create `docs/log/2026-08-11-sort-control.md`:

```markdown
# Sort control — Price low/high, Newest, Oldest

**Date:** 2026-08-11 · **Status:** done

## Goal

Add a Sort dropdown (Featured / Price Low→High / Price High→Low / Newest / Oldest) to
`/directory` and every lane page.

## What changed

- `lib/types.ts` — `Product` gains `firstSeen?: string | null`.
- `lib/lifecycle.ts` — `stripLifecycle()` no longer removes `firstSeen`; it's now a published
  field. `lastSeen`/`delistedAt`/`filteredAt`/`filterReason` are unaffected, still stripped.
- `lib/compactCatalogue.ts` — new `rows.firstSeenDay: number[]` column, a compact integer
  day-index (days since `FIRST_SEEN_EPOCH` = 2026-01-01), `-1` sentinel for unknown/never-tracked
  rows. Sort-only — not decoded into `CardProduct`.
- `lib/sortRows.ts` (new) — `sortRowIndices()`, the shared comparator for both grids.
  Price comparison reuses `lib/fx.ts`'s `convert()` with the same native-price fallback
  `displayPrice()` uses, so sort order can never disagree with what's rendered.
- `components/DirectoryBrowser.tsx`, `components/FilterableGrid.tsx` — new "Sort"
  `FilterDropdown` in the shared `IndexPanel`. Composes with existing filters; deliberately
  does NOT reset the "Load more" count when changed (unlike every other filter).

## Verification

- `npm test` — [paste real output here when run]
- `npm run lint` — [paste real output here when run]
- `npx tsc --noEmit` — [paste real output here when run]
- Manual: `/directory` and a lane page, Sort chip opens, all five options reorder the grid
  correctly, composes with Category/Occasion/Brand/search, survives a currency-preference
  switch, Load More count survives a sort change.

## Notes / follow-ups

- No re-publish (`npm run build:data`) was run — `products.json` at HEAD still has no
  `firstSeen` values (the field was always stripped before this change). Newest/Oldest will
  show every row as the `-1`/unknown bucket (in whatever stable order they arrive in) until the
  next real `npm run refresh` populates real dates. This is expected, not a bug — see the
  design spec's "Out of scope" section.
- `firstSeen` coverage is ~64% of raw rows as of 2026-08-10 (tracking started 2026-08-05);
  it improves naturally as brands get refreshed, never retroactively.
```

Fill in the `[paste real output here when run]` placeholders with the ACTUAL command output from Steps 1-3 before committing — do not commit the literal placeholder text.

- [ ] **Step 5: Commit**

```bash
git add docs/log/2026-08-11-sort-control.md
git commit -m "$(cat <<'EOF'
docs: log the sort control implementation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
