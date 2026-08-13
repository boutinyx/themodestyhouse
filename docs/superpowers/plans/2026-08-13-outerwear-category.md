# Outerwear Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Outerwear" lane (Blazers/Vests/Cardigans/Coats) pulled out of Tops, with a hover-opened "Type" filter narrowing to each sub-category — mirroring the existing Layering Basics mechanism exactly.

**Architecture:** A new specialty-overlay function `isOuterwear()` (title regex, gated on `garment === 'top'` to avoid misclassifying dresses/abayas/sets that merely mention these words) plus `outerwearSubtype()` (picks one of the four sub-types using a "rightmost match, checked before any `|` first" heuristic informed by real catalogue titles). A new lane in `lib/lanes.ts`, a parallel compact-catalogue column, and an extension to `FilterableGrid.tsx`'s existing Type filter.

**Tech Stack:** TypeScript, Vitest, existing `lib/specialty.ts`/`lib/compactCatalogue.ts`/`components/FilterableGrid.tsx` patterns (this plan is a close structural copy of how Layering Basics already works).

## Global Constraints

- English vocabulary only for this pass — do not add non-English blazer/vest/cardigan/coat terms; that's an explicit, documented follow-up, not silent scope creep.
- `isOuterwear()` MUST gate on `p.garment === 'top'` (or `p.forcedLane === 'outerwear'`) — measured against the real catalogue: 190 of 946 raw keyword-matching titles are dresses/abayas/sets/skirts/trousers that merely mention "blazer"/"vest"/"coat" as a styling descriptor (e.g. "Capo Blazer Dress", "The Oversized Blazer Abaya In Sage Green", "Vest And Skirt Set"). Matching on title alone without this gate would misclassify all 190.
- No republish (`npm run build:data`) needed anywhere in this plan — every function operates on `title`/`garment` fields already in `data/products.json` at request time (`lib/lanes.ts`/`lib/specialty.ts` run when a page is requested, not at publish time).
- Every new/changed function needs a test before being trusted; run `npx tsc --noEmit` and the relevant test files clean before each commit.

---

### Task 1: `OuterwearSubtype` type + `ForcedLane` extension

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `OuterwearSubtype = 'blazer' | 'vest' | 'cardigan' | 'coat'`, and `'outerwear'` added to the `ForcedLane` union. Read by Task 2 (`lib/specialty.ts`) and Task 4 (`lib/compactCatalogue.ts`).

This task is a type-only change — no test file, since `lib/types.ts` has none today and a type alias has nothing to unit test. Verified by `npx tsc --noEmit` at the end of Task 2, once something actually uses the new type.

- [ ] **Step 1: Add the type**

In `lib/types.ts`, find the existing `LayeringSubtype` type (around line 13-19). Add directly after it:

```typescript
/** The four sub-categories of the Outerwear lane (lib/lanes.ts) — see
 *  lib/specialty.ts for the classification logic. Declared here for the
 *  same reason as LayeringSubtype: avoids a circular import, since a
 *  future forced-subtype field on Product would need this type and
 *  lib/specialty.ts imports Product from here. */
export type OuterwearSubtype = 'blazer' | 'vest' | 'cardigan' | 'coat';
```

- [ ] **Step 2: Extend `ForcedLane`**

Find:

```typescript
export type ForcedLane = 'modest-activewear' | 'layering-basics';
```

Change to:

```typescript
export type ForcedLane = 'modest-activewear' | 'layering-basics' | 'outerwear';
```

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "$(cat <<'EOF'
feat(types): add OuterwearSubtype, extend ForcedLane

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `isOuterwear()` + `outerwearSubtype()` in `lib/specialty.ts`

**Files:**
- Modify: `lib/specialty.ts`
- Test: `lib/specialty.test.ts`

**Interfaces:**
- Consumes: `OuterwearSubtype` from `lib/types.ts` (Task 1).
- Produces: `isOuterwear(p: Product): boolean`, `outerwearSubtype(p: Product): OuterwearSubtype | null`, `OUTERWEAR_SUBTYPE_LABELS: Record<OuterwearSubtype, string>`. Read by Task 3 (`lib/lanes.ts`) and Task 4 (`lib/compactCatalogue.ts`).

- [ ] **Step 1: Write the failing tests**

Open `lib/specialty.test.ts`. It already has a `p()` fixture helper (`p(title, garment = 'top', extra = {})`) and a `describe('isLayering', ...)` block — follow that exact style. Add a new `describe` block after the existing `isLayering` tests (find where that block's closing `});` is, and the `isJilbab`/`isSpecialty` blocks that likely follow it — insert before whichever comes last, or at the end of the file):

```typescript
describe('isOuterwear', () => {
  it('is true for real catalogue titles, garment top', () => {
    expect(isOuterwear(p('Maren Vest'))).toBe(true); // ria-miranda
    expect(isOuterwear(p('Jacquard Blazer Jacket - Black'))).toBe(true); // nihan
    expect(isOuterwear(p('Fitted Cardigan-Beige'))).toBe(true); // bemu
    expect(isOuterwear(p('Lameesa Lyocell Trench Coat - Black'))).toBe(true); // nour-al-houda
    expect(isOuterwear(p('Belted Double Breasted Angora Coat - Mink'))).toBe(true); // nihan
  });

  it('is false when the same words appear on a non-top garment (styling descriptor, not the actual piece)', () => {
    expect(isOuterwear(p('Capo Blazer Dress', 'dress'))).toBe(false); // zayda — a dress, not a blazer
    expect(isOuterwear(p('The Oversized Blazer Abaya In Sage Green', 'abaya'))).toBe(false); // madiha
    expect(isOuterwear(p('Denim Vest Dress 9420', 'dress'))).toBe(false); // beyza
    expect(isOuterwear(p('Vest And Skirt Set', 'skirt'))).toBe(false); // touche-prive
    expect(isOuterwear(p('Sage Green Bell Sleeve Cardigan Set', 'set'))).toBe(false); // ilovemodesty
    expect(isOuterwear(p('Ahd Abaya (Trench Coat)', 'abaya'))).toBe(false); // bait-hanayen
  });

  it('is false for a top with none of the four words', () => {
    expect(isOuterwear(p('Basic Long Sleeve Top'))).toBe(false);
  });

  it('forcedLane overrides everything, including garment', () => {
    expect(isOuterwear(p('Random Dress Title', 'dress', { forcedLane: 'outerwear' }))).toBe(true);
    expect(isOuterwear(p('Belted Double Breasted Angora Coat', 'top', { forcedLane: 'layering-basics' }))).toBe(false);
  });

  it('does not overlap with isLayering (checked empirically against the real catalogue — 0 titles match both regexes)', () => {
    expect(isOuterwear(p('Under Shirt With Cardigan Detail'))).toBe(false); // hypothetical overlap case: layering wins
  });
});

describe('outerwearSubtype', () => {
  it('returns null for a non-outerwear product', () => {
    expect(outerwearSubtype(p('Basic Long Sleeve Top'))).toBeNull();
    expect(outerwearSubtype(p('Capo Blazer Dress', 'dress'))).toBeNull();
  });

  it('picks the single matching subtype for an unambiguous title', () => {
    expect(outerwearSubtype(p('Maren Vest'))).toBe('vest');
    expect(outerwearSubtype(p('Jacquard Blazer Jacket - Black'))).toBe('blazer');
    expect(outerwearSubtype(p('Fitted Cardigan-Beige'))).toBe('cardigan');
    expect(outerwearSubtype(p('Lameesa Lyocell Trench Coat - Black'))).toBe('coat');
  });

  it('picks the RIGHTMOST matching word when a title names more than one (the head noun, in this catalogue\'s naming convention)', () => {
    expect(outerwearSubtype(p('Tailored Blazer Coat'))).toBe('coat'); // real title
    expect(outerwearSubtype(p('2-in-1 Detachable Vest Trench Coat'))).toBe('coat'); // real title
    expect(outerwearSubtype(p('Belted Blazer Vest - Black'))).toBe('vest'); // real title, nihan
    expect(outerwearSubtype(p('Tree Bark Knitwear Blazer Cardigan - Camel'))).toBe('cardigan'); // real title
  });

  it('checks only the part of the title BEFORE a "|" first, so a marketing subtitle cannot override the actual product name', () => {
    // Real title, mariams: primary name "Sleeveless Cape Vest" is a vest;
    // "Gilet Coat" after the pipe is a descriptive subtitle, not the name.
    expect(outerwearSubtype(p('Sleeveless Cape Vest | Minimalist Long Wool-Blend Gilet Coat (MS204)'))).toBe('vest');
    // Real title, mariams: primary name is a cardigan.
    expect(outerwearSubtype(p('Waffle Knit Robe Cardigan | Belted Oversized Sweater Coat(MS198)'))).toBe('cardigan');
  });

  it('falls back to the whole title (rightmost match) when nothing before the pipe matches', () => {
    expect(outerwearSubtype(p('Autumn Collection | Classic Wool Coat'))).toBe('coat');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/specialty.test.ts`
Expected: FAIL — `isOuterwear`/`outerwearSubtype` are not exported from `./specialty` (import error), or `undefined` comparisons.

- [ ] **Step 3: Update the import line for the new tests**

At the top of `lib/specialty.test.ts`, find:

```typescript
import { isSwim, isActivewear, isLayering, isJilbab, isSpecialty, layeringSubtype } from './specialty';
```

Change to:

```typescript
import { isSwim, isActivewear, isLayering, isJilbab, isSpecialty, layeringSubtype, isOuterwear, outerwearSubtype } from './specialty';
```

- [ ] **Step 4: Implement in `lib/specialty.ts`**

Update the type import at the top of the file. Find:

```typescript
import type { Product } from '@/lib/types';
import type { LayeringSubtype } from '@/lib/types';

// Re-exported so existing call sites (lib/compactCatalogue.ts) don't need
// to change their import — the type itself now lives in lib/types.ts to
// avoid a circular import (Product carries a field of this type).
export type { LayeringSubtype };
```

Change to:

```typescript
import type { Product } from '@/lib/types';
import type { LayeringSubtype, OuterwearSubtype } from '@/lib/types';

// Re-exported so existing call sites (lib/compactCatalogue.ts) don't need
// to change their import — the type itself now lives in lib/types.ts to
// avoid a circular import (Product carries a field of this type).
export type { LayeringSubtype, OuterwearSubtype };
```

Add the following at the end of the file (after `isSpecialty`'s current closing brace):

```typescript
// Outerwear = blazers, vests, cardigans, coats. Tina's call 2026-08-13: one
// combined lane pulled out of Tops, with a Type filter breaking it into the
// four sub-categories, same mechanism as Layering Basics.
//
// GATED ON garment === 'top'. Measured against the real catalogue before
// shipping this: 946 published titles match one of the four words, but only
// 756 are garment:'top'. The other 190 are dresses, abayas, sets, skirts and
// trousers that merely MENTION "blazer"/"vest"/"coat" as a styling
// descriptor — "Capo Blazer Dress" (zayda, a dress), "The Oversized Blazer
// Abaya In Sage Green" (madiha, an abaya), "Vest And Skirt Set" (touche-prive,
// a skirt), "Ahd Abaya (Trench Coat)" (bait-hanayen, an abaya styled like a
// trench coat). Matching on title alone, the §10.10 mistake this project has
// already made once with unanchored substrings, would have pulled all 190 out
// of their correct lanes into Outerwear. `\b`-anchoring alone does not fix
// this — every one of those 190 titles contains the exact whole word.
const OUTERWEAR_RE = /\b(blazers?|vests?|cardigans?|coats?)\b/i;

export function isOuterwear(p: Product): boolean {
  if (p.forcedLane) return p.forcedLane === 'outerwear';
  if (isLayering(p)) return false; // checked empirically: 0 overlap today, but stay defensive — same pattern isActivewear() already uses against isSwim/isLayering
  return p.garment === 'top' && OUTERWEAR_RE.test(p.title);
}

export const OUTERWEAR_SUBTYPE_LABELS: Record<OuterwearSubtype, string> = {
  blazer: 'Blazers',
  vest: 'Vests',
  cardigan: 'Cardigans',
  coat: 'Coats',
};

// Order matters here only as the fallback iteration order when two matches
// land at the exact same index (impossible in practice — no word is a
// substring of another among these four — kept in the order Tina named them).
const OUTERWEAR_SUBTYPE_RES: [OuterwearSubtype, RegExp][] = [
  ['blazer', /\bblazers?\b/i],
  ['vest', /\bvests?\b/i],
  ['cardigan', /\bcardigans?\b/i],
  ['coat', /\bcoats?\b/i],
];

/**
 * Picks ONE of the four sub-types for a title naming more than one — e.g.
 * "Belted Blazer Vest - Black" (nihan) or "Tailored Blazer Coat". Real
 * catalogue titles checked before shipping this (19 multi-word titles found):
 * the RIGHTMOST matching word is consistently the actual garment, with
 * everything before it a styling adjective — "Blazer VEST", "Blazer COAT",
 * "Vest Trench COAT". This mirrors ordinary English compound-noun order
 * (head noun last).
 *
 * Checked BEFORE any "|" first, falling back to the whole title only if
 * nothing before the pipe matches. Mariam's Collection titles this catalogue
 * already carries put the real product name before a "|" and a marketing
 * subtitle after it — "Sleeveless Cape Vest | Minimalist Long Wool-Blend
 * Gilet Coat (MS204)" is a VEST; picking the rightmost match against the
 * WHOLE title would have said "coat", wrong, because "Gilet Coat" is
 * describing the silhouette in the subtitle, not naming the product.
 */
export function outerwearSubtype(p: Product): OuterwearSubtype | null {
  if (!isOuterwear(p)) return null;
  const head = p.title.split('|')[0];
  let best: OuterwearSubtype | null = null;
  let bestIndex = -1;
  for (const [type, re] of OUTERWEAR_SUBTYPE_RES) {
    const m = head.match(re);
    if (m && m.index !== undefined && m.index > bestIndex) {
      best = type;
      bestIndex = m.index;
    }
  }
  if (best) return best;
  for (const [type, re] of OUTERWEAR_SUBTYPE_RES) {
    const m = p.title.match(re);
    if (m && m.index !== undefined && m.index > bestIndex) {
      best = type;
      bestIndex = m.index;
    }
  }
  return best;
}
```

Then update `isSpecialty()`. Find:

```typescript
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p) || isLayering(p) || isJilbab(p);
}
```

Change to:

```typescript
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p) || isLayering(p) || isJilbab(p) || isOuterwear(p);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/specialty.test.ts`
Expected: PASS, all tests in the file green (including every pre-existing test — you have not touched `isSwim`/`isActivewear`/`isLayering`/`isJilbab`'s own logic, only added to `isSpecialty`'s OR chain).

- [ ] **Step 6: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/specialty.ts lib/specialty.test.ts
git commit -m "$(cat <<'EOF'
feat(specialty): add isOuterwear + outerwearSubtype

Gated on garment === 'top' -- measured against the real catalogue,
190 of 946 keyword-matching titles are dresses/abayas/sets/skirts/
trousers that merely mention "blazer"/"vest"/"coat" as a styling
descriptor, not the actual piece. outerwearSubtype() picks the
rightmost matching word (checked before any "|" first, to handle
Mariam's Collection's "name | subtitle" title format), matching
this catalogue's compound-noun-last naming convention -- verified
against all 19 real multi-word titles in the catalogue.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `outerwear` lane + exclude from Tops

**Files:**
- Modify: `lib/lanes.ts`

**Interfaces:**
- Consumes: `isOuterwear` from `lib/specialty.ts` (Task 2).
- Produces: a new entry in `LANES`/`CATEGORY_LANES` with `slug: 'outerwear'`.

No dedicated test file — `lib/lanes.ts` has none today (it's a plain data array; the routing/nav/sitemap machinery that reads `CATEGORY_LANES` is what Task 6's manual verification exercises).

- [ ] **Step 1: Update the import**

Find:

```typescript
import { isSwim, isActivewear, isLayering, isJilbab } from '@/lib/specialty';
```

Change to:

```typescript
import { isSwim, isActivewear, isLayering, isJilbab, isOuterwear } from '@/lib/specialty';
```

- [ ] **Step 2: Exclude outerwear from the Tops lane**

Find:

```typescript
  {
    slug: 'modest-tops',
    title: 'Tops',
    nav: 'Tops',
    intro: 'Tunics, blouses, shirts and layering tops.',
    kind: 'category',
    match: (p) => p.garment === 'top',
  },
```

Change the `match` line to:

```typescript
  {
    slug: 'modest-tops',
    title: 'Tops',
    nav: 'Tops',
    intro: 'Tunics, blouses, shirts and layering tops.',
    kind: 'category',
    // isOuterwear() items (blazers/vests/cardigans/coats) moved to their own
    // lane 2026-08-13 -- see the 'outerwear' entry below. Same exclusion
    // shape isActivewear() already uses against isSwim()/isLayering().
    match: (p) => p.garment === 'top' && !isOuterwear(p),
  },
```

- [ ] **Step 3: Add the new lane**

Find the `layering-basics` entry (it ends with `specialty: true,` followed by a blank line and the `// — other discovery lanes —` comment). Insert the new lane directly after `layering-basics`'s closing `},` and before the `// — other discovery lanes —` comment:

```typescript
  {
    slug: 'outerwear',
    title: 'Outerwear',
    nav: 'Outerwear',
    intro: 'Blazers, vests, cardigans and coats to layer over everything else.',
    kind: 'category',
    match: (p) => isOuterwear(p),
    specialty: true,
  },
```

- [ ] **Step 4: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/lanes.ts
git commit -m "$(cat <<'EOF'
feat(lanes): add Outerwear lane, exclude it from Tops

specialty: true, so it's picked up by the existing data-driven
routing/nav/footer/sitemap machinery with no hand-written route.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `outerwearSubtypes` column in the compact catalogue

**Files:**
- Modify: `lib/compactCatalogue.ts`
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: `outerwearSubtype`, `OUTERWEAR_SUBTYPE_LABELS`, `OuterwearSubtype` from `lib/specialty.ts` (Task 2).
- Produces: `CompactCatalogue.outerwearSubtypes: OuterwearSubtype[]`, `CompactCatalogue.rows.outerwearSubtypeIdx: number[]`. Read by Task 5 (`components/FilterableGrid.tsx`).

- [ ] **Step 1: Write the failing tests**

Open `lib/compactCatalogue.test.ts`. Find the `describe('layering subtype encoding', ...)` block (search for it — it has tests like `'gives a non-layering product the -1 sentinel and an empty dictionary'`). Add a new block directly after it, following the exact same shape:

```typescript
describe('outerwear subtype encoding', () => {
  it('gives a non-outerwear product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, title: 'Basic Long Sleeve Top', garment: 'top' }], [BRAND]);
    expect(cat.outerwearSubtypes).toEqual([]);
    expect(cat.rows.outerwearSubtypeIdx[0]).toBe(-1);
  });

  it('assigns a real index for an outerwear product, and only lists subtypes actually present', () => {
    const cat = encodeCatalogue([{ ...PRODUCT, title: 'Maren Vest', garment: 'top' }], [BRAND]);
    expect(cat.outerwearSubtypes).toEqual(['vest']);
    expect(cat.rows.outerwearSubtypeIdx[0]).toBe(0);
  });

  it('lists multiple present subtypes in canonical order, not first-appearance order', () => {
    const cat = encodeCatalogue(
      [
        { ...PRODUCT, id: 'aab:1', title: 'Classic Wool Coat', garment: 'top' },
        { ...PRODUCT, id: 'aab:2', title: 'Maren Vest', garment: 'top' },
      ],
      [BRAND],
    );
    // Canonical order is OUTERWEAR_SUBTYPE_LABELS' key order: blazer, vest, cardigan, coat.
    expect(cat.outerwearSubtypes).toEqual(['vest', 'coat']);
    expect(cat.rows.outerwearSubtypeIdx[0]).toBe(cat.outerwearSubtypes.indexOf('coat'));
    expect(cat.rows.outerwearSubtypeIdx[1]).toBe(cat.outerwearSubtypes.indexOf('vest'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-outerwear rows alongside real indices', () => {
    const cat = encodeCatalogue(
      [
        { ...PRODUCT, id: 'aab:1', title: 'Basic Long Sleeve Top', garment: 'top' },
        { ...PRODUCT, id: 'aab:2', title: 'Fitted Cardigan', garment: 'top' },
      ],
      [BRAND],
    );
    expect(cat.rows.outerwearSubtypeIdx[0]).toBe(-1);
    expect(cat.rows.outerwearSubtypeIdx[1]).toBe(0);
  });
});
```

(This uses the same `PRODUCT`/`BRAND` fixtures already defined near the top of the test file — check their exact shape by reading the file if the field names above don't match; they must include `id`, `brandSlug` matching `BRAND.slug`, `inStock: true`, `currency` matching `BRAND.currency`, per `encodeCatalogue`'s validation. Copy the existing `layering subtype encoding` block's fixture-construction style exactly.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: FAIL — `cat.outerwearSubtypes` is `undefined`.

- [ ] **Step 3: Implement in `lib/compactCatalogue.ts`**

Update the import line. Find:

```typescript
import { layeringSubtype, LAYERING_SUBTYPE_LABELS, type LayeringSubtype } from '@/lib/specialty';
```

Change to:

```typescript
import { layeringSubtype, LAYERING_SUBTYPE_LABELS, type LayeringSubtype, outerwearSubtype, OUTERWEAR_SUBTYPE_LABELS, type OuterwearSubtype } from '@/lib/specialty';
```

In the `CompactCatalogue` interface, find:

```typescript
  layeringSubtypes: LayeringSubtype[];
  rows: {
```

Change to:

```typescript
  layeringSubtypes: LayeringSubtype[];
  /** Same shape as layeringSubtypes, for the Outerwear lane's Type filter. */
  outerwearSubtypes: OuterwearSubtype[];
  rows: {
```

In the `rows` type, find:

```typescript
    layeringSubtypeIdx: number[];
    /** Days since FIRST_SEEN_EPOCH, or -1 if unknown. Sort-only — never
     *  decoded into CardProduct, same treatment as occasionMask. */
    firstSeenDay: number[];
```

Change to:

```typescript
    layeringSubtypeIdx: number[];
    /** Same shape as layeringSubtypeIdx, for outerwearSubtypes. */
    outerwearSubtypeIdx: number[];
    /** Days since FIRST_SEEN_EPOCH, or -1 if unknown. Sort-only — never
     *  decoded into CardProduct, same treatment as occasionMask. */
    firstSeenDay: number[];
```

In `encodeCatalogue`, find:

```typescript
  const layeringSubtypeOrder = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
  const presentSubtypes = new Set(products.map((p) => layeringSubtype(p)).filter((t): t is LayeringSubtype => t !== null));
  const layeringSubtypes = layeringSubtypeOrder.filter((t) => presentSubtypes.has(t));
  const layeringSubtypeIndex = new Map(layeringSubtypes.map((t, i) => [t, i]));
```

Add directly after it:

```typescript
  const outerwearSubtypeOrder = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
  const presentOuterwearSubtypes = new Set(products.map((p) => outerwearSubtype(p)).filter((t): t is OuterwearSubtype => t !== null));
  const outerwearSubtypes = outerwearSubtypeOrder.filter((t) => presentOuterwearSubtypes.has(t));
  const outerwearSubtypeIndex = new Map(outerwearSubtypes.map((t, i) => [t, i]));
```

In the `rows` initializer object, find:

```typescript
    layeringSubtypeIdx: [],
    firstSeenDay: [],
  };
```

Change to:

```typescript
    layeringSubtypeIdx: [],
    outerwearSubtypeIdx: [],
    firstSeenDay: [],
  };
```

In the main loop, find:

```typescript
    const subtype = layeringSubtype(p);
    rows.layeringSubtypeIdx.push(subtype === null ? -1 : layeringSubtypeIndex.get(subtype)!);
    rows.firstSeenDay.push(encodeFirstSeenDay(p.firstSeen));
```

Change to:

```typescript
    const subtype = layeringSubtype(p);
    rows.layeringSubtypeIdx.push(subtype === null ? -1 : layeringSubtypeIndex.get(subtype)!);
    const outerwearSub = outerwearSubtype(p);
    rows.outerwearSubtypeIdx.push(outerwearSub === null ? -1 : outerwearSubtypeIndex.get(outerwearSub)!);
    rows.firstSeenDay.push(encodeFirstSeenDay(p.firstSeen));
```

Finally, find the function's return statement:

```typescript
  return { brands: compactBrands, imagePrefixes, garments, occasions, layeringSubtypes, rows };
```

Change to:

```typescript
  return { brands: compactBrands, imagePrefixes, garments, occasions, layeringSubtypes, outerwearSubtypes, rows };
```

Do NOT touch `decodeCard` — `outerwearSubtypeIdx` is intentionally not part of `CardProduct`, same as `layeringSubtypeIdx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: PASS, all tests in the file green — including every pre-existing test (you have only added fields, never removed or renamed one an existing test reads).

- [ ] **Step 5: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "$(cat <<'EOF'
feat(catalogue): add outerwearSubtypes column

Parallel to the existing layeringSubtypes column, same shape,
kept independent rather than generalizing the two into one
mechanism -- matches how this codebase already prefers a narrow
second implementation over reworking a shipped one.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Wire the Type filter to show outerwear subtypes on the Outerwear lane

**Files:**
- Modify: `components/FilterableGrid.tsx`

**Interfaces:**
- Consumes: `cat.outerwearSubtypes`, `cat.rows.outerwearSubtypeIdx` (Task 4); `OUTERWEAR_SUBTYPE_LABELS` from `lib/specialty.ts` (Task 2).

No dedicated test file — this component has none today (confirmed: no `FilterableGrid.test.tsx` exists), consistent with this codebase's convention that these grid components are verified manually, not with component tests (`lib/*.ts` carries the tested logic; the component is a thin renderer over it).

- [ ] **Step 1: Update the import**

Find:

```typescript
import { LAYERING_SUBTYPE_LABELS } from '@/lib/specialty';
```

Change to:

```typescript
import { LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS } from '@/lib/specialty';
```

- [ ] **Step 2: Generalize the `types` memo to source from whichever subtype column is non-empty**

Find:

```typescript
  // Only ever non-empty on /layering-basics (the only lane with any
  // layeringSubtype != null) — see the same `.length > 0` gating pattern the
  // Occasion dropdown used before it was pulled (2026-08-12). Kept in
  // cat.layeringSubtypes' own canonical order (lib/specialty.ts), not
  // resorted here.
  const types = useMemo(
    () => cat.layeringSubtypes.map((t) => ({ value: t, label: LAYERING_SUBTYPE_LABELS[t] })),
    [cat]
  );
```

Change to:

```typescript
  // Non-empty on exactly ONE lane at a time — /layering-basics has real
  // layeringSubtype values and an empty outerwearSubtypes array; /outerwear
  // is the reverse. Every other lane has both empty, so `types` is `[]` and
  // the dropdown doesn't render at all (see the `types.length > 0` gate
  // below) — same pattern the Occasion dropdown used before it was pulled
  // (2026-08-12). Kept in each column's own canonical order
  // (lib/specialty.ts), not resorted here. Falls back to outerwear when
  // layering is empty rather than concatenating the two: a lane is never
  // both at once, by construction (isLayering/isOuterwear are mutually
  // exclusive — see lib/specialty.ts::isOuterwear's isLayering() guard).
  const types = useMemo(
    () =>
      cat.layeringSubtypes.length > 0
        ? cat.layeringSubtypes.map((t) => ({ value: t, label: LAYERING_SUBTYPE_LABELS[t] }))
        : cat.outerwearSubtypes.map((t) => ({ value: t, label: OUTERWEAR_SUBTYPE_LABELS[t] })),
    [cat]
  );
```

- [ ] **Step 3: Generalize the `typeIdx` lookup and the row filter**

Find:

```typescript
  const typeIdx = type === 'all' ? -1 : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);
```

Change to:

```typescript
  const usingOuterwearTypes = cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length > 0;
  const typeIdx =
    type === 'all'
      ? -1
      : usingOuterwearTypes
        ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
        : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);
```

Find, inside the `filteredRows` `useMemo`:

```typescript
      if (typeIdx !== -1 && cat.rows.layeringSubtypeIdx[i] !== typeIdx) continue;
```

Change to:

```typescript
      if (typeIdx !== -1) {
        const rowTypeIdx = usingOuterwearTypes ? cat.rows.outerwearSubtypeIdx[i] : cat.rows.layeringSubtypeIdx[i];
        if (rowTypeIdx !== typeIdx) continue;
      }
```

Also update that `useMemo`'s dependency array — find:

```typescript
  }, [cat, brandIdx, typeIdx, query]);
```

Change to:

```typescript
  }, [cat, brandIdx, typeIdx, usingOuterwearTypes, query]);
```

- [ ] **Step 4: Update the comment above the Type filter's JSX**

Find:

```typescript
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. Layering
          Basics is the one exception — it's one category by garment but
          spans five genuinely different kinds of piece (neck covers vs.
          under-dresses, say), so it alone gets a "Type" dropdown, gated on
          `types.length > 0` so no other lane ever renders it. */}
```

Change to:

```typescript
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. Layering
          Basics and Outerwear are the two exceptions — each is one category
          by garment/specialty-status but spans several genuinely different
          kinds of piece, so they alone get a "Type" dropdown, gated on
          `types.length > 0` so no other lane ever renders it. */}
```

- [ ] **Step 5: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/outerwear`.
- Confirm the page loads, shows a "Type" filter chip alongside Brand/Sort (no Occasion — that's already removed sitewide).
- Hover/click the Type chip — confirm it lists Blazers, Vests, Cardigans, Coats (in that order), not "All type" duplicated oddly.
- Select "Vests" — confirm the grid re-renders to only vest items (spot-check a card's title).
- Confirm `/layering-basics` still works exactly as before — its own Type filter (neck covers, sleeve extenders, etc.) is unaffected, since `usingOuterwearTypes` is only true when `cat.layeringSubtypes.length === 0`.
- Confirm `/modest-tops` no longer shows blazers/vests/cardigans/coats (spot-check: search "Cardigan" on that lane, expect zero results, whereas the same search on `/outerwear` finds results).
- Confirm `/outerwear` appears in the header's "Products" nav dropdown and in the footer's category list (both are `CATEGORY_LANES`-driven, so this should be automatic — verify it actually happened rather than assuming).

- [ ] **Step 7: Commit**

```bash
git add components/FilterableGrid.tsx
git commit -m "$(cat <<'EOF'
feat(outerwear): wire the Type filter to outerwear subtypes

Generalizes the existing Layering-only Type filter to also serve
/outerwear's Blazers/Vests/Cardigans/Coats breakdown -- the two
subtype columns are never both non-empty for the same lane, so this
is a branch, not a merge.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Full suite + lint + docs log

**Files:**
- Create: `docs/log/2026-08-13-outerwear-category.md`

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run --no-file-parallelism` (parallelism off — this repo's suite has known flakiness under parallel load on a busy machine; see `docs/log/2026-08-12-currency-expansion.md` for the prior incident).
Expected: all tests passing, including every new test from Tasks 2 and 4.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean, or only pre-existing warnings from files this plan never touched (check `git status` first — if another session has in-progress uncommitted work with its own lint warnings, that's not this plan's regression; note it in the log rather than fixing someone else's file).

- [ ] **Step 3: Full typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: clean, and the route list includes `/outerwear` (it's `generateStaticParams`-driven off `CATEGORY_LANES`, same as every other category lane — confirm it's actually there rather than assuming).

- [ ] **Step 5: Re-measure classification against the real catalogue**

Run this to confirm the shipped code's real-world numbers match what the spec/tests assumed (the spec's own "no accuracy sweep yet" follow-up — closing it here):

```bash
node -e "
const p = require('./data/products.json');
const OUTERWEAR_RE = /\b(blazers?|vests?|cardigans?|coats?)\b/i;
const hits = p.filter(x => x.garment === 'top' && OUTERWEAR_RE.test(x.title));
console.log('Outerwear candidates (garment top, matches regex):', hits.length);
const nonTop = p.filter(x => x.garment !== 'top' && OUTERWEAR_RE.test(x.title));
console.log('Correctly excluded (non-top, would be false positives):', nonTop.length);
"
```

Expected: roughly 756 and 190 respectively (exact numbers may drift slightly if the catalogue has been republished since this plan was written — that's fine; record whatever the real run prints in the log, not the numbers above verbatim).

- [ ] **Step 6: Write the docs/log entry**

Create `docs/log/2026-08-13-outerwear-category.md`:

```markdown
# Outerwear category (Blazers, Vests, Cardigans, Coats)

**Date:** 2026-08-13 · **Status:** done

## Goal

New "Outerwear" lane, pulled out of Tops, with a hover-opened Type filter narrowing to
Blazers/Vests/Cardigans/Coats — mirroring the existing Layering Basics mechanism. Tina's call,
arrived at over conversation (one combined lane, not four separate ones; pulled out of Tops
entirely, not left in both places).

## What changed

- `lib/types.ts` — new `OuterwearSubtype` type; `ForcedLane` gained `'outerwear'`.
- `lib/specialty.ts` — new `isOuterwear()` (gated on `garment === 'top'`, plus a title regex
  and an `isLayering()` exclusion guard) and `outerwearSubtype()` (rightmost-match heuristic,
  checked before any `|` first). Added to `isSpecialty()`.
- `lib/lanes.ts` — new `outerwear` lane (`specialty: true`), picked up automatically by the
  existing data-driven nav/footer/sitemap. `modest-tops`'s match gained `&& !isOuterwear(p)`.
- `lib/compactCatalogue.ts` — parallel `outerwearSubtypes`/`rows.outerwearSubtypeIdx` column,
  same shape as the existing layering one.
- `components/FilterableGrid.tsx` — the Type filter now branches between layering and
  outerwear subtypes depending on which column is non-empty for the current lane.

## Root cause avoided (not a bug fixed, a bug avoided)

A naive title-only regex would have misclassified 190 real dresses/abayas/sets/skirts/trousers
as outerwear — "Capo Blazer Dress", "The Oversized Blazer Abaya In Sage Green", "Vest And Skirt
Set" all contain a matching whole word while being a completely different garment. Measured
against the real catalogue before writing any code, not discovered after shipping.

## Verification

- [paste real `npx vitest run --no-file-parallelism` output here]
- [paste real `npm run lint` output here]
- [paste real `npx tsc --noEmit` output here — should be silent/exit 0]
- [paste real `npm run build` output here, confirming `/outerwear` in the route list]
- [paste real classification re-measurement output here]
- Manual: `/outerwear` loads, Type filter lists all four sub-categories in order, filtering by
  one works, `/layering-basics` unaffected, `/modest-tops` no longer shows outerwear items,
  `/outerwear` appears in the Products nav dropdown and footer.

## Notes / follow-ups

- English vocabulary only. Non-English blazer/vest/cardigan/coat terms are not covered —
  explicit gap, not a silent one, same as this catalogue's other specialty categories were
  built incrementally.
- No republish was needed or run — this is pure application code over titles already in
  `data/products.json`.
```

Fill in every `[paste real output here]` placeholder with the ACTUAL command output from Steps 1-5 before committing — do not commit the literal placeholder text.

- [ ] **Step 7: Commit**

```bash
git add docs/log/2026-08-13-outerwear-category.md
git commit -m "$(cat <<'EOF'
docs: log the Outerwear category implementation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
