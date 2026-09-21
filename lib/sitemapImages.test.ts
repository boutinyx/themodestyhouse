import { describe, it, expect } from 'vitest';
import { sitemapImages } from './sitemapImages';

describe('sitemapImages', () => {
  it('keeps catalogue order, drops duplicates and non-https, and caps at the limit', () => {
    const rows = [
      { image: 'https://cdn.shopify.com/a.jpg' },
      { image: 'https://cdn.shopify.com/a.jpg' },
      { image: 'http://cdn.example.com/insecure.jpg' },
      { image: '/local.jpg' },
      { image: 'https://cdn.shopify.com/b.jpg' },
      { image: 'https://cdn.shopify.com/c.jpg' },
    ];
    expect(sitemapImages(rows, 2)).toEqual(['https://cdn.shopify.com/a.jpg', 'https://cdn.shopify.com/b.jpg']);
  });
  it('defaults to 48', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ image: `https://cdn.shopify.com/${i}.jpg` }));
    expect(sitemapImages(rows)).toHaveLength(48);
  });
});
