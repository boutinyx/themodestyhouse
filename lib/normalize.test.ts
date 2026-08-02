import { describe, it, expect } from 'vitest';
import { normalizeProduct } from './normalize';
import type { Brand } from '@/lib/types';

const brand: Brand = { slug: 'ivy-city', name: 'Ivy City Co', homepage: 'https://ivycityco.com', feedUrl: '', community: 'general', currency: 'USD' };

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
