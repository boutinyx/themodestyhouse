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

import { imageSitemapXml } from './sitemapImages';
describe('imageSitemapXml', () => {
  it('escapes ampersands, declares the image namespace and skips pages with no images', () => {
    const xml = imageSitemapXml([
      { url: 'https://x.test/a', images: ['https://cdn.test/i.jpg?v=1&width=2'] },
      { url: 'https://x.test/empty', images: [] },
    ]);
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain('v=1&amp;width=2');
    expect(xml).not.toContain('/empty');
  });
});
