import { describe, it, expect } from 'vitest';
import { normalizeProduct, normalizeProductDetailed } from './normalize';
import type { Brand } from '@/lib/types';

const brand: Brand = {
  slug: 'ivy-city', name: 'Ivy City Co', homepage: 'https://ivycityco.com', feedUrl: '',
  community: 'general', currency: 'USD', category: 'Modest dresses', city: 'Salt Lake City', vibe: 'elegant',
};

const sp = {
  id: 123, title: 'Aurelia Maxi Dress', handle: 'aurelia-maxi-dress', product_type: 'Dresses', tags: ['summer'],
  variants: [{ price: '135.00', available: true }],
  images: [{ src: 'https://cdn.shopify.com/x.jpg' }],
};

describe('normalizeProduct', () => {
  it('maps a shopify product to our Product', () => {
    const p = normalizeProduct(sp, brand)!;
    expect(p.id).toBe('ivy-city:123');
    expect(p.brandName).toBe('Ivy City Co');
    expect(p.price).toBe(135);
    expect(p.currency).toBe('USD');
    expect(p.image).toBe('https://cdn.shopify.com/x.jpg');
    expect(p.url).toBe('https://ivycityco.com/products/aurelia-maxi-dress');
    expect(p.inStock).toBe(true);
    expect(p.garment).toBe('dress');
    expect(p.community).toBe('general');
    expect(p.season).toContain('summer');
  });
  it('drops products with no image', () => {
    expect(normalizeProduct({ ...sp, images: [] }, brand)).toBeNull();
  });
  it('drops junk (garment other)', () => {
    expect(normalizeProduct({ ...sp, title: 'Gift Card', product_type: '', tags: [] }, brand)).toBeNull();
  });
});

// The refresh pipeline needs to know WHY a row was rejected, so that a product
// the brand still sells but our filters dropped is recorded as `filteredAt`
// (our fault, possibly a classifier regression) rather than as a delist
// (the merchant's doing). Merged, 300 rows from a broken regex would look
// exactly like ordinary churn.
describe('normalizeProductDetailed', () => {
  it('returns the product and no reason when it passes', () => {
    const r = normalizeProductDetailed(sp, brand);
    expect(r.product!.id).toBe('ivy-city:123');
    expect(r.reason).toBeUndefined();
  });

  it('reports no-image', () => {
    expect(normalizeProductDetailed({ ...sp, images: [] }, brand)).toEqual({ product: null, reason: 'no-image' });
  });

  it('reports excluded-title for a menswear match', () => {
    const r = normalizeProductDetailed({ ...sp, title: "Men's Thobe" }, brand);
    expect(r).toEqual({ product: null, reason: 'excluded-title' });
  });

  it('reports unclassified when the tagger cannot name the garment', () => {
    const r = normalizeProductDetailed({ ...sp, title: 'Gift Card', product_type: '', tags: [] }, brand);
    expect(r).toEqual({ product: null, reason: 'unclassified' });
  });

  it('normalizeProduct stays behaviourally identical to it', () => {
    expect(normalizeProduct(sp, brand)).toEqual(normalizeProductDetailed(sp, brand).product);
    expect(normalizeProduct({ ...sp, images: [] }, brand)).toBeNull();
  });
});

// Regression guard for §10.11 — the size-chart bug. The rule under test is
// "portrait must be the DOMINANT format", not "first portrait wins".
// Dimensions below are copied verbatim from live Shopify feeds.
describe('pickImage (via normalizeProduct)', () => {
  const img = (name: string, width: number, height: number) => ({ src: `https://cdn.shopify.com/${name}`, width, height });
  const withImages = (images: { src: string; width?: number; height?: number }[]) =>
    normalizeProduct({ ...sp, images }, brand)!.image;

  it('ignores a lone portrait among squares — that is the size chart, not a model shot', () => {
    // mariams:9114791706840 "3D-Style Rose Garden Embroidered Open Abaya (MOA275)".
    // Image 8 (521x1200) is the size chart Tina found published on the site.
    const image = withImages([
      img('moa275-1019022.png', 1200, 1200),
      img('moa275-a.png', 1000, 1000),
      img('moa275-b.png', 1000, 1000),
      img('moa275-c.png', 1000, 1000),
      img('moa275-d.png', 1000, 1000),
      img('moa275-e.png', 1000, 1000),
      img('moa275-f.png', 1000, 1000),
      img('moa275-g.png', 832, 832),
      img('moa275-7828719.png', 521, 1200), // ← the size chart
    ]);
    expect(image).toBe('https://cdn.shopify.com/moa275-1019022.png');
  });

  it('still prefers a model shot when portrait IS the dominant format', () => {
    const image = withImages([
      img('flatlay.jpg', 1000, 1000),
      img('model-1.jpg', 800, 1200),
      img('model-2.jpg', 800, 1200),
      img('model-3.jpg', 800, 1200),
    ]);
    expect(image).toBe('https://cdn.shopify.com/model-1.jpg');
  });

  it('falls back to the first image when dimensions are missing', () => {
    expect(withImages([{ src: 'https://cdn.shopify.com/a.jpg' }, { src: 'https://cdn.shopify.com/b.jpg' }]))
      .toBe('https://cdn.shopify.com/a.jpg');
  });

  it('does not treat a single portrait image as dominant', () => {
    const image = withImages([img('square.jpg', 1000, 1000), img('chart.jpg', 500, 1200)]);
    expect(image).toBe('https://cdn.shopify.com/square.jpg');
  });
});
