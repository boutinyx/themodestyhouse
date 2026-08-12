import { describe, it, expect, vi, beforeEach } from 'vitest';

const FIXTURE: Record<string, unknown>[] = [
  { id: 'a:1', brandSlug: 'a', title: 'One', garment: 'top' },
  { id: 'a:2', brandSlug: 'a', title: 'Two', garment: 'top' },
  { id: 'b:1', brandSlug: 'b', title: 'Three', garment: 'top' },
];

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => JSON.stringify(FIXTURE)),
}));

const getCutIds = vi.fn<() => Set<string>>(() => new Set());
vi.mock('@/lib/liveCuts', () => ({ getCutIds: () => getCutIds() }));

const getLiveGarmentOverrides = vi.fn<() => Record<string, { garment: string; decidedAt: string }>>(() => ({}));
vi.mock('@/lib/liveGarmentOverrides', () => ({ getLiveGarmentOverrides: () => getLiveGarmentOverrides() }));

describe('getProducts', () => {
  beforeEach(() => {
    vi.resetModules();
    getCutIds.mockReturnValue(new Set());
    getLiveGarmentOverrides.mockReturnValue({});
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
});
