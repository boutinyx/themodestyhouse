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

import { editSitemapImages, SITEMAP_IMAGES_PER_LANE } from './sitemapImages';
import { EDITS } from './edits';
describe('editSitemapImages', () => {
  const edit = {
    image: '/edit-hero.jpg',
    imageMobile: '/edit-hero-mobile.jpg',
    storyImages: [
      { src: '/edits/ours.jpg', credit: null },
      { src: '/edits/theirs.jpg', credit: 'someone' },
    ],
  };
  const picks = Array.from({ length: 40 }, (_, i) => ({ image: `https://cdn.shopify.com/${i}.jpg` }));
  it('leads with the hero crops and our own story images, absolute on the production origin', () => {
    expect(editSitemapImages(edit, picks).slice(0, 3)).toEqual([
      'https://themodestyhouse.com/edit-hero.jpg',
      'https://themodestyhouse.com/edit-hero-mobile.jpg',
      'https://themodestyhouse.com/edits/ours.jpg',
    ]);
  });
  it('never lists a credited third-party photograph', () => {
    expect(editSitemapImages(edit, picks).some((u) => u.includes('theirs'))).toBe(false);
  });
  it('caps the picks at the lane limit, in grid order', () => {
    expect(editSitemapImages(edit, picks).slice(3)).toEqual(picks.slice(0, SITEMAP_IMAGES_PER_LANE).map((p) => p.image));
  });
  it('works on every real edit: absolute https, no duplicates, under the 1,000-per-URL limit', () => {
    for (const e of EDITS) {
      const imgs = editSitemapImages(e, picks);
      expect(imgs.every((u) => u.startsWith('https://'))).toBe(true);
      expect(new Set(imgs).size).toBe(imgs.length);
      expect(imgs.length).toBeLessThanOrEqual(1000);
    }
  });
});
