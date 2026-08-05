import { describe, it, expect } from 'vitest';
import { paginateFeed, classifyFeed } from './ingest';
import { isCompleteFetch } from './lifecycle';
import type { Brand } from '@/lib/types';
import type { ShopifyProduct } from './normalize';

const brand: Brand = {
  slug: 'inayah', name: 'Inayah', homepage: 'https://inayah.co', feedUrl: 'https://inayah.co/products.json',
  community: 'general', currency: 'GBP', category: 'Modest dresses', city: 'London', vibe: 'elegant',
};

const sp = (id: number, over: Partial<ShopifyProduct> = {}): ShopifyProduct => ({
  id, title: `Aurelia Maxi Dress ${id}`, handle: `d-${id}`, product_type: 'Dresses', tags: [],
  variants: [{ price: '60.00', available: true }],
  images: [{ src: 'https://cdn.shopify.com/a.jpg' }],
  ...over,
});

const page = (products: ShopifyProduct[]) => ({ status: 200, products });

describe('paginateFeed', () => {
  it('walks pages to a natural end and reports a complete fetch', async () => {
    const pages = [page([sp(1), sp(2)]), page([sp(3)]), page([])];
    const { products, outcome } = await paginateFeed(async (p) => pages[p - 1]);
    expect(products.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(isCompleteFetch(outcome)).toBe(true);
  });

  // The live bug: exhausting the page cap used to still report complete:true,
  // which under this design would license delisting everything we never saw.
  it('reports INCOMPLETE when it exhausts the page cap', async () => {
    const { products, outcome } = await paginateFeed(async () => page([sp(1)]), 3);
    expect(products).toHaveLength(3);
    expect(outcome.hitPageCap).toBe(true);
    expect(isCompleteFetch(outcome)).toBe(false);
  });

  it('reports INCOMPLETE when a page gives up after 429 retries, keeping what it got', async () => {
    const pages = [page([sp(1)]), { status: 429, products: null, gaveUp: true }];
    const { products, outcome } = await paginateFeed(async (p) => pages[p - 1]);
    expect(products.map((x) => x.id)).toEqual([1]);
    expect(outcome.gaveUpOn429).toBe(true);
    expect(isCompleteFetch(outcome)).toBe(false);
  });

  it('reports INCOMPLETE when a page returns a non-OK status', async () => {
    const pages = [page([sp(1)]), { status: 404, products: null }];
    const { outcome } = await paginateFeed(async (p) => pages[p - 1]);
    expect(outcome.sawErrorStatus).toBe(true);
    expect(isCompleteFetch(outcome)).toBe(false);
  });

  it('treats a dead feed as incomplete, never as an empty catalogue', async () => {
    const { products, outcome } = await paginateFeed(async () => ({ status: 500, products: null }));
    expect(products).toEqual([]);
    expect(isCompleteFetch(outcome)).toBe(false);
  });
});

describe('classifyFeed', () => {
  it('splits a feed into rows we can publish and rows our filters reject', () => {
    const r = classifyFeed([sp(1), sp(2, { images: [] }), sp(3, { title: "Men's Thobe" })], brand, true);
    expect(r.brandSlug).toBe('inayah');
    expect(r.normalized.map((p) => p.id)).toEqual(['inayah:1']);
    expect(r.rejected).toEqual([
      { id: 'inayah:2', reason: 'no-image' },
      { id: 'inayah:3', reason: 'excluded-title' },
    ]);
    expect(r.complete).toBe(true);
  });

  it('carries the completeness flag through untouched', () => {
    expect(classifyFeed([sp(1)], brand, false).complete).toBe(false);
  });
});
