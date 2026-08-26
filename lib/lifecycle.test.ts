import { describe, it, expect } from 'vitest';
import {
  isCompleteFetch,
  applyBrandRefresh,
  nextDecisions,
  isLifecycleLive,
  stripLifecycle,
  brandDropViolations,
  freezeCollapsedBrands,
  brandPriceSignals,
} from './lifecycle';
import type { Product } from '@/lib/types';
import type { LifecycleRow } from './lifecycle';

const TODAY = '2026-08-05';

const product = (id: string, over: Partial<Product> = {}): Product => ({
  id,
  brandSlug: id.split(':')[0],
  brandName: 'Inayah',
  title: `Product ${id}`,
  price: 60,
  currency: 'GBP',
  image: 'https://cdn.shopify.com/a.jpg',
  url: 'https://inayah.co/products/a',
  inStock: true,
  garment: 'dress',
  community: 'general',
  occasion: [],
  season: [],
  activity: [],
  ...over,
});

// ---------------------------------------------------------------------------
// The complete-fetch contract. Delisting hangs entirely off this, so it is the
// most safety-critical predicate in the system (§10.1).
// ---------------------------------------------------------------------------
describe('isCompleteFetch', () => {
  const clean = { reachedNaturalEnd: true, gaveUpOn429: false, sawErrorStatus: false, hitPageCap: false };

  it('is complete when pagination reached a natural end with no failures', () => {
    expect(isCompleteFetch(clean)).toBe(true);
  });

  it('is incomplete when a page gave up after 429 retries', () => {
    expect(isCompleteFetch({ ...clean, gaveUpOn429: true })).toBe(false);
  });

  it('is incomplete when any page returned a non-OK status', () => {
    expect(isCompleteFetch({ ...clean, sawErrorStatus: true })).toBe(false);
  });

  it('is incomplete when it never reached a natural end', () => {
    expect(isCompleteFetch({ ...clean, reachedNaturalEnd: false })).toBe(false);
  });

  // Live bug in add-brands.mjs:42 — exhausting the 20-page cap still reported
  // complete:true. At 250/page that mislabels any 5000+ product brand as fully
  // fetched, which under this design is a licence to delist.
  it('is incomplete when the page cap was hit, even if nothing errored', () => {
    expect(isCompleteFetch({ ...clean, hitPageCap: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The core reducer.
// ---------------------------------------------------------------------------
describe('applyBrandRefresh', () => {
  const fetched = (over: Partial<Parameters<typeof applyBrandRefresh>[1]> = {}) => ({
    brandSlug: 'inayah',
    normalized: [] as Product[],
    rejected: [] as { id: string; reason: string }[],
    complete: true,
    ...over,
  });

  it('stamps delistedAt on a row absent from a COMPLETE fetch', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), lastSeen: '2026-07-01' }];
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [] }), TODAY);
    expect(rows[0].delistedAt).toBe(TODAY);
  });

  // THE §10.1 REGRESSION TEST. A partial fetch must never be able to remove
  // anything — that mistake once wiped thousands of products with no backup.
  it('stamps NOTHING on a row absent from an INCOMPLETE fetch', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), lastSeen: '2026-07-01' }];
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [], complete: false }), TODAY);
    expect(rows[0].delistedAt).toBeUndefined();
    expect(rows[0].lastSeen).toBe('2026-07-01');
  });

  it('keeps a delisted row in the dataset rather than deleting it', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1') }];
    const { rows } = applyBrandRefresh(existing, fetched(), TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('inayah:1');
  });

  it('adds a product the brand has and we do not, stamping firstSeen', () => {
    const { rows, report } = applyBrandRefresh([], fetched({ normalized: [product('inayah:9')] }), TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0].firstSeen).toBe(TODAY);
    expect(rows[0].lastSeen).toBe(TODAY);
    expect(report.added).toEqual(['Product inayah:9']);
  });

  it('re-derives an existing row from the fresh feed data', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1', { price: 60, image: 'old.jpg' }), firstSeen: '2026-01-01' }];
    const fresh = product('inayah:1', { price: 45, image: 'model.jpg' });
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [fresh] }), TODAY);
    expect(rows[0].price).toBe(45);
    expect(rows[0].image).toBe('model.jpg');
  });

  it('never rewrites firstSeen on a row it already has', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), firstSeen: '2026-01-01' }];
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [product('inayah:1')] }), TODAY);
    expect(rows[0].firstSeen).toBe('2026-01-01');
  });

  // null means "pre-dates tracking" — a real value, not a missing one. `??=`
  // would quietly overwrite it and claim 13,627 legacy rows arrived today.
  it('preserves an explicit null firstSeen rather than backfilling today', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), firstSeen: null }];
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [product('inayah:1')] }), TODAY);
    expect(rows[0].firstSeen).toBeNull();
  });

  it('clears delistedAt when a product comes back', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), delistedAt: '2026-06-01' }];
    const { rows, report } = applyBrandRefresh(existing, fetched({ normalized: [product('inayah:1')] }), TODAY);
    expect(rows[0].delistedAt).toBeNull();
    expect(report.returned).toBe(1);
  });

  it('stamps filteredAt with a reason when the brand still lists a row our filters reject', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1') }];
    const result = fetched({ rejected: [{ id: 'inayah:1', reason: 'no-image' }] });
    const { rows, report } = applyBrandRefresh(existing, result, TODAY);
    expect(rows[0].filteredAt).toBe(TODAY);
    expect(rows[0].filterReason).toBe('no-image');
    expect(rows[0].delistedAt).toBeUndefined(); // NOT counted as a delist
    expect(report.filtered).toEqual([{ title: 'Product inayah:1', reason: 'no-image' }]);
  });

  it('clears filteredAt when a row starts passing our filters again', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1'), filteredAt: '2026-06-01', filterReason: 'no-image' }];
    const { rows } = applyBrandRefresh(existing, fetched({ normalized: [product('inayah:1')] }), TODAY);
    expect(rows[0].filteredAt).toBeNull();
  });

  it('does not delist a row the brand still lists but our filters rejected', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1') }];
    // present in `rejected`, absent from `normalized`, fetch complete
    const { rows } = applyBrandRefresh(existing, fetched({ rejected: [{ id: 'inayah:1', reason: 'unclassified' }] }), TODAY);
    expect(rows[0].delistedAt).toBeUndefined();
  });

  it('leaves other brands\' rows alone', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1') }, { ...product('aab:1') }];
    const { rows } = applyBrandRefresh(existing, fetched(), TODAY);
    expect(rows.find((r) => r.id === 'aab:1')!.delistedAt).toBeUndefined();
  });

  it('reports counts for the run', () => {
    const existing: LifecycleRow[] = [{ ...product('inayah:1') }, { ...product('inayah:2') }];
    const { report } = applyBrandRefresh(
      existing,
      fetched({ normalized: [product('inayah:1'), product('inayah:3')] }),
      TODAY,
    );
    expect(report).toMatchObject({ brandSlug: 'inayah', complete: true, updated: 1, delisted: 1 });
    expect(report.added).toEqual(['Product inayah:3']);
  });
});

// ---------------------------------------------------------------------------
// Decisions. add-brands.mjs:80 currently stamps 'keep' unconditionally, which
// resurrects anything Tina cut (Invariant 3).
// ---------------------------------------------------------------------------
describe('nextDecisions', () => {
  it('defaults an unseen product to keep', () => {
    expect(nextDecisions({}, ['inayah:1'])).toEqual({ 'inayah:1': 'keep' });
  });

  it('NEVER overwrites an existing cut decision', () => {
    expect(nextDecisions({ 'inayah:1': 'cut' }, ['inayah:1'])).toEqual({ 'inayah:1': 'cut' });
  });

  it('leaves an existing keep untouched', () => {
    expect(nextDecisions({ 'inayah:1': 'keep' }, ['inayah:1'])).toEqual({ 'inayah:1': 'keep' });
  });

  it('does not mutate the map it was given', () => {
    const before = { 'inayah:1': 'cut' };
    nextDecisions(before, ['inayah:2']);
    expect(before).toEqual({ 'inayah:1': 'cut' });
  });
});

// ---------------------------------------------------------------------------
// Publish-side.
// ---------------------------------------------------------------------------
describe('isLifecycleLive', () => {
  it('accepts a normal row', () => {
    expect(isLifecycleLive({ ...product('inayah:1') })).toBe(true);
  });
  it('rejects a delisted row', () => {
    expect(isLifecycleLive({ ...product('inayah:1'), delistedAt: TODAY })).toBe(false);
  });
  it('rejects a filtered row', () => {
    expect(isLifecycleLive({ ...product('inayah:1'), filteredAt: TODAY })).toBe(false);
  });
  it('accepts a row whose delistedAt was cleared to null', () => {
    expect(isLifecycleLive({ ...product('inayah:1'), delistedAt: null })).toBe(true);
  });
});

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

// ---------------------------------------------------------------------------
// The guard that replaces the global ±40 ratchet. A total lets a dying brand
// hide behind other brands' gains.
// ---------------------------------------------------------------------------
describe('brandDropViolations', () => {
  it('flags a brand that loses more than 30% of its published products', () => {
    const v = brandDropViolations({ inayah: 100 }, { inayah: 60 });
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ brandSlug: 'inayah', prev: 100, next: 60 });
  });

  it('passes ordinary churn', () => {
    expect(brandDropViolations({ inayah: 100 }, { inayah: 95 })).toEqual([]);
  });

  it('always flags a brand falling to zero', () => {
    expect(brandDropViolations({ inayah: 12 }, { inayah: 0 })).toHaveLength(1);
  });

  it('flags a brand that disappears from the published set entirely', () => {
    expect(brandDropViolations({ inayah: 12 }, {})).toHaveLength(1);
  });

  // A tiny brand losing 1 of 3 is 33% but is not evidence of a broken feed.
  it('ignores a large percentage drop that is only a couple of products', () => {
    expect(brandDropViolations({ inayah: 3 }, { inayah: 2 })).toEqual([]);
  });

  it('flags a drop that is both >30% and >=5 products', () => {
    expect(brandDropViolations({ inayah: 15 }, { inayah: 9 })).toHaveLength(1);
  });

  it('ignores growth', () => {
    expect(brandDropViolations({ inayah: 100 }, { inayah: 400 })).toEqual([]);
  });

  it('ignores a brand that is new this run', () => {
    expect(brandDropViolations({}, { inayah: 40 })).toEqual([]);
  });

  it('checks every brand independently, so gains cannot mask a collapse', () => {
    const v = brandDropViolations({ inayah: 400, aab: 300 }, { inayah: 0, aab: 700 });
    expect(v.map((x) => x.brandSlug)).toEqual(['inayah']);
  });
});

describe('freezeCollapsedBrands', () => {
  const row = (brandSlug: string, id: string) => ({ brandSlug, id });

  it('is a no-op with no drops', () => {
    const next = [row('inayah', 'a'), row('aab', 'b')];
    expect(freezeCollapsedBrands([], next, [])).toBe(next);
  });

  it('replaces a collapsed brand\'s rows with its previous ones, leaving other brands untouched', () => {
    const prev = [row('abadia', 'old-1'), row('abadia', 'old-2'), row('aab', 'x')];
    const next = [row('abadia', 'new-1'), row('aab', 'x'), row('aab', 'y')];
    const drops = [{ brandSlug: 'abadia', prev: 15, next: 1, pct: 0.93 }];
    const out = freezeCollapsedBrands(prev, next, drops);
    expect(out.filter((p) => p.brandSlug === 'abadia')).toEqual([row('abadia', 'old-1'), row('abadia', 'old-2')]);
    expect(out.filter((p) => p.brandSlug === 'aab')).toEqual([row('aab', 'x'), row('aab', 'y')]);
  });

  it('freezes multiple brands independently', () => {
    const prev = [row('a', 'a-old'), row('b', 'b-old')];
    const next = [row('a', 'a-new'), row('b', 'b-new'), row('c', 'c-new')];
    const drops = [
      { brandSlug: 'a', prev: 10, next: 1, pct: 0.9 },
      { brandSlug: 'b', prev: 10, next: 0, pct: 1 },
    ];
    const out = freezeCollapsedBrands(prev, next, drops);
    expect(out).toEqual([row('c', 'c-new'), row('a', 'a-old'), row('b', 'b-old')]);
  });

  it('a brand entirely absent from prev (brand-new, never published before) freezes to nothing rather than crashing', () => {
    const next = [row('brandnew', 'x')];
    const drops = [{ brandSlug: 'brandnew', prev: 0, next: 0, pct: 0 }];
    expect(freezeCollapsedBrands([], next, drops)).toEqual([]);
  });
});

describe('brandPriceSignals', () => {
  const rates = { EUR: 0.857, DKK: 6.409, GBP: 0.733 };
  const rows = (brandSlug: string, currency: string, ...prices: number[]) =>
    prices.map((price) => ({ brandSlug, price, currency }));

  it('says nothing when prices are steady', () => {
    const r = rows('aab', 'USD', 10, 20, 30);
    expect(brandPriceSignals(r, r, rates)).toEqual([]);
  });

  // The live 2026-08-26 case: the number never moved, only its label was corrected
  // from DKK to USD. The median leaps 6.4x — an exchange rate, in plain sight.
  it('catches a currency relabel even though the price numbers are identical', () => {
    const before = rows('hidayah', 'DKK', 20, 55, 11);
    const after = rows('hidayah', 'USD', 20, 55, 11);
    const [sig] = brandPriceSignals(before, after, rates);
    expect(sig.brandSlug).toBe('hidayah');
    expect(sig.currency).toEqual({ prev: 'DKK', next: 'USD' });
    expect(sig.medianUsd.ratio).toBeCloseTo(6.41, 1);
  });

  it('reports a big move even when the currency did not change', () => {
    const [sig] = brandPriceSignals(rows('x', 'USD', 100), rows('x', 'USD', 40), rates);
    expect(sig.medianUsd).toEqual({ prev: 100, next: 40, ratio: 0.4 });
    expect(sig.currency).toBeUndefined();
  });

  it('ignores ordinary drift under the threshold', () => {
    expect(brandPriceSignals(rows('x', 'USD', 100), rows('x', 'USD', 105), rates)).toEqual([]);
  });

  it('skips a currency it has no rate for rather than counting it 1:1', () => {
    expect(brandPriceSignals(rows('x', 'XYZ', 100), rows('x', 'XYZ', 400), rates)).toEqual([]);
  });

  it('ranks the largest movement first', () => {
    const before = [...rows('small', 'USD', 100), ...rows('big', 'USD', 100)];
    const after = [...rows('small', 'USD', 130), ...rows('big', 'USD', 500)];
    expect(brandPriceSignals(before, after, rates).map((s) => s.brandSlug)).toEqual(['big', 'small']);
  });
});
