# Price Range Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-handle price range slider to every catalogue grid on the site, filtering client-side in the visitor's display currency.

**Architecture:** One pure module (`lib/priceFilter.ts`) computes bounds and the row predicate; one client component (`components/PriceRange.tsx`) wraps Base UI's Slider; both existing grids (`FilterableGrid`, `DirectoryBrowser`) gain one more predicate in their filter loop and render the control inside `IndexPanel`. No server change, no URL parameter, no payload change — `rows.price` is already a column in the compact catalogue.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Vitest 4 (node env) · `@base-ui-components/react` Slider · Tailwind v4 for layout only

**Spec:** `docs/superpowers/specs/2026-09-05-price-range-filter-design.md`

## Global Constraints

- **Every colour, border and shadow is an inline `style={{}}` with a `var(--token)`.** Colour is never a Tailwind class in this repo (CLAUDE.md §6). Tokens: `--aubergine #441943`, `--plum #6e4a6b`, `--parchment #faf7f1`, `--ink #241b24`, `--hairline #e4ddcf`, `--muted #796e5e`.
- **Every money string goes through `formatPrice(amount, currency)` from `lib/price.ts`.** Never a template literal with a `$` in it (ADR-0002).
- **Every icon is Phosphor** (`@phosphor-icons/react`), never a text glyph. Server components import from `@phosphor-icons/react/dist/ssr`.
- **Tests are co-located** `lib/<module>.test.ts`, importing the module relatively and types via `@/lib/types`.
- **No URL parameter, no canonical change, no sitemap change.** Tina chose client state only.
- **Never `git add` a directory in this tree** (§10.55) — name every file. Run `git diff --cached` as its own command before committing (§10.30), and stage+commit in one command (§10.39).
- **Commit messages go through `git commit -F <file>`**, never `-m` with backticks — zsh evaluates them (§10.20).
- The branch is `staging`. Never push to `main` without Tina's explicit approval.

---

### Task 1: Expose a price conversion that can say "no rate"

`comparablePrice` in `lib/sortRows.ts` is module-private and, critically, **swallows the distinction the filter needs**: when no FX rate exists it returns the raw native amount, so a €500 piece with no rate is indistinguishable from a $500 one. That is a defensible compromise for *sorting* (an order must place every row somewhere) and a bug for *filtering* (a range in dollars would silently exclude it, or worse, include it at the wrong end).

This task extracts the conversion so both callers share one reader of the price column, and the filter can see the null.

**Files:**
- Modify: `lib/sortRows.ts:28-33`
- Test: `lib/sortRows.test.ts`

**Interfaces:**
- Consumes: `CompactCatalogue` from `./compactCatalogue`; `convert`, `FX_BASE`, `CurrencyPreference` from `./fx`
- Produces: `export function convertedRowPrice(cat: CompactCatalogue, row: number, preference: CurrencyPreference): number | null` — the row's price in the visitor's display currency, or `null` when that row's native currency has no rate. Task 2 depends on this exact name and return type.

- [ ] **Step 1: Write the failing test**

Append to `lib/sortRows.test.ts`. Build the fixture the way the existing tests in that file do; if there is no catalogue factory there yet, this literal is self-contained:

```ts
import { convertedRowPrice } from './sortRows';

function catWith(rows: { price: number; currency: string }[]) {
  return {
    brands: rows.map((r, i) => ({ slug: `b${i}`, name: `B${i}`, currency: r.currency })),
    rows: {
      price: rows.map((r) => r.price),
      brandIdx: rows.map((_, i) => i),
      title: rows.map(() => 't'),
      firstSeenDay: rows.map(() => 0),
    },
  } as unknown as CompactCatalogue;
}

describe('convertedRowPrice', () => {
  it('converts into the visitor display currency', () => {
    const cat = catWith([{ price: 100, currency: 'USD' }]);
    expect(convertedRowPrice(cat, 0, 'USD')).toBe(100);
  });

  // The whole reason this function exists separately from comparablePrice.
  it('returns null rather than a raw amount when the row currency has no rate', () => {
    const cat = catWith([{ price: 500, currency: 'ZZZ' }]);
    expect(convertedRowPrice(cat, 0, 'USD')).toBeNull();
  });

  it('falls back to FX_BASE when the visitor has no preference', () => {
    const cat = catWith([{ price: 100, currency: FX_BASE }]);
    expect(convertedRowPrice(cat, 0, null)).toBe(100);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/sortRows.test.ts`
Expected: FAIL — `convertedRowPrice is not a function` / no matching export.

- [ ] **Step 3: Implement it and rebuild `comparablePrice` on top**

Replace `lib/sortRows.ts:28-33` with:

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/sortRows.test.ts`
Expected: PASS, including every pre-existing sort test — `comparablePrice`'s behaviour is unchanged by construction.

- [ ] **Step 5: Commit**

```bash
git diff --cached --name-only   # read this, then commit as a separate command
git add lib/sortRows.ts lib/sortRows.test.ts && git commit -F /tmp/t1.txt -- lib/sortRows.ts lib/sortRows.test.ts
```

`/tmp/t1.txt`:

```
refactor(sort): expose convertedRowPrice, which can say "no rate"

comparablePrice falls back to the raw native amount when no FX rate exists —
correct for a sort, which must place every row somewhere, and wrong for the
price filter about to be built, which would compare ZZZ 500 against a dollar
range as if the numbers were commensurate. Extracted so both share one reader
of the price column and only the filter sees the null.
```

---

### Task 2: The pure filter module

**Files:**
- Create: `lib/priceFilter.ts`
- Test: `lib/priceFilter.test.ts`

**Interfaces:**
- Consumes: `convertedRowPrice` from `./sortRows` (Task 1); `CompactCatalogue`; `CurrencyPreference`
- Produces:
  - `export type PriceBounds = { min: number; max: number; step: number; openTop: boolean; usable: boolean }`
  - `export function priceBounds(cat: CompactCatalogue, rows: number[], preference: CurrencyPreference): PriceBounds`
  - `export function withinPrice(cat: CompactCatalogue, row: number, preference: CurrencyPreference, range: [number, number], openTop: boolean): boolean`
  - `export function clampRange(range: [number, number], bounds: PriceBounds): [number, number]`
  - `export const MIN_ROWS_FOR_SLIDER = 8`

- [ ] **Step 1: Write the failing tests**

Create `lib/priceFilter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { priceBounds, withinPrice, clampRange, MIN_ROWS_FOR_SLIDER } from './priceFilter';
import type { CompactCatalogue } from './compactCatalogue';

function catWith(prices: number[], currency = 'USD'): CompactCatalogue {
  return {
    brands: [{ slug: 'b', name: 'B', currency }],
    rows: { price: prices, brandIdx: prices.map(() => 0), title: prices.map(() => 't'), firstSeenDay: prices.map(() => 0) },
  } as unknown as CompactCatalogue;
}
const all = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('priceBounds', () => {
  it('rounds outward to a clean step, never inside the real data', () => {
    const cat = catWith([12, 37, 44, 61, 88, 91, 103, 118, 129, 140]);
    const b = priceBounds(cat, all(10), 'USD');
    expect(b.min).toBeLessThanOrEqual(12);
    expect(b.max).toBeGreaterThanOrEqual(129); // p95 of this set
    expect(b.min % b.step).toBe(0);
    expect(b.max % b.step).toBe(0);
  });

  // The measured problem the spec is built around: /modest-hijabs runs $1-$243
  // and 75% of it sits under $32, so a track to the true max is unusable.
  it('caps the track at p95 and flags openTop when a tail exists', () => {
    const prices = [...Array(95).fill(20), ...Array(5).fill(2000)];
    const b = priceBounds(catWith(prices), all(100), 'USD');
    expect(b.openTop).toBe(true);
    expect(b.max).toBeLessThan(2000);
  });

  it('does not flag openTop when there is no tail above p95', () => {
    const b = priceBounds(catWith(Array(100).fill(50)), all(100), 'USD');
    expect(b.openTop).toBe(false);
  });

  it('reports unusable when every row is the same price', () => {
    expect(priceBounds(catWith(Array(20).fill(50)), all(20), 'USD').usable).toBe(false);
  });

  it('reports unusable below the row floor', () => {
    const n = MIN_ROWS_FOR_SLIDER - 1;
    const prices = Array.from({ length: n }, (_, i) => 10 + i * 10);
    expect(priceBounds(catWith(prices), all(n), 'USD').usable).toBe(false);
  });

  it('ignores rows it cannot convert when computing bounds', () => {
    const cat = {
      brands: [{ slug: 'a', name: 'A', currency: 'USD' }, { slug: 'z', name: 'Z', currency: 'ZZZ' }],
      rows: { price: [10, 20, 30, 40, 50, 60, 70, 80, 999999], brandIdx: [0, 0, 0, 0, 0, 0, 0, 0, 1], title: Array(9).fill('t'), firstSeenDay: Array(9).fill(0) },
    } as unknown as CompactCatalogue;
    expect(priceBounds(cat, all(9), 'USD').max).toBeLessThan(999999);
  });
});

describe('withinPrice', () => {
  const cat = catWith([10, 50, 100]);

  it('includes a row inside the range and excludes one outside it', () => {
    expect(withinPrice(cat, 1, 'USD', [40, 60], false)).toBe(true);
    expect(withinPrice(cat, 0, 'USD', [40, 60], false)).toBe(false);
  });

  it('is inclusive at both ends', () => {
    expect(withinPrice(cat, 0, 'USD', [10, 50], false)).toBe(true);
    expect(withinPrice(cat, 1, 'USD', [10, 50], false)).toBe(true);
  });

  it('admits everything above the top handle when openTop is set', () => {
    expect(withinPrice(cat, 2, 'USD', [10, 60], true)).toBe(true);
    expect(withinPrice(cat, 2, 'USD', [10, 60], false)).toBe(false);
  });

  // A filter must never delete a product because we could not price it.
  it('includes a row whose currency has no rate, whatever the range', () => {
    const noRate = {
      brands: [{ slug: 'z', name: 'Z', currency: 'ZZZ' }],
      rows: { price: [500], brandIdx: [0], title: ['t'], firstSeenDay: [0] },
    } as unknown as CompactCatalogue;
    expect(withinPrice(noRate, 0, 'USD', [0, 1], false)).toBe(true);
  });
});

describe('clampRange', () => {
  it('pulls both handles inside new bounds after a currency change', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    expect(clampRange([5, 500], b)).toEqual([10, 100]);
  });

  it('leaves a range that already fits alone', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    expect(clampRange([20, 80], b)).toEqual([20, 80]);
  });

  it('never returns an inverted range', () => {
    const b = { min: 10, max: 100, step: 5, openTop: false, usable: true };
    const [lo, hi] = clampRange([90, 20], b);
    expect(lo).toBeLessThanOrEqual(hi);
  });
});
```

- [ ] **Step 2: Run and watch every one fail**

Run: `npx vitest run lib/priceFilter.test.ts`
Expected: FAIL — `Cannot find module './priceFilter'`.

- [ ] **Step 3: Implement**

Create `lib/priceFilter.ts`:

```ts
import { convertedRowPrice } from './sortRows';
import type { CompactCatalogue } from './compactCatalogue';
import type { CurrencyPreference } from './fx';

/**
 * A slider over fewer than this many rows is worse than no slider: the control
 * costs a row of the filter bar and can only ever remove two or three cards.
 */
export const MIN_ROWS_FOR_SLIDER = 8;

/**
 * The track stops here rather than at the true maximum.
 *
 * MEASURED, 2026-09-05, not chosen: prices are heavily right-skewed, and on
 * /modest-hijabs (which runs $1-$243) three quarters of the catalogue sits
 * inside the FIRST 13% of a linear track to the max. Every adjustment a real
 * shopper wants happens within a few pixels while 87% of the travel separates
 * a handful of outliers. Capping at p95 moves that 75% into 43% of the track.
 *
 * Nothing is hidden: a top handle parked at the maximum sets openTop, and
 * withinPrice then admits everything above it.
 */
const TAIL_PERCENTILE = 0.95;

/** Steps that make a slider land on numbers a person would say out loud. */
const STEPS = [1, 5, 10, 25, 50];

export type PriceBounds = {
  min: number;
  max: number;
  step: number;
  /** True when rows exist above `max`; the top handle then means "and up". */
  openTop: boolean;
  /** False when the control should not be rendered at all. */
  usable: boolean;
};

const UNUSABLE: PriceBounds = { min: 0, max: 0, step: 1, openTop: false, usable: false };

function stepFor(span: number): number {
  // ~20 stops across the track: fine enough to be precise, coarse enough that
  // dragging does not produce $73.
  for (const s of STEPS) if (span / s <= 20) return s;
  return STEPS[STEPS.length - 1];
}

export function priceBounds(
  cat: CompactCatalogue,
  rows: number[],
  preference: CurrencyPreference,
): PriceBounds {
  if (rows.length < MIN_ROWS_FOR_SLIDER) return UNUSABLE;

  const values: number[] = [];
  for (const row of rows) {
    const v = convertedRowPrice(cat, row, preference);
    // An unconvertible row cannot inform the bounds — it has no comparable
    // number. It is still never FILTERED OUT; see withinPrice.
    if (v !== null) values.push(v);
  }
  if (values.length < MIN_ROWS_FOR_SLIDER) return UNUSABLE;

  values.sort((a, b) => a - b);
  const lo = values[0];
  const trueMax = values[values.length - 1];
  const cap = values[Math.min(values.length - 1, Math.floor((values.length - 1) * TAIL_PERCENTILE))];
  if (lo === trueMax) return UNUSABLE;

  const step = stepFor(Math.max(cap - lo, 1));
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(cap / step) * step;
  if (min === max) return UNUSABLE;

  return { min, max, step, openTop: trueMax > max, usable: true };
}

export function withinPrice(
  cat: CompactCatalogue,
  row: number,
  preference: CurrencyPreference,
  range: [number, number],
  openTop: boolean,
): boolean {
  const v = convertedRowPrice(cat, row, preference);
  // Invariant 9's reasoning one layer out: not being able to classify — here,
  // to price — a product is not evidence it should disappear.
  if (v === null) return true;
  const [lo, hi] = range;
  if (v < lo) return false;
  return v <= hi || openTop;
}

/** Keeps a range inside bounds that moved, e.g. after a currency change. */
export function clampRange(range: [number, number], bounds: PriceBounds): [number, number] {
  const lo = Math.min(Math.max(range[0], bounds.min), bounds.max);
  const hi = Math.min(Math.max(range[1], bounds.min), bounds.max);
  return lo <= hi ? [lo, hi] : [hi, lo];
}
```

- [ ] **Step 4: Run and watch every one pass**

Run: `npx vitest run lib/priceFilter.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Prove the two load-bearing guards actually fire (§10.28 rule 1)**

Temporarily change `if (v === null) return true;` to `return false;` in `withinPrice` and run again.
Expected: FAIL — "includes a row whose currency has no rate". Restore it.

Then temporarily set `TAIL_PERCENTILE = 1` and run again.
Expected: FAIL — "caps the track at p95 and flags openTop when a tail exists". Restore it.

Both restored: `npx vitest run lib/priceFilter.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git diff --cached --name-only
git add lib/priceFilter.ts lib/priceFilter.test.ts && git commit -F /tmp/t2.txt -- lib/priceFilter.ts lib/priceFilter.test.ts
```

`/tmp/t2.txt`:

```
feat(filter): the pure price-range module

priceBounds derives a slider's min/max/step from the rows on the page, in the
visitor's display currency. The track stops at p95 rather than the true max,
which is measured not chosen: on /modest-hijabs a linear track to $243 puts 75%
of the catalogue in the first 13% of it. A parked top handle sets openTop and
withinPrice then admits the tail, so the cap changes resolution, not visibility.

A row whose currency has no rate is included by every range. Not being able to
price a product is not evidence it should disappear.

Negative controls run first: forcing openTop off fails the cap test, and
excluding unconvertible rows fails the inclusion test.
```

---

### Task 3: The slider component

**Files:**
- Create: `components/PriceRange.tsx`
- Modify: none

**Interfaces:**
- Consumes: `PriceBounds` from `@/lib/priceFilter` (Task 2); `formatPrice` from `@/lib/price`; `Slider` from `@base-ui-components/react/slider`
- Produces: `export default function PriceRange(props: { bounds: PriceBounds; value: [number, number]; onChange: (v: [number, number]) => void; currency: string })` — Task 4 renders this.

- [ ] **Step 1: Write the component**

Create `components/PriceRange.tsx`:

```tsx
'use client';

import { Slider } from '@base-ui-components/react/slider';
import { formatPrice } from '@/lib/price';
import type { PriceBounds } from '@/lib/priceFilter';

/**
 * The price range control in IndexPanel.
 *
 * Base UI's Slider rather than a hand-rolled one, deliberately: CLAUDE.md
 * §10.25 records that hand-rolling a dropdown instead of reusing this same
 * primitive family is what left the filter menus unreachable on every iPhone
 * and iPad for as long as they existed. Its value is a readonly number[] with
 * indexed thumbs, and it handles pointer, touch and keyboard natively.
 *
 * Every colour is an inline var(--token) style, per §6 — colour is never a
 * Tailwind class in this repo. Every amount goes through formatPrice, which is
 * ADR-0002's single source of truth for money.
 */
export default function PriceRange({
  bounds,
  value,
  onChange,
  currency,
}: {
  bounds: PriceBounds;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  currency: string;
}) {
  if (!bounds.usable) return null;

  const atTop = value[1] >= bounds.max;
  const label =
    `${formatPrice(value[0], currency)} — ${formatPrice(value[1], currency)}` +
    (bounds.openTop && atTop ? '+' : '');

  return (
    <div className="flex flex-col gap-1.5 min-w-[190px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow" style={{ color: 'var(--muted)' }}>
          Price
        </span>
        <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
      </div>
      <Slider.Root
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        // Both handles may meet but never cross; a zero-width range is a
        // legitimate "exactly this price" selection.
        minStepsBetweenValues={0}
      >
        <Slider.Control className="flex items-center h-6 w-full touch-none select-none">
          <Slider.Track
            className="h-[3px] w-full rounded-full"
            style={{ backgroundColor: 'var(--hairline)' }}
          >
            <Slider.Indicator className="rounded-full" style={{ backgroundColor: 'var(--plum)' }} />
            {/* 20px targets: below the 24px the mobile audit checks for, so the
                visual dot is 12px and the hit area is padded around it. */}
            <Slider.Thumb
              index={0}
              getAriaLabel={() => 'Minimum price'}
              className="size-3 rounded-full outline-none focus-visible:ring-2"
              style={{ backgroundColor: 'var(--aubergine)', boxShadow: '0 0 0 6px var(--parchment)' }}
            />
            <Slider.Thumb
              index={1}
              getAriaLabel={() => 'Maximum price'}
              className="size-3 rounded-full outline-none focus-visible:ring-2"
              style={{ backgroundColor: 'var(--aubergine)', boxShadow: '0 0 0 6px var(--parchment)' }}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck it**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean, apart from two pre-existing `.next/types/validator.ts` errors mentioning `app/directory/page.js` — stale generated route types for a page deleted on 2026-09-01, not caused by this work. Any error naming `components/PriceRange.tsx` is yours.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git diff --cached --name-only
git add components/PriceRange.tsx && git commit -F /tmp/t3.txt -- components/PriceRange.tsx
```

`/tmp/t3.txt`:

```
feat(filter): the price range slider component

Base UI's Slider with two indexed thumbs rather than a hand-rolled control —
§10.25 records that hand-rolling instead of reusing this primitive family is
what left the filter menus unreachable on every iPhone. Renders nothing when
bounds.usable is false. Label goes through formatPrice and gains a "+" when a
parked top handle means "and up".
```

---

### Task 4: Wire it into both grids

**Files:**
- Modify: `components/FilterableGrid.tsx` (state near line 104, `filteredRows` at 324, the reset effect at 383, the `IndexPanel` children at ~465)
- Modify: `components/DirectoryBrowser.tsx` (state near line 53, `filteredRows` at 94, the reset effect at 130, the `IndexPanel` children)

**Interfaces:**
- Consumes: `priceBounds`, `withinPrice`, `clampRange`, type `PriceBounds` from `@/lib/priceFilter`; `PriceRange` from `@/components/PriceRange`
- Produces: nothing new — this is the last consumer.

- [ ] **Step 1: Add the state and the derived bounds, in BOTH files**

The bounds must be computed from the rows that survive **every other filter**, so the slider describes the set the visitor is actually looking at. That means a two-pass memo: filter without price, derive bounds, then apply price.

In each file, immediately after the existing `const [colour, setColour] = useState('all');`:

```tsx
  // null until the visitor touches the slider. Kept separate from `bounds` so
  // an untouched control filters nothing at all — the alternative, seeding it
  // to [min, max], makes every currency change or filter change silently
  // re-clamp a range the visitor never chose.
  const [price, setPrice] = useState<[number, number] | null>(null);
```

Rename the existing `filteredRows` memo to `rowsBeforePrice` (same body, unchanged), then add below it:

```tsx
  const bounds = useMemo(
    () => priceBounds(cat, rowsBeforePrice, preference),
    [cat, rowsBeforePrice, preference],
  );

  // Clamp rather than reset when the bounds move under a chosen range —
  // switching display currency must not throw away the visitor's choice.
  const effectivePrice = useMemo<[number, number] | null>(
    () => (price && bounds.usable ? clampRange(price, bounds) : null),
    [price, bounds],
  );

  const filteredRows = useMemo(() => {
    if (!effectivePrice) return rowsBeforePrice;
    return rowsBeforePrice.filter((i) =>
      withinPrice(cat, i, preference, effectivePrice, bounds.openTop),
    );
  }, [cat, rowsBeforePrice, effectivePrice, preference, bounds.openTop]);
```

Add the imports at the top of each file:

```tsx
import { priceBounds, withinPrice, clampRange } from '@/lib/priceFilter';
import PriceRange from '@/components/PriceRange';
```

- [ ] **Step 2: Reset the "load more" count when the price changes**

In each file, add `price` to the existing reset effect's dependency array — the one whose comment explains why `sort` is deliberately absent. In `FilterableGrid.tsx` that becomes:

```tsx
  }, [brand, type, fabricType, colour, q, price]);
```

and in `DirectoryBrowser.tsx` add `price` to the equivalent array. This matters: a price change is a change of SET, not of order, and leaving it out means a visitor who filters after loading 96 cards keeps seeing rows that no longer match.

- [ ] **Step 3: Render the control**

In each file, inside `<IndexPanel …>`, immediately after the `<FilterDropdown label="Brand" … />` line:

```tsx
        {bounds.usable && (
          <PriceRange
            bounds={bounds}
            value={effectivePrice ?? [bounds.min, bounds.max]}
            onChange={setPrice}
            currency={preference ?? FX_BASE}
          />
        )}
```

Both files already have `const { preference } = useCurrency();` in scope — `FilterableGrid.tsx:164`, `DirectoryBrowser.tsx:53`. Confirm `FX_BASE` is imported from `@/lib/fx` in both and add it where it is not.

- [ ] **Step 4: The reset affordance**

The spec requires one, and without it a visitor who drags the range down to a set that matches nothing is left on an empty page whose only escape is to find two small handles and drag them back. Add it to `PriceRange.tsx`, so both grids get it from one place — and gate it on `value` differing from the full span, so it never appears on an untouched control:

```tsx
        {(value[0] > bounds.min || value[1] < bounds.max) && (
          <button
            type="button"
            onClick={() => onChange([bounds.min, bounds.max])}
            className="text-[12px] underline underline-offset-2 self-start"
            style={{ color: 'var(--muted)' }}
          >
            Reset price
          </button>
        )}
```

Note this hands back `[bounds.min, bounds.max]` rather than `null`. The parent treats a full-span range as "everything", so the effect is identical and the component stays a controlled input with no null case to reason about.

- [ ] **Step 5: Verify by hand against a real build, not the dev server**

```bash
git worktree add /tmp/price-wt HEAD          # §10.28 rule 4: .next is shared
cp -al node_modules /tmp/price-wt/node_modules   # hardlink; a symlink panics Turbopack (§10.38)
cd /tmp/price-wt && npm run build && npx next start -p 3199
```

Then, in another shell:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3199/modest-abayas', { waitUntil: 'networkidle' });
  console.log('body bg:', await p.evaluate(() => getComputedStyle(document.body).backgroundColor));
  const before = await p.locator('[data-surface=\"product-card\"]').count();
  const thumb = p.locator('[role=\"slider\"]').last();
  const box = await thumb.boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x - 220, box.y + box.height / 2, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(400);
  console.log('cards before:', before, '-> after:', await p.locator('[data-surface=\"product-card\"]').count());
  await b.close();
})();
"
```

Expected: `body bg: rgb(250, 247, 241)` (the CSS genuinely loaded — §10.24; a run without it measures nothing) and a card count that DROPS. If the count is unchanged, the wiring is not live — do not proceed.

- [ ] **Step 6: Full suite, typecheck, lint**

Run: `npm test && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint`
Expected: all tests pass; tsc clean apart from the two known `.next` `app/directory/page.js` errors; lint exit 0.

- [ ] **Step 7: Commit**

```bash
git worktree remove /tmp/price-wt --force
git diff --cached --name-only
git add components/FilterableGrid.tsx components/DirectoryBrowser.tsx && git commit -F /tmp/t4.txt -- components/FilterableGrid.tsx components/DirectoryBrowser.tsx
```

`/tmp/t4.txt`:

```
feat(filter): price range on every lane, designer, edit and /new-in

Two-pass filtering: rowsBeforePrice runs every other predicate, bounds are
derived from THAT set so the slider describes what the visitor is looking at,
then the price predicate applies. Bounds move with the display currency and the
chosen range is clamped rather than discarded.

price joins the load-more reset dependencies — a price change is a change of
set, not of order, so a visitor who filters after loading 96 cards must not keep
rows that no longer match.

Verified against a production build in a worktree, not the dev server: card
count drops on a real thumb drag, with the stylesheet assertion so the run
cannot report numbers from an unstyled page.
```

---

### Task 5: An audit check that performs the interaction

A static render cannot see this control work, and §10.25 is explicit: anything that only exists after an interaction needs an audit that performs the interaction.

**Files:**
- Modify: `scripts/interaction-audit.mjs`

**Interfaces:**
- Consumes: the deployed staging URL, or `BASE=`
- Produces: a check named `price-slider-drag`

- [ ] **Step 1: Read how an existing check is written**

Run: `grep -n "filter-dropdown-after-tap" -A 40 scripts/interaction-audit.mjs`

Copy that check's shape exactly — including how it sets `PROBLEM` on its note. The reporter prints only keys it knows, so a check that reports through any other key is silently "ok" (§10.28).

- [ ] **Step 2: Add the check**

Place it beside `filter-dropdown-after-tap`, following that file's own conventions:

```js
// A price slider is invisible to every static render, and its whole value is
// what happens mid-drag. §10.50: a Playwright touch context ALWAYS reports
// `(hover: none)` true, so the commonest real tablet — touch AND hover-capable
// — is unreachable unless it is stubbed, and that is the configuration that
// broke the nav twice.
{
  name: 'price-slider-drag',
  async run(page, note, { viewport }) {
    await page.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes('hover: none') ? { ...mm(q), matches: false } : mm(q));
    });
    await page.goto(`${BASE}/modest-abayas`, { waitUntil: 'networkidle' });
    const thumbs = page.locator('[role="slider"]');
    if ((await thumbs.count()) < 2) { note.PROBLEM = 'PRICE SLIDER HAS FEWER THAN TWO THUMBS'; return; }
    const cards = page.locator('[data-surface="product-card"]');
    const before = await cards.count();
    const box = await thumbs.last().boundingBox();
    if (!box) { note.PROBLEM = 'PRICE SLIDER THUMB HAS NO BOX'; return; }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(Math.max(box.x - 200, 8), box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await cards.count();
    if (after >= before) { note.PROBLEM = `DRAG CHANGED NOTHING (${before} -> ${after})`; return; }
    note.result = `${before} -> ${after} cards at ${viewport}`;
  },
},
```

- [ ] **Step 3: Prove the negative control fires FIRST**

Run it against PRODUCTION, which does not have the feature:

```bash
BASE=https://themodestyhouse.com npm run audit:interaction 2>&1 | grep price-slider
```

Expected: `PRICE SLIDER HAS FEWER THAN TWO THUMBS` at every viewport in both engines. A check that cannot fail is a check you do not have (§10.28 rule 1); if this reads `ok` against production, the check is broken, not the site.

- [ ] **Step 4: Push to staging and run it there**

```bash
git fetch origin && git log HEAD..origin/main --oneline    # §10.53: fetch adjacent to the work
git push origin HEAD:staging
```

Wait for the deploy, then:

```bash
npm run audit:interaction 2>&1 | grep -E "price-slider|PROBLEM"
```

Expected: a card count that drops at all five viewports in both engines, and no `PROBLEM` line anywhere in the whole run.

- [ ] **Step 5: Click through to the end, on the page with pagination**

The §10.32 Load-more bug was invisible to every check that read only the first screenful. Against staging:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('https://themodestyhouse-staging-production.up.railway.app/new-in', { waitUntil: 'networkidle' });
  const thumb = p.locator('[role=\"slider\"]').last();
  const box = await thumb.boundingBox();
  await p.mouse.move(box.x + box.width/2, box.y + box.height/2);
  await p.mouse.down(); await p.mouse.move(box.x - 150, box.y + box.height/2, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(400);
  let clicks = 0;
  while (await p.locator('button:has-text(\"Load more\")').count()) {
    await p.locator('button:has-text(\"Load more\")').click();
    await p.waitForTimeout(700);
    if (++clicks > 30) break;
  }
  console.log('clicks:', clicks, '| cards:', await p.locator('[data-surface=\"product-card\"]').count());
  console.log('showing text:', await p.locator('text=/Showing \\\\d+ of \\\\d+/').first().innerText());
  await b.close();
})();
"
```

Expected: every card loads, and the "Showing N of N" counter ends with both numbers equal. A run that stalls short of the total is the §10.32 bug in a new place — the price filter changes which row indices are shown, and `DirectoryBrowser` fetches extra cards BY row index against a `rowCount` guard.

- [ ] **Step 6: Write the log entry and commit**

Create `docs/log/2026-09-05-price-range-filter.md` in the §9 format — Goal, What changed, Verification with real pasted output, Notes. Include the negative-control output from Step 3 and the click-through from Step 5, and the measured before/after card counts.

```bash
git diff --cached --name-only
git add scripts/interaction-audit.mjs docs/log/2026-09-05-price-range-filter.md && git commit -F /tmp/t5.txt -- scripts/interaction-audit.mjs docs/log/2026-09-05-price-range-filter.md
```

`/tmp/t5.txt`:

```
test(audit): price-slider-drag, and the log entry

A static render cannot see a slider work. This check drags a real thumb at five
viewports in both engines and asserts the card count drops, with (hover: none)
stubbed FALSE so it exercises the touch-and-hover-capable tablet that §10.50
says no other check in the file can reach.

Negative control run against production first, which has no slider: it reports
PRICE SLIDER HAS FEWER THAN TWO THUMBS everywhere, so the check can fail.
```

---

## Do NOT merge to `main`

Every task above lands on `staging`. Merging needs Tina's explicit approval, every time (CLAUDE.md §1), and the merge is followed by a Cloudflare purge — production HTML is held at the edge for 3600s, and purging BEFORE the origin serves the new build re-fills the cache with the old page for another hour (§10.47).
