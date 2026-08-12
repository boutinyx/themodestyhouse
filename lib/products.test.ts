import { describe, it, expect, vi, beforeEach } from 'vitest';

const FIXTURE: Record<string, unknown>[] = [
  { id: 'a:1', brandSlug: 'a', title: 'One' },
  { id: 'a:2', brandSlug: 'a', title: 'Two' },
  { id: 'b:1', brandSlug: 'b', title: 'Three' },
];

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => JSON.stringify(FIXTURE)),
}));

const getCutIds = vi.fn<() => Set<string>>(() => new Set());
vi.mock('@/lib/liveCuts', () => ({ getCutIds: () => getCutIds() }));

describe('getProducts', () => {
  beforeEach(() => {
    vi.resetModules();
    getCutIds.mockReturnValue(new Set());
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
});
