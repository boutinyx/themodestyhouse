# Hijab Type Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 15-group "Type" filter (fabric + style, e.g. Jersey/Chiffon/Instant/Khimars)
to the Hijabs & Scarves lane, reachable from the header nav flyout exactly like Outerwear
and Layering Basics already are.

**Architecture:** A third parallel subtype-classification system (`lib/hijabTypes.ts`),
matching the existing `layeringSubtype()`/`outerwearSubtype()` mechanism in
`lib/specialty.ts` file-for-file: a `HijabSubtype` union type, a priority-ordered regex
classifier, a labels dictionary, a compact-catalogue column, a three-way branch in the
existing "Type" filtering logic, and a third flyout/disclosure block in the desktop and
mobile nav. No new abstraction is introduced — this codebase's own prior design doc
(`docs/superpowers/specs/2026-08-13-outerwear-category-design.md`) documents a deliberate
preference for a narrow parallel implementation per category over generalizing the
mechanism, and this plan follows that.

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict), Vitest 4 (node env), no new
dependencies.

## Global Constraints

- TypeScript strict mode — every new export must be fully typed, no `any`.
- Tests are co-located `lib/<module>.test.ts`; import the module relatively (`./hijabTypes`),
  types via `@/lib/types`.
- No hand-written route files — this plan touches no routing, `lib/lanes.ts`'s existing
  `modest-hijabs` entry needs no change.
- Every icon comes from `@phosphor-icons/react` — not touched by this plan (no new icons).
- Colour is never a Tailwind class — not touched by this plan (no new styled elements beyond
  what `Menu.Item`/`.menu-row` already style).
- `npx tsc --noEmit` and `npm run lint` must both stay clean (they are clean on `main` as of
  2026-08-15) — treat any failure introduced by this plan as a regression to fix, not report.
- Never claim a step "done" without pasting the real command output that verifies it.
- This repo has a concurrent session; before staging any file, run `git status` and confirm
  the only diff present is the one this plan just made (see `docs/log/2026-08-15-session-handoff.md`
  and `docs/log/2026-08-15-hijab-type-filter-design-and-concurrent-edit.md`).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/types.ts` (modify) | Adds the `HijabSubtype` union type. |
| `lib/hijabTypes.ts` (create) | The 15-group classifier: `hijabSubtype(p)`, `HIJAB_SUBTYPE_LABELS`. Sole owner of the taxonomy's regex vocabulary. |
| `lib/hijabTypes.test.ts` (create) | Classification tests against real catalogue titles. |
| `lib/compactCatalogue.ts` (modify) | Adds the `hijabSubtypes`/`rows.hijabSubtypeIdx` column, mirroring the existing two. |
| `lib/compactCatalogue.test.ts` (modify) | Encoding tests for the new column, mirroring the existing two `describe` blocks. |
| `components/FilterableGrid.tsx` (modify) | Extends the existing two-way subtype dispatch to three-way, so `?type=` from a flyout link narrows the grid on arrival. |
| `components/Nav.tsx` (modify) | Desktop header hover flyout: a third `subItems` list for `modest-hijabs`. |
| `components/MobileNav.tsx` (modify) | Mobile disclosure row for Hijabs & Scarves, mirroring the existing Outerwear/Layering rows. Not named in the original design doc's file list, but required for the design's own stated goal of full parity with the existing two flyouts — the mobile nav is the touch equivalent of the desktop hover flyout, and skipping it would leave the Hijabs & Scarves row un-openable on phones the way Outerwear was before its 2026-08-13 fix. |

---

### Task 1: HijabSubtype type + classifier

**Files:**
- Modify: `lib/types.ts:27` (right after the `OuterwearSubtype` declaration)
- Create: `lib/hijabTypes.ts`
- Test: `lib/hijabTypes.test.ts`

**Interfaces:**
- Consumes: `Product` (`lib/types.ts`), `isJilbab`/`isKhimarAbaya`/`isUndercap` (`lib/specialty.ts`, all already exported).
- Produces: `export type HijabSubtype` (`lib/types.ts`); `export function hijabSubtype(p: Product): HijabSubtype | null` and `export const HIJAB_SUBTYPE_LABELS: Record<HijabSubtype, string>` (`lib/hijabTypes.ts`) — these two are what Tasks 2, 4 and 5 import.

- [ ] **Step 1: Add the `HijabSubtype` type to `lib/types.ts`**

Insert immediately after the existing `OuterwearSubtype` declaration (currently line 27,
right before the `ForcedLane` comment block):

```ts
/** The 15 fabric/style groups within the Hijabs & Scarves lane (lib/lanes.ts) —
 *  see lib/hijabTypes.ts's hijabSubtype() for the classification logic and
 *  priority order. Declared here for the same circular-import reason as
 *  LayeringSubtype/OuterwearSubtype. Built from the real modest-hijabs lane
 *  (5,146 products, measured 2026-08-15) — see
 *  docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md. No forced-
 *  override field yet: staff manual override was an explicit out-of-scope
 *  call for this first version, same follow-up shape as Outerwear/Layering
 *  originally had. */
export type HijabSubtype =
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
```

- [ ] **Step 2: Write the failing test file `lib/hijabTypes.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { hijabSubtype, HIJAB_SUBTYPE_LABELS } from './hijabTypes';
import type { Product } from '@/lib/types';
import { productsForLane } from '@/lib/products';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'hijab', community: 'general',
  occasion: [], season: [], activity: [],
};

const p = (title: string, garment: Product['garment'] = 'hijab', extra: Partial<Product> = {}): Product =>
  ({ ...base, title, garment, ...extra });

describe('hijabSubtype', () => {
  it('returns null for a product outside the Hijabs & Scarves lane', () => {
    expect(hijabSubtype(p('Jersey Maxi Dress', 'dress'))).toBeNull();
  });

  it('returns null for a plain, unclassifiable hijab title', () => {
    expect(hijabSubtype(p('Riverwalk Blue Hijab'))).toBeNull(); // haute-hijab, real title
  });

  it('sorts a real title from each of the 15 groups into exactly the right group', () => {
    expect(hijabSubtype(p('Syrian Full-Neck Underscarf'))).toBe('caps-underscarves'); // jaida
    expect(hijabSubtype(p('Khimar Medina silk'))).toBe('khimar'); // jennah-boutique
    expect(hijabSubtype(p('Jilbab - Black', 'abaya'))).toBe('jilbab');
    expect(hijabSubtype(p('Premium Instant Hijab'))).toBe('instant'); // lafemme
    expect(hijabSubtype(p('Lina Knit Sweater and Removable Shawl'))).toBe('shawl'); // mondo-the-label
    expect(hijabSubtype(p('The Culture Starter Set'))).toBe('set'); // culture-hijab
    expect(hijabSubtype(p('Airy Jersey Scarf Mocha Brown'))).toBe('jersey'); // diversity-modest
    expect(hijabSubtype(p('Navy Lace Trim Modal Hijab'))).toBe('modal'); // urban-modesty
    expect(hijabSubtype(p('Small Premium Chiffon Hijab (Non-Slip)'))).toBe('chiffon'); // voile-chic
    expect(hijabSubtype(p('Premium Cotton Hijab'))).toBe('cotton');
    expect(hijabSubtype(p('Scarlet of Granada Satin'))).toBe('satin'); // jaida
    expect(hijabSubtype(p('Hijab ready to tie burgundy Medina silk'))).toBe('silk-viscose'); // chic-modesty
  });

  // Each pair below is a REAL catalogue title matching two groups at once —
  // confirms the priority order in GROUPS resolves to the higher one, not
  // just whichever group happens to be tested first.
  it('resolves priority order when a real title matches more than one group', () => {
    expect(hijabSubtype(p('Khimar Medina silk'))).toBe('khimar'); // khimar over silk-viscose
    // hidayah, garment:'abaya' — "One-Piece" alone would say instant
    expect(hijabSubtype(p('Mirah One-Piece Jilbab (Bordeaux)', 'abaya'))).toBe('jilbab'); // jilbab over instant
    expect(hijabSubtype(p('BreathLite Sports Hijab Set- Ivory Blush - Final Sale'))).toBe('sport'); // sport over set, dignitii
    expect(hijabSubtype(p('Printed Satin'))).toBe('printed'); // printed over satin, culture-hijab
    expect(hijabSubtype(p('Diamond Satin Crinkle (Oat)'))).toBe('crinkle'); // crinkle over satin, hidayah
    expect(hijabSubtype(p('Liquid Jersey Instant Hijab'))).toBe('instant'); // instant over jersey, lafemme
  });

  it('classifies a khimar-abaya item (garment !== "hijab") via isKhimarAbaya, not the plain garment check', () => {
    // Real title, cited in lib/specialty.ts's own isKhimarAbaya() comment.
    expect(hijabSubtype(p('Mastour Khimaar Burnished Lilac', 'abaya'))).toBe('khimar');
  });

  it('every label in HIJAB_SUBTYPE_LABELS is reachable — regression guard against a group with a label but no working regex', () => {
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
    for (const key of Object.keys(HIJAB_SUBTYPE_LABELS)) {
      expect(hijabSubtype(realExampleByGroup[key])).toBe(key);
    }
  });

  // Regression guard, not an exact snapshot — data/products.json is
  // republished nightly by the refresh workflow (CLAUDE.md §10.35), so
  // pinning an exact count here would fail on ordinary catalogue growth,
  // not a real bug. This only catches the classifier actually breaking
  // (e.g. GROUPS emptied, or reordered so nothing resolves). Measured
  // 2026-08-15: 5,146 items on the lane, 83.5% classified.
  it('classifies most of the real modest-hijabs lane', () => {
    const items = productsForLane('modest-hijabs');
    const classified = items.filter((prod) => hijabSubtype(prod) !== null).length;
    expect(items.length).toBeGreaterThan(1000);
    expect(classified / items.length).toBeGreaterThan(0.6);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run lib/hijabTypes.test.ts`
Expected: FAIL — `Cannot find module './hijabTypes'` (the file doesn't exist yet).

- [ ] **Step 4: Create `lib/hijabTypes.ts`**

```ts
import type { Product, HijabSubtype } from '@/lib/types';
import { isJilbab, isKhimarAbaya, isUndercap } from '@/lib/specialty';

export type { HijabSubtype };

/**
 * The Hijabs & Scarves lane's "Type" filter — 15 fabric/style groups built
 * from the real modest-hijabs lane (5,146 products, measured 2026-08-15),
 * not guessed. Full taxonomy table, group-by-group counts, and the priority-
 * order rationale live in
 * docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md.
 *
 * `isHijabLaneItem` mirrors the modest-hijabs lane's own `match` in
 * lib/lanes.ts, MINUS its `&& !isLayering(p)` guard: that guard only matters
 * for LANE MEMBERSHIP (deciding whether a prayer-titled jilbab/khimar shows
 * on this lane at all, vs. Layering Basics), not for classifying an item
 * that a caller already knows is on the lane. In production this function is
 * only ever called on rows a page already fetched via
 * productsForLane('modest-hijabs') — which already applied that guard — so
 * omitting it here cannot misclassify anything actually rendered. It does
 * mean this function, called directly and out of context (as some tests
 * above do), can return non-null for a title that would in practice be
 * routed to Layering Basics instead — a deliberate, documented
 * simplification, not a bug.
 */
function isHijabLaneItem(p: Product): boolean {
  return p.garment === 'hijab' || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p);
}

export const HIJAB_SUBTYPE_LABELS: Record<HijabSubtype, string> = {
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
// HIJAB_SUBTYPE_LABELS above, which is also the flyout's display order.
const GROUPS: [HijabSubtype, RegExp][] = [
  ['caps-underscarves', /\bunderscarf|under.?cap|under.?scarf\b|\bbonnets?\b|\btube\b|\bninja\b|\bcaps?\b|\bturbans?\b|\bheadbands?\b/i],
  ['khimar', /\bkhimaa?rs?\b/i],
  ['jilbab', /\bjilbabs?\b/i],
  ['instant', /\binstant\b|\bone.?piece\b|\bno.?pin\b|\bready.?to.?wear\b|\bslip.?on\b/i],
  ['sport', /\bsports?\b|\bactive\b/i],
  ['shawl', /\bshawls?\b|\bpashmina\b/i],
  // \bprint(?:s|ed)?\b covers print/prints/printed — a first draft used
  // \bprints?\b alone and silently missed 134 real "Printed ..." titles,
  // caught and fixed while writing this plan (see the design doc's
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
 *  expected, not errors; see the design doc's "Other bucket" decision. */
export function hijabSubtype(p: Product): HijabSubtype | null {
  if (!isHijabLaneItem(p)) return null;
  for (const [type, re] of GROUPS) {
    if (re.test(p.title)) return type;
  }
  return null;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/hijabTypes.test.ts`
Expected: PASS, all assertions green.

- [ ] **Step 6: Typecheck**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git status --short lib/types.ts lib/hijabTypes.ts lib/hijabTypes.test.ts
git add lib/types.ts lib/hijabTypes.ts lib/hijabTypes.test.ts
git commit -m "$(cat <<'EOF'
feat(hijabs): add HijabSubtype classifier (15 fabric/style groups)

hijabSubtype() classifies a hijab-lane product into one of 15
fabric/style groups (Jersey, Chiffon, Instant, Khimars, etc.) built
from the real modest-hijabs lane (5,146 products). Same mechanism as
layeringSubtype()/outerwearSubtype() in lib/specialty.ts. Not wired
into the UI yet — that's the following tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Compact-catalogue encoding

**Files:**
- Modify: `lib/compactCatalogue.ts:2` (imports), `:50-95` (interface), `:105-146` (encode setup), `:225-243` (per-row loop + return)
- Test: `lib/compactCatalogue.test.ts`

**Interfaces:**
- Consumes: `hijabSubtype`, `HIJAB_SUBTYPE_LABELS`, `type HijabSubtype` from `lib/hijabTypes.ts` (Task 1).
- Produces: `CompactCatalogue.hijabSubtypes: HijabSubtype[]` and `CompactCatalogue.rows.hijabSubtypeIdx: number[]` — Task 3 (`FilterableGrid.tsx`) reads both.

- [ ] **Step 1: Write the failing tests in `lib/compactCatalogue.test.ts`**

Add this new `describe` block right after the existing `describe('outerwear subtype encoding', ...)` block (which currently ends at line 186):

```ts
describe('hijab subtype encoding', () => {
  const UNDERSCARF: Product = { ...PRODUCT, id: 'aab:5', title: 'Syrian Full-Neck Underscarf', garment: 'hijab' };
  const JERSEY_HIJAB: Product = { ...PRODUCT, id: 'aab:6', title: 'Airy Jersey Scarf Mocha Brown', garment: 'hijab' };

  it('gives a non-hijab product the -1 sentinel and an empty dictionary', () => {
    const cat = encodeCatalogue([PRODUCT], [BRAND]);
    expect(cat.hijabSubtypes).toEqual([]);
    expect(cat.rows.hijabSubtypeIdx[0]).toBe(-1);
  });

  it('assigns a real index for a hijab product, and only lists subtypes actually present', () => {
    const cat = encodeCatalogue([UNDERSCARF], [BRAND]);
    expect(cat.hijabSubtypes).toEqual(['caps-underscarves']);
    expect(cat.rows.hijabSubtypeIdx[0]).toBe(0);
  });

  it('orders present subtypes canonically, not by first appearance in the input', () => {
    // JERSEY_HIJAB ('jersey') is listed BEFORE UNDERSCARF ('caps-underscarves')
    // in the input array, but caps-underscarves sorts first in HIJAB_SUBTYPE_LABELS.
    const cat = encodeCatalogue([JERSEY_HIJAB, UNDERSCARF], [BRAND]);
    expect(cat.hijabSubtypes).toEqual(['caps-underscarves', 'jersey']);
    expect(cat.rows.hijabSubtypeIdx[0]).toBe(cat.hijabSubtypes.indexOf('jersey'));
    expect(cat.rows.hijabSubtypeIdx[1]).toBe(cat.hijabSubtypes.indexOf('caps-underscarves'));
  });

  it('a mixed catalogue keeps the -1 sentinel for non-hijab rows alongside real indices', () => {
    const cat = encodeCatalogue([PRODUCT, UNDERSCARF], [BRAND]);
    expect(cat.rows.hijabSubtypeIdx[0]).toBe(-1);
    expect(cat.rows.hijabSubtypeIdx[1]).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: FAIL — `cat.hijabSubtypes` is `undefined`.

- [ ] **Step 3: Modify `lib/compactCatalogue.ts`**

Import line (currently line 2) — add a second import line right after it:
```ts
import { layeringSubtype, LAYERING_SUBTYPE_LABELS, type LayeringSubtype, outerwearSubtype, OUTERWEAR_SUBTYPE_LABELS, type OuterwearSubtype } from '@/lib/specialty';
import { hijabSubtype, HIJAB_SUBTYPE_LABELS, type HijabSubtype } from '@/lib/hijabTypes';
```

In the `CompactCatalogue` interface, right after `outerwearSubtypes: OuterwearSubtype[];` (currently line 62):
```ts
  /** Same shape as layeringSubtypes/outerwearSubtypes, for the Hijabs &
   *  Scarves lane's Type filter (fabric + style groups) — only ever
   *  non-empty for /modest-hijabs. */
  hijabSubtypes: HijabSubtype[];
```

In the `rows` sub-interface, right after `outerwearSubtypeIdx: number[];` (currently line 84):
```ts
    /** Same shape as layeringSubtypeIdx/outerwearSubtypeIdx, for hijabSubtypes. */
    hijabSubtypeIdx: number[];
```

In `encodeCatalogue`, right after the `outerwearSubtypeIndex` computation (currently lines 127-130):
```ts
  const hijabSubtypeOrder = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];
  const presentHijabSubtypes = new Set(products.map((p) => hijabSubtype(p)).filter((t): t is HijabSubtype => t !== null));
  const hijabSubtypes = hijabSubtypeOrder.filter((t) => presentHijabSubtypes.has(t));
  const hijabSubtypeIndex = new Map(hijabSubtypes.map((t, i) => [t, i]));
```

In the `rows` initializer object, right after `outerwearSubtypeIdx: [],` (currently line 143):
```ts
    hijabSubtypeIdx: [],
```

In the per-product loop, right after the `outerwearSub` push (currently lines 236-237):
```ts
    const hijabSub = hijabSubtype(p);
    rows.hijabSubtypeIdx.push(hijabSub === null ? -1 : hijabSubtypeIndex.get(hijabSub)!);
```

The final `return` statement (currently line 242) — add `hijabSubtypes` to it:
```ts
  return { brands: compactBrands, imagePrefixes, garments, occasions, layeringSubtypes, outerwearSubtypes, hijabSubtypes, rows };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/compactCatalogue.test.ts`
Expected: PASS, all assertions green (including the pre-existing tests — this file's other
`describe` blocks must stay unaffected).

- [ ] **Step 5: Full test suite + typecheck**

Run: `npm test && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
Expected: all green, no type errors.

- [ ] **Step 6: Commit**

```bash
git status --short lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git add lib/compactCatalogue.ts lib/compactCatalogue.test.ts
git commit -m "$(cat <<'EOF'
feat(hijabs): encode hijabSubtype into the compact catalogue

Adds hijabSubtypes/rows.hijabSubtypeIdx, mirroring the existing
layering/outerwear subtype columns exactly. Still not reachable from
the UI — FilterableGrid and the nav flyouts are the next tasks.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: FilterableGrid three-way type dispatch

**Files:**
- Modify: `components/FilterableGrid.tsx:24-30` (state init), `:45-53` (resync effect),
  `:83-108` (dispatch + filter loop)

**Interfaces:**
- Consumes: `cat.hijabSubtypes: HijabSubtype[]`, `cat.rows.hijabSubtypeIdx: number[]` (Task 2).
- Produces: nothing new for later tasks — this is where the `?type=` URL param from a
  Task 4/5 flyout link actually takes effect.

No unit test exists for this file (no component-test framework in this repo — Vitest runs
in `node` env, not `jsdom`; verified by `grep -rn "environment" vitest.config.ts` returning
nothing beyond the default, and no `*.test.tsx` file existing anywhere in `components/`).
Verification for this task is `tsc`/`lint` plus the manual Playwright pass in Task 6.

- [ ] **Step 1: Modify the `type` state initializer** (currently lines 24-30)

Before:
```tsx
  const [type, setType] = useState(() => {
    if (!initialType) return 'all';
    if ((cat.layeringSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.outerwearSubtypes as string[]).includes(initialType)) return initialType;
    return 'all';
  }); // layering OR outerwear subtype, or 'all'
```

After:
```tsx
  const [type, setType] = useState(() => {
    if (!initialType) return 'all';
    if ((cat.layeringSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.outerwearSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.hijabSubtypes as string[]).includes(initialType)) return initialType;
    return 'all';
  }); // layering OR outerwear OR hijab subtype, or 'all'
```

- [ ] **Step 2: Modify the resync effect** (currently lines 45-53)

Before:
```tsx
  useEffect(() => {
    const resolved = !initialType
      ? 'all'
      : (cat.layeringSubtypes as string[]).includes(initialType) || (cat.outerwearSubtypes as string[]).includes(initialType)
        ? initialType
        : 'all';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(resolved);
  }, [initialType, cat]);
```

After:
```tsx
  useEffect(() => {
    const resolved = !initialType
      ? 'all'
      : (cat.layeringSubtypes as string[]).includes(initialType)
          || (cat.outerwearSubtypes as string[]).includes(initialType)
          || (cat.hijabSubtypes as string[]).includes(initialType)
        ? initialType
        : 'all';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(resolved);
  }, [initialType, cat]);
```

- [ ] **Step 3: Modify the dispatch + filter loop** (currently lines 83-108)

Before:
```tsx
  const usingOuterwearTypes = cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length > 0;
  const typeIdx =
    type === 'all'
      ? -1
      : usingOuterwearTypes
        ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
        : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        const rowTypeIdx = usingOuterwearTypes ? cat.rows.outerwearSubtypeIdx[i] : cat.rows.layeringSubtypeIdx[i];
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
  }, [cat, brandIdx, typeIdx, usingOuterwearTypes, query]);
```

After:
```tsx
  const usingOuterwearTypes = cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length > 0;
  // Hijabs is checked last: only reached once neither of the other two
  // subtype systems is present on this lane's compact catalogue. All three
  // are mutually exclusive by construction — layering/outerwear/hijab lane
  // membership never overlaps (lib/specialty.ts, lib/lanes.ts) — so this
  // stays a branch, not a merge, same as the pre-existing two-way one.
  const usingHijabTypes =
    cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length === 0 && cat.hijabSubtypes.length > 0;
  const typeIdx =
    type === 'all'
      ? -1
      : usingOuterwearTypes
        ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
        : usingHijabTypes
          ? cat.hijabSubtypes.indexOf(type as (typeof cat.hijabSubtypes)[number])
          : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        const rowTypeIdx = usingOuterwearTypes
          ? cat.rows.outerwearSubtypeIdx[i]
          : usingHijabTypes
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
  }, [cat, brandIdx, typeIdx, usingOuterwearTypes, usingHijabTypes, query]);
```

- [ ] **Step 4: Typecheck and lint**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git status --short components/FilterableGrid.tsx
git add components/FilterableGrid.tsx
git commit -m "$(cat <<'EOF'
feat(hijabs): extend the Type filter dispatch to three subtype systems

FilterableGrid's ?type= handling now also recognizes hijab subtypes,
alongside the existing layering/outerwear ones. Still no way to reach
it from the UI — the nav flyouts are next.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Desktop nav flyout

**Files:**
- Modify: `components/Nav.tsx:1-43`

**Interfaces:**
- Consumes: `HIJAB_SUBTYPE_LABELS`, `type HijabSubtype` (`lib/hijabTypes.ts`, Task 1).
- Produces: nothing later tasks depend on — this is a leaf.

- [ ] **Step 1: Modify the import line** (currently line 4)

Before:
```tsx
import { OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, type OuterwearSubtype, type LayeringSubtype } from '@/lib/specialty';
```

After:
```tsx
import { OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, type OuterwearSubtype, type LayeringSubtype } from '@/lib/specialty';
import { HIJAB_SUBTYPE_LABELS, type HijabSubtype } from '@/lib/hijabTypes';
```

- [ ] **Step 2: Add the canonical-order constant** (currently lines 9-12)

Before:
```tsx
const OUTERWEAR_SUBTYPES: OuterwearSubtype[] = ['blazer', 'vest', 'cardigan', 'coat'];
// Insertion order of the LAYERING_SUBTYPE_LABELS object literal — same
// source components/FilterableGrid.tsx and lib/compactCatalogue.ts read.
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
```

After:
```tsx
const OUTERWEAR_SUBTYPES: OuterwearSubtype[] = ['blazer', 'vest', 'cardigan', 'coat'];
// Insertion order of the LAYERING_SUBTYPE_LABELS object literal — same
// source components/FilterableGrid.tsx and lib/compactCatalogue.ts read.
const LAYERING_SUBTYPES = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
// Same pattern, for the Hijabs & Scarves flyout.
const HIJAB_SUBTYPES = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];
```

- [ ] **Step 3: Add the third `subItems` block** (currently lines 27-42, inside the
  `categoryItems` map)

Before:
```tsx
    ...(l.slug === 'outerwear'
      ? {
          subItems: OUTERWEAR_SUBTYPES.map((t) => ({
            href: `/outerwear?type=${t}`,
            label: OUTERWEAR_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
    ...(l.slug === 'layering-basics'
      ? {
          subItems: LAYERING_SUBTYPES.map((t) => ({
            href: `/layering-basics?type=${t}`,
            label: LAYERING_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
  }));
```

After:
```tsx
    ...(l.slug === 'outerwear'
      ? {
          subItems: OUTERWEAR_SUBTYPES.map((t) => ({
            href: `/outerwear?type=${t}`,
            label: OUTERWEAR_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
    ...(l.slug === 'layering-basics'
      ? {
          subItems: LAYERING_SUBTYPES.map((t) => ({
            href: `/layering-basics?type=${t}`,
            label: LAYERING_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
    // Hijabs & Scarves got the same flyout treatment 2026-08-15 — 15
    // fabric/style groups, see lib/hijabTypes.ts. Same mechanism as the two
    // above: a hover flyout is the only way to reach a filtered view, no
    // in-page Type dropdown (matches Tina's explicit call to remove those
    // for Outerwear/Layering Basics).
    ...(l.slug === 'modest-hijabs'
      ? {
          subItems: HIJAB_SUBTYPES.map((t) => ({
            href: `/modest-hijabs?type=${t}`,
            label: HIJAB_SUBTYPE_LABELS[t],
          })),
        }
      : {}),
  }));
```

- [ ] **Step 4: Typecheck and lint**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git status --short components/Nav.tsx
git add components/Nav.tsx
git commit -m "$(cat <<'EOF'
feat(hijabs): add Hijabs & Scarves to the desktop nav flyout

Hovering "Hijabs & Scarves" in the header now shows all 15 type
groups, same hover-flyout mechanism as Outerwear/Layering Basics.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Mobile nav disclosure row

**Files:**
- Modify: `components/MobileNav.tsx:1-16` (imports/constants), `:52-80` (state/effects),
  `:210-242` (row functions), `:349-351` (render)

**Interfaces:**
- Consumes: `HIJAB_SUBTYPE_LABELS`, `type HijabSubtype` (`lib/hijabTypes.ts`, Task 1).
- Produces: nothing later tasks depend on — this is a leaf.

- [ ] **Step 1: Modify the import line** (currently line 9)

Before:
```tsx
import { OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, type OuterwearSubtype, type LayeringSubtype } from '@/lib/specialty';
```

After:
```tsx
import { OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, type OuterwearSubtype, type LayeringSubtype } from '@/lib/specialty';
import { HIJAB_SUBTYPE_LABELS, type HijabSubtype } from '@/lib/hijabTypes';
```

- [ ] **Step 2: Add the canonical-order constant** (currently lines 15-16)

Before:
```tsx
const OUTERWEAR_SUBTYPE_ORDER = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
const LAYERING_SUBTYPE_ORDER = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
```

After:
```tsx
const OUTERWEAR_SUBTYPE_ORDER = Object.keys(OUTERWEAR_SUBTYPE_LABELS) as OuterwearSubtype[];
const LAYERING_SUBTYPE_ORDER = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const HIJAB_SUBTYPE_ORDER = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];
```

- [ ] **Step 3: Add disclosure state + scroll-into-view effect** (currently lines 52-80,
  right after the existing `layeringOpen`/`layeringRowRef` block and its `useEffect`)

Before (end of the block):
```tsx
  const [layeringOpen, setLayeringOpen] = useState(false);
  const layeringRowRef = useRef<HTMLDivElement>(null);

  // Outerwear sits near the bottom of the Category list (9th of 10), so
  // ... [existing comment unchanged] ...
  useEffect(() => {
    if (outerwearOpen) outerwearRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [outerwearOpen]);
  useEffect(() => {
    if (layeringOpen) layeringRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [layeringOpen]);
```

After:
```tsx
  const [layeringOpen, setLayeringOpen] = useState(false);
  const layeringRowRef = useRef<HTMLDivElement>(null);
  // Hijabs & Scarves got the same disclosure treatment 2026-08-15, same
  // reasoning as layeringOpen/layeringRowRef above.
  const [hijabOpen, setHijabOpen] = useState(false);
  const hijabRowRef = useRef<HTMLDivElement>(null);

  // Outerwear sits near the bottom of the Category list (9th of 10), so
  // ... [existing comment unchanged] ...
  useEffect(() => {
    if (outerwearOpen) outerwearRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [outerwearOpen]);
  useEffect(() => {
    if (layeringOpen) layeringRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [layeringOpen]);
  useEffect(() => {
    if (hijabOpen) hijabRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hijabOpen]);
```

(The existing multi-line comment between `layeringOpen` and the first `useEffect` stays
exactly where it is — only the two new lines above and the new effect below are added.)

- [ ] **Step 4: Add the `hijabRow()` function** (currently lines 210-242, right after the
  existing `layeringRow` function, before the `return (`)

Before (end of `layeringRow`):
```tsx
      {layeringOpen && subtypeLinks('layering-basics', LAYERING_SUBTYPE_ORDER, LAYERING_SUBTYPE_LABELS)}
    </div>
  );

  return (
```

After:
```tsx
      {layeringOpen && subtypeLinks('layering-basics', LAYERING_SUBTYPE_ORDER, LAYERING_SUBTYPE_LABELS)}
    </div>
  );

  /** Hijabs & Scarves's row — same shape as Outerwear's/Layering's. */
  const hijabRow = () => (
    <div key="/modest-hijabs" ref={hijabRowRef}>
      <button
        type="button"
        onClick={() => setHijabOpen((v) => !v)}
        aria-expanded={hijabOpen}
        className="flex items-center justify-between gap-4 py-4 w-full text-left"
        style={{
          fontFamily: 'var(--font-ui-stack)',
          fontSize: 17,
          lineHeight: 1.35,
          letterSpacing: '0.01em',
          color: path === '/modest-hijabs' ? 'var(--aubergine)' : 'var(--ink)',
          fontWeight: path === '/modest-hijabs' ? 500 : 400,
        }}
      >
        Hijabs & Scarves
        <CaretDown
          size={15}
          style={{
            flexShrink: 0,
            color: 'var(--muted)',
            transition: 'transform 150ms ease-out',
            transform: hijabOpen ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>
      {hijabOpen && subtypeLinks('modest-hijabs', HIJAB_SUBTYPE_ORDER, HIJAB_SUBTYPE_LABELS)}
    </div>
  );

  return (
```

- [ ] **Step 5: Wire it into the category list render** (currently line 350)

Before:
```tsx
              l.slug === 'outerwear' ? outerwearRow() : l.slug === 'layering-basics' ? layeringRow() : row(`/${l.slug}`, l.title),
```

After:
```tsx
              l.slug === 'outerwear'
                ? outerwearRow()
                : l.slug === 'layering-basics'
                  ? layeringRow()
                  : l.slug === 'modest-hijabs'
                    ? hijabRow()
                    : row(`/${l.slug}`, l.title),
```

- [ ] **Step 6: Typecheck and lint**

Run: `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git status --short components/MobileNav.tsx
git add components/MobileNav.tsx
git commit -m "$(cat <<'EOF'
feat(hijabs): add Hijabs & Scarves disclosure row to mobile nav

Tapping "Hijabs & Scarves" in the phone menu now expands to all 15
type groups in place, same disclosure mechanism as Outerwear/Layering
Basics — matches the desktop flyout added in the previous commit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Full verification + docs log

**Files:**
- Create: `docs/log/2026-08-15-hijab-type-filter-shipped.md`

- [ ] **Step 1: Full automated verification**

Run, in order, pasting real output for each:
```bash
rm -f tsconfig.tsbuildinfo && npx tsc --noEmit
npm run lint
npm test
```
Expected: all three clean/passing, including every new test from Tasks 1-2 and every
pre-existing test in `lib/specialty.test.ts`, `lib/compactCatalogue.test.ts`, `lib/lanes.test.ts`.

- [ ] **Step 2: Build and start a real server**

Per §10.28's lesson (a port collision silently drives a different session's server), first
confirm nothing already owns the port:
```bash
lsof -i :3177 || echo "port free"
```
If free:
```bash
npm run build
npx next start -p 3177 &
```
If NOT free, pick an unused port instead (e.g. 3179) and use it for every step below.

- [ ] **Step 3: Manual Playwright verification — desktop flyout**

Using Playwright (per this project's "verify UI with Playwright, not just curl" convention),
against `http://localhost:3177` (or whatever port Step 2 used):
1. Load `/`, hover "Products" in the header, then hover "Hijabs & Scarves".
2. Confirm the flyout shows exactly 15 links, in this order: Caps & Underscarves, Khimars,
   Jilbabs, Instant Hijabs, Sport Hijabs, Shawls & Pashminas, Printed, Hijab Sets, Crinkle,
   Jersey, Modal, Chiffon, Cotton & Bamboo, Satin, Silk & Viscose.
3. Click "Jersey". Confirm the URL is `/modest-hijabs?type=jersey` and the page's product
   grid only shows cards whose title plausibly contains "jersey" (spot-check 3 visible
   cards).
4. Click "Khimars" from the still-open flyout (without navigating away first). Confirm the
   grid actually changes to khimar items — this is the exact regression the comment on
   `initialType`'s resync effect in `components/FilterableGrid.tsx` describes (a same-route
   `?type=` change not re-triggering the lazy state initializer).

- [ ] **Step 4: Manual Playwright verification — mobile disclosure**

At a phone viewport (e.g. 390x844):
1. Open the hamburger menu, scroll to "Hijabs & Scarves" under Category.
2. Tap it. Confirm the panel does NOT navigate — it expands in place to the 15 links,
   auto-scrolled into view (matches the existing Outerwear/Layering behavior).
3. Tap "Chiffon". Confirm it navigates to `/modest-hijabs?type=chiffon` and closes the panel.

- [ ] **Step 5: Stop the server**

```bash
kill %1 2>/dev/null || true
```
(Only if Step 2 started one in this shell job — skip if using an already-running server on a
different port.)

- [ ] **Step 6: Write the docs/log entry**

Create `docs/log/2026-08-15-hijab-type-filter-shipped.md`:

```markdown
# Hijab Type filter — shipped
**Date:** 2026-08-15 · **Status:** done

## Goal
Add a "Type" filter to Hijabs & Scarves (Jersey, Chiffon, Instant, Khimars, etc.), matching
the existing Outerwear/Layering Basics hover-flyout mechanism. Full background:
`docs/superpowers/specs/2026-08-15-hijab-type-filter-design.md`.

## What changed
- `lib/types.ts` — new `HijabSubtype` union type (15 groups).
- `lib/hijabTypes.ts` (new) — `hijabSubtype()` classifier + `HIJAB_SUBTYPE_LABELS`.
- `lib/hijabTypes.test.ts` (new) — classification tests against real catalogue titles.
- `lib/compactCatalogue.ts` — `hijabSubtypes`/`rows.hijabSubtypeIdx` column, mirroring the
  existing layering/outerwear ones.
- `lib/compactCatalogue.test.ts` — encoding tests for the new column.
- `components/FilterableGrid.tsx` — three-way subtype dispatch (was two-way).
- `components/Nav.tsx` — desktop hover flyout, 15 links.
- `components/MobileNav.tsx` — mobile disclosure row, 15 links.

## Verification
[paste the real tsc/lint/test output from Task 6 Step 1, and a summary of the manual
Playwright pass from Steps 3-4 — what was clicked/tapped and what was observed]

## Notes / follow-ups
- No staff manual override for a misclassified item yet — explicit out-of-scope call, same
  as the design doc says. Add later the same way Outerwear/Layering got theirs.
- English vocabulary only — non-English hijab titles (e.g. Manzaram's Dutch feed) aren't
  covered by these regexes.
- ~16.5% of the lane (plain color-named titles) has no Type link — reachable only via
  unfiltered browsing/search, per Tina's explicit call.
```

- [ ] **Step 7: Commit**

```bash
git status --short docs/log/2026-08-15-hijab-type-filter-shipped.md
git add docs/log/2026-08-15-hijab-type-filter-shipped.md
git commit -m "$(cat <<'EOF'
docs(hijabs): log the shipped Type filter with verification evidence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** every file in the design doc's "Design" section has a task
  (`lib/types.ts`/`lib/hijabTypes.ts` → Task 1, `lib/compactCatalogue.ts` → Task 2,
  `components/FilterableGrid.tsx` → Task 3, `components/Nav.tsx` → Task 4). One addition
  beyond the design doc's literal file list: `components/MobileNav.tsx` (Task 5) — required
  for the design's own stated goal of matching Outerwear/Layering's existing behavior, which
  includes their mobile disclosure rows, not just the desktop flyout. Called out explicitly
  in the File Structure table above rather than silently added.
- **Placeholder scan:** no TBD/TODO markers; every code block is complete, copy-pasteable
  code, not a description of code.
- **Type consistency:** `HijabSubtype`, `hijabSubtype()`, `HIJAB_SUBTYPE_LABELS` are spelled
  identically everywhere they're used across Tasks 1-5 (checked by re-reading each task's
  import lines against Task 1's actual export names).
