import { describe, it, expect, vi, beforeEach } from 'vitest';

const FIXTURE: Record<string, unknown>[] = [
  { id: 'a:1', brandSlug: 'a', title: 'One', garment: 'top' },
  { id: 'a:2', brandSlug: 'a', title: 'Two', garment: 'top' },
  { id: 'b:1', brandSlug: 'b', title: 'Three', garment: 'top' },
];

// mtimes the cache in getProducts() keys on. Bumping one is how a test says
// "a file changed on disk"; the real production writer is /staff/curate.
const mtimes: Record<string, number> = {};
const readCount = { n: 0 };

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => { readCount.n++; return JSON.stringify(FIXTURE); }),
  statSync: vi.fn((p: string) => ({ mtimeMs: mtimes[String(p).split('/').pop() ?? ''] ?? 1 })),
}));

const getCutIds = vi.fn<() => Set<string>>(() => new Set());
vi.mock('@/lib/liveCuts', () => ({ getCutIds: () => getCutIds() }));

const getLiveGarmentOverrides = vi.fn<() => Record<string, { garment: string; decidedAt: string }>>(() => ({}));
vi.mock('@/lib/liveGarmentOverrides', () => ({ getLiveGarmentOverrides: () => getLiveGarmentOverrides() }));

const getLiveLaneOverrides = vi.fn<() => Record<string, { lane: string; subtype?: string; decidedAt: string }>>(() => ({}));
vi.mock('@/lib/liveLaneOverrides', () => ({ getLiveLaneOverrides: () => getLiveLaneOverrides() }));

describe('getProducts', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(mtimes)) delete mtimes[k];
    readCount.n = 0;
    getCutIds.mockReturnValue(new Set());
    getLiveGarmentOverrides.mockReturnValue({});
    getLiveLaneOverrides.mockReturnValue({});
  });

  it('returns every row when nothing is live-cut', async () => {
    const { getProducts } = await import('./products');
    expect(getProducts().map((p) => p.id)).toEqual(['a:1', 'a:2', 'b:1']);
  });

  it('excludes ids present in the live-cuts store', async () => {
    getCutIds.mockReturnValue(new Set(['a:2']));
    const { getProducts } = await import('./products');
    expect(getProducts().map((p) => p.id)).toEqual(['a:1', 'b:1']);
  });

  it('excluding everything leaves an empty array, not an error', async () => {
    getCutIds.mockReturnValue(new Set(['a:1', 'a:2', 'b:1']));
    const { getProducts } = await import('./products');
    expect(getProducts()).toEqual([]);
  });

  it('a live garment override changes p.garment on the returned product', async () => {
    getLiveGarmentOverrides.mockReturnValue({ 'a:1': { garment: 'skirt', decidedAt: '2026-01-01T00:00:00.000Z' } });
    const { getProducts } = await import('./products');
    const changed = getProducts().find((p) => p.id === 'a:1');
    expect(changed?.garment).toBe('skirt');
  });

  it('a product moved to hijab disappears from browseProducts()', async () => {
    getLiveGarmentOverrides.mockReturnValue({ 'a:1': { garment: 'hijab', decidedAt: '2026-01-01T00:00:00.000Z' } });
    const { browseProducts } = await import('./products');
    expect(browseProducts().find((p) => p.id === 'a:1')).toBeUndefined();
  });

  it("a product moved into a lane's garment now appears in productsForLane", async () => {
    getLiveGarmentOverrides.mockReturnValue({ 'a:1': { garment: 'dress', decidedAt: '2026-01-01T00:00:00.000Z' } });
    const { productsForLane } = await import('./products');
    expect(productsForLane('modest-dresses').find((p) => p.id === 'a:1')).toBeDefined();
  });

  it('a live lane override stamps forcedLane on the returned product', async () => {
    getLiveLaneOverrides.mockReturnValue({ 'a:1': { lane: 'modest-activewear', decidedAt: '2026-01-01T00:00:00.000Z' } });
    const { getProducts } = await import('./products');
    const changed = getProducts().find((p) => p.id === 'a:1');
    expect(changed?.forcedLane).toBe('modest-activewear');
  });

  it('a live lane override to layering-basics with a subtype now appears in productsForLane("layering-basics")', async () => {
    getLiveLaneOverrides.mockReturnValue({
      'a:1': { lane: 'layering-basics', subtype: 'under-dress', decidedAt: '2026-01-01T00:00:00.000Z' },
    });
    const { productsForLane } = await import('./products');
    const rows = productsForLane('layering-basics');
    const changed = rows.find((p) => p.id === 'a:1');
    expect(changed?.forcedLane).toBe('layering-basics');
    expect(changed?.forcedLayeringSubtype).toBe('under-dress');
  });

  it('a product forced to layering-basics disappears from browseProducts()', async () => {
    getLiveLaneOverrides.mockReturnValue({ 'a:1': { lane: 'layering-basics', decidedAt: '2026-01-01T00:00:00.000Z' } });
    const { browseProducts } = await import('./products');
    expect(browseProducts().find((p) => p.id === 'a:1')).toBeUndefined();
  });
});


// ---- parsed-catalogue cache (2026-08-26) ------------------------------------
// getProducts() re-read and re-parsed 11.2MB on EVERY call — measured 14ms read
// + 19ms parse on an M-series Mac, more on Railway's shared CPU — and the
// homepage calls it more than once per render. With the index/card split,
// /api/catalogue/cards calls it per request too.
// → docs/superpowers/plans/2026-08-26-split-catalogue-payload.md
describe('getProducts caching', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const k of Object.keys(mtimes)) delete mtimes[k];
    readCount.n = 0;
    getCutIds.mockReturnValue(new Set());
    getLiveGarmentOverrides.mockReturnValue({});
    getLiveLaneOverrides.mockReturnValue({});
  });

  it('parses products.json once when nothing on disk has changed', async () => {
    const { getProducts } = await import('./products');
    const a = getProducts();
    const b = getProducts();
    expect(readCount.n).toBe(1);
    expect(b).toBe(a); // identity, not equality — equality passes on a re-parse
  });

  it('re-reads when products.json itself changes', async () => {
    const { getProducts } = await import('./products');
    getProducts();
    mtimes['products.json'] = 2;
    getProducts();
    expect(readCount.n).toBe(2);
  });

  // THE risk of caching at all: /staff/curate writes .live-cuts.json inside the
  // running production container and Tina's cuts must still take effect
  // immediately (docs/log/2026-08-12-staff-curate.md). The key is a set of
  // mtimes, not a boolean, precisely so this keeps working.
  it('picks up a live cut written after the first read', async () => {
    const { getProducts } = await import('./products');
    expect(getProducts().map((p) => p.id)).toEqual(['a:1', 'a:2', 'b:1']);
    getCutIds.mockReturnValue(new Set(['a:2']));
    mtimes['.live-cuts.json'] = 2;
    expect(getProducts().map((p) => p.id)).toEqual(['a:1', 'b:1']);
  });

  it('picks up a live garment override written after the first read', async () => {
    const { getProducts } = await import('./products');
    expect(getProducts()[0].garment).toBe('top');
    getLiveGarmentOverrides.mockReturnValue({ 'a:1': { garment: 'dress', decidedAt: 'x' } });
    mtimes['.live-garment-overrides.json'] = 2;
    expect(getProducts()[0].garment).toBe('dress');
  });

  it('picks up a live lane override written after the first read', async () => {
    const { getProducts } = await import('./products');
    expect(getProducts()[0].forcedLane).toBeUndefined();
    getLiveLaneOverrides.mockReturnValue({ 'a:1': { lane: 'modest-tops', decidedAt: 'x' } });
    mtimes['.live-lane-overrides.json'] = 2;
    expect(getProducts()[0].forcedLane).toBe('modest-tops');
  });
});
