# Split the catalogue payload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut `/directory`'s document from 2.56 MB to under 1 MB by shipping only the columns needed to FILTER and SORT, and fetching the columns needed to DRAW A CARD on demand.

**Architecture:** `CompactCatalogue.rows` is split into two tiers. The **index tier** (`title`, `brandIdx`, `garmentIdx`, `price`, `firstSeenDay`, `occasionMask`, subtype indices) stays inline in the RSC payload, because every filter and sort reads it and the product's feel depends on filtering being instant. The **card tier** (`imageFile`, `urlTail`, `shopifyId`, `imagePrefixIdx`, `altUrl`) is 69% of the bytes, is read only by `decodeCard`, and is fetched for the ~24 rows actually on screen. The first page of cards is embedded inline so the initial paint needs no round-trip.

**Tech Stack:** Next.js 16.2.12 App Router · React 19.2.4 · TypeScript 5 strict · Vitest 4 · no new dependencies.

## Global Constraints

- **Measured baseline, do not re-derive:** `/directory` is 675,734 bytes brotli / 2,564,326 decoded; 2,361,529 of those (92%) are the RSC flight payload; 13,226 rows.
- **Column sizes (encoded JSON, measured 2026-08-26):** `imageFile` 690 KB · `title` 442 KB · `urlTail` 442 KB · `shopifyId` 208 KB · `price` 63 KB · `firstSeenDay` 49 KB · `imagePrefixIdx` 39 KB · `brandIdx` 38 KB · `occasionMask` 26 KB · `garmentIdx` 26 KB · `altUrl` 15 KB.
- **Target:** index tier ≈ 644 KB encoded (a 69% cut) before compression.
- CLAUDE.md Invariant 15 — bulk text never goes on `Product`. This plan is the same principle applied one layer out.
- CLAUDE.md §6 — colour only via `var(--token)` inline styles; layout only via Tailwind. No visual change is in scope here.
- `@/` alias lives in BOTH `tsconfig.json` and `vitest.config.ts`.
- Ship through `staging`; merging to `main` needs Tina's explicit approval each time.
- **After merging to `main`, purge Cloudflare** — pages are edge-cached for 3600 s (`docs/log/2026-08-26-cloudflare-html-caching.md`).

## Files

- **Modify** `lib/compactCatalogue.ts` — split the `rows` interface into `IndexRows` (inline, every row) and a `CardSlice` (on demand); add `EncodeOptions`, and make `decodeCard` take an optional out-of-band `CardSlice`.
- **Create** `lib/catalogueCards.ts` — the pure row-index → `CardSlice` logic, framework-free so it is unit-testable without a request context.
- **Create** `lib/catalogueCards.test.ts`
- **Create** `app/api/catalogue/cards/route.ts` — POST handler returning a `CardSlice` for a list of row indices.
- **Modify** `components/DirectoryBrowser.tsx` — hold fetched card slices in state, request missing ones.
- **Modify** `components/FilterableGrid.tsx` — same treatment (lane pages, ~12% of traffic combined).
- **Modify** `app/directory/page.tsx`, `app/[lane]/page.tsx`, `app/designers/[slug]/page.tsx`, `app/edits/[slug]/page.tsx` — pass the new encode option.
- **Modify** `lib/compactCatalogue.test.ts`, `lib/sortRows.ts` (type-only).

---

### Task 1: Split the row types and prove the index tier is smaller

**Files:**
- Modify: `lib/compactCatalogue.ts`
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  /** The index tier: every column a filter or a sort reads. One entry per row,
   *  for EVERY row — this is what keeps filtering instant and client-side.
   *  Exactly the current `rows` interface minus the four card columns. */
  export interface IndexRows {
    title: string[];
    brandIdx: number[];
    price: number[];
    garmentIdx: number[];
    occasionMask: number[];
    firstSeenDay: number[];
    layeringSubtypeIdx?: number[];
    outerwearSubtypeIdx?: number[];
    hijabSubtypeIdx?: number[];
    hijabTypeFilterIdx?: number[];
  }
  export interface CompactCatalogue {
    /** … existing dictionary fields unchanged … */
    rows: IndexRows;
    /** Card data for the rows embedded in the initial render. Keyed by ABSOLUTE
     *  row index, not by position, so a slice is self-describing. */
    cards: CardSlice;
    /** Rows this catalogue describes. Guards against an index request that
     *  outlived a catalogue rebuild. */
    rowCount: number;
  }
  export interface CardSlice { rows: Record<number, CardEntry>; }
  export interface CardEntry {
    shopifyId: string; imagePrefixIdx: number; imageFile: string; urlTail: string; altUrl?: string;
  }
  ```

- [ ] **Step 1: Write the failing test**

Add to `lib/compactCatalogue.test.ts`:

```ts
import { encodeCatalogue, decodeCard } from './compactCatalogue';
import type { Product, Brand } from '@/lib/types';

const BRAND: Brand = {
  slug: 'testhouse', name: 'Test House', homepage: 'https://testhouse.com',
  currency: 'GBP', community: 'hijabi', vibe: 'classic', region: 'UK',
} as Brand;

function product(n: number): Product {
  return {
    id: `testhouse:${n}`, brandSlug: 'testhouse', brandName: 'Test House',
    title: `Test Piece ${n}`, price: 40 + n, currency: 'GBP',
    image: `https://cdn.shopify.com/s/files/1/0001/test-${n}.jpg`,
    url: `https://testhouse.com/products/test-${n}`,
    garment: 'dress', inStock: true,
  } as Product;
}

it('omits card columns from the index tier when embedCards is a subset', () => {
  const products = Array.from({ length: 100 }, (_, i) => product(i));
  const full = encodeCatalogue(products, [BRAND]);
  const split = encodeCatalogue(products, [BRAND], { embedCards: 24 });

  // The index tier must still describe every row.
  expect(split.rows.title).toHaveLength(100);
  expect(split.rowCount).toBe(100);

  // …but card data only for the embedded window.
  expect(Object.keys(split.cards.rows)).toHaveLength(24);
  expect(split.cards.rows[0].imageFile).toBe(full.cards.rows[0].imageFile);
  expect(split.cards.rows[24]).toBeUndefined();

  // And it must actually be smaller.
  const size = (o: unknown) => Buffer.byteLength(JSON.stringify(o));
  expect(size(split)).toBeLessThan(size(full) * 0.5);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/compactCatalogue.test.ts -t 'omits card columns'`
Expected: FAIL — `encodeCatalogue` takes 2 arguments, and `.cards` / `.rowCount` do not exist.

- [ ] **Step 3: Implement the split**

In `lib/compactCatalogue.ts`, move the four card columns out of the `rows` literal and into a `cards` record built only for the embedded window:

```ts
export interface EncodeOptions {
  /** How many leading rows get their card data embedded inline. Everything
   *  beyond this is fetched from /api/catalogue/cards on demand.
   *  `Infinity` reproduces the pre-split behaviour and is what the pages
   *  that render every row they hold (edits, designer pages) pass. */
  embedCards?: number;
}

export function encodeCatalogue(
  products: Product[], brands: Brand[], opts: EncodeOptions = {},
): CompactCatalogue {
  const embed = opts.embedCards ?? Infinity;
  // … existing dictionary + index-column construction, unchanged …
  const cards: CardSlice = { rows: {} };
  for (let i = 0; i < products.length && i < embed; i++) {
    cards.rows[i] = {
      shopifyId: shopifyIdAt(i), imagePrefixIdx: imagePrefixIdxAt(i),
      imageFile: imageFileAt(i), urlTail: urlTailAt(i),
      ...(altUrlAt(i) ? { altUrl: altUrlAt(i)! } : {}),
    };
  }
  return { /* …dictionaries…, */ rows, cards, rowCount: products.length };
}
```

Keep the existing per-row derivations exactly as they are — this step MOVES code, it does not rewrite the encoding of any single value. If a value's encoding changes, the diff is wrong.

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/compactCatalogue.test.ts -t 'omits card columns'`
Expected: PASS

- [ ] **Step 5: Run the whole suite and the typechecker**

Run: `npx tsc --noEmit && npm test`
Expected: tsc exit 0. Tests: failures ONLY in files that read `cat.rows.imageFile` etc. — that is `lib/compactCatalogue.test.ts`'s older cases and `lib/sortRows.ts` if it touches card columns. Fix those to read `cat.cards.rows[i]`. Do not change any assertion's expected VALUE.

- [ ] **Step 6: Commit**

```bash
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "refactor(catalogue): split rows into an index tier and a card tier"
```

---

### Task 2: `decodeCard` reads from a card slice, and says so when it cannot

**Files:**
- Modify: `lib/compactCatalogue.ts:305` (`decodeCard`)
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: `CompactCatalogue`, `CardSlice`, `CardEntry` from Task 1.
- Produces: `decodeCard(cat: CompactCatalogue, row: number, extra?: CardSlice): CardProduct | null`

- [ ] **Step 1: Write the failing test**

```ts
it('returns null for a row whose card data has not been fetched', () => {
  const products = Array.from({ length: 100 }, (_, i) => product(i));
  const split = encodeCatalogue(products, [BRAND], { embedCards: 24 });
  expect(decodeCard(split, 0)).not.toBeNull();
  expect(decodeCard(split, 50)).toBeNull();
});

it('decodes a row once its card data is supplied out of band', () => {
  const products = Array.from({ length: 100 }, (_, i) => product(i));
  const split = encodeCatalogue(products, [BRAND], { embedCards: 24 });
  const full = encodeCatalogue(products, [BRAND]);
  const extra = { rows: { 50: full.cards.rows[50] } };
  expect(decodeCard(split, 50, extra)!.title).toBe('Test Piece 50');
  expect(decodeCard(split, 50, extra)!.url).toBe('https://testhouse.com/products/test-50');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/compactCatalogue.test.ts -t 'card data has not been fetched'`
Expected: FAIL — `decodeCard` currently throws on `undefined.startsWith` rather than returning null.

Returning `null` rather than throwing is deliberate: a missing card is a normal transient state while a fetch is in flight, not a defect.

- [ ] **Step 3: Implement**

```ts
export function decodeCard(cat: CompactCatalogue, row: number, extra?: CardSlice): CardProduct | null {
  const card = extra?.rows[row] ?? cat.cards.rows[row];
  if (!card) return null;
  const brand = cat.brands[cat.rows.brandIdx[row]];
  const url = card.urlTail.startsWith('http')
    ? card.urlTail
    : `${brand.homepage}/products/${card.urlTail}`;
  return {
    id: `${brand.slug}:${card.shopifyId}`,
    brandSlug: brand.slug,
    brandName: brand.name,
    garment: cat.garments[cat.rows.garmentIdx[row]],
    title: cat.rows.title[row],
    price: cat.rows.price[row],
    currency: brand.currency,
    image: `${cat.imagePrefixes[card.imagePrefixIdx]}${card.imageFile}`,
    url,
    ...(card.altUrl ? { altUrl: card.altUrl } : {}),
  };
}
```

Copy the exact `id`, `image` and `url` construction from the current implementation — read lines 305-330 before writing this. Any drift here changes product URLs, which is Invariant 1 territory.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "refactor(catalogue): decodeCard takes an optional out-of-band card slice"
```

---

### Task 3: The card-slice endpoint

**Files:**
- Create: `lib/catalogueCards.ts`
- Create: `lib/catalogueCards.test.ts`
- Create: `app/api/catalogue/cards/route.ts`

**Interfaces:**
- Consumes: `CardSlice`, `encodeCatalogue` from Tasks 1-2.
- Produces: `cardSliceFor(source: 'browse' | { lane: string } | { brand: string }, rows: number[]): CardSlice`
  and `POST /api/catalogue/cards` taking `{ source, rows, rowCount }` and returning `CardSlice`.

`rowCount` is the guard. The client sends the `rowCount` its catalogue was built with; if the server's differs, the catalogue was rebuilt (a nightly refresh, a deploy) and the row indices no longer mean the same products. The server returns 409 rather than silently sending the wrong products — this is the same class of bug as CLAUDE.md §10.35, where an index referred to a catalogue that had moved.

- [ ] **Step 1: Write the failing test**

`lib/catalogueCards.test.ts`:

```ts
import { cardSliceFor, CatalogueMovedError } from './catalogueCards';

it('returns only the requested rows', () => {
  const slice = cardSliceFor('browse', [0, 5, 9]);
  expect(Object.keys(slice.rows).map(Number).sort((a, b) => a - b)).toEqual([0, 5, 9]);
});

it('ignores out-of-range indices rather than throwing', () => {
  const slice = cardSliceFor('browse', [0, 99_999_999]);
  expect(slice.rows[0]).toBeDefined();
  expect(slice.rows[99_999_999]).toBeUndefined();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/catalogueCards.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/catalogueCards.ts`**

```ts
import { encodeCatalogue, type CardSlice } from '@/lib/compactCatalogue';
import { browseProducts, productsForLane, productsForBrand } from '@/lib/products';
import { BRANDS } from '@/data/brands';

export class CatalogueMovedError extends Error {}

export type CardSource = 'browse' | { lane: string } | { brand: string };

function productsFor(source: CardSource) {
  if (source === 'browse') return browseProducts();
  if ('lane' in source) return productsForLane(source.lane);
  return productsForBrand(source.brand);
}

/** Maximum rows one request may ask for. The client asks for a screenful at a
 *  time (STEP = 24, occasionally a few screens after fast scrolling); this cap
 *  exists so the endpoint cannot be turned into a bulk catalogue export. */
const MAX_ROWS = 240;

export function cardSliceFor(source: CardSource, rows: number[], expectedRowCount?: number): CardSlice {
  const products = productsFor(source);
  if (expectedRowCount !== undefined && expectedRowCount !== products.length) {
    throw new CatalogueMovedError(
      `catalogue moved: client had ${expectedRowCount} rows, server has ${products.length}`,
    );
  }
  const wanted = [...new Set(rows)].filter((r) => Number.isInteger(r) && r >= 0 && r < products.length).slice(0, MAX_ROWS);
  const full = encodeCatalogue(products, BRANDS);
  const out: CardSlice = { rows: {} };
  for (const r of wanted) out.rows[r] = full.cards.rows[r];
  return out;
}
```

**Known inefficiency, deliberate for now:** this re-encodes the whole catalogue to return 24 rows, because `getProducts()` is uncached anyway (CLAUDE.md §8) and every page render already pays this. Task 6 fixes both at once. Do not optimise it here — one change at a time.

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/catalogueCards.test.ts`
Expected: PASS

- [ ] **Step 5: Write the route handler**

`app/api/catalogue/cards/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { cardSliceFor, CatalogueMovedError, type CardSource } from '@/lib/catalogueCards';

// Reads the catalogue per request and is not cacheable per URL (the body
// carries the row list). Cloudflare bypasses /api/* by rule, so this never
// lands in the edge cache — correct, and deliberate.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { source?: CardSource; rows?: number[]; rowCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.source || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: 'source and rows are required' }, { status: 400 });
  }
  try {
    return NextResponse.json(cardSliceFor(body.source, body.rows, body.rowCount));
  } catch (e) {
    if (e instanceof CatalogueMovedError) {
      return NextResponse.json({ error: 'catalogue moved', reload: true }, { status: 409 });
    }
    throw e;
  }
}
```

- [ ] **Step 6: Verify the route against a real build**

```bash
npm run build && npx next start -p 3188 &
sleep 12
curl -s -X POST localhost:3188/api/catalogue/cards \
  -H 'Content-Type: application/json' \
  -d '{"source":"browse","rows":[0,1,2]}' | head -c 300
```
Expected: JSON with a `rows` object holding keys `0`, `1`, `2`, each with `shopifyId`, `imagePrefixIdx`, `imageFile`, `urlTail`.

Then the guard:
```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3188/api/catalogue/cards \
  -H 'Content-Type: application/json' -d '{"source":"browse","rows":[0],"rowCount":1}'
```
Expected: `409`

**Use a port nothing else owns and confirm the server started** — CLAUDE.md §10.28 is about exactly this: a probe that drove another session's server on a port that was already taken. Check the `next start` output for `EADDRINUSE` before trusting any result. Build in a worktree if another session is live.

- [ ] **Step 7: Commit**

```bash
git add lib/catalogueCards.ts lib/catalogueCards.test.ts app/api/catalogue/cards/route.ts
git commit -m "feat(catalogue): endpoint returning card data for a set of row indices"
```

---

### Task 4: `DirectoryBrowser` fetches the cards it is missing

**Files:**
- Modify: `components/DirectoryBrowser.tsx`
- Modify: `app/directory/page.tsx`

**Interfaces:**
- Consumes: `decodeCard(cat, row, extra?)` (Task 2), `POST /api/catalogue/cards` (Task 3).
- Produces: no new exports.

- [ ] **Step 1: Pass the new option from the page**

In `app/directory/page.tsx`, change:
```ts
const catalogue = encodeCatalogue(browseProducts(), BRANDS);
```
to:
```ts
// Only the first screenful of card data travels in the RSC payload. The index
// columns still describe every row, so filtering and sorting stay instant and
// entirely client-side — which is the whole point of the columnar encoding.
// Measured 2026-08-26: card columns are 69% of this page's 2.36 MB payload.
// STEP*2 rather than STEP: the second screenful is the one a visitor reaches
// fastest, and prefetching it costs ~30 KB.
const catalogue = encodeCatalogue(browseProducts(), BRANDS, { embedCards: 48 });
```

`listedItems` below it (the JSON-LD `ItemList`) reads `decodeCard(catalogue, i)` for the first 24 — those are inside the embedded window, so it keeps working. Verify this by asserting the built page still contains an `ItemList` with 24 entries in Step 5.

- [ ] **Step 2: Add fetch state to the component**

In `components/DirectoryBrowser.tsx`, after the existing `useState` calls:

```ts
const [extraCards, setExtraCards] = useState<CardSlice>({ rows: {} });
const [cardsError, setCardsError] = useState(false);
```

- [ ] **Step 3: Fetch the missing rows for the current window**

Replace:
```ts
const shownCards = useMemo(() => shownRows.map((i) => decodeCard(cat, i)), [cat, shownRows]);
```
with:
```ts
const missing = shownRows.filter((i) => !cat.cards.rows[i] && !extraCards.rows[i]);

useEffect(() => {
  if (missing.length === 0) return;
  let cancelled = false;
  fetch('/api/catalogue/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'browse', rows: missing, rowCount: cat.rowCount }),
  })
    .then(async (r) => {
      if (r.status === 409) { window.location.reload(); return null; }
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<CardSlice>;
    })
    .then((slice) => {
      if (cancelled || !slice) return;
      setExtraCards((prev) => ({ rows: { ...prev.rows, ...slice.rows } }));
      setCardsError(false);
    })
    .catch(() => { if (!cancelled) setCardsError(true); });
  return () => { cancelled = true; };
  // `missing` is derived; key the effect on its contents, not its identity.
}, [missing.join(','), cat.rowCount]);

const shownCards = useMemo(
  () => shownRows.map((i) => decodeCard(cat, i, extraCards)).filter((c) => c !== null),
  [cat, shownRows, extraCards],
);
```

**A 409 reloads the page rather than retrying.** The catalogue was rebuilt underneath this tab, so every row index it holds is stale; refetching with the same indices would return the wrong products, which is worse than a reload.

- [ ] **Step 4: Surface a failure rather than showing an empty grid**

CLAUDE.md §1 — "no silent failure paths". Under the grid, when `cardsError` is true and `shownCards.length < shownRows.length`:

```tsx
{cardsError && shownCards.length < shownRows.length && (
  <p
    className="text-center py-8"
    style={{ color: 'var(--muted)', fontFamily: 'var(--font-ui), sans-serif', fontSize: 14 }}
  >
    Some pieces could not be loaded. Refresh to try again.
  </p>
)}
```

That string is the plainest functional wording for the state — CLAUDE.md §10.18: implement the mechanism, do not compose brand voice. If Tina wants different words she will say so.

- [ ] **Step 5: Verify against a real build**

```bash
npm run build && npx next start -p 3188 &
sleep 12
curl -s localhost:3188/directory -o /tmp/dir-new.html
echo "decoded bytes: $(wc -c < /tmp/dir-new.html)"
grep -c '"@type":"ItemList"' /tmp/dir-new.html      # expect 1
grep -o 'data-surface="product-card"' /tmp/dir-new.html | wc -l   # expect 24
```
Expected: decoded bytes well under 1,000,000 (baseline 2,564,326); ItemList still present; 24 cards still server-rendered.

- [ ] **Step 6: Verify the interaction, in a real browser, in BOTH engines**

CLAUDE.md §10.25 — anything that only exists after an interaction needs an audit that performs the interaction. Write `/tmp/verify-directory.mjs`:

```js
import { chromium, webkit } from 'playwright';
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await engine.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('http://localhost:3188/directory', { waitUntil: 'load' });
  const first = await page.locator('a[data-surface="product-card"]').count();
  await page.getByRole('button', { name: /load more/i }).click();
  await page.waitForTimeout(2500);
  const after = await page.locator('a[data-surface="product-card"]').count();
  const broken = await page.evaluate(() =>
    [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[data-surface="product-card"]')].slice(24, 30).map((a) => a.href));
  console.log(name, { first, after, broken, sampleHrefs: hrefs });
  await b.close();
}
```

Run: `node /tmp/verify-directory.mjs`
Expected: `first: 24`, `after: 48`, `broken: 0`, and `sampleHrefs` pointing at real brand product URLs (`https://<brand>/products/<handle>`), NOT at `undefined` or the site's own origin. **Check the hrefs by eye** — a card that renders but links wrongly is exactly the §10.12 failure, invisible from the grid.

- [ ] **Step 7: Commit**

```bash
git add components/DirectoryBrowser.tsx app/directory/page.tsx
git commit -m "perf(directory): fetch card data for rows beyond the first screenful"
```

---

### Task 5: The same treatment for lane pages

**Files:**
- Modify: `components/FilterableGrid.tsx`
- Modify: `app/[lane]/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: no new exports.

`FilterableGrid` has the same `STEP = 24` + `decodeCard` shape as `DirectoryBrowser` (its line 53 mirrors `DirectoryBrowser.tsx:53`). Apply the identical change, with `source: { lane: <slug> }`.

The lane slug must reach the client component. Add a `laneSlug: string` prop in `app/[lane]/page.tsx` and thread it into the fetch body. Do NOT derive it from `usePathname()` — a lane page can be reached at `/outerwear?type=blazer`, and the subtype must not change which product set the row indices refer to.

- [ ] **Step 1: Confirm the lane row set matches what the server will rebuild**

Before writing code, prove the assumption. `productsForLane(slug)` is what the page encodes; the endpoint must return the same array for the same slug.

```bash
npx tsx -e "
import { productsForLane } from './lib/products';
const a = productsForLane('modest-dresses');
const b = productsForLane('modest-dresses');
console.log('stable:', a.length === b.length && a[0].id === b[0].id, a.length);
"
```
Expected: `stable: true` and a row count. If this is ever false the whole index-based scheme is unsound — stop and reconsider.

- [ ] **Step 2: Apply the Task 4 changes to `FilterableGrid`**

Same five edits: `extraCards`/`cardsError` state, the `missing` computation, the fetch effect (with `source: { lane: laneSlug }`), the filtered `shownCards`, and the error line.

- [ ] **Step 3: Pass `embedCards` and `laneSlug` from the page**

In `app/[lane]/page.tsx`, `encodeCatalogue(productsForLane(slug), BRANDS, { embedCards: 48 })` and `<FilterableGrid … laneSlug={slug} />`.

- [ ] **Step 4: Verify**

```bash
npm run build && npx next start -p 3188 &
sleep 12
for u in /modest-dresses /modest-tops /outerwear '/outerwear?type=blazer'; do
  printf '%-26s %s bytes\n' "$u" "$(curl -s "localhost:3188$u" | wc -c)"
done
```
Expected: every one smaller than its current size; `?type=blazer` still renders blazers (check the `h1` and the first card title).

- [ ] **Step 5: Run the interaction audit**

Run: `BASE=http://localhost:3188 npm run audit:interaction`
Expected: 0 problems, 4 widths x 2 engines. This is the suite that already covers the filter dropdowns; it must stay clean.

- [ ] **Step 6: Commit**

```bash
git add components/FilterableGrid.tsx app/[lane]/page.tsx
git commit -m "perf(lanes): fetch card data for rows beyond the first screenful"
```

---

### Task 6: Memoise `getProducts()`

**Files:**
- Modify: `lib/products.ts:20`
- Test: `lib/products.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: no signature change — `getProducts(): Product[]` throughout.

`getProducts()` re-reads and re-parses 11.2 MB on every call (measured: 14 ms read + 19 ms parse on an M-series Mac; more on Railway's shared CPU). The homepage calls it more than once per render, and Task 3's endpoint now calls it per request. This is the bulk of the 490-760 ms origin TTFB.

Key the cache on the file's mtime, not on a boolean: `/staff/curate` writes `data/.live-cuts.json` in the running container and those edits must still take effect (`docs/log/2026-08-12-staff-curate.md`).

- [ ] **Step 1: Write the failing test**

```ts
it('does not re-parse products.json when nothing has changed', () => {
  const a = getProducts();
  const b = getProducts();
  expect(b).toBe(a); // same array identity, not merely equal
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/products.test.ts -t 'does not re-parse'`
Expected: FAIL — two distinct arrays.

- [ ] **Step 3: Implement**

```ts
let cache: { key: string; value: Product[] } | null = null;

function cacheKey(): string {
  const stamp = (p: string) => { try { return String(statSync(p).mtimeMs); } catch { return '0'; } };
  return [
    stamp(path.join(process.cwd(), 'data', 'products.json')),
    stamp(path.join(process.cwd(), 'data', '.live-cuts.json')),
    stamp(path.join(process.cwd(), 'data', '.live-garment-overrides.json')),
    stamp(path.join(process.cwd(), 'data', '.live-lane-overrides.json')),
  ].join(':');
}
```

Then in `getProducts()`, return `cache.value` when `cache.key === cacheKey()`, otherwise build as now and store.

The three store paths above are **verified**, not assumed — read from each module's own `STORE_PATH` on 2026-08-26:

```
lib/liveCuts.ts:31             data/.live-cuts.json
lib/liveGarmentOverrides.ts:27 data/.live-garment-overrides.json
lib/liveLaneOverrides.ts:26    data/.live-lane-overrides.json
```

If a fourth live-override store is ever added, it must be added to `cacheKey()` in the same commit, or edits made through it will appear to do nothing.

- [ ] **Step 4: Prove a live edit still takes effect**

This is the whole risk of the change, so test it explicitly rather than trusting the mtime logic:

```ts
it('picks up a live cut written after the first read', () => {
  const before = getProducts().length;
  const store = path.join(process.cwd(), 'data', '.live-cuts.json');
  const existing = existsSync(store) ? readFileSync(store, 'utf8') : null;
  try {
    const victim = getProducts()[0].id;
    writeFileSync(store, JSON.stringify({ [victim]: { decision: 'cut', decidedAt: new Date().toISOString() } }));
    expect(getProducts().length).toBe(before - 1);
  } finally {
    if (existing === null) rmSync(store, { force: true }); else writeFileSync(store, existing);
  }
});
```

- [ ] **Step 5: Run everything**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: tsc 0, lint 0, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/products.ts lib/products.test.ts
git commit -m "perf(products): cache the parsed catalogue, keyed on file mtimes"
```

---

### Task 7: Measure, document, ship

**Files:**
- Create: `docs/log/2026-08-26-split-catalogue-payload.md`

- [ ] **Step 1: Measure staging against the recorded baseline**

Push to `staging`, wait for Railway, then:

```bash
S=https://themodestyhouse-staging-production.up.railway.app
for u in /directory /modest-dresses /modest-tops; do
  printf '%-18s br=%s decoded=%s\n' "$u" \
    "$(curl -s -o /dev/null -w '%{size_download}' -H 'Accept-Encoding: br' "$S$u")" \
    "$(curl -s "$S$u" | wc -c)"
done
```
Baseline to beat on `/directory`: **675,734 br / 2,564,326 decoded**.

- [ ] **Step 2: Re-run Lighthouse and compare like for like**

```bash
npx lighthouse@12 "$S/directory" --only-categories=performance \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --quiet --chrome-flags="--headless=new" --output=json --output-path=/tmp/lh-dir-after.json
```
Baseline: score **65**, FCP **4.3 s**, LCP **7.7 s**, TBT 20 ms, CLS 0.
Target: FCP under 2 s. **CLS must still be 0** — if it is not, the grid has started reflowing as cards arrive, and that is a regression worth more than the bytes saved.

- [ ] **Step 3: Write the log entry**

`docs/log/2026-08-26-split-catalogue-payload.md`, in the §9 format: Goal / What changed / Verification (real numbers, before and after) / Notes.

- [ ] **Step 4: Ask Tina to merge**

Do not merge to `main` without her explicit approval (CLAUDE.md §1).

- [ ] **Step 5: After she approves and Railway has deployed, purge Cloudflare**

```bash
set -a && . ./.env && set +a
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/480bf96b3a960f3933b8e69d13417b3d/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

Purge AFTER the deploy finishes, not before — purging early just re-caches the old build.

---

## Risks

| risk | why it matters | handled by |
|---|---|---|
| Row indices refer to a catalogue that has since been rebuilt | the nightly refresh pushes to `main` on its own schedule (§10.35); stale indices would render the WRONG products, silently | `rowCount` guard, 409, page reload (Task 3/4) |
| A card renders with a wrong `url` | invisible from the grid — this is §10.12 exactly | Task 4 Step 6 checks sample hrefs by eye in both engines |
| Grid reflows as fetched cards arrive | would trade FCP for CLS, currently a perfect 0 | Task 7 Step 2 asserts CLS stays 0 |
| A live `/staff/curate` cut stops taking effect | Tina's edits would silently stop working | Task 6 Step 4 tests it directly |
| `/api/catalogue/cards` used as a bulk export | it returns catalogue data to anyone | `MAX_ROWS = 240` cap (Task 3) |

## Out of scope

- Server-side filtering. The index tier is what keeps filtering instant and client-side; this plan deliberately preserves that behaviour rather than changing how the page feels.
- The 504 KB `edit-lace-hero-mobile-v2` re-encode — Tina's artwork, her call.
- Moving the staff-session read out of the root layout so pages genuinely prerender. Separate change, tracked in `docs/log/2026-08-26-cloudflare-html-caching.md`.
