# New In page, and the removal of All Clothing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/new-in` — recent arrivals from 38 named houses, hijabs behind a toggle, four Losyana pieces seeded near the top — and delete `/directory`, which it replaces.

**Architecture:** One pure selection module (`lib/newIn.ts`) that takes a `Product[]` and returns a `Product[]`, so every rule is unit-testable without touching the 11 MB catalogue. One server page (`app/new-in/page.tsx`) modelled on the `app/directory/page.tsx` it replaces, reusing `DirectoryBrowser` unchanged. The hijab toggle is a URL parameter rendered server-side, not client state.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Vitest 4 (node env) · Tailwind v4 utilities for layout, `var(--token)` inline styles for colour.

**Spec:** `docs/superpowers/specs/2026-09-01-new-in-page-design.md`

## Global Constraints

- Branch is `staging`. Never push to `main`. `origin/main` was merged in before this plan was written.
- Stage and commit in ONE command (`git commit -- <paths>`) — shared working tree, concurrent sessions (§10.39).
- Read `git diff --cached` before each commit and confirm every hunk is yours (§10.30).
- Colour/border/shadow via inline `style={{}}` with `var(--token)`. Never a Tailwind colour class.
- Every icon from `@phosphor-icons/react` — never a text glyph.
- Outbound links keep `target="_blank" rel="noopener noreferrer sponsored"` and `withUtm()`.
- Any card component takes `CardProduct`, never `Product`.
- No invented marketing copy (§10.18). Page copy describes the mechanism only; Tina overwrites it.
- A new check is trusted only after it has been watched to FAIL on the unfixed code (§10.28 rule 1).
- No test may assert a fact about live catalogue data that a nightly refresh can flip (§10.19).

---

### Task 1: `lib/newIn.ts` — the selection rule

**Files:**
- Create: `lib/newIn.ts`
- Create: `lib/newIn.test.ts`

**Interfaces:**
- Consumes: `getProducts` (`lib/products.ts`), `groupColourVariants` (`lib/colorVariants.ts`), `isSwim`/`isActivewear`/`isJilbab`/`isKhimarAbaya`/`isUndercap`/`isPrayer` (`lib/specialty.ts`), `Product` (`lib/types.ts`).
- Produces:
  - `NEW_IN_HOUSES: readonly string[]` — 39 slugs
  - `NEW_IN_WINDOW_DAYS = 30`, `INGEST_BATCH_SHARE = 0.3`, `SEED_HOUSE = 'losyana'`, `SEED_POSITIONS = [2, 8, 15, 21]`
  - `selectNewIn(all: Product[], opts?: { hijabs?: boolean }): Product[]` — pure
  - `newInProducts(opts?: { hijabs?: boolean }): Product[]` — `selectNewIn(getProducts(), opts)`

- [ ] **Step 1: Write the failing tests** in `lib/newIn.test.ts`, using fixtures only — no real catalogue.

Fixture helper and the eleven cases from the spec:

```ts
import { describe, it, expect } from 'vitest';
import { selectNewIn, SEED_POSITIONS, NEW_IN_HOUSES } from './newIn';
import type { Product } from './types';

const base: Omit<Product, 'id' | 'brandSlug' | 'brandName' | 'firstSeen' | 'title'> = {
  price: 50, currency: 'USD', image: 'https://cdn.shopify.com/a.jpg',
  url: 'https://x.com/products/a', inStock: true, garment: 'dress',
  community: 'hijabi', occasion: [], season: [], activity: [],
};

/** `n` products for one house, all on one day, with unique titles so
 *  groupColourVariants cannot collapse them into one card. */
function rows(slug: string, day: string, n: number, over: Partial<Product> = {}): Product[] {
  return Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `${slug}:${day}-${i}`,
    brandSlug: slug,
    brandName: slug,
    title: `${slug} ${day} piece ${i}`,
    firstSeen: day,
    ...over,
  }));
}
```

Cases (each its own `it`):

1. `de-batching removes an ingest batch` — `rows('veiled','2026-08-20',100)` + `rows('veiled','2026-08-28',3)` → result length 3, every id from the 08-28 set.
2. `de-batching keeps a genuine drip` — a house with 5 days of 20 rows each (20% per day, under the 30% threshold) → all 100 survive the window.
3. `batch days do not depend on the view` — same house, one batch day and one drip day, run with `{hijabs:false}` and `{hijabs:true}`; the surviving non-hijab ids are identical.
4. `a house whose whole dated population is one date contributes nothing` — `rows('losyana','2026-08-28',40)` plus a drip from another house → no `losyana:` id arrives through the window path (the four seeds are asserted separately in case 5).
5. `four seeds land at one-indexed 3, 9, 16 and 22` — 40 drip rows from `veiled` + 60 `losyana` rows all on one day → `out[2]`, `out[8]`, `out[15]`, `out[21]` all have `brandSlug === 'losyana'`, and no two seed indices are adjacent (`SEED_POSITIONS` pairwise gap > 1).
6. `a seed already in the list is not duplicated` — give `losyana` a genuine drip day so one Losyana row arrives through the window; assert every id in the result is unique.
7. `fewer than 21 results appends the remaining seeds` — 4 drip rows + 10 losyana rows → result length 8, no throw, all four seeds present.
8. `the window is anchored to the data, not the clock` — call `selectNewIn` twice with `vi.setSystemTime(new Date('2027-06-01'))` between; results are identical.
9. `a house not in NEW_IN_HOUSES never appears` — `rows('inayah', <today>, 10)` → absent. Assert `NEW_IN_HOUSES.includes('inayah') === false` first, so the case cannot silently pass by naming a listed house.
10. `swim and activewear never appear` — a row titled `'Burkini Swimsuit'` and one titled `'Sports Leggings'`, both from a listed house on a drip day, absent with `{hijabs:false}` AND `{hijabs:true}`.
11. `hijabs appear only with the toggle on` — a `garment:'hijab'` row and a jilbab row whose `garment` is `'abaya'` and title is `'Jilbab Two Piece'`; both absent by default, both present with `{hijabs:true}`. The jilbab is the case a `garment`-only filter would miss.

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run lib/newIn.test.ts`
Expected: FAIL — `Failed to resolve import "./newIn"`.

- [ ] **Step 3: Write `lib/newIn.ts`**

```ts
import { getProducts } from './products';
import { groupColourVariants } from './colorVariants';
import { isSwim, isActivewear, isJilbab, isKhimarAbaya, isUndercap, isPrayer } from './specialty';
import type { Product } from './types';

/**
 * New In — recent arrivals from a hand-picked set of houses.
 *
 * Tina's list, 2026-09-01. `touche-prive` and `touche-prive-eu` are two brand
 * records for one house; the -eu record had 0 published rows when the list was
 * written and is included so a future publish cannot silently omit it.
 */
export const NEW_IN_HOUSES: readonly string[] = [
  'veiled', 'aab', 'summer-evenings', 'vela', 'niswa', 'jawda', 'hawaa', 'klay',
  'diversity-modest', 'esme-ny', 'arakai', 'bemu', 'merrachi', 'manzaram', 'fares',
  'losyana', 'whiteicy', 'chador', 'hum', 'chic-modesty', 'kimodesty', 'by-hasanat',
  'noureen', 'khair-archives', 'amariah', 'touche-prive', 'touche-prive-eu',
  'jennah-boutique', 'ayaana', 'eynaa-paris', 'elaa-the-label', 'modesty-in-style',
  'labayah', 'aurora-abaya', 'nour-al-houda', 'mondo-the-label',
  'la-petite-parisienne', 'glamberry', 'parladusa',
];

export const NEW_IN_WINDOW_DAYS = 30;

/**
 * A `firstSeen` day holding at least this share of a house's dated rows is the
 * day this project first SCRAPED that house, not a day the house published
 * anything. Without this the page opens with Merrachi's entire 1,022-piece
 * catalogue: 94% of it carries the single date 2026-08-05. Every house in
 * NEW_IN_HOUSES shows the same shape, between 42% and 100%.
 */
export const INGEST_BATCH_SHARE = 0.3;

/**
 * Losyana is seeded deliberately because the site is in its referral
 * programme. It also HAS to be: all 826 of its published pieces carry
 * firstSeen 2026-08-28, the .shop domain move that reissued every product id
 * (CLAUDE.md §10.54), so that is one batch and de-batching removes all of it.
 * Losyana's organic contribution to this page is zero.
 *
 * Positions are 0-indexed and spliced in ascending order into the growing
 * array, so the final one-indexed positions are 3, 9, 16 and 22 — on a
 * four-column grid, rows 1/3/4/6 and columns 3/1/4/2. Four different rows,
 * four different columns, no two adjacent: Tina asked for four "but not next
 * to eachother that its obvious".
 */
export const SEED_HOUSE = 'losyana';
export const SEED_POSITIONS: readonly number[] = [2, 8, 15, 21];

const HOUSES = new Set(NEW_IN_HOUSES);

const day = (p: Product): string | null => (p.firstSeen ? p.firstSeen.slice(0, 10) : null);

/**
 * Anything the Hijabs & Scarves lane would show. Mirrors that lane's `match`
 * in lib/lanes.ts, minus its `&& !isLayering` — here the question is only
 * "does the visitor consider this a hijab", and a prayer piece that is also a
 * layering piece should still be behind the toggle.
 *
 * `garment === 'hijab'` alone is NOT enough: jilbabs and khimars carry
 * garment 'abaya' or 'dress', so a garment-only filter leaks them onto a page
 * whose default is meant to be clothing.
 */
function isHijabLane(p: Product): boolean {
  return p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p) || isPrayer(p);
}

/** The newest `firstSeen` day anywhere in the published catalogue, or null. */
function latestDay(all: Product[]): string | null {
  let max: string | null = null;
  for (const p of all) {
    const d = day(p);
    if (d && (max === null || d > max)) max = d;
  }
  return max;
}

function minusDays(iso: string, n: number): string {
  const t = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Per house, the `firstSeen` days that are ingest batches.
 *
 * Computed over every published dated row of that house, BEFORE the swim,
 * activewear and hijab filters. If it ran on the filtered subset, turning the
 * hijab toggle on would change which day counts as a batch and the two views
 * would disagree about what is new. A batch day is a property of the house.
 */
function ingestBatchDays(all: Product[]): Map<string, Set<string>> {
  const counts = new Map<string, Map<string, number>>();
  const totals = new Map<string, number>();
  for (const p of all) {
    if (!HOUSES.has(p.brandSlug)) continue;
    const d = day(p);
    if (!d) continue;
    let m = counts.get(p.brandSlug);
    if (!m) { m = new Map(); counts.set(p.brandSlug, m); }
    m.set(d, (m.get(d) ?? 0) + 1);
    totals.set(p.brandSlug, (totals.get(p.brandSlug) ?? 0) + 1);
  }
  const out = new Map<string, Set<string>>();
  for (const [slug, m] of counts) {
    const total = totals.get(slug) ?? 0;
    const batch = new Set<string>();
    for (const [d, c] of m) if (total > 0 && c / total >= INGEST_BATCH_SHARE) batch.add(d);
    out.set(slug, batch);
  }
  return out;
}

/** Splice the seed house's pieces in at SEED_POSITIONS, skipping any already shown. */
function seed(list: Product[], pool: Product[]): Product[] {
  const present = new Set(list.map((p) => p.id));
  const picks = groupColourVariants(pool.filter((p) => p.brandSlug === SEED_HOUSE))
    .filter((p) => !present.has(p.id))
    .slice(0, SEED_POSITIONS.length);
  const out = [...list];
  for (let i = 0; i < picks.length; i++) {
    out.splice(Math.min(SEED_POSITIONS[i], out.length), 0, picks[i]);
  }
  return out;
}

/**
 * Pure — takes the catalogue, returns the page's rows. The window is anchored
 * to the newest date in the DATA rather than to `Date.now()`: this page is
 * prerendered, so its data is frozen at build time, and a clock-based window
 * would slide away from frozen data and quietly empty the page over a long
 * gap between deploys. Anchoring to the data also makes the function
 * deterministic, which is the only reason it can be unit-tested at all.
 */
export function selectNewIn(all: Product[], opts: { hijabs?: boolean } = {}): Product[] {
  const hijabs = opts.hijabs ?? false;
  const anchor = latestDay(all);
  if (!anchor) return [];
  const cutoff = minusDays(anchor, NEW_IN_WINDOW_DAYS);
  const batches = ingestBatchDays(all);

  const eligible = (p: Product): boolean =>
    HOUSES.has(p.brandSlug) && !isSwim(p) && !isActivewear(p) && (hijabs || !isHijabLane(p));

  const arrivals = all.filter((p) => {
    if (!eligible(p)) return false;
    const d = day(p);
    if (!d || d < cutoff) return false;
    return !batches.get(p.brandSlug)?.has(d);
  });

  // Newest first. The index tiebreak keeps the catalogue's own Featured order
  // within a day rather than relying on sort stability.
  const ordered = arrivals
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const da = day(a.p) ?? '';
      const db = day(b.p) ?? '';
      return da === db ? a.i - b.i : da < db ? 1 : -1;
    })
    .map((x) => x.p);

  // Colour runs collapse to one card LAST, after every other filter — same
  // reasoning as productsForLane(): grouping earlier lets a card claim
  // "+5 colours" when four of them were filtered off this page.
  return seed(groupColourVariants(ordered), all.filter(eligible));
}

/** Server-only wrapper. getProducts() is uncached and re-parses ~11 MB, so
 *  call this ONCE per render (CLAUDE.md §8). */
export function newInProducts(opts: { hijabs?: boolean } = {}): Product[] {
  return selectNewIn(getProducts(), opts);
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/newIn.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Prove the de-batch test is a real check** (§10.28 rule 1)

Temporarily set `INGEST_BATCH_SHARE = 1.01` so nothing is ever a batch, re-run, and confirm cases 1 and 4 FAIL. Restore `0.3` and re-run to PASS. Paste both outputs into the log entry.

- [ ] **Step 6: Measure against the real catalogue** — a one-off measurement, deliberately NOT a test (§10.19: the nightly refresh would flip it).

```bash
npx tsx -e "import {selectNewIn} from './lib/newIn'; import {getProducts} from './lib/products';
const all=getProducts();
for (const h of [false,true]) { const r=selectNewIn(all,{hijabs:h});
  console.log('hijabs='+h, r.length, 'seeds at', [2,8,15,21].map(i=>r[i]?.brandSlug)); }"
```
Expected: a few hundred rows in each mode, and `[ 'losyana', 'losyana', 'losyana', 'losyana' ]`.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(new-in): the selection rule - 38 houses, a de-batched 30-day window, four seeded Losyana pieces" -- lib/newIn.ts lib/newIn.test.ts
```

---

### Task 2: `/new-in` — the page

**Files:**
- Create: `app/new-in/page.tsx`
- Modify: `lib/seoCopy.ts` (add `'/new-in'`; leave `'/directory'` in place until Task 3)
- Modify: `lib/laneAnswers.ts` (add `NEW_IN_ANSWER`)

**Interfaces:**
- Consumes: `newInProducts` (Task 1), `browseProducts`, `encodeCatalogue`/`decodeCard`, `DirectoryBrowser`, `pageMetadata`, `breadcrumbSchema`/`collectionPageSchema`/`jsonLdGraph`, `BRANDS`, `LANES`.
- Produces: the route `/new-in`, accepting `?q=` and `?hijabs=1`.

- [ ] **Step 1: Add the copy.** In `lib/seoCopy.ts`, beside the `'/directory'` entry:

```ts
  '/new-in': {
    title: 'New In — The Latest Modest Arrivals',
    description: 'The newest modest clothing added to The Modesty House: recent arrivals from selected independent houses, linking straight to the brand.',
  },
```

In `lib/laneAnswers.ts`, beside `DIRECTORY_ANSWER`:

```ts
/**
 * Mechanism, not pitch — same rule the file header states for DIRECTORY_ANSWER
 * and CLAUDE.md §10.18 requires. Tina overwrites this in her own voice
 * whenever she wants. DIRECTORY_ANSWER is deliberately NOT reused: its closing
 * sentence says hijabs are kept on their own pages, which stops being true on
 * a page that has a hijab toggle.
 */
export const NEW_IN_ANSWER: LaneAnswer = {
  h2: 'What "new in" means here',
  body:
    'This page shows pieces added in the last thirty days by a selected group of houses, newest first. "Added" means the date this index first saw a piece in a house’s own feed, which is close to but not the same as the day the house launched it — a piece can sit in a feed before it is announced. The whole of a house’s catalogue arriving on one day is this index reading that house for the first time rather than a drop, so those days are left out; what remains is the ordinary week-to-week flow. Swimwear and activewear stay on their own pages. Hijabs and scarves are off by default and can be switched on. As everywhere else here, the price, the size chart and the checkout belong to the house, not to us.',
  related: ['modest-dresses', 'modest-abayas'],
};
```

- [ ] **Step 2: Create `app/new-in/page.tsx`**

Copy `app/directory/page.tsx` and change exactly these things:

```tsx
export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ q?: string; hijabs?: string }> },
): Promise<Metadata> {
  const { q, hijabs } = await searchParams;
  return {
    ...pageMetadata('/new-in'),
    // ?q= and ?hijabs= are views of this page, not distinct pages. Both
    // canonicalise to /new-in (pageMetadata's default) and neither is
    // submitted for indexing — the same treatment /directory?q= had.
    ...(q || hijabs ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function NewInPage(
  { searchParams }: { searchParams: Promise<{ q?: string; hijabs?: string }> },
) {
  const { q, hijabs: hijabsParam } = await searchParams;
  const hijabs = hijabsParam === '1';
  // Search covers every house and the whole catalogue — the New In selection
  // applies only to the unsearched page. This is what keeps the header
  // magnifier, useZeroResultSearch and the WebSite SearchAction behaving
  // exactly as they did when this was /directory.
  const rows = q ? browseProducts() : newInProducts({ hijabs });
  const catalogue = encodeCatalogue(rows, BRANDS, { embedCards: 48 });
  ...
```

h1: `{q ? <>Results for “{q}”</> : 'New In'}`. Intro line constant:
`const DESCRIPTION = 'The latest pieces added, from a selected group of houses.'`

The toggle, immediately under the intro, rendered only when `!q`:

```tsx
{!q && (
  <div className="mb-8 flex items-center gap-2">
    <Link href="/new-in" className="chip" data-active={!hijabs}>Clothing</Link>
    <Link href="/new-in?hijabs=1" className="chip" data-active={hijabs}>Include hijabs</Link>
  </div>
)}
```

`.chip` and `.chip[data-active="true"]` already exist in `globals.css:1159-1170`; nothing new is added there. A server-rendered `<Link>` pair rather than client state because `lib/compactCatalogue.ts` encodes a garment dictionary and cannot distinguish a jilbab (garment `abaya`) from an abaya without a new column in a payload format that exists to be small — and `?type=` on the lane pages already works exactly this way.

JSON-LD block: gate on `{!q && !hijabs && (` and use `name: 'New In'`, `path: '/new-in'`.

Answer section at the foot: swap `DIRECTORY_ANSWER` for `NEW_IN_ANSWER`.

- [ ] **Step 3: Build and look at it**

```bash
npm run build 2>&1 | tail -30
npx next start -p 3178 &
curl -sL -o /tmp/newin.html -w '%{http_code} %{size_download}\n' http://localhost:3178/new-in
```
Expected: 200, a body well over 100 KB. A body under 1 KB is a redirect or an error, not a page (§10.49 rule 2).

- [ ] **Step 4: Assert the seed positions in a real browser**, not by grepping HTML (§10.49 rule 1 — titles are not unique and `&` is written `&` in the payload).

```bash
npx playwright test --help >/dev/null 2>&1 || true
node -e "const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();
await p.goto('http://localhost:3178/new-in',{waitUntil:'networkidle'});
const h=await p.\$\$eval('[data-surface=\"product-card\"]',a=>a.map(x=>x.getAttribute('href')));
console.log('cards',h.length);console.log([2,8,15,21].map(i=>h[i]));await b.close();})()"
```
Expected: four `losyana.shop` URLs.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(new-in): the page - search covers every house, hijabs behind a URL toggle" -- app/new-in/page.tsx lib/seoCopy.ts lib/laneAnswers.ts
```

---

### Task 3: Remove All Clothing

**Files:**
- Delete: `app/directory/page.tsx`
- Modify: `next.config.ts` (redirects), `app/page.tsx` (hero button ×2), `components/Nav.tsx`, `components/MobileNav.tsx`, `components/HeaderSearch.tsx`, `app/favourites/page.tsx`, `app/product/[brandSlug]/[shopifyId]/page.tsx`, `app/editorial/[slug]/page.tsx`, `app/llms.txt/route.ts`, `app/sitemap.ts`, `lib/schema.ts`, `lib/seoCopy.ts`

- [ ] **Step 1: Redirects** in `next.config.ts`, inside the existing `redirects()` array. Change the `/hijabi-outfits` line's destination to `/new-in` and add:

```ts
        /*
         * /directory ("All Clothing") was replaced by /new-in on 2026-09-01 at
         * Tina's request. 308 rather than 404 because it was the site's
         * highest-intent indexed URL and sat in sitemap.xml; a 404 discards
         * whatever it holds instead of passing it on.
         *
         * /hijabi-outfits's own 308 above was repointed from /directory to
         * /new-in in the same change, so that URL does not become a chain of
         * two redirects.
         */
        { source: '/directory', destination: '/new-in', permanent: true },
```

- [ ] **Step 2: The hero buttons.** In `app/page.tsx`, both the desktop (`~:449`) and mobile (`~:466`) `<Link>`: `href="/new-in"`, and the visible text `Shop the Archive` → `Shop New In` in both. Tina's words, 2026-09-01: "the shop the archive button need to be shop new in now".

- [ ] **Step 3: The remaining nine href/target swaps.** `/directory` → `/new-in` in: `components/Nav.tsx:44` (label `All Clothing` → `New In`) and `:121-123` (group href + active-path test), `components/MobileNav.tsx:514`, `components/HeaderSearch.tsx:78` and `:186`, `app/favourites/page.tsx:93`, `app/product/[brandSlug]/[shopifyId]/page.tsx:125`, `app/editorial/[slug]/page.tsx:85`, `app/llms.txt/route.ts:41`, `app/sitemap.ts:55`, `lib/schema.ts:63`. In `lib/seoCopy.ts` delete the `'/directory'` entry.

- [ ] **Step 4: Delete the page**

```bash
git rm app/directory/page.tsx
```

- [ ] **Step 5: The grep test.** Add to `lib/seoCopy.test.ts` (or create `lib/routes.test.ts`):

```ts
it('no source file still points at /directory', () => {
  const roots = ['app', 'components', 'lib'];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      const src = readFileSync(full, 'utf8');
      // String literals only. Four files mention /directory in explanatory
      // comments (ProductCard, IndexPanel, FilterableGrid, useZeroResultSearch)
      // and that history is worth keeping — it is not a live reference.
      if (/['"`]\/directory(\?|['"`])/.test(src)) offenders.push(full);
    }
  };
  roots.forEach(walk);
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 6: Watch it fail, then pass.** Run it BEFORE step 3's edits are complete and confirm it lists the offending files; run after and confirm `[]`.

Run: `npx vitest run lib/routes.test.ts`

- [ ] **Step 7: Full suite + typecheck + lint**

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint && npm test
```
Expected: all three exit 0.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(new-in): retire /directory - 308 to /new-in, and the hero button becomes Shop New In" -- next.config.ts app components lib
```

Read `git diff --cached` first and confirm every hunk is yours (§10.30).

---

### Task 4: Verify on staging

- [ ] **Step 1: Push** `git push origin staging`, then `git merge-base --is-ancestor HEAD origin/staging` — a clean exit code from push is not evidence (§10.17).

- [ ] **Step 2: Wait for the Railway build**, then confirm the ORIGIN is serving the new build before believing anything: fetch `https://themodestyhouse-staging-production.up.railway.app/new-in?cb=$RANDOM` and check it returns the page (§10.47).

- [ ] **Step 3: Redirects**

```bash
for u in /directory /hijabi-outfits; do
  curl -sLo /tmp/r.html -w "$u -> %{url_effective} %{http_code} %{size_download}\n" \
    "https://themodestyhouse-staging-production.up.railway.app$u"
done
```
Expected: both land on `/new-in`, 200, size well over 100 KB. Always `-L`, always read the byte count (§10.49 rule 2).

- [ ] **Step 4: Seeds and controls in a real browser.** Assert on staging: cards 3, 9, 16 and 22 are Losyana; the `Include hijabs` chip changes the count; and — CONTROLS FROM OUTSIDE THE CHANGE (§10.53 rule 2) — a search for `Inayah` (a house NOT in the 38) still returns results, and `/modest-dresses` still renders its grid.

- [ ] **Step 5: `npm run audit:interaction`** with `BASE=` pointed at staging. Expected: the nav check reaches the renamed "New In" row and reports no `PROBLEM`.

- [ ] **Step 6: Write `docs/log/2026-09-01-new-in-page.md`** in the §9 format, with the real command output pasted — including the negative-control runs from Task 1 Step 5 and Task 3 Step 6.

- [ ] **Step 7: Commit the log, push, and ask Tina to approve the merge to `main`.** Never merge without her explicit approval (§1).
