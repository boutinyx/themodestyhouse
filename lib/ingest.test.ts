import { describe, it, expect } from 'vitest';
import {
  paginateFeed, classifyFeed, wooToShopify,
  detectFeedCurrency, fetchBrand, CURRENCY_SAMPLE_SIZE,
} from './ingest';
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

describe('wooToShopify (WooCommerce Store API → ShopifyProduct)', () => {
  it('maps name, permalink url, minor-unit price, categories and images', () => {
    const sh = wooToShopify({
      id: 42,
      name: 'EMIRATI Satin Dress',
      slug: 'emirati-satin-dress',
      permalink: 'https://lafemmecollectie.nl/product/emirati-satin-dress',
      is_in_stock: true,
      prices: { price: '4999', currency_minor_unit: 2 },
      categories: [{ name: 'Dresses' }, { name: 'New in' }],
      images: [{ src: 'https://x/1.jpg' }, { src: 'https://x/2.jpg' }],
    });
    expect(sh.id).toBe(42);
    expect(sh.title).toBe('EMIRATI Satin Dress');
    expect(sh.url).toBe('https://lafemmecollectie.nl/product/emirati-satin-dress');
    expect(sh.variants[0]).toEqual({ price: '49.99', available: true });
    expect(sh.product_type).toBe('Dresses');
    expect(sh.tags).toEqual(['Dresses', 'New in']);
    expect(sh.images.map((i) => i.src)).toEqual(['https://x/1.jpg', 'https://x/2.jpg']);
  });
  it('defaults minor unit to 2 and drops empty images', () => {
    const sh = wooToShopify({ id: 1, name: 'X', prices: { price: '1050' }, images: [{ src: '' }] });
    expect(sh.variants[0].price).toBe('10.5');
    expect(sh.images).toEqual([]);
  });
});

// --- presentment currency ----------------------------------------------------
// The 2026-08-26 defect: /products.json never states its currency, Shopify
// Markets varies it per requester, and we stamped data/brands.ts's declared
// value onto it. 31 brands / 4,625 products carried a wrong price.
// → docs/log/2026-08-26-currency-mislabelling.md
describe('detectFeedCurrency', () => {
  const ld = (c: string) => `<script type="application/ld+json">{"offers":{"priceCurrency":"${c}"}}</script>`;
  const noPause = async () => {};

  it('reads the currency from the first product page that has one', async () => {
    const seen: string[] = [];
    const got = await detectFeedCurrency(brand, [sp(1), sp(2)], async (u) => { seen.push(u); return ld('USD'); }, noPause);
    expect(got).toBe('USD');
    expect(seen).toEqual(['https://inayah.co/products/d-1']);
  });

  // One blank page is not evidence the shop has no currency — a sold-out item or
  // a theme without structured data would end the ingest for the whole brand.
  it('tries further products when the first page yields nothing', async () => {
    const pages: Record<string, string | null> = {
      'https://inayah.co/products/d-1': '<html>no price</html>',
      'https://inayah.co/products/d-2': null,
      'https://inayah.co/products/d-3': ld('EUR'),
    };
    const got = await detectFeedCurrency(brand, [sp(1), sp(2), sp(3)], async (u) => pages[u], noPause);
    expect(got).toBe('EUR');
  });

  it('stops after CURRENCY_SAMPLE_SIZE pages rather than crawling the catalogue', async () => {
    let calls = 0;
    const got = await detectFeedCurrency(
      brand, [sp(1), sp(2), sp(3), sp(4), sp(5)], async () => { calls++; return '<html/>'; }, noPause,
    );
    expect(got).toBeNull();
    expect(calls).toBe(CURRENCY_SAMPLE_SIZE);
  });
});

describe('fetchBrand currency handling', () => {
  const ld = (c: string) => `{"priceCurrency":"${c}"}`;
  // Drives the real fetchBrand with both network edges injected.
  const fetchBrandWithPages = (products: ShopifyProduct[], b: Brand, fetchText: (u: string) => Promise<string | null>) => {
    const pages = [page(products), page([])];
    return fetchBrand(b, { fetchPage: async (n) => pages[n - 1], fetchText });
  };

  it('stamps the DETECTED currency on every row, not the one data/brands.ts declares', async () => {
    // Exactly the live case: a GBP-declared house whose feed served the US
    // runner USD. Before the fix these rows read "60.00 GBP" and displayed $82.
    const r = await fetchBrandWithPages([sp(1), sp(2)], brand, async () => ld('USD'));
    expect(r.feedCurrency).toBe('USD');
    expect(r.normalized.map((p) => p.currency)).toEqual(['USD', 'USD']);
  });

  it('throws instead of falling back when no currency can be found', async () => {
    await expect(fetchBrandWithPages([sp(1)], brand, async () => '<html/>')).rejects.toThrow(/inayah/);
  });

  it('takes a WooCommerce brand currency from the feed itself, with no page fetch', async () => {
    const sh = wooToShopify({
      id: 7, name: 'Satin Dress', slug: 's', permalink: 'https://x/p/s', is_in_stock: true,
      prices: { price: '5999', currency_minor_unit: 2, currency_code: 'EUR' },
      images: [{ src: 'https://x/1.jpg' }],
    });
    expect(sh.currency).toBe('EUR');
  });
});
