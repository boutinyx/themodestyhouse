# Garment Classification Confidence + Review Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop trusting a single unanchored regex match to publish a garment classification, and make future `lib/tag.ts` fixes reach the whole catalogue on the next publish instead of only on re-scraped brands.

**Architecture:** Persist the classification *signals* (`product_type`, `tags`) alongside the frozen `garment` on each raw row; re-derive classification at publish time from those signals with a second independent check (title vs. `product_type`); hold back anything weak or conflicting into a review queue instead of guessing; let manual corrections (`data/garment-overrides.json`) permanently override re-derivation, never the other way around.

**Tech Stack:** TypeScript (`lib/`), tsx-run Node scripts (`scripts/build-data.mjs`), Vitest, Next.js dev-only admin routes (existing `.dev.ts(x)` convention).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-12-garment-classification-design.md` — read it first, this plan implements it exactly.
- `raw` signal fields must never reach `products.json` / the public `Product` payload (Invariant 15, CLAUDE.md §5).
- Manual overrides in `data/garment-overrides.json` are never written by any automated path — only by the dev-only review UI (§10.13 lesson).
- Any new dev-only route must live under `/admin/*` or `/api/admin/*` — those are the only prefixes `proxy.ts`'s matcher and `scripts/verify-gate.mjs`'s leak checks already cover; do **not** invent a new top-level `/api/*` prefix without also updating both.
- Follow the existing `.dev.ts`/`.dev.tsx` naming convention for anything gated by `next.config.ts`'s `pageExtensions`.
- `npx tsc --noEmit` and `npm run lint` must stay clean; run `rm -f tsconfig.tsbuildinfo` before `tsc` (incremental builds can mask a repeat run).
- Every task ends with real command output pasted as evidence, per CLAUDE.md's "verify before claiming."

---

### Task 1: Harden `GARMENT_RULES` word boundaries

**DONE — deviated from plan, in the direction §10.11 warns about.** Naive anchoring (as
written below) regressed 92 real products off the whole corpus before compounds like
`sweatshirt`/`overcoat`/`sundress` (no space, so a boundary-anchored suffix can't see them)
were added as explicit alternatives — same treatment as the existing `sweatpants`/`twinset`
compounds. Caught by re-running the corpus diff script (`/tmp/tagcheck/diff.mjs`, ad hoc, not
committed) before committing, per the plan's own "no placeholders / verify against real data"
constraint. Final commit `705d76d` — see its message for the full before/after numbers. The
steps below are left as originally planned for the record; the actual shipped regex additions
are wider than Step 3 shows.

**Files:**
- Modify: `lib/tag.ts:75` (the catch-all `top` rule), `lib/tag.ts:35` (`dress`), and the `skirt` rule (currently line 36, plain `/skirt|\bjupe\b/i`)
- Test: `lib/tag.test.ts`

**Interfaces:**
- Produces: no signature change — `GARMENT_RULES` entries still `[Garment, RegExp]`, `word()` already exists (`lib/tag.ts:15`) and is reused as-is.

- [ ] **Step 1: Write the failing regression tests**

Add to `lib/tag.test.ts` (new `describe` block near the other regression-fixture blocks):

```ts
describe('word-boundary hardening (2026-08-12)', () => {
  it('does not classify a Spanish dress ("Vestido") as a top via the unanchored "vest" match', () => {
    expect(tagDiscovery({ title: 'Vestido Largo Azul', productType: '', tags: [] }).garment).not.toBe('top');
  });
  it('does not classify a petticoat as a top via the unanchored "coat" match', () => {
    expect(tagDiscovery({ title: 'Cotton Petticoat Underskirt', productType: '', tags: [] }).garment).not.toBe('top');
  });
  it('does not classify a headdress as a dress via the unanchored "dress" match', () => {
    expect(tagDiscovery({ title: 'Beaded Headdress', productType: '', tags: [] }).garment).not.toBe('dress');
  });
  it('still classifies real tops/dresses containing these substrings as themselves', () => {
    expect(tagDiscovery({ title: 'Wool Overcoat', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Quilted Vest', productType: '', tags: [] }).garment).toBe('top');
    expect(tagDiscovery({ title: 'Bridesmaid Sundress', productType: '', tags: [] }).garment).toBe('dress');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/tag.test.ts`
Expected: the first three `it`s FAIL (garment comes back `'top'`/`'dress'` respectively); the fourth passes already.

- [ ] **Step 3: Anchor the rules**

In `lib/tag.ts`, replace:
```ts
  ['top', /top|blouse|shirt|tunic|sweater|cardigan|bolero|blazer|vest|coat|jacket/i],
```
with:
```ts
  ['top', word('tops?|blouses?|shirts?|tunics?|sweaters?|cardigans?|boleros?|blazers?|vests?|coats?|jackets?')],
```
Replace:
```ts
  ['dress', /dress|gown/i],
```
(the FIRST occurrence, near the top of `GARMENT_RULES` — line ~35) with:
```ts
  ['dress', word('dress(?:es)?|gowns?')],
```
Replace:
```ts
  ['skirt', /skirt|\bjupe\b/i],
```
with:
```ts
  ['skirt', word('skirts?|jupes?')],
```
Leave the length-only fallback (`['dress', /\b(maxi|midi)\b/i]`, last in the array) untouched — it already uses `\b` deliberately and is not part of this bug class.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/tag.test.ts`
Expected: all tests PASS, including the full existing suite (no regressions — paste the full summary line).

- [ ] **Step 5: Commit**

```bash
git add lib/tag.ts lib/tag.test.ts
git commit -m "fix(tag): anchor top/dress/skirt rules to word boundaries

Vest/coat/top/dress/gown/skirt matched as bare substrings, so e.g. Spanish
'Vestido' (dress) matched 'vest' and published as a top. Same bug class
§10.10 already fixed for set/pant."
```

---

### Task 2: Add classification provenance (`source`) and a second signal (`classifyFromType`)

**Files:**
- Modify: `lib/tag.ts`
- Test: `lib/tag.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `tagDiscovery(input): { garment: Garment; source: 'title' | 'meta' | 'foreign' | 'description'; occasion: string[]; season: string[]; activity: string[] }` — `source` is new; when `garment === 'other'` its value is `'meta'` (last pass attempted, callers must check `garment` first, never rely on `source` alone to mean "matched").
  - `classifyFromType(productType: string): Garment` — new export.
  - `GARMENT_VALUES: Garment[]` and `GARMENT_LABELS: Record<Garment, string>` — new exports, used by Task 8's review UI.

- [ ] **Step 1: Write the failing tests**

Add to `lib/tag.test.ts`:

```ts
import { tagDiscovery, classifyFromType, GARMENT_VALUES, GARMENT_LABELS } from './tag';

describe('classification source', () => {
  it('reports "title" when the title itself matched', () => {
    expect(tagDiscovery({ title: 'Chiffon Silk Hijab', productType: 'Hijabs', tags: [] }).source).toBe('title');
  });
  it('reports "meta" when only product_type/tags matched, not the title', () => {
    const r = tagDiscovery({ title: 'Navy Blue Square Neck Cover', productType: 'Tops', tags: [] });
    expect(r.garment).toBe('top');
    expect(r.source).toBe('meta');
  });
  it('reports "foreign" when a foreign-vocabulary rule matched', () => {
    const r = tagDiscovery({ title: 'Robe évasée Lilas Pastel', productType: '', tags: [] });
    expect(r.garment).toBe('dress');
    expect(r.source).toBe('foreign');
  });
  it('reports "description" when only the description lead matched', () => {
    const r = tagDiscovery({
      title: 'Hazelnut', productType: '', tags: [],
      bodyHtml: '<p>A bamboo jersey hijab in a warm hazelnut tone.</p>',
    });
    expect(r.garment).toBe('hijab');
    expect(r.source).toBe('description');
  });
});

describe('classifyFromType', () => {
  it('classifies from product_type alone', () => {
    expect(classifyFromType('Dresses')).toBe('dress');
    expect(classifyFromType('Trousers')).toBe('trousers');
  });
  it('returns "other" for an empty or non-matching type', () => {
    expect(classifyFromType('')).toBe('other');
    expect(classifyFromType('Accessories')).toBe('other');
  });
});

describe('GARMENT_VALUES / GARMENT_LABELS', () => {
  it('has a label for every garment value, and only those values', () => {
    for (const g of GARMENT_VALUES) expect(GARMENT_LABELS[g]).toBeTruthy();
    expect(GARMENT_VALUES).toContain('other');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/tag.test.ts`
Expected: FAIL — `source` is `undefined`, `classifyFromType`/`GARMENT_VALUES`/`GARMENT_LABELS` are not exported.

- [ ] **Step 3: Implement**

In `lib/tag.ts`, change the `tagDiscovery` body to track which pass matched, and add the new exports. Replace the whole function body from `let garment: Garment = 'other';` through the final `return` with:

```ts
export type ClassificationSource = 'title' | 'meta' | 'foreign' | 'description';

export const GARMENT_VALUES: Garment[] = [
  'dress', 'skirt', 'top', 'trousers', 'abaya', 'hijab', 'swim', 'set', 'other',
];
export const GARMENT_LABELS: Record<Garment, string> = {
  dress: 'Dress', skirt: 'Skirt', top: 'Top', trousers: 'Trousers', abaya: 'Abaya',
  hijab: 'Hijab', swim: 'Swim', set: 'Set', other: 'Other / unclassifiable',
};

/** Classifies from a Shopify product_type string alone — the title-tier rules
 *  only, no hay fallback, no foreign/description passes. Used as an
 *  independent second opinion against the title-based result (see
 *  lib/garmentReview.ts), not as another chance at the same fuzzy match. */
export function classifyFromType(productType: string): Garment {
  const type = productType || '';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(type)) return g;
  }
  return 'other';
}
```

(keep this above `tagDiscovery`, below `FOREIGN_RULES`/`OCCASION_RULES`/etc. — anywhere before `tagDiscovery` is fine since it only needs `GARMENT_RULES`).

Then inside `tagDiscovery`, change:
```ts
  const hay = [input.title, input.productType, ...(input.tags || [])].join(' ');
  // Trust the TITLE first (most accurate), then fall back to type/tags.
  let garment: Garment = 'other';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(input.title)) { garment = g; break; }
  }
  if (garment === 'other') {
    for (const [g, re] of GARMENT_RULES) {
      if (re.test(hay)) { garment = g; break; }
    }
  }
```
to:
```ts
  const hay = [input.title, input.productType, ...(input.tags || [])].join(' ');
  // Trust the TITLE first (most accurate), then fall back to type/tags.
  let garment: Garment = 'other';
  let source: ClassificationSource = 'meta';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(input.title)) { garment = g; source = 'title'; break; }
  }
  if (garment === 'other') {
    for (const [g, re] of GARMENT_RULES) {
      if (re.test(hay)) { garment = g; source = 'meta'; break; }
    }
  }
```
And the two remaining passes — change
```ts
  if (garment === 'other') {
    for (const [g, re] of FOREIGN_RULES) {
      if (re.test(input.title) || re.test(input.productType || '')) { garment = g; break; }
    }
  }
```
to set `source = 'foreign'` alongside `garment = g`, and
```ts
  if (garment === 'other') {
    const lead = descriptionLead(input.bodyHtml);
    if (lead) {
      for (const [g, re] of GARMENT_RULES) {
        if (re.test(lead)) { garment = g; break; }
      }
    }
  }
```
to set `source = 'description'` alongside `garment = g`. Finally change the return statement:
```ts
  return {
    garment,
    source,
    occasion: matchAll(OCCASION_RULES, hay),
    season: matchAll(SEASON_RULES, hay),
    activity: matchAll(ACTIVITY_RULES, hay),
  };
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/tag.test.ts`
Expected: all PASS, full file. Paste the summary line.

- [ ] **Step 5: Commit**

```bash
git add lib/tag.ts lib/tag.test.ts
git commit -m "feat(tag): report classification source, add classifyFromType

Groundwork for publish-time re-derivation: tagDiscovery now says WHICH pass
matched, and classifyFromType gives an independent second opinion from
product_type alone."
```

---

### Task 3: Persist classification signals on the raw row

**Files:**
- Modify: `lib/types.ts` (add `raw?` to `Product`), `lib/normalize.ts`
- Test: `lib/normalize.test.ts`

**Interfaces:**
- Consumes: `tagDiscovery`'s `source` field (Task 2).
- Produces: `Product.raw?: { productType: string; tags: string[]; classifiedFrom: ClassificationSource }`. `stripRawSignals(product: Product): Product` — new export from `lib/normalize.ts`, deletes `raw` (mirrors `stripLifecycle` in shape, lives here because this is where `raw` is produced — "files that change together live together").

- [ ] **Step 1: Write the failing tests**

Add to `lib/normalize.test.ts`:

```ts
import { stripRawSignals } from './normalize';

describe('normalizeProduct raw signals', () => {
  it('persists product_type, tags and classifiedFrom for later re-derivation', () => {
    const p = normalizeProduct(sp, brand)!;
    expect(p.raw).toEqual({ productType: 'Dresses', tags: ['summer'], classifiedFrom: 'title' });
  });
});

describe('stripRawSignals', () => {
  it('removes the raw field', () => {
    const p = normalizeProduct(sp, brand)!;
    expect(p.raw).toBeDefined();
    expect(stripRawSignals(p).raw).toBeUndefined();
  });
  it('does not mutate the input', () => {
    const p = normalizeProduct(sp, brand)!;
    stripRawSignals(p);
    expect(p.raw).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/normalize.test.ts`
Expected: FAIL — `p.raw` is `undefined`, `stripRawSignals` is not exported.

- [ ] **Step 3: Implement**

In `lib/types.ts`, add to the `Product` interface (after `activity: string[];`):
```ts
  /** Classification signals, RAW-ONLY — never survives to products.json (see
   *  lib/normalize.ts::stripRawSignals, called at publish time). Lets
   *  build-data.mjs re-derive `garment` from the current lib/tag.ts logic
   *  without a re-scrape. Absent on rows scraped before 2026-08-12; absent on
   *  most test fixtures. */
  raw?: {
    productType: string;
    tags: string[];
    classifiedFrom: 'title' | 'meta' | 'foreign' | 'description';
  };
```

In `lib/normalize.ts`, inside `normalizeProductDetailed`, the returned product object gains `raw`:
```ts
    product: {
      id: `${brand.slug}:${sp.id}`,
      brandSlug: brand.slug,
      brandName: brand.name,
      title,
      price,
      currency: brand.currency,
      image,
      url: sp.url ?? `${brand.homepage}/products/${sp.handle}`,
      inStock: (sp.variants || []).some((v) => v.available),
      garment: disc.garment,
      community: brand.community,
      occasion: disc.occasion,
      season: disc.season,
      activity: disc.activity,
      raw: { productType: sp.product_type || '', tags, classifiedFrom: disc.source },
    },
```
(`tags` here is the already-normalized array computed a few lines above — reuse it, do not re-split `sp.tags`.)

Add, at the end of the file:
```ts
/** Drops classification-signal bookkeeping before publish — raw-only, never
 *  reaches products.json (Invariant 15: bulk text never goes on the public
 *  Product). Mirrors lib/lifecycle.ts::stripLifecycle in shape; lives here
 *  because this is where `raw` is produced. */
export function stripRawSignals(product: Product): Product {
  const { raw: _raw, ...rest } = product;
  return rest;
}
```
(add `import type { ... }` adjustments only if needed — `Product` is already imported.)

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/normalize.test.ts`
Expected: all PASS.

- [ ] **Step 5: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean (adding an optional field cannot break existing call sites).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/normalize.ts lib/normalize.test.ts
git commit -m "feat(normalize): persist product_type/tags/classifiedFrom on raw rows

raw-products.json only ever stored the classification RESULT, never the
signals that produced it — the reason a lib/tag.ts fix needs a full
re-scrape to take effect (CLAUDE.md §10.12). This is the fix for that."
```

---

### Task 4: `lib/garmentReview.ts` — the publish-time decision

**Files:**
- Create: `lib/garmentReview.ts`
- Test: `lib/garmentReview.test.ts`

**Interfaces:**
- Consumes: `tagDiscovery`, `classifyFromType` (Task 2); `Product['raw']` shape (Task 3).
- Produces:
```ts
export type GarmentDecision =
  | { status: 'override'; garment: Garment }
  | { status: 'confident'; garment: Garment }
  | { status: 'frozen'; garment: Garment }
  | { status: 'held'; why: 'signal-conflict' | 'weak-signal' | 'unclassified'; titleGuess: Garment; typeGuess: Garment };

export function resolveGarment(
  row: { id: string; garment: Garment; title: string; raw?: Product['raw'] },
  overrides: Record<string, Garment>,
): GarmentDecision
```
Used by `scripts/build-data.mjs` (Task 5) and `app/api/admin/garment-review/*` (Task 7).

- [ ] **Step 1: Write the failing tests**

Create `lib/garmentReview.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveGarment } from './garmentReview';

const base = { id: 'brand:1', garment: 'other' as const, title: '' };

describe('resolveGarment', () => {
  it('an override always wins, regardless of title/type', () => {
    const row = { ...base, title: 'Wide Leg Trousers', garment: 'trousers' as const,
      raw: { productType: 'Trousers', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, { 'brand:1': 'top' })).toEqual({ status: 'override', garment: 'top' });
  });

  it('no raw signals -> falls back to the frozen garment, unchanged', () => {
    const row = { ...base, title: 'Something', garment: 'dress' as const };
    expect(resolveGarment(row, {})).toEqual({ status: 'frozen', garment: 'dress' });
  });

  it('title-confident match with no contradicting type -> confident', () => {
    const row = { id: 'brand:2', garment: 'other' as const, title: 'Chiffon Silk Hijab',
      raw: { productType: 'Hijabs', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'hijab' });
  });

  it('title-confident match with type agreeing -> confident', () => {
    const row = { id: 'brand:3', garment: 'other' as const, title: 'Aurelia Maxi Dress',
      raw: { productType: 'Dresses', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({ status: 'confident', garment: 'dress' });
  });

  it('title-confident but type disagrees -> held, signal-conflict, both guesses recorded', () => {
    const row = { id: 'brand:4', garment: 'other' as const, title: 'Wide Leg Trousers',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'title' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'signal-conflict', titleGuess: 'trousers', typeGuess: 'top',
    });
  });

  it('weak signal (matched only via meta, not the title) -> held', () => {
    const row = { id: 'brand:5', garment: 'other' as const, title: 'Navy Blue Square Neck Cover',
      raw: { productType: 'Tops', tags: [], classifiedFrom: 'meta' as const } };
    const d = resolveGarment(row, {});
    expect(d.status).toBe('held');
    expect(d).toMatchObject({ why: 'weak-signal', titleGuess: 'top', typeGuess: 'top' });
  });

  it('unclassifiable title -> held, unclassified', () => {
    const row = { id: 'brand:6', garment: 'other' as const, title: 'Gift Card',
      raw: { productType: '', tags: [], classifiedFrom: 'meta' as const } };
    expect(resolveGarment(row, {})).toEqual({
      status: 'held', why: 'unclassified', titleGuess: 'other', typeGuess: 'other',
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/garmentReview.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

Create `lib/garmentReview.ts`:

```ts
import type { Garment, Product } from '@/lib/types';
import { tagDiscovery, classifyFromType } from '@/lib/tag';

export type GarmentDecision =
  | { status: 'override'; garment: Garment }
  | { status: 'confident'; garment: Garment }
  | { status: 'frozen'; garment: Garment }
  | {
      status: 'held';
      why: 'signal-conflict' | 'weak-signal' | 'unclassified';
      titleGuess: Garment;
      typeGuess: Garment;
    };

/**
 * The publish-time classification decision. Re-runs the CURRENT lib/tag.ts
 * logic from the signals persisted on the raw row (see lib/normalize.ts),
 * instead of trusting the value frozen at ingest time — this is what lets a
 * tagger fix reach the whole catalogue on the next `npm run build:data`
 * without a re-scrape.
 *
 * Order matters: an override always wins (§10.13 — a human decision is never
 * silently revisited by automation). Absent `raw` means the row pre-dates
 * this system and there is nothing to re-derive from, so the frozen value is
 * kept as-is — behavior only improves as brands get re-scraped, never
 * regresses on untouched rows.
 */
export function resolveGarment(
  row: { id: string; garment: Garment; title: string; raw?: Product['raw'] },
  overrides: Record<string, Garment>,
): GarmentDecision {
  const override = overrides[row.id];
  if (override) return { status: 'override', garment: override };

  if (!row.raw) return { status: 'frozen', garment: row.garment };

  const disc = tagDiscovery({ title: row.title, productType: row.raw.productType, tags: row.raw.tags });
  const typeGuess = classifyFromType(row.raw.productType);

  if (disc.garment === 'other') {
    return { status: 'held', why: 'unclassified', titleGuess: disc.garment, typeGuess };
  }
  if (disc.source !== 'title') {
    return { status: 'held', why: 'weak-signal', titleGuess: disc.garment, typeGuess };
  }
  if (typeGuess !== 'other' && typeGuess !== disc.garment) {
    return { status: 'held', why: 'signal-conflict', titleGuess: disc.garment, typeGuess };
  }
  return { status: 'confident', garment: disc.garment };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/garmentReview.test.ts`
Expected: all PASS.

- [ ] **Step 5: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/garmentReview.ts lib/garmentReview.test.ts
git commit -m "feat(garmentReview): publish-time classification decision

Pure, unit-tested decision function: override > confident title match >
held-back (conflict/weak-signal/unclassified) > frozen fallback when no
signals exist yet. Wired into build-data.mjs next."
```

---

### Task 5: Wire `resolveGarment` into `scripts/build-data.mjs`

**Files:**
- Modify: `scripts/build-data.mjs`

**Interfaces:**
- Consumes: `resolveGarment` (Task 4), `stripRawSignals` (Task 3).
- Produces: `data/garment-overrides.json` is read (create it empty first, this task's Step 0).

- [ ] **Step 0: Create the (initially empty) overrides file**

```bash
echo '{}' > data/garment-overrides.json
```

- [ ] **Step 1: Load overrides, near the top of the script**

In `scripts/build-data.mjs`, after the existing `decisions` load, add:
```js
const garmentOverrides = existsSync(U('garment-overrides.json'))
  ? JSON.parse(readFileSync(U('garment-overrides.json'), 'utf8'))
  : {};
```
And add the import at the top:
```js
import { resolveGarment } from '../lib/garmentReview.ts';
import { stripRawSignals } from '../lib/normalize.ts';
```
(`normalizeTitle` is already imported from `../lib/normalize.ts` on line 9 — add `stripRawSignals` to that same import instead of a new line.)

- [ ] **Step 2: Replace the garment-review lines inside the `kept` filter**

Find, inside the `raw.filter((p) => { ... })` callback:
```js
  if (p.garment === 'other') review.push({ id: p.id, title: p.title, url: p.url, why: 'unclassified' });
  else if (p.raw?.classifiedFrom === 'meta') review.push({ id: p.id, title: p.title, url: p.url, why: 'meta-only' });
  return true;
```
Replace with:
```js
  const decision = resolveGarment(p, garmentOverrides);
  if (decision.status === 'held') {
    review.push({
      id: p.id, title: p.title, url: p.url, why: decision.why,
      titleGuess: decision.titleGuess, typeGuess: decision.typeGuess,
    });
    return false;
  }
  // Safe: `raw` was freshly parsed this run and nothing reads `p` before this
  // point in the pipeline — interleaveByBrand/demoteGarment/publishTitle all
  // run AFTER this filter, so they see the resolved value.
  p.garment = decision.garment;
  return true;
```

- [ ] **Step 3: Strip `raw` before writing `products.json`**

Find:
```js
writeFileSync(U('products.json'), JSON.stringify(published.map(stripLifecycle), null, 2));
```
Replace with:
```js
writeFileSync(U('products.json'), JSON.stringify(published.map(stripLifecycle).map(stripRawSignals), null, 2));
```

- [ ] **Step 4: Run the existing exclusion/classification unit tests plus a manual smoke test**

Run: `npx vitest run`
Expected: all existing suites still PASS (nothing above touches test-covered logic directly, but this confirms no import/typo broke anything importable from `lib/`).

Run: `node --check scripts/build-data.mjs`
Expected: `syntax OK`.

Then a real run against current data (safe — `build:data` only reads raw/decisions/exclusions and writes products.json/rejected.json/review.json, never raw-products.json itself):
```bash
npm run build:data
```
Expected: completes, prints the usual `console.table`/counts. Since no existing raw row has a `.raw` field yet (Task 3 only affects *newly scraped* rows), every row takes the `frozen` path — **expect the published count and review.json to be unchanged from before this task**. Paste the printed counts and confirm they match a `git stash` run of the same command beforehand, or compare against `git diff data/products.json` being empty aside from key ordering.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data.mjs data/garment-overrides.json
git commit -m "feat(build-data): re-derive garment at publish time

Wires lib/garmentReview.ts into the kept filter: rows with persisted raw
signals get re-classified with the current lib/tag.ts logic and held back
on conflict/weak-signal; rows without signals keep their frozen garment
unchanged. No-op until the next scrape starts producing raw.productType."
```

---

### Task 6: Override read/write in `lib/rawData.ts`

**Files:**
- Modify: `lib/rawData.ts`

**Interfaces:**
- Produces: `loadGarmentOverrides(): Record<string, Garment>`, `saveGarmentOverride(id: string, garment: Garment): void`, `loadReview(): unknown[]` — all `assertLocalDev()`-guarded, mirroring `loadDecisions`/`saveDecision`.

No new test file. Checked first: `lib/rawData.ts`'s existing functions (`loadRaw`, `loadDecisions`, `saveDecision`) have **zero** unit test coverage today — `lib/rawData.test.ts` does not exist. Its file-path functions hardcode `path.join(process.cwd(), 'data', ...)` with no injection point, and `lib/devOnly.test.ts`'s sentinel-mocking pattern tests `devOnly.ts`'s own injectable pure functions, not code that hardcodes real paths — it doesn't transfer here. The codebase's actual, established way of verifying this layer is a manual smoke test against the real dev server (see Task 7 Step 3, which exercises `loadGarmentOverrides`/`saveGarmentOverride`/`loadReview` end-to-end through the API routes). Matching that precedent rather than inventing a new, unprecedented test-mocking approach for this one file.

- [ ] **Step 1: Implement**

In `lib/rawData.ts`, add:
```ts
import type { Garment } from '@/lib/types';

const garmentOverridesFile = () => path.join(process.cwd(), 'data', 'garment-overrides.json');
const reviewFile = () => path.join(process.cwd(), 'data', 'review.json');

export function loadGarmentOverrides(): Record<string, Garment> {
  assertLocalDev();
  const f = garmentOverridesFile();
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8')) as Record<string, Garment>;
}

export function saveGarmentOverride(id: string, garment: Garment): void {
  assertLocalDev();
  const overrides = loadGarmentOverrides();
  overrides[id] = garment;
  writeFileSync(garmentOverridesFile(), JSON.stringify(overrides, null, 2));
}

export function loadReview(): unknown[] {
  assertLocalDev();
  const f = reviewFile();
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as unknown[];
}
```

- [ ] **Step 2: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: clean. (Full functional verification happens in Task 7 Step 3's smoke test, once the API routes exist to exercise these functions through.)

- [ ] **Step 3: Commit**

```bash
git add lib/rawData.ts
git commit -m "feat(rawData): load/save garment overrides, load review queue

Same sentinel-guarded pattern as loadDecisions/saveDecision. No new test
file — matches the existing (untested) loadRaw/loadDecisions/saveDecision
precedent; verified via the Task 7 smoke test instead. Feeds the dev-only
review UI in the next task."
```

---

### Task 7: Dev-only API routes — `/api/admin/garment-review`

**Files:**
- Create: `app/api/admin/garment-review/list/route.dev.ts`
- Create: `app/api/admin/garment-review/route.dev.ts`

**Interfaces:**
- Consumes: `loadReview`, `loadGarmentOverrides`, `saveGarmentOverride` (Task 6); `GARMENT_VALUES` (Task 2).
- Produces: `GET /api/admin/garment-review/list` → `{ items: ReviewEntry[], overrides: Record<string,Garment> }`; `POST /api/admin/garment-review` body `{ id, garment }` → `{ ok: true }` or 400.

No test file — these two routes are thin wrappers with no logic of their own (matches `app/api/curate/*` precedent, which also has no test file; correctness is covered by the manual smoke test in Step 3 below).

- [ ] **Step 1: `list/route.dev.ts`**

```ts
import { NextResponse } from 'next/server';
import { loadReview, loadGarmentOverrides } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';

// LOCAL-ONLY — see app/api/curate/route.dev.ts for the 4-layer guard this
// project uses everywhere under /admin and /api/admin.
export async function GET() {
  const blocked = devOnlyResponse(); // LAYER 3
  if (blocked) return blocked;

  // LAYER 4 guards inside each loader.
  const items = (loadReview() as { why?: string }[]).filter((r) =>
    ['signal-conflict', 'weak-signal', 'unclassified'].includes(r.why || ''),
  );
  return NextResponse.json({ items, overrides: loadGarmentOverrides() });
}
```

- [ ] **Step 2: `route.dev.ts`**

```ts
import { NextResponse } from 'next/server';
import { saveGarmentOverride } from '@/lib/rawData';
import { devOnlyResponse } from '@/lib/devOnly';
import { GARMENT_VALUES } from '@/lib/tag';

// LOCAL-ONLY — see app/api/curate/route.dev.ts.
export async function POST(req: Request) {
  const blocked = devOnlyResponse(); // LAYER 3
  if (blocked) return blocked;

  const { id, garment } = await req.json();
  if (typeof id !== 'string' || !GARMENT_VALUES.includes(garment)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  saveGarmentOverride(id, garment); // LAYER 4 guards inside
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Manual smoke test under `next dev`**

```bash
npm run dev &
sleep 3
curl -s http://localhost:3000/api/admin/garment-review/list | head -c 300
echo
curl -s -X POST http://localhost:3000/api/admin/garment-review \
  -d '{"id":"test:1","garment":"top"}' -H 'content-type: application/json'
cat data/garment-overrides.json
kill %1
```
Expected: the GET returns `{"items":[...],"overrides":{...}}`; the POST returns `{"ok":true}`; `garment-overrides.json` now contains `{"test:1":"top"}`. **Revert that test entry afterward**: `git checkout data/garment-overrides.json` (or manually remove the `test:1` key) before committing.

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/garment-review
git commit -m "feat(api): dev-only garment review endpoints

GET lists held-back review entries + current overrides; POST records an
override. Both under /api/admin/*, already covered by proxy.ts's matcher
and scripts/verify-gate.mjs's leak checks — no changes needed to either."
```

---

### Task 8: Dev-only review UI — `/admin/review`

**Files:**
- Create: `app/admin/review/page.dev.tsx`
- Create: `app/admin/review/ReviewClient.dev.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/garment-review/list`, `POST /api/admin/garment-review` (Task 7); `GARMENT_VALUES`, `GARMENT_LABELS` (Task 2).

- [ ] **Step 1: `page.dev.tsx`** (mirrors `app/admin/curate/page.dev.tsx` exactly)

```tsx
import { notFound } from 'next/navigation';
import { IS_LOCAL_DEV } from '@/lib/devOnly';
import ReviewClient from './ReviewClient.dev';

// LOCAL-ONLY. See app/admin/curate/page.dev.tsx for why this file is named
// .dev.tsx and why notFound() (not force-dynamic) is the right call here.
export default function ReviewPage() {
  if (!IS_LOCAL_DEV) notFound();
  return <ReviewClient />;
}
```

- [ ] **Step 2: `ReviewClient.dev.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { GARMENT_VALUES, GARMENT_LABELS } from '@/lib/tag';
import type { Garment } from '@/lib/types';

type ReviewEntry = {
  id: string; title: string; url: string; why: string;
  titleGuess?: Garment; typeGuess?: Garment;
};

export default function ReviewClient() {
  const [items, setItems] = useState<ReviewEntry[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Garment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/garment-review/list')
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setOverrides(d.overrides || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function setGarment(id: string, garment: Garment) {
    setOverrides((prev) => ({ ...prev, [id]: garment }));
    await fetch('/api/admin/garment-review', {
      method: 'POST', body: JSON.stringify({ id, garment }),
    });
  }

  if (loading) return <main className="p-6">Loading review queue…</main>;
  const pending = items.filter((it) => !overrides[it.id]);
  if (items.length === 0) return <main className="p-6">Nothing in the review queue.</main>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Garment review — {pending.length} pending / {items.length} total</h1>
      <p className="mb-4 text-sm text-gray-500">Held back from publish until a garment is set here.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => (
          <div key={it.id} className={`border rounded p-3 ${overrides[it.id] ? 'opacity-40' : ''}`}>
            <div className="text-xs text-gray-500">{it.why}</div>
            <a href={it.url} target="_blank" rel="noopener noreferrer" className="font-medium underline">{it.title}</a>
            <div className="text-xs text-gray-500 mt-1">
              title guess: {it.titleGuess ?? '—'} · type guess: {it.typeGuess ?? '—'}
            </div>
            <select
              className="mt-2 border rounded px-2 py-1 text-sm"
              value={overrides[it.id] ?? ''}
              onChange={(e) => setGarment(it.id, e.target.value as Garment)}
            >
              <option value="" disabled>Set garment…</option>
              {GARMENT_VALUES.map((g) => (
                <option key={g} value={g}>{GARMENT_LABELS[g]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Manual verification under `next dev`**

```bash
npm run dev &
sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/admin/review
kill %1
```
Expected: `200`. (Full interaction — dropdown, save — is a client-state flow; open it in a real browser once and confirm a selection persists across reload, since that's the one thing curl can't verify. Note the result in the docs/log entry for this feature, per CLAUDE.md's "verify before claiming" — don't just claim the UI works from reading the code.)

- [ ] **Step 4: Add the new leak-check needles to `scripts/verify-gate.mjs`**

In `scripts/verify-gate.mjs`, extend the `NEEDLES` array:
```js
const NEEDLES = [
  'CurateClient',
  'Curate — tap', // literal UI copy from CurateClient.dev.tsx
  'raw-products.json',
  'saveDecision',
  'ReviewClient',
  'Garment review —', // literal UI copy from ReviewClient.dev.tsx
  'saveGarmentOverride',
];
```

- [ ] **Step 5: Full production-build gate check**

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
npm run build
npm run verify:gate
```
Expected: all three clean. `verify:gate` specifically must print `ok` for every check — paste its full output, this is the check that would have caught P0-A and is the one that matters most for a new admin route.

- [ ] **Step 6: Commit**

```bash
git add app/admin/review scripts/verify-gate.mjs
git commit -m "feat(admin): dev-only garment review page

Lists held-back products with both classification guesses; a dropdown
writes the override. Added its component/route names to verify-gate.mjs's
leak-check needles, same as CurateClient/saveDecision."
```

---

### Task 9: Full verification pass + docs/log entry

**Files:**
- Create: `docs/log/2026-08-12-garment-classification-confidence.md`

- [ ] **Step 1: Full test suite, typecheck, lint**

```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: all clean. Paste the vitest summary line (test file count, test count).

- [ ] **Step 2: Full build + gate**

```bash
npm run build
npm run verify:gate
```
Expected: 32+ routes (existing count plus `/admin/review`, minus nothing — `/api/admin/garment-review*` are dynamic, not counted in the static route number the same way), `verify:gate` all `ok`.

- [ ] **Step 3: Write the docs/log entry**

Follow the `docs/log/YYYY-MM-DD-<slug>.md` format from CLAUDE.md §9 (Goal / What changed / Verification / Notes-follow-ups). Include:
- Link to the spec (`docs/superpowers/specs/2026-08-12-garment-classification-design.md`) and this plan.
- The full file list touched across all 9 tasks.
- Real verification output from Steps 1–2 above.
- Explicit note: **this task did not run `npm run refresh`** — that's the cleanup pass, deliberately separate (network-touching, long-running, touches all 108 brands) and covered by Task 10 below, run and logged on its own.

- [ ] **Step 4: Commit**

```bash
git add docs/log/2026-08-12-garment-classification-confidence.md
git commit -m "docs(log): garment classification confidence + review queue"
```

---

### Task 10: The cleanup pass — `npm run refresh`

**Files:** none (data-only). Append to the same `docs/log/2026-08-12-garment-classification-confidence.md` from Task 9, or a new dated entry if run on a later date.

This is the "clean up now" half of the spec's two-part goal (§ Goal, spec doc): backfills `raw.productType`/`tags` onto every existing row and applies the hardened Task-1 rules catalogue-wide, in one pass, via the pipeline's own documented mechanism (CLAUDE.md §4/§8) — not a new script.

- [ ] **Step 1: Run the refresh**

```bash
npm run refresh
```
This touches all 108 live brand feeds and can take a long time — run it, don't sleep-poll it; treat it as a long background job per CLAUDE.md §10.7 (it already checkpoints per-brand, so it's safe to be interrupted and re-run).

- [ ] **Step 2: Expect Guard 2 to trip, and that's correct**

Per the spec's Rollout section: held-back conflict/weak-signal rows shrink some brands' published counts relative to their pre-refresh state, which is exactly what the per-brand collapse guard (`lib/lifecycle.ts::brandDropViolations`) exists to flag. If `npm run refresh`'s publish step throws citing brand collapses:
1. Read `data/rejected.json` and `data/review.json` — confirm the drops are held-back garment items (`why` starting with the new reasons), not a dead feed or broken filter.
2. If confirmed intentional: `ALLOW_LARGE_DIFF=1 npm run build:data` (the documented escape hatch, CLAUDE.md §8) to push it through.
3. If NOT confirmed — a brand's count cratered for an unrelated reason — stop and investigate before forcing it through. Do not reach for `ALLOW_LARGE_DIFF=1` reflexively.

- [ ] **Step 3: Report the real numbers**

Paste: published count before vs. after, size of the new review queue (how many entries, broken down by `why`), and how many rows now carry `raw`. This is the number that answers "how big is the queue Tina actually has to work through" — do not estimate it, run it and report the real count.

- [ ] **Step 4: Commit**

The refresh pipeline commits its own data changes per its existing documented behavior (§4) — confirm this still holds (`git log -1 --stat` after the run) rather than assuming; if `npm run refresh` on this machine does NOT auto-commit, stage and commit `data/raw-products.json`, `data/products.json`, `data/rejected.json`, `data/review.json` explicitly with a message referencing this feature, and say so in the log entry rather than silently doing it differently from documented.
