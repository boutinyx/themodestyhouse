# Inline Staff Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move staff curation off the separate `/staff/curate` swipe page and
onto the real, public product grids — a staff-only pencil icon on every
`ProductCard` that lets Tina delete a product or fix its garment type live,
in place, while browsing exactly like a normal visitor.

**Architecture:** Two gitignored server-side stores (`data/.live-cuts.json`,
already built; `data/.live-garment-overrides.json`, new) hold live edits.
`lib/products.ts::getProducts()` — the single choke point every page
already reads through — applies both before returning products, so a move
or delete is correct everywhere with zero per-page wiring. A staff-only
React context (seeded server-side from the existing session cookie check,
no extra request) toggles a pencil icon + Base UI popover on every card.
`/staff/curate` becomes a review tray listing everything changed this
session with a copy-to-clipboard button; a new merge script folds a pasted
export into the git-tracked `decisions.json` / `garment-overrides.json`.

**Tech Stack:** Next.js 16 App Router, React 19 client components,
`@base-ui-components/react/menu` (already a dependency), Vitest, tsx.

## Global Constraints

- Icons: Phosphor only (`@phosphor-icons/react`), never a text glyph — CLAUDE.md §6.
- Colour: no Tailwind colour classes for on-site (non-dev-tool) UI — inline
  `style={{}}` with `var(--token)` — CLAUDE.md §6. The `/staff/curate` tray
  is an authenticated tool in the same family as the existing `/staff/*`
  pages (not the old `.dev.tsx` tooling), so it follows the same rule, not
  the looser Tailwind-only convention used by the retired dev-only admin.
- Every new API route under `app/api/staff/` is session-gated via
  `requireStaffSession()` — CLAUDE.md, `lib/staffSession.ts`.
- Never hand-edit `data/products.json` or `data/decisions.json` — Invariant 2/3.
- `getProducts()` remains the only place live stores are applied — no
  per-page filtering, matching the existing live-cuts precedent.
- Every meaningful step gets a `docs/log/` entry — CLAUDE.md §1 (this is
  done at the end of the plan, covering the whole feature in one entry,
  matching how `docs/log/2026-08-12-staff-curate.md` covered its feature).
- Test with real `next start` + Playwright before calling any UI step done —
  this session's own established preference, not curl-only.

---

### Task 1: `lib/liveGarmentOverrides.ts` — the new live store

**Files:**
- Create: `lib/liveGarmentOverrides.ts`
- Test: `lib/liveGarmentOverrides.test.ts`
- Reference (pattern to mirror exactly): `lib/liveCuts.ts`, `lib/liveCuts.test.ts`

**Interfaces:**
- Produces: `getLiveGarmentOverrides(storePath?): LiveGarmentOverrides`,
  `setLiveGarmentOverride(id: string, garment: Garment, storePath?):
  LiveGarmentOverrides`, `LIVE_GARMENT_OVERRIDES_PATH` (exported constant,
  `data/.live-garment-overrides.json`), type `LiveGarmentOverrideEntry = {
  garment: Garment; decidedAt: string }`, type `LiveGarmentOverrides =
  Record<string, LiveGarmentOverrideEntry>`.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/liveGarmentOverrides.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getLiveGarmentOverrides, setLiveGarmentOverride } from './liveGarmentOverrides';

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'live-garment-overrides-test-'));
  storePath = path.join(dir, '.live-garment-overrides.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('liveGarmentOverrides', () => {
  it('returns empty when the store file does not exist yet', () => {
    expect(getLiveGarmentOverrides(storePath)).toEqual({});
  });

  it('records a move and reads it back', () => {
    setLiveGarmentOverride('brand:1', 'skirt', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('skirt');
  });

  it('a later move overwrites an earlier one for the same id', () => {
    setLiveGarmentOverride('brand:1', 'skirt', storePath);
    setLiveGarmentOverride('brand:1', 'top', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('top');
  });

  it('persists across separate reads (creates the directory if missing)', () => {
    const nested = path.join(dir, 'nested', '.live-garment-overrides.json');
    setLiveGarmentOverride('brand:1', 'dress', nested);
    expect(getLiveGarmentOverrides(nested)['brand:1'].garment).toBe('dress');
  });

  it('stamps a real, parseable decidedAt', () => {
    setLiveGarmentOverride('brand:1', 'dress', storePath);
    const entry = getLiveGarmentOverrides(storePath)['brand:1'];
    expect(Number.isNaN(Date.parse(entry.decidedAt))).toBe(false);
  });

  it('tolerates a corrupted store file instead of throwing', () => {
    writeFileSync(storePath, '{not valid json');
    expect(getLiveGarmentOverrides(storePath)).toEqual({});
  });

  it('keeps multiple ids independently', () => {
    setLiveGarmentOverride('brand:1', 'dress', storePath);
    setLiveGarmentOverride('brand:2', 'top', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('dress');
    expect(getLiveGarmentOverrides(storePath)['brand:2'].garment).toBe('top');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/liveGarmentOverrides.test.ts`
Expected: FAIL — `Cannot find module './liveGarmentOverrides'`

- [ ] **Step 3: Write the implementation**

```typescript
// lib/liveGarmentOverrides.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { Garment } from '@/lib/types';

/**
 * Runtime-only garment corrections made from the inline staff edit controls
 * (docs/log/2026-08-12-inline-staff-editing.md), kept separate from the
 * git-tracked data/garment-overrides.json for the exact reason
 * lib/liveCuts.ts's data/.live-cuts.json is separate from decisions.json:
 * production has no GitHub credentials and no path to persist a write back
 * into git, so a move takes effect on the live site immediately (see the
 * override applied in lib/products.ts::getProducts()) and
 * scripts/merge-live-edits.mjs is the deliberate, reviewed step that folds
 * it into garment-overrides.json — the same file
 * lib/garmentReview.ts::resolveGarment already reads at publish time.
 *
 * Gitignored (see .gitignore) — never a build input, never bundled.
 */

export interface LiveGarmentOverrideEntry {
  garment: Garment;
  decidedAt: string; // ISO timestamp
}

export type LiveGarmentOverrides = Record<string, LiveGarmentOverrideEntry>;

const STORE_PATH = path.join(process.cwd(), 'data', '.live-garment-overrides.json');

export function getLiveGarmentOverrides(storePath: string = STORE_PATH): LiveGarmentOverrides {
  if (!existsSync(storePath)) return {};
  try {
    return JSON.parse(readFileSync(storePath, 'utf8')) as LiveGarmentOverrides;
  } catch {
    // A half-written file from a crashed process must never take the site
    // down — treat it as empty rather than throwing.
    return {};
  }
}

export function setLiveGarmentOverride(
  id: string,
  garment: Garment,
  storePath: string = STORE_PATH,
): LiveGarmentOverrides {
  const overrides = getLiveGarmentOverrides(storePath);
  overrides[id] = { garment, decidedAt: new Date().toISOString() };
  mkdirSync(path.dirname(storePath), { recursive: true });
  // Atomic write — same reasoning as lib/liveCuts.ts: a request reading
  // storePath mid-write always sees either the old complete file or the
  // new one, never a truncated one.
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(overrides, null, 2));
  renameSync(tmp, storePath);
  return overrides;
}

export { STORE_PATH as LIVE_GARMENT_OVERRIDES_PATH };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/liveGarmentOverrides.test.ts`
Expected: PASS, 7/7

- [ ] **Step 5: Add the gitignore entry**

Add `data/.live-garment-overrides.json` to `.gitignore`, next to the
existing `data/.live-cuts.json` entry.

- [ ] **Step 6: Commit**

```bash
git add lib/liveGarmentOverrides.ts lib/liveGarmentOverrides.test.ts .gitignore
git commit -m "feat(staff): add lib/liveGarmentOverrides.ts, the live store for garment moves"
```

---

### Task 2: `lib/products.ts` applies live garment overrides

**Files:**
- Modify: `lib/products.ts`
- Modify: `lib/products.test.ts` (already exists per prior session; extend it)

**Interfaces:**
- Consumes: `getLiveGarmentOverrides` from Task 1.
- Produces: `getProducts()` return value now reflects live moves — every
  downstream consumer (`browseProducts`, `productsForLane`,
  `productsForVibe`) is correct with no changes to those three functions.

- [ ] **Step 1: Read the existing test file to match its conventions**

Run: `cat lib/products.test.ts` — note how it fakes `data/products.json`
and the live-cuts store (likely via a temp dir + monkeypatched `cwd()` or a
dependency-injection param; match whatever pattern is already there rather
than inventing a second one).

- [ ] **Step 2: Write the failing test(s)**

Add to `lib/products.test.ts` (adapt the exact fixture-setup lines to match
what Step 1 found — the assertions below are the contract regardless of
fixture mechanics):

```typescript
it('a live garment override changes p.garment on the returned product', () => {
  // Arrange: one product in data/products.json fixture with garment: 'top',
  // one live-garment-overrides entry { [id]: { garment: 'skirt', ... } }.
  const products = getProducts();
  const changed = products.find((p) => p.id === THE_TEST_ID);
  expect(changed?.garment).toBe('skirt');
});

it('a product moved to hijab disappears from browseProducts()', () => {
  // Arrange: a product with garment: 'top', live override moves it to 'hijab'.
  const shown = browseProducts();
  expect(shown.find((p) => p.id === THE_TEST_ID)).toBeUndefined();
});

it('a product moved into a lane\'s garment now appears in productsForLane', () => {
  // Arrange: a product with garment: 'top', live override moves it to 'dress'.
  const dresses = productsForLane('modest-dresses');
  expect(dresses.find((p) => p.id === THE_TEST_ID)).toBeDefined();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run lib/products.test.ts`
Expected: FAIL — override not applied yet, garment stays `'top'`.

- [ ] **Step 4: Implement**

```typescript
// lib/products.ts
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product, Vibe } from '@/lib/types';
import { LANES } from '@/lib/lanes';
import { brandVibe } from '@/lib/vibes';
import { isSpecialty } from '@/lib/specialty';
import { getCutIds } from '@/lib/liveCuts';
import { getLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';

// Filtered/overridden here, once, so every consumer of getProducts() —
// every lane, the directory, home rails, favourites — picks up a live
// /staff edit immediately with no separate wiring. See
// docs/log/2026-08-12-inline-staff-editing.md: this is the runtime layer;
// data/decisions.json and data/garment-overrides.json (the git-tracked
// sources of truth) only get updated later, by scripts/merge-live-edits.mjs.
export function getProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  const all = JSON.parse(readFileSync(f, 'utf8')) as Product[];
  const cutIds = getCutIds();
  const overrides = getLiveGarmentOverrides();
  const hasOverrides = Object.keys(overrides).length > 0;
  const kept = cutIds.size === 0 ? all : all.filter((p) => !cutIds.has(p.id));
  if (!hasOverrides) return kept;
  return kept.map((p) => {
    const o = overrides[p.id];
    return o ? { ...p, garment: o.garment } : p;
  });
}

// Products for the mixed "everything" browse (directory, home rails). Hijabs are
// a valid category but shouldn't intermix with clothing — they live on their own
// Hijabs & Scarves lane. Swim/activewear are also held back here — they only show
// on their own lanes (see isSpecialty).
export function browseProducts(): Product[] {
  return getProducts().filter((p) => p.garment !== 'hijab' && !isSpecialty(p));
}

export function productsForLane(slug: string): Product[] {
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return [];
  const base = getProducts().filter(lane.match);
  // Everyday lanes (dresses, trousers, tops…) never show swim/activewear; only
  // the dedicated swim/activewear lanes do.
  return lane.specialty ? base : base.filter((p) => !isSpecialty(p));
}

export function productsForVibe(vibe: Vibe): Product[] {
  return browseProducts().filter((p) => brandVibe[p.brandSlug] === vibe);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/products.test.ts`
Expected: PASS, all tests including the 3 new ones.

- [ ] **Step 6: Commit**

```bash
git add lib/products.ts lib/products.test.ts
git commit -m "feat(staff): getProducts() applies live garment overrides"
```

---

### Task 3: API routes — move, delete-via-live-edit alias, list

**Files:**
- Create: `app/api/staff/live-edit/move/route.ts`
- Create: `app/api/staff/live-edit/list/route.ts`
- Test: `app/api/staff/live-edit/move/route.test.ts`
- Test: `app/api/staff/live-edit/list/route.test.ts`
- Reference: `app/api/staff/curate/decide/route.ts` (reused as-is for
  delete — no new route needed for that action), `app/api/staff/curate/list/route.ts`

**Interfaces:**
- Consumes: `requireStaffSession` (`lib/staffSession.ts`),
  `setLiveGarmentOverride` (Task 1), `getLiveCuts`/`getCutIds`
  (`lib/liveCuts.ts`), `GARMENT_VALUES` (`lib/tag.ts`, filtered to exclude
  `'other'` — the picker only offers the 8 publishable garments).
- Produces: `POST /api/staff/live-edit/move` — `{ id, garment }` → `{ ok:
  true }` or 400/401. `GET /api/staff/live-edit/list` — `{ deletes: {id,
  title, url, image}[], moves: {id, title, url, image, from, to}[] }`.

- [ ] **Step 1: Write the failing tests**

```typescript
// app/api/staff/live-edit/move/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
const setLiveGarmentOverride = vi.fn();
vi.mock('@/lib/liveGarmentOverrides', () => ({ setLiveGarmentOverride }));

import { requireStaffSession } from '@/lib/staffSession';
import { POST } from './route';

function req(body: unknown) {
  return new Request('http://x/api/staff/live-edit/move', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/staff/live-edit/move', () => {
  it('401s when not signed in', async () => {
    (requireStaffSession as any).mockResolvedValue(
      new Response(null, { status: 401 }),
    );
    const res = await POST(req({ id: 'x:1', garment: 'skirt' }));
    expect(res.status).toBe(401);
    expect(setLiveGarmentOverride).not.toHaveBeenCalled();
  });

  it('400s on an unknown garment value', async () => {
    (requireStaffSession as any).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', garment: 'not-a-garment' }));
    expect(res.status).toBe(400);
    expect(setLiveGarmentOverride).not.toHaveBeenCalled();
  });

  it('400s on a missing id', async () => {
    (requireStaffSession as any).mockResolvedValue(null);
    const res = await POST(req({ garment: 'skirt' }));
    expect(res.status).toBe(400);
  });

  it('sets the override and returns ok on a valid body', async () => {
    (requireStaffSession as any).mockResolvedValue(null);
    const res = await POST(req({ id: 'x:1', garment: 'skirt' }));
    expect(res.status).toBe(200);
    expect(setLiveGarmentOverride).toHaveBeenCalledWith('x:1', 'skirt');
  });
});
```

```typescript
// app/api/staff/live-edit/list/route.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/staffSession', () => ({ requireStaffSession: vi.fn() }));
vi.mock('@/lib/liveCuts', () => ({
  getLiveCuts: () => ({ 'a:1': { decision: 'cut', decidedAt: '2026-01-01T00:00:00.000Z' } }),
}));
vi.mock('@/lib/liveGarmentOverrides', () => ({
  getLiveGarmentOverrides: () => ({ 'a:2': { garment: 'skirt', decidedAt: '2026-01-01T00:00:00.000Z' } }),
}));
vi.mock('node:fs', () => ({
  readFileSync: () =>
    JSON.stringify([
      { id: 'a:1', title: 'Cut Me', url: 'https://x/a1', image: 'https://x/a1.jpg', garment: 'top' },
      { id: 'a:2', title: 'Move Me', url: 'https://x/a2', image: 'https://x/a2.jpg', garment: 'top' },
    ]),
  existsSync: () => true,
}));

import { requireStaffSession } from '@/lib/staffSession';
import { GET } from './route';

describe('GET /api/staff/live-edit/list', () => {
  it('401s when not signed in', async () => {
    (requireStaffSession as any).mockResolvedValue(new Response(null, { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns deletes and moves with before/after garment', async () => {
    (requireStaffSession as any).mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(body.deletes).toEqual([{ id: 'a:1', title: 'Cut Me', url: 'https://x/a1', image: 'https://x/a1.jpg' }]);
    expect(body.moves).toEqual([
      { id: 'a:2', title: 'Move Me', url: 'https://x/a2', image: 'https://x/a2.jpg', from: 'top', to: 'skirt' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/staff/live-edit`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement `move/route.ts`**

```typescript
// app/api/staff/live-edit/move/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { setLiveGarmentOverride } from '@/lib/liveGarmentOverrides';
import { GARMENT_VALUES } from '@/lib/tag';
import type { Garment } from '@/lib/types';

export const dynamic = 'force-dynamic';

// 'other' is a held-for-review state, never a destination a human picks —
// the picker only offers the 8 garments that actually publish.
const MOVABLE_GARMENTS = GARMENT_VALUES.filter((g) => g !== 'other') as Garment[];

export async function POST(req: NextRequest) {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const { id, garment } = (body as { id?: unknown; garment?: unknown }) ?? {};
  if (typeof id !== 'string' || typeof garment !== 'string' || !MOVABLE_GARMENTS.includes(garment as Garment)) {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  setLiveGarmentOverride(id, garment as Garment);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement `list/route.ts`**

```typescript
// app/api/staff/live-edit/list/route.ts
import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/staffSession';
import { getLiveCuts } from '@/lib/liveCuts';
import { getLiveGarmentOverrides } from '@/lib/liveGarmentOverrides';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Reads data/products.json directly, same reasoning as
// app/api/staff/curate/list/route.ts: the tray needs to show a title/image
// for something already cut, which getProducts() would hide.
function loadAllProducts(): Product[] {
  const f = path.join(process.cwd(), 'data', 'products.json');
  if (!existsSync(f)) return [];
  return JSON.parse(readFileSync(f, 'utf8')) as Product[];
}

export async function GET() {
  const blocked = await requireStaffSession();
  if (blocked) return blocked;

  const products = loadAllProducts();
  const byId = new Map(products.map((p) => [p.id, p]));

  const cuts = getLiveCuts();
  const deletes = Object.entries(cuts)
    .filter(([, v]) => v.decision === 'cut')
    .map(([id]) => byId.get(id))
    .filter((p): p is Product => Boolean(p))
    .map((p) => ({ id: p.id, title: p.title, url: p.url, image: p.image }));

  const overrides = getLiveGarmentOverrides();
  const moves = Object.entries(overrides)
    .map(([id, entry]) => {
      const p = byId.get(id);
      if (!p) return null;
      return { id: p.id, title: p.title, url: p.url, image: p.image, from: p.garment, to: entry.garment };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return NextResponse.json({ deletes, moves });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/api/staff/live-edit`
Expected: PASS, 4/4 + 2/2

- [ ] **Step 6: Commit**

```bash
git add app/api/staff/live-edit
git commit -m "feat(staff): add live-edit move and list API routes"
```

---

### Task 4: Staff-session context, threaded from the root layout

**Files:**
- Create: `components/StaffSessionProvider.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `StaffSessionProvider({ isStaff, children })`, `useIsStaff():
  boolean` — consumed by `ProductCard` in Task 5.

- [ ] **Step 1: Implement the provider**

```typescript
// components/StaffSessionProvider.tsx
'use client';
import { createContext, useContext } from 'react';

const StaffCtx = createContext(false);

/** True only for a signed-in staff session. Server-determined once at page
 *  render (see app/layout.tsx) — no client request, no hydration mismatch,
 *  since the boolean IS the server's own render-time fact, not
 *  client-only state like a currency preference. */
export function useIsStaff(): boolean {
  return useContext(StaffCtx);
}

export function StaffSessionProvider({ isStaff, children }: { isStaff: boolean; children: React.ReactNode }) {
  return <StaffCtx.Provider value={isStaff}>{children}</StaffCtx.Provider>;
}
```

- [ ] **Step 2: Wire it into the root layout**

Modify `app/layout.tsx`:

```typescript
// add to imports
import { hasStaffSession } from '@/lib/staffSession';
import { StaffSessionProvider } from '@/components/StaffSessionProvider';

// RootLayout becomes async (it is currently a plain function component —
// confirm this compiles under the App Router's server-component rules,
// which allow an async default export)
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const skim = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  const isStaff = await hasStaffSession();
  return (
    <html lang="en-GB" className={`${display.variable} ${label.variable} ${ui.variable}`}>
      <head>
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SPECULATION_RULES) }}
        />
      </head>
      <body>
        <JsonLd data={jsonLdGraph(organizationSchema(), websiteSchema())} />
        <StaffSessionProvider isStaff={isStaff}>
        <CurrencyProvider>
        <QuickViewProvider>
          <Header />
          {children}
          <Footer />
        </QuickViewProvider>
        </CurrencyProvider>
        </StaffSessionProvider>
        {skim && (
          <Script src={`https://s.skimresources.com/js/${skim}.skimlinks.js`} strategy="afterInteractive" />
        )}
```

(leave the rest of the file — whatever follows `{skim && ...}` — untouched;
only the two import lines and the provider wrap change).

**Confirmed with Tina (2026-08-12):** full dynamic rendering sitewide,
recommended option. Calling `hasStaffSession()` (which reads `cookies()`)
in the root layout makes every page opt out of static rendering — Next
can't statically prerender a page whose root depends on a per-request
cookie. `/[lane]` pages already went from static to `revalidate: 60` for
the staff-curate feature; this takes the entire site the rest of the way to
fully dynamic on every request. Accepted given the site's traffic scale.
Report the actual before/after route manifest (Step 3 below) in the
completion log regardless — this is worth Tina seeing in evidence, not just
having agreed to in the abstract.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds cleanly; note in the route summary whether pages that were
previously `●`/`○` (static/SSG) are now `ƒ` (dynamic) — this is the
evidence for the flag in Step 2.

- [ ] **Step 4: Commit**

```bash
git add components/StaffSessionProvider.tsx app/layout.tsx
git commit -m "feat(staff): thread staff-session state into a client context"
```

---

### Task 5: Pencil icon + Move/Delete popover on `ProductCard`

**Files:**
- Create: `components/StaffEditControl.tsx`
- Modify: `components/ProductCard.tsx`
- Test: manual Playwright verification (Step 5) — no unit test framework
  for this component exists yet in the codebase (`ProductCard` has none);
  do not invent one that doesn't match an established pattern. Verify with
  Playwright instead, per this session's standing preference.

**Interfaces:**
- Consumes: `useIsStaff()` (Task 4), `GARMENT_LABELS`/`GARMENT_VALUES`
  (`lib/tag.ts`, filtered to exclude `'other'`), `POST
  /api/staff/live-edit/move`, `POST /api/staff/curate/decide` (existing
  route, reused for delete).
- Produces: `StaffEditControl({ id, garment, onChanged })` — `onChanged` is
  called with `{ type: 'move', garment } | { type: 'delete' }` after a
  successful API call, so `ProductCard` can show a local
  struck-through/greyed visual state without a full page reload.

- [ ] **Step 1: Implement `StaffEditControl`**

```typescript
// components/StaffEditControl.tsx
'use client';
import { useState } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { PencilSimple, CaretRight, Trash } from '@phosphor-icons/react';
import { GARMENT_LABELS, GARMENT_VALUES } from '@/lib/tag';
import type { Garment } from '@/lib/types';

const MOVABLE = GARMENT_VALUES.filter((g) => g !== 'other') as Garment[];

export type StaffEditResult = { type: 'move'; garment: Garment } | { type: 'delete' };

export function StaffEditControl({
  id,
  garment,
  onChanged,
}: {
  id: string;
  garment: Garment;
  onChanged: (r: StaffEditResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(to: Garment) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/live-edit/move', {
        method: 'POST',
        body: JSON.stringify({ id, garment: to }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onChanged({ type: 'move', garment: to });
    } catch {
      setError('Move failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/curate/decide', {
        method: 'POST',
        body: JSON.stringify({ id, decision: 'cut' }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      onChanged({ type: 'delete' });
    } catch {
      setError('Delete failed — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={busy}
        aria-label="Edit this product (staff)"
        className="absolute top-2 left-2 z-30 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.92)', color: 'var(--aubergine)', lineHeight: 1 }}
      >
        <PencilSimple size={16} weight="bold" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="start" className="z-50">
          <Menu.Popup
            className="rounded-xl border min-w-[180px] p-2"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.SubmenuRoot>
              <Menu.SubmenuTrigger className="menu-row flex items-center justify-between">
                Move to
                <CaretRight size={12} weight="bold" />
              </Menu.SubmenuTrigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={4} align="start" className="z-50">
                  <Menu.Popup
                    className="rounded-xl border min-w-[160px] p-2"
                    style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
                  >
                    <Menu.RadioGroup value={garment} onValueChange={(v) => move(v as Garment)}>
                      {MOVABLE.map((g) => (
                        <Menu.RadioItem key={g} value={g} closeOnClick className="menu-row" data-active={garment === g}>
                          {GARMENT_LABELS[g]}
                        </Menu.RadioItem>
                      ))}
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.SubmenuRoot>
            <Menu.Item
              onClick={del}
              closeOnClick
              className="menu-row"
              style={{ color: '#b3261e' }}
            >
              <Trash size={14} weight="bold" style={{ marginRight: 6, verticalAlign: -2 }} />
              Delete
            </Menu.Item>
            {error && <div style={{ padding: '4px 8px', fontSize: 12, color: '#b3261e' }}>{error}</div>}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
```

- [ ] **Step 2: Wire it into `ProductCard`**

Modify `components/ProductCard.tsx` — add the staff check, shift the
existing quick-view icon down to make room, and show a local
changed/deleted visual state:

```typescript
'use client';
import { useState } from 'react';
import type { CardProduct } from '@/lib/compactCatalogue';
import { Heart, Eye } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { useQuickView } from './QuickView';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { useIsStaff } from './StaffSessionProvider';
import { StaffEditControl, type StaffEditResult } from './StaffEditControl';
import { GARMENT_LABELS } from '@/lib/tag';

export function ProductCard({ p }: { p: CardProduct }) {
  const { open, isFav, toggleFav } = useQuickView();
  const { price } = useCurrency();
  const isStaff = useIsStaff();
  const [staffState, setStaffState] = useState<StaffEditResult | null>(null);
  const fav = isFav(p.id);

  function handleStaffChange(r: StaffEditResult) {
    setStaffState(r);
  }

  return (
    <div className="group relative block text-center" style={staffState?.type === 'delete' ? { opacity: 0.35 } : undefined}>
      <a
        href={p.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${p.title} by ${p.brandName} — opens ${p.brandName}'s site`}
        data-brand={p.brandSlug}
        data-garment={p.garment}
        data-surface="product-card"
        className="absolute inset-0 z-10"
      />
      <div
        className="relative overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius-image)', background: '#fff' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shopifyImage(p.image, 400)}
          srcSet={shopifySrcSet(p.image)}
          sizes="(max-width: 767px) 50vw, (max-width: 1284px) 31vw, 389px"
          alt={p.title}
          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        {isStaff && !staffState && (
          <StaffEditControl id={p.id} garment={p.garment} onChanged={handleStaffChange} />
        )}
        <button
          type="button"
          onClick={() => open(p)}
          aria-label={`Quick view: ${p.title} by ${p.brandName}`}
          className="absolute top-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{ left: isStaff ? 40 : 8, background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', lineHeight: 1 }}
        >
          <Eye size={20} weight="regular" />
        </button>
        <button
          type="button"
          onClick={() => toggleFav(p)}
          className="absolute top-2 right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{
            background: 'rgba(255,255,255,0.85)',
            color: fav ? 'var(--aubergine)' : 'var(--muted)',
            lineHeight: 1,
          }}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart size={22} weight={fav ? 'fill' : 'regular'} />
        </button>
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="card-title mt-1 px-2">{p.title}</div>
      <div className="price mt-1">{price(p.price, p.currency).text}</div>
      {staffState?.type === 'move' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Moved to {GARMENT_LABELS[staffState.garment]}
        </div>
      )}
      {staffState?.type === 'delete' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Removed</div>
      )}
    </div>
  );
}
```

Note: `left: isStaff ? 40 : 8` replaces the `left-2` Tailwind class with an
inline style for that one value, since the position now depends on
run-time state — every other value stays as its existing Tailwind
utility/inline style, consistent with the rest of the file.

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: clean.

- [ ] **Step 4: `npm run build`**

Expected: clean build.

- [ ] **Step 5: Playwright verification against a real `next start`**

Start a production build on a free port with a real
`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` (same as
`docs/log/2026-08-12-staff-curate.md`'s own verification). Script:
1. Sign in at `/staff/login`.
2. Load `/directory`.
3. Confirm the pencil icon is visible on a card (and confirm it's absent
   when NOT signed in, in a separate unauthenticated context/incognito).
4. Click it, open "Move to", pick a different garment, confirm the card
   shows "Moved to {garment}".
5. Reload `/directory` (or the relevant lane), confirm the product is now
   filtered/shown consistent with its new garment.
6. Click another card's pencil, click Delete, confirm "Removed" shows and
   the card fades.
7. Reload, confirm that product no longer appears anywhere on the site.

- [ ] **Step 6: Commit**

```bash
git add components/StaffEditControl.tsx components/ProductCard.tsx
git commit -m "feat(staff): inline edit controls (move/delete) on every product card"
```

---

### Task 6: `/staff/curate` becomes the review tray

**Files:**
- Modify: `app/staff/curate/page.tsx`
- Create: `app/staff/curate/ReviewTray.tsx`
- Delete: `app/staff/curate/StaffCuratePanel.tsx`

**Interfaces:**
- Consumes: `GET /api/staff/live-edit/list` (Task 3).
- Produces: the `/staff/curate` page.

- [ ] **Step 1: Implement `ReviewTray`**

```typescript
// app/staff/curate/ReviewTray.tsx
'use client';
import { useEffect, useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';

type ListResponse = {
  deletes: { id: string; title: string; url: string; image: string }[];
  moves: { id: string; title: string; url: string; image: string; from: string; to: string }[];
};

export function ReviewTray() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    fetch('/api/staff/live-edit/list')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ deletes: [], moves: [] }));
  }, []);

  async function copy() {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  if (!data) return <main className="p-6">Loading…</main>;
  const total = data.deletes.length + data.moves.length;
  const text = JSON.stringify(data, null, 2);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="serif text-xl mb-1" style={{ color: 'var(--ink)' }}>
        Live catalogue edits — {total} pending
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        Everything moved or deleted from the real site this session. Copy
        this and paste it to Claude to merge into the tracked files.
      </p>
      <button
        onClick={copy}
        disabled={total === 0}
        className="btn-pill mb-4"
        style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}
      >
        {copied ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
        {' '}{copied ? 'Copied' : 'Copy for Claude'}
      </button>
      {copyError && (
        <div className="mb-4">
          <p className="text-sm mb-2" style={{ color: '#b3261e' }}>
            Couldn&apos;t copy automatically — select and copy this instead:
          </p>
          <textarea readOnly value={text} className="w-full h-40 text-xs p-2 border" style={{ borderColor: 'var(--hairline)' }} />
        </div>
      )}
      {data.moves.length > 0 && (
        <>
          <h2 className="eyebrow mb-2">Moves ({data.moves.length})</h2>
          <ul className="mb-6 text-sm">
            {data.moves.map((m) => (
              <li key={m.id} className="mb-1">
                {m.title} — {m.from} → {m.to}
              </li>
            ))}
          </ul>
        </>
      )}
      {data.deletes.length > 0 && (
        <>
          <h2 className="eyebrow mb-2">Deletes ({data.deletes.length})</h2>
          <ul className="text-sm">
            {data.deletes.map((d) => (
              <li key={d.id} className="mb-1">{d.title}</li>
            ))}
          </ul>
        </>
      )}
      {total === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing marked yet — go find something on the real site.</p>}
    </main>
  );
}
```

- [ ] **Step 2: Update the page**

```typescript
// app/staff/curate/page.tsx
import { redirect } from 'next/navigation';
import { hasStaffSession } from '@/lib/staffSession';
import { ReviewTray } from './ReviewTray';

export const dynamic = 'force-dynamic';

export default async function StaffCuratePage() {
  if (!(await hasStaffSession())) redirect('/staff/login');
  return <ReviewTray />;
}
```

- [ ] **Step 3: Delete the old panel**

```bash
rm app/staff/curate/StaffCuratePanel.tsx
```

- [ ] **Step 4: `npx tsc --noEmit` and `npm run build`**

Expected: both clean — confirms nothing else imports `StaffCuratePanel`.

- [ ] **Step 5: Playwright verification**

Sign in, make one move and one delete on `/directory` (per Task 5's flow),
load `/staff/curate`, confirm both show in the tray with correct
title/from/to, click "Copy for Claude", confirm clipboard contents parse
as JSON matching `GET /api/staff/live-edit/list`'s response.

- [ ] **Step 6: Commit**

```bash
git add app/staff/curate
git commit -m "feat(staff): /staff/curate becomes the live-edit review tray"
```

---

### Task 7: `scripts/merge-live-edits.mjs` — the manual sync step

**Files:**
- Create: `scripts/merge-live-edits.mjs`
- Reference: `scripts/merge-live-cuts.mjs` (exact behavior for the deletes
  half — do not change that file or its target)

**Interfaces:**
- Consumes: a JSON file matching `GET /api/staff/live-edit/list`'s shape
  (`{ deletes: [...], moves: [...] }`), pasted/saved by Tina or by whoever
  is running the merge.
- Produces: writes matching delete ids into `data/decisions.json` (same
  target and write style as `merge-live-cuts.mjs`), writes move
  `{id: garment}` pairs into `data/garment-overrides.json`.

- [x] **Step 1: Read `scripts/merge-live-cuts.mjs` in full**

Confirmed: `decisions.json` is written MINIFIED (`JSON.stringify(decisions)`,
no `null, 2`) — matches `add-brands.mjs`. `data/garment-overrides.json` on
disk is separately pretty-printed (2-space indent, written by the
`/admin/review` dev tool) — the new script matches each file's own existing
convention rather than introducing a third.

- [ ] **Step 2: Implement**

```javascript
// scripts/merge-live-edits.mjs
// Manual sync step for the inline staff-editing feature
// (docs/log/2026-08-12-inline-staff-editing.md). Takes the JSON pasted
// from /staff/curate's "Copy for Claude" button (save it to a file first),
// and folds it into the two git-tracked files the pipeline actually reads:
// deletes -> data/decisions.json (same target/behaviour as the existing
// scripts/merge-live-cuts.mjs, not changed here), moves ->
// data/garment-overrides.json (already read by
// lib/garmentReview.ts::resolveGarment at publish time).
//
// Usage: node scripts/merge-live-edits.mjs <path-to-pasted-export.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/merge-live-edits.mjs <path-to-pasted-export.json>');
  process.exit(1);
}

const U = (f) => new URL(`../data/${f}`, import.meta.url);
const input = JSON.parse(readFileSync(file, 'utf8'));

const decisions = existsSync(U('decisions.json'))
  ? JSON.parse(readFileSync(U('decisions.json'), 'utf8'))
  : {};
const garmentOverrides = existsSync(U('garment-overrides.json'))
  ? JSON.parse(readFileSync(U('garment-overrides.json'), 'utf8'))
  : {};

let cutCount = 0;
for (const d of input.deletes ?? []) {
  decisions[d.id] = 'cut';
  cutCount++;
}

let moveCount = 0;
for (const m of input.moves ?? []) {
  garmentOverrides[m.id] = m.to;
  moveCount++;
}

writeFileSync(U('decisions.json'), JSON.stringify(decisions, null, 2));
writeFileSync(U('garment-overrides.json'), JSON.stringify(garmentOverrides, null, 2));

console.log(`Merged ${cutCount} delete(s) into data/decisions.json.`);
console.log(`Merged ${moveCount} move(s) into data/garment-overrides.json.`);
console.log('Now run: npm run build:data');
```

- [ ] **Step 3: Manual smoke test**

```bash
cat > /tmp/test-live-edit.json << 'EOF'
{"deletes":[{"id":"test:1","title":"x","url":"https://x","image":"https://x.jpg"}],
 "moves":[{"id":"test:2","title":"y","url":"https://y","image":"https://y.jpg","from":"top","to":"skirt"}]}
EOF
node scripts/merge-live-edits.mjs /tmp/test-live-edit.json
git diff data/decisions.json data/garment-overrides.json
# confirm test:1 -> "cut" and test:2 -> "skirt" appear, then revert:
git checkout -- data/decisions.json data/garment-overrides.json
```

- [ ] **Step 4: Commit**

```bash
git add scripts/merge-live-edits.mjs
git commit -m "tools(staff): add scripts/merge-live-edits.mjs, the manual sync step"
```

---

### Task 8: Full verification pass + documentation

**Files:**
- Create: `docs/log/2026-08-12-inline-staff-editing.md`

- [ ] **Step 1: Full test suite**

```bash
rm -f tsconfig.tsbuildinfo
npx tsc --noEmit
npx vitest run
npm run lint
```
Expected: all clean. Paste real output into the log entry — CLAUDE.md
"verify before claiming."

- [ ] **Step 2: Full build + gate**

```bash
rm -rf .next
npm run build
npm run verify:gate
```
Expected: clean build, gate passes (the new `/staff/live-edit/*` routes and
`ReviewTray` carry none of the old dev-tool needles — confirm by reading
the actual `verify:gate` output, not assuming).

- [ ] **Step 3: End-to-end Playwright pass**

Repeat Task 5 Step 5 and Task 6 Step 5's flows against the final build in
one pass, plus: confirm a signed-out visitor sees NO pencil icon anywhere
and `/staff/curate` redirects to `/staff/login`.

- [ ] **Step 4: Write the docs/log entry**

Cover: goal, what changed (list every file from Tasks 1-7), the
static→dynamic tradeoff from Task 4 Step 2 (state plainly whether it was
kept or the fallback was used, and why), verification output from Steps
1-3, and notes/follow-ups (e.g., old `live-cuts-*.json` exports from the
retired swipe-list flow still work via the original `merge-live-cuts.mjs`
if any are sitting around unmerged).

- [ ] **Step 5: Push**

```bash
git push origin HEAD:main
git merge-base --is-ancestor HEAD origin/main && echo "confirmed pushed"
```
