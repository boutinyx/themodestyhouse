# Hijab Type Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-page **Type** filter dropdown to `/modest-hijabs` (next to the existing
Brand and Sort dropdowns), narrowing the grid by 15 fabric/style groups (Jersey, Chiffon,
Instant, Printed, etc.).

**Architecture:** A standalone classifier (`lib/hijabTypeFilter.ts`), a new independent
column in the compact catalogue, and one new `FilterDropdown` + one new filter guard in
`components/FilterableGrid.tsx`. This is the SECOND revision of this plan — see
`docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md`'s "Revision history" for why:
a concurrent session independently shipped a *different*, structural sub-category flyout
(Hijabs / Khimars & Jilbabs / Undercaps, commit `034a985`, touching `lib/specialty.ts`,
`lib/types.ts`, `components/Nav.tsx`, `components/MobileNav.tsx`, `app/[lane]/page.tsx`) for
what Tina clarified is a *different* concept from what this plan builds. **None of those five
files are touched by this plan** — this filter is additive and independent, composing with
their flyout rather than replacing or merging with it.

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict), Vitest 4 (node env), no new
dependencies.

## Global Constraints

- TypeScript strict mode — every new export fully typed, no `any`.
- Tests co-located `lib/<module>.test.ts`; import the module relatively.
- `npx tsc --noEmit` and `npm run lint` must both stay clean.
- Never claim a step "done" without pasting the real command output that verifies it.
- **This repo has at least one concurrent session, actively committing.** Before every `git
  add`, run `git status` and `git diff --stat` and confirm the only changes present are the
  ones this plan just made — do not use `git add -A` or stage a file you haven't personally
  diffed this session. (This plan's own authoring already hit this twice — see
  `docs/log/2026-08-15-hijab-type-filter-design-and-concurrent-edit.md` and the commit
  history around `71115fd`/`034a985` for what it looked like when it went wrong.)
- Do not touch `lib/types.ts`, `lib/specialty.ts`, `components/Nav.tsx`,
  `components/MobileNav.tsx`, or `app/[lane]/page.tsx` — all already correct for the
  concurrent session's sub-category flyout feature.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/hijabTypeFilter.ts` (create) | The 15-group classifier: `hijabTypeFilter(p)`, `HIJAB_TYPE_FILTER_LABELS`, `HijabTypeFilter` type. Self-contained — no edit to `lib/types.ts` needed. |
| `lib/hijabTypeFilter.test.ts` (create) | Classification tests against real catalogue titles. |
| `lib/compactCatalogue.ts` (modify) | Adds the `hijabTypeFilters`/`rows.hijabTypeFilterIdx` column — independent of the existing `hijabSubtypes`/`rows.hijabSubtypeIdx` column from `034a985`. |
| `lib/compactCatalogue.test.ts` (modify) | Encoding tests for the new column, including one proving a row can carry a real index in both hijab columns at once. |
| `components/FilterableGrid.tsx` (modify) | New `fabricType` state + `FilterDropdown`, ANDed into the existing filter loop. |

---

### Task 1: HijabTypeFilter classifier

**Files:**
- Create: `lib/hijabTypeFilter.ts`
- Test: `lib/hijabTypeFilter.test.ts`

**Interfaces:**
- Consumes: `Product` (`lib/types.ts`); `isJilbab`/`isKhimarAbaya`/`isUndercap` (`lib/specialty.ts`, read-only — not modified).
- Produces: `export type HijabTypeFilter`, `export function hijabTypeFilter(p: Product): HijabTypeFilter | null`, `export const HIJAB_TYPE_FILTER_LABELS: Record<HijabTypeFilter, string>` — Task 2 imports all three.

- [ ] **Step 1: Write the failing test file `lib/hijabTypeFilter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { hijabTypeFilter, HIJAB_TYPE_FILTER_LABELS } from './hijabTypeFilter';
import type { Product } from '@/lib/types';
import { productsForLane } from '@/lib/products';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'hijab', community: 'general',
  occasion: [], season: [], activity: [],
};

const p = (title: string, garment: Product['garment'] = 'hijab', extra: Partial<Product> = {}): Product =>
  ({ ...base, title, garment, ...extra });

describe('hijabTypeFilter', () => {
  it('returns null for a product outside the Hijabs & Scarves lane', () => {
    expect(hijabTypeFilter(p('Jersey Maxi Dress', 'dress'))).toBeNull();
  });

  it('returns null for a plain, unclassifiable hijab title', () => {
    expect(hijabTypeFilter(p('Riverwalk Blue Hijab'))).toBeNull(); // haute-hijab, real title
  });

  it('sorts a real title from each of the 15 groups into exactly the right group', () => {
    expect(hijabTypeFilter(p('Syrian Full-Neck Underscarf'))).toBe('caps-underscarves'); // jaida
    expect(hijabTypeFilter(p('Khimar Medina silk'))).toBe('khimar'); // jennah-boutique
    expect(hijabTypeFilter(p('Jilbab - Black', 'abaya'))).toBe('jilbab');
    expect(hijabTypeFilter(p('Premium Instant Hijab'))).toBe('instant'); // lafemme
    expect(hijabTypeFilter(p('Lina Knit Sweater and Removable Shawl'))).toBe('shawl'); // mondo-the-label
    expect(hijabTypeFilter(p('The Culture Starter Set'))).toBe('set'); // culture-hijab
    expect(hijabTypeFilter(p('Airy Jersey Scarf Mocha Brown'))).toBe('jersey'); // diversity-modest
    expect(hijabTypeFilter(p('Navy Lace Trim Modal Hijab'))).toBe('modal'); // urban-modesty
    expect(hijabTypeFilter(p('Small Premium Chiffon Hijab (Non-Slip)'))).toBe('chiffon'); // voile-chic
    expect(hijabTypeFilter(p('Premium Cotton Hijab'))).toBe('cotton');
    expect(hijabTypeFilter(p('Scarlet of Granada Satin'))).toBe('satin'); // jaida
    expect(hijabTypeFilter(p('Hijab ready to tie burgundy Medina silk'))).toBe('silk-viscose'); // chic-modesty
  });

  // Each pair is a REAL catalogue title matching two groups at once — confirms
  // the priority order resolves to the higher one, not just whichever group
  // happens to be tested first.
  it('resolves priority order when a real title matches more than one group', () => {
    expect(hijabTypeFilter(p('Khimar Medina silk'))).toBe('khimar'); // khimar over silk-viscose
    // hidayah, garment:'abaya' — "One-Piece" alone would say instant
    expect(hijabTypeFilter(p('Mirah One-Piece Jilbab (Bordeaux)', 'abaya'))).toBe('jilbab'); // jilbab over instant
    expect(hijabTypeFilter(p('BreathLite Sports Hijab Set- Ivory Blush - Final Sale'))).toBe('sport'); // sport over set, dignitii
    expect(hijabTypeFilter(p('Printed Satin'))).toBe('printed'); // printed over satin, culture-hijab
    expect(hijabTypeFilter(p('Diamond Satin Crinkle (Oat)'))).toBe('crinkle'); // crinkle over satin, hidayah
    expect(hijabTypeFilter(p('Liquid Jersey Instant Hijab'))).toBe('instant'); // instant over jersey, lafemme
  });

  it('classifies a khimar-abaya item (garment !== "hijab") via isKhimarAbaya, not the plain garment check', () => {
    // Real title, cited in lib/specialty.ts's own isKhimarAbaya() comment.
    expect(hijabTypeFilter(p('Mastour Khimaar Burnished Lilac', 'abaya'))).toBe('khimar');
  });

  it('every label in HIJAB_TYPE_FILTER_LABELS is reachable — regression guard against a group with a label but no working regex', () => {
    const realExampleByGroup: Record<string, Product> = {
      'caps-underscarves': p('Syrian Full-Neck Underscarf'),
      khimar: p('Khimar Medina silk'),
      jilbab: p('Jilbab - Black', 'abaya'),
      instant: p('Premium Instant Hijab'),
      sport: p('BreathLite Sports Hijab Set- Ivory Blush - Final Sale'),
      shawl: p('Lina Knit Sweater and Removable Shawl'),
      printed: p('Printed Satin'),
      set: p('The Culture Starter Set'),
      crinkle: p('Diamond Satin Crinkle (Oat)'),
      jersey: p('Airy Jersey Scarf Mocha Brown'),
      modal: p('Navy Lace Trim Modal Hijab'),
      chiffon: p('Small Premium Chiffon Hijab (Non-Slip)'),
      cotton: p('Premium Cotton Hijab'),
      satin: p('Scarlet of Granada Satin'),
      'silk-viscose': p('Hijab ready to tie burgundy Medina silk'),
    };
    for (const key of Object.keys(HIJAB_TYPE_FILTER_LABELS)) {
      expect(hijabTypeFilter(realExampleByGroup[key])).toBe(key);
    }
  });

  // Regression guard, not an exact snapshot — data/products.json is
  // republished nightly (CLAUDE.md §10.35), so pinning an exact count here
  // would fail on ordinary catalogue growth, not a real bug. This only
  // catches the classifier actually breaking (e.g. GROUPS emptied, or
  // reordered so nothing resolves). Measured 2026-08-15: 5,146 items on the
  // lane, 83.5% classified.
  it('classifies most of the real modest-hijabs lane', () => {
    const items = productsForLane('modest-hijabs');
    const classified = items.filter((prod) => hijabTypeFilter(prod) !== null).length;
    expect(items.length).toBeGreaterThan(1000);
    expect(classified / items.length).toBeGreaterThan(0.6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/hijabTypeFilter.test.ts`
Expected: FAIL — `Cannot find module './hijabTypeFilter'` (the file doesn't exist yet).

- [ ] **Step 3: Create `lib/hijabTypeFilter.ts`**

```ts
import type { Product } from '@/lib/types';
import { isJilbab, isKhimarAbaya, isUndercap } from '@/lib/specialty';

/**
 * The Hijabs & Scarves lane's in-page "Type" filter (Brand/Sort's own
 * FilterDropdown, components/IndexPanel.tsx) — 15 fabric/style groups built
 * from the real modest-hijabs lane (5,146 products, measured 2026-08-15),
 * not guessed. Full taxonomy table, group-by-group counts, and the priority-
 * order rationale live in
 * docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md.
 *
 * Deliberately NOT named HijabSubtype/hijabSubtype()/HIJAB_SUBTYPE_LABELS —
 * lib/specialty.ts and lib/types.ts already export those, for a DIFFERENT,
 * independent concept: which structural sub-category a product is (plain
 * hijab / khimar-jilbab / undercap), added by a concurrent session the same
 * evening (commit 034a985) and reachable from the header nav flyout, not
 * this in-page dropdown. A jersey khimar has a real value in BOTH — see
 * lib/compactCatalogue.ts's hijabTypeFilters column, added alongside the
 * pre-existing hijabSubtypes one, not replacing it.
 *
 * `isHijabLaneItem` mirrors the modest-hijabs lane's own `match` in
 * lib/lanes.ts, MINUS its `&& !isLayering(p)` guard: that guard only matters
 * for LANE MEMBERSHIP (deciding whether a prayer-titled jilbab/khimar shows
 * on this lane at all, vs. Layering Basics), not for classifying an item
 * that a caller already knows is on the lane. In production this function is
 * only ever called on rows a page already fetched via
 * productsForLane('modest-hijabs') — which already applied that guard — so
 * omitting it here cannot misclassify anything actually rendered.
 */
function isHijabLaneItem(p: Product): boolean {
  return p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p);
}

export type HijabTypeFilter =
  | 'caps-underscarves'
  | 'khimar'
  | 'jilbab'
  | 'instant'
  | 'sport'
  | 'shawl'
  | 'printed'
  | 'set'
  | 'crinkle'
  | 'jersey'
  | 'modal'
  | 'chiffon'
  | 'cotton'
  | 'satin'
  | 'silk-viscose';

export const HIJAB_TYPE_FILTER_LABELS: Record<HijabTypeFilter, string> = {
  'caps-underscarves': 'Caps & Underscarves',
  khimar: 'Khimars',
  jilbab: 'Jilbabs',
  instant: 'Instant Hijabs',
  sport: 'Sport Hijabs',
  shawl: 'Shawls & Pashminas',
  printed: 'Printed',
  set: 'Hijab Sets',
  crinkle: 'Crinkle',
  jersey: 'Jersey',
  modal: 'Modal',
  chiffon: 'Chiffon',
  cotton: 'Cotton & Bamboo',
  satin: 'Satin',
  'silk-viscose': 'Silk & Viscose',
};

// Priority order — most specific/functional groups first, generic fabric
// last, so a title matching more than one (e.g. "Liquid Jersey Instant
// Hijab") resolves to the narrower, more useful group. Same order as
// HIJAB_TYPE_FILTER_LABELS above, which is also the dropdown's display order.
const GROUPS: [HijabTypeFilter, RegExp][] = [
  ['caps-underscarves', /\bunderscarf|under.?cap|under.?scarf\b|\bbonnets?\b|\btube\b|\bninja\b|\bcaps?\b|\bturbans?\b|\bheadbands?\b/i],
  ['khimar', /\bkhimaa?rs?\b/i],
  ['jilbab', /\bjilbabs?\b/i],
  ['instant', /\binstant\b|\bone.?piece\b|\bno.?pin\b|\bready.?to.?wear\b|\bslip.?on\b/i],
  ['sport', /\bsports?\b|\bactive\b/i],
  ['shawl', /\bshawls?\b|\bpashmina\b/i],
  // \bprint(?:s|ed)?\b covers print/prints/printed — a first draft used
  // \bprints?\b alone and silently missed 134 real "Printed ..." titles,
  // caught and fixed before implementation (see the design doc's
  // Correction note).
  ['printed', /\bprint(?:s|ed)?\b|\bfloral\b|\bpolka\b|\banimal print\b|\bstripe[sd]?\b|\bplaid\b|\bcheck(?:ered)?\b/i],
  ['set', /\bsets?\b/i],
  ['crinkle', /\bcrinkle[d]?\b/i],
  ['jersey', /\bjersey\b/i],
  ['modal', /\bmodal\b/i],
  ['chiffon', /\bchiffon\b/i],
  ['cotton', /\bcotton\b|\bbamboo\b/i],
  ['satin', /\bsatin\b/i],
  ['silk-viscose', /\bsilk\b|\bviscose\b|\brayon\b/i],
];

/** Returns null for anything not on the Hijabs & Scarves lane, and for the
 *  ~16.5% of real lane items with no fabric/style word in the title at all
 *  (plain color-named titles like "Riverwalk Blue Hijab") — both are
 *  expected, not errors; they're simply shown under the dropdown's default
 *  "All types" state, same as Brand's default. */
export function hijabTypeFilter(p: Product): HijabTypeFilter | null {
  if (!isHijabLaneItem(p)) return null;
  for (const [type, re] of GROUPS) {
    if (re.test(p.title)) return type;
  }
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/hijabTypeFilter.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 5: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Confirm the working tree has only this task's files before staging**

```bash
git status --short
```
Confirm only `lib/hijabTypeFilter.ts` and `lib/hijabTypeFilter.test.ts` show as new/modified
by you (untracked `??`). If any other file you didn't touch this task shows as modified,
STOP and do not add it — it belongs to the concurrent session.

- [ ] **Step 7: Commit**

```bash
git add lib/hijabTypeFilter.ts lib/hijabTypeFilter.test.ts
git status --short lib/hijabTypeFilter.ts lib/hijabTypeFilter.test.ts
git commit -m "$(cat <<'EOF'
feat(hijabs): add HijabTypeFilter classifier (15 fabric/style groups)

hijabTypeFilter() classifies a hijab-lane product into one of 15
fabric/style groups (Jersey, Chiffon, Instant, Khimars, etc.) for the
in-page Type filter dropdown — independent of the sub-category
concept (hijab/khimar-jilbab/undercap) commit 034a985 already added
to lib/specialty.ts. Not wired into the UI yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Compact-catalogue encoding

**Files:**
- Modify: `lib/compactCatalogue.ts:1-6` (imports), `:54-104` (interface), `:114-160` (encode
  setup), `:239-259` (per-row loop + return)
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: `hijabTypeFilter`, `HIJAB_TYPE_FILTER_LABELS`, `type HijabTypeFilter` from
  `lib/hijabTypeFilter.ts` (Task 1).
- Produces: `CompactCatalogue.hijabTypeFilters: HijabTypeFilter[]` and
  `CompactCatalogue.rows.hijabTypeFilterIdx: number[]` — Task 3 reads both.

- [ ] **Step 1: Write the failing tests in `lib/compactCatalogue.test.ts`**

Add this new `describe` block right after the existing `describe('hijab subtype encoding',
...)` block (which currently ends at line 219, just before `describe('firstSeenDay
encoding', ...)`):

```ts
describe('hijab type-filter encoding', () => {
  // Distinct ids from the "hijab subtype encoding" block above's fixtures —
  // this is a SEPARATE, independent column, not a replacement for it.
  const JERSEY_HIJAB: Product = { ...PRODUCT, id: 'aab:10', title: 'Airy Jersey Scarf Mocha Brown', garment: 'hijab' };
  const CHIFFON_HIJAB: Product = { ...PRODUCT, id: 'aab:11', title: 'Small Premium Chiffon Hijab', garment: 'hijab' };
  const JERSEY_KHIMAR: Product = { ...PRODUCT, id: 'aab:12', title: 'Jersey Khimar Medina', garment: 'hijab' };

  it('gives a non-hijab product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual([]);
    expect(cat.rows.hijabTypeFilterIdx[0]).toBe(-1);
  });

  it('assigns a real index for a hijab product, and only lists types actually present', () => {
    const cat = encodeCatalogue([JERSEY_HIJAB], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual(['jersey']);
    expect(cat.rows.hijabTypeFilterIdx[0]).toBe(0);
  });

  it('orders present types canonically, not by first appearance in the input', () => {
    // CHIFFON_HIJAB ('chiffon') is listed BEFORE JERSEY_HIJAB ('jersey') in
    // the input array, but jersey sorts first in HIJAB_TYPE_FILTER_LABELS.
    const cat = encodeCatalogue([CHIFFON_HIJAB, JERSEY_HIJAB], [BRAND]);
    expect(cat.hijabTypeFilters).toEqual(['jersey', 'chiffon']);
    expect(cat.rows.hijabTypeFilterIdx[0]).toBe(cat.hijabTypeFilters.indexOf('chiffon'));
    expect(cat.rows.hijabTypeFilterIdx[1]).toBe(cat.hijabTypeFilters.indexOf('jersey'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-hijab rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, JERSEY_HIJAB], [BRAND]);
    expect(cat.rows.hijabTypeFilterIdx[0]).toBe(-1);
    expect(cat.rows.hijabTypeFilterIdx[1]).toBe(0);
  });

  it('a row can carry a real index in BOTH hijabSubtypeIdx and hijabTypeFilterIdx at once — the two columns are independent', () => {
    // JERSEY_KHIMAR is both a structural khimar (034a985's hijabSubtype:
    // 'khimar-jilbab', via isKhimarAbaya/isJilbab — wait, plain garment:
    // 'hijab' khimar wording alone does NOT satisfy isKhimarAbaya (abaya-
    // garment only) or isJilbab, so hijabSubtype() resolves this one to
    // plain 'hijab' — and separately, via THIS design's own classifier, a
    // fine-grained 'khimar' type. Both non-null, on the same row, is the
    // point: this proves the two columns don't clobber each other.
    const cat = encodeCatalogue([JERSEY_KHIMAR], [BRAND]);
    expect(cat.rows.hijabSubtypeIdx[0]).not.toBe(-1);
    expect(cat.rows.hijabTypeFilterIdx[0]).not.toBe(-1);
    expect(cat.hijabTypeFilters[cat.rows.hijabTypeFilterIdx[0]]).toBe('khimar');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: FAIL — `cat.hijabTypeFilters` is `undefined`.

- [ ] **Step 3: Modify `lib/compactCatalogue.ts`**

Import block (currently lines 1-6) — add a new import line after the existing one:
```ts
import type { Brand, Garment, Product } from '@/lib/types';
import {
  layeringSubtype, LAYERING_SUBTYPE_LABELS, type LayeringSubtype,
  outerwearSubtype, OUTERWEAR_SUBTYPE_LABELS, type OuterwearSubtype,
  hijabSubtype, HIJAB_SUBTYPE_LABELS, type HijabSubtype,
} from '@/lib/specialty';
import { hijabTypeFilter, HIJAB_TYPE_FILTER_LABELS, type HijabTypeFilter } from '@/lib/hijabTypeFilter';
```

In the `CompactCatalogue` interface, right after the `hijabSubtypes: HijabSubtype[];` field
(currently line 69):
```ts
  /** A SEPARATE, independent classification from hijabSubtypes above — which
   *  of 15 fabric/style groups (Jersey, Chiffon, Instant, ...) a product is,
   *  for the in-page Type filter dropdown (components/FilterableGrid.tsx),
   *  not the header nav flyout. A row can have a real index in both this and
   *  hijabSubtypeIdx at once — see rows.hijabTypeFilterIdx. */
  hijabTypeFilters: HijabTypeFilter[];
```

In the `rows` sub-interface, right after `hijabSubtypeIdx: number[];` (currently line 93):
```ts
    /** Same shape as hijabSubtypeIdx, but for hijabTypeFilters — a
     *  DIFFERENT, independent fact about the row (see the field comment
     *  above). Not mutually exclusive with hijabSubtypeIdx: a jersey khimar
     *  has a real value in both. */
    hijabTypeFilterIdx: number[];
```

In `encodeCatalogue`, right after the `hijabSubtypeIndex` computation (currently lines
140-143):
```ts
  const hijabTypeFilterOrder = Object.keys(HIJAB_TYPE_FILTER_LABELS) as HijabTypeFilter[];
  const presentHijabTypeFilters = new Set(products.map((p) => hijabTypeFilter(p)).filter((t): t is HijabTypeFilter => t !== null));
  const hijabTypeFilters = hijabTypeFilterOrder.filter((t) => presentHijabTypeFilters.has(t));
  const hijabTypeFilterIndex = new Map(hijabTypeFilters.map((t, i) => [t, i]));
```

In the `rows` initializer object, right after `hijabSubtypeIdx: [],` (currently line 157):
```ts
    hijabTypeFilterIdx: [],
```

In the per-product loop, right after the `hijabSub` push (currently lines 252-253):
```ts
    const hijabType = hijabTypeFilter(p);
    rows.hijabTypeFilterIdx.push(hijabType === null ? -1 : hijabTypeFilterIndex.get(hijabType)!);
```

The final `return` statement (currently line 258) — add `hijabTypeFilters` to it:
```ts
  return { brands: compactBrands, imagePrefixes, garments, occasions, layeringSubtypes, outerwearSubtypes, hijabSubtypes, hijabTypeFilters, rows };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: PASS, all assertions green — including every pre-existing test in this file
(`encodeCatalogue / decodeCard`, `layering subtype encoding`, `outerwear subtype encoding`,
`hijab subtype encoding`, `firstSeenDay encoding`), which must stay unaffected.

- [ ] **Step 5: Full test suite + typecheck**

Run: `npm test && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: all green, no type errors.

- [ ] **Step 6: Confirm the working tree has only this task's file before staging**

```bash
git status --short
```
Confirm only `lib/compactCatalogue.ts` and `lib/compactCatalogue.test.ts` are modified by
you. STOP if anything else appears.

- [ ] **Step 7: Commit**

```bash
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git status --short lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "$(cat <<'EOF'
feat(hijabs): encode hijabTypeFilter into the compact catalogue

Adds hijabTypeFilters/rows.hijabTypeFilterIdx as a new, independent
column alongside the existing hijabSubtypes one from 034a985 — a row
can have a real value in both (e.g. a jersey khimar). Still not
reachable from the UI — FilterableGrid is the next task.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: In-page Type filter dropdown

**Files:**
- Modify: `components/FilterableGrid.tsx:24` (state), `:62-65` (after `brands` memo),
  `:107-129` (filter loop), `:163` (IndexPanel render)

**Interfaces:**
- Consumes: `cat.hijabTypeFilters: HijabTypeFilter[]`, `cat.rows.hijabTypeFilterIdx:
  number[]` (Task 2); `HIJAB_TYPE_FILTER_LABELS` (Task 1, for building dropdown options).
- Produces: nothing later tasks depend on — this is where the feature becomes visible.

No unit test exists for this file (no component-test framework in this repo). Verification
is `tsc`/`lint` plus the manual Playwright pass in Task 4.

- [ ] **Step 1: Add the `fabricType` state** (currently line 24, right after `brand`)

Before:
```tsx
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
```

After:
```tsx
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  // Independent of `type` below (the sub-category flyout's URL-driven
  // state, from 034a985) — this is a plain in-page filter, same shape as
  // `brand`, not synced to the URL. Only meaningful on lanes where
  // cat.hijabTypeFilters is non-empty (in practice: only modest-hijabs).
  const [fabricType, setFabricType] = useState('all');
```

- [ ] **Step 2: Build the dropdown's options list** (currently lines 62-65, right after the
  `brands` memo)

Before:
```tsx
  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );
```

After:
```tsx
  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );
  // cat.hijabTypeFilters is already in HIJAB_TYPE_FILTER_LABELS's canonical
  // order (lib/compactCatalogue.ts's pre-pass) and already contains only the
  // types actually present on this lane — no further sort/filter needed,
  // same as how `brands` above is the one place that DOES need a sort
  // (brand names have no canonical order the way subtype keys do).
  const fabricTypes = useMemo(
    () => cat.hijabTypeFilters.map((t) => ({ value: t, label: HIJAB_TYPE_FILTER_LABELS[t] })),
    [cat]
  );
```

Add the import this needs, at the top of the file (currently line 7, right after the
`sortRows` import):
```tsx
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { HIJAB_TYPE_FILTER_LABELS } from '@/lib/hijabTypeFilter';
```

- [ ] **Step 3: Add the filter guard** (currently lines 107-129, the `filteredRows` useMemo)

Before:
```tsx
  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        const rowTypeIdx =
          typeDomain === 'outerwear'
            ? cat.rows.outerwearSubtypeIdx[i]
            : typeDomain === 'hijab'
              ? cat.rows.hijabSubtypeIdx[i]
              : cat.rows.layeringSubtypeIdx[i];
        if (rowTypeIdx !== typeIdx) continue;
      }
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, brandIdx, typeIdx, typeDomain, query]);
```

After:
```tsx
  const fabricTypeIdx = fabricType === 'all' ? -1 : cat.hijabTypeFilters.indexOf(fabricType as (typeof cat.hijabTypeFilters)[number]);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        const rowTypeIdx =
          typeDomain === 'outerwear'
            ? cat.rows.outerwearSubtypeIdx[i]
            : typeDomain === 'hijab'
              ? cat.rows.hijabSubtypeIdx[i]
              : cat.rows.layeringSubtypeIdx[i];
        if (rowTypeIdx !== typeIdx) continue;
      }
      // Independent of the typeIdx/typeDomain check above — ANDed, not a
      // replacement. A visitor can arrive via the Khimars & Jilbabs flyout
      // link (narrows by sub-category) and also pick "Jersey" here (narrows
      // further by fabric).
      if (fabricTypeIdx !== -1 && cat.rows.hijabTypeFilterIdx[i] !== fabricTypeIdx) continue;
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, brandIdx, typeIdx, typeDomain, fabricTypeIdx, query]);
```

- [ ] **Step 4: Reset "load more" on a fabric-type change too** (currently the `useEffect`
  right after `sortedRows`)

Before:
```tsx
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, type, q]);
```

After:
```tsx
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, type, fabricType, q]);
```

- [ ] **Step 5: Render the dropdown** (currently line 163, right after the `Brand`
  `FilterDropdown`, before `Sort`)

Before:
```tsx
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* Unlike the two above, this dropdown's "nothing chosen" value is a
```

After:
```tsx
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* Only rendered on a lane with fabric/style groups to offer — in
            practice, only /modest-hijabs. Independent of the sub-category
            flyout (Khimars & Jilbabs/Undercaps, 034a985) — see the comment
            on fabricTypeIdx above. */}
        {fabricTypes.length > 0 && (
          <FilterDropdown label="Type" value={fabricType} options={fabricTypes} onSelect={setFabricType} />
        )}
        {/* Unlike the two above, this dropdown's "nothing chosen" value is a
```

- [ ] **Step 6: Typecheck and lint**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 7: Confirm the working tree has only this task's file before staging**

```bash
git status --short
```
Confirm only `components/FilterableGrid.tsx` is modified by you. STOP if anything else
appears.

- [ ] **Step 8: Commit**

```bash
git add components/FilterableGrid.tsx
git status --short components/FilterableGrid.tsx
git commit -m "$(cat <<'EOF'
feat(hijabs): add in-page Type filter dropdown to Hijabs & Scarves

A new "Type" FilterDropdown, next to Brand/Sort, narrows by the 15
fabric/style groups from lib/hijabTypeFilter.ts. Independent of and
composable with the existing Khimars & Jilbabs/Undercaps header
flyout (034a985) — the two filter on different, orthogonal facts
about the same row.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Full verification + docs log

**Files:**
- Create: `docs/log/2026-08-15-hijab-type-filter-dropdown-shipped.md`

- [ ] **Step 1: Full automated verification**

Run, in order, pasting real output for each:
```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
npm run lint
npm test
```
Expected: all three clean/passing, including every new test from Tasks 1-2 and every
pre-existing test — especially `lib/specialty.test.ts` and the pre-existing blocks of
`lib/compactCatalogue.test.ts`, none of which this plan should have touched.

- [ ] **Step 2: Build and start a real server**

Confirm nothing already owns the port before starting one (§10.28's lesson):
```bash
lsof -i :3177 || echo "port free"
```
If free: `npm run build && npx next start -p 3177 &`. If not, pick a free port (e.g. 3179)
and use it below.

- [ ] **Step 3: Manual Playwright verification**

Against `http://localhost:3177` (or whatever port Step 2 used):
1. Load `/modest-hijabs`. Confirm a "Type" chip now sits next to "Brand" and "Sort" in the
   index panel.
2. Open it. Confirm 15 rows, in this order: Caps & Underscarves, Khimars, Jilbabs, Instant
   Hijabs, Sport Hijabs, Shawls & Pashminas, Printed, Hijab Sets, Crinkle, Jersey, Modal,
   Chiffon, Cotton & Bamboo, Satin, Silk & Viscose.
3. Pick "Jersey". Confirm the grid narrows to cards whose title plausibly contains "jersey"
   (spot-check 3 visible cards) — and confirm the URL does NOT change (this filter is
   deliberately not URL-synced, matching Brand).
4. With "Jersey" still selected, hover "Hijabs & Scarves" in the header and click "Khimars &
   Jilbabs" from that flyout. Confirm the page navigates to
   `/modest-hijabs?type=khimar-jilbab` and the grid now shows the INTERSECTION — khimar/
   jilbab items that are ALSO jersey (a small set; if it's empty, confirm the "No pieces
   match" state renders instead of a crash) — proving the two filters compose rather than
   one clobbering the other.
5. Reset "Type" back to "All types" with "Khimars & Jilbabs" still selected. Confirm the
   grid returns to the full khimar/jilbab set (132 items, per the design doc's count).

- [ ] **Step 4: Stop the server**

```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 5: Write the docs/log entry**

Create `docs/log/2026-08-15-hijab-type-filter-dropdown-shipped.md`:

```markdown
# Hijab Type filter dropdown — shipped
**Date:** 2026-08-15 · **Status:** done

## Goal
Add an in-page "Type" filter dropdown to /modest-hijabs (Jersey, Chiffon, Instant, Printed,
etc.), independent of and composable with the concurrent session's Khimars & Jilbabs/
Undercaps header flyout (034a985). Full background, including why this plan went through
two revisions: `docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md`.

## What changed
- `lib/hijabTypeFilter.ts` (new) — `hijabTypeFilter()` classifier + `HIJAB_TYPE_FILTER_LABELS`.
- `lib/hijabTypeFilter.test.ts` (new) — classification tests against real catalogue titles.
- `lib/compactCatalogue.ts` — `hijabTypeFilters`/`rows.hijabTypeFilterIdx` column, independent
  of the pre-existing `hijabSubtypes`/`rows.hijabSubtypeIdx`.
- `lib/compactCatalogue.test.ts` — encoding tests, including one proving a row can carry a
  real index in both hijab columns at once.
- `components/FilterableGrid.tsx` — new "Type" `FilterDropdown`, ANDed into the existing
  filter loop alongside brand/sub-category-type/search.

## Verification
[paste the real tsc/lint/test output from Task 4 Step 1, and a summary of the manual
Playwright pass from Step 3 — what was picked/clicked and what was observed, especially the
compose-with-the-flyout check]

## Notes / follow-ups
- No staff manual override, no non-English vocabulary coverage, no URL sync for this
  filter — same explicit out-of-scope calls as the design doc.
- This plan went through two revisions after discovering a concurrent session had
  independently built a related-but-different feature in the same evening — see the design
  doc's "Revision history" and `docs/log/2026-08-15-hijab-type-filter-design-and-concurrent-edit.md`
  for the full account, including a git mistake (another session's staged work briefly got
  swept into one of this session's commits, caught and corrected before pushing anywhere).
```

- [ ] **Step 6: Confirm the working tree has only this task's file before staging**

```bash
git status --short
```

- [ ] **Step 7: Commit**

```bash
git add docs/log/2026-08-15-hijab-type-filter-dropdown-shipped.md
git status --short docs/log/2026-08-15-hijab-type-filter-dropdown-shipped.md
git commit -m "$(cat <<'EOF'
docs(hijabs): log the shipped Type filter dropdown with verification evidence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** every file in the revised design doc's "Design" section has a task
  (`lib/hijabTypeFilter.ts` → Task 1, `lib/compactCatalogue.ts` → Task 2,
  `components/FilterableGrid.tsx` → Task 3). The design doc's explicit "not touched" list
  (`lib/types.ts`, `lib/specialty.ts`, `components/Nav.tsx`, `components/MobileNav.tsx`,
  `app/[lane]/page.tsx`) has no task, correctly.
- **Placeholder scan:** no TBD/TODO markers; every code block is complete, copy-pasteable
  code.
- **Type consistency:** `HijabTypeFilter`, `hijabTypeFilter()`, `HIJAB_TYPE_FILTER_LABELS`
  are spelled identically everywhere across Tasks 1-3, and deliberately distinct from
  `034a985`'s `HijabSubtype`/`hijabSubtype()`/`HIJAB_SUBTYPE_LABELS` at every call site.
- **Concurrent-session risk:** every task ends with an explicit `git status` check before
  staging, called out in Global Constraints and repeated per-task — this plan's own
  authoring hit the collision it's now guarding against, twice, so the guard is not
  theoretical.
