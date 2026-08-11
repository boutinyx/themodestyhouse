import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema, breadcrumbSchema, collectionPageSchema, articleSchema, jsonLdGraph } from './schema';

describe('organizationSchema', () => {
  it('carries the site identity', () => {
    const org = organizationSchema();
    expect(org['@type']).toBe('Organization');
    expect(org.url).toBe('https://themodestyhouse.com');
  });
});

describe('websiteSchema', () => {
  it('points its SearchAction at /directory?q=', () => {
    const site = websiteSchema();
    expect(site.potentialAction.target.urlTemplate).toBe('https://themodestyhouse.com/directory?q={search_term_string}');
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 and builds absolute URLs', () => {
    const b = breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Abayas', path: '/modest-abayas' }]);
    expect(b.itemListElement[0]).toMatchObject({ position: 1, name: 'Home', item: 'https://themodestyhouse.com/' });
    expect(b.itemListElement[1]).toMatchObject({ position: 2, name: 'Abayas', item: 'https://themodestyhouse.com/modest-abayas' });
  });
});

describe('collectionPageSchema', () => {
  const items = Array.from({ length: 30 }, (_, i) => ({
    title: `Item ${i}`,
    url: `https://brand.example/products/item-${i}`,
    image: `https://brand.example/item-${i}.jpg`,
    brandName: 'Brand',
  }));

  it('caps the ItemList at the default limit rather than shipping the whole lane', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items });
    expect(page.mainEntity.itemListElement).toHaveLength(24);
  });

  it('never puts a price or availability on a listed item', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items });
    for (const el of page.mainEntity.itemListElement) {
      expect(el.item).not.toHaveProperty('offers');
      expect(el.item).not.toHaveProperty('price');
    }
  });

  it('uses the outbound brand URL, since no internal product page exists', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items: items.slice(0, 1) });
    expect(page.mainEntity.itemListElement[0].item.url).toBe('https://brand.example/products/item-0');
  });
});

describe('articleSchema', () => {
  it('resolves a site-relative image to an absolute URL', () => {
    const a = articleSchema({
      title: 'T', description: 'D', path: '/editorial/t', datePublished: '2026-08-04', authorName: 'A', image: '/editorial/x.jpg',
    });
    expect(a.image).toBe('https://themodestyhouse.com/editorial/x.jpg');
  });

  it('leaves an already-absolute image alone', () => {
    const a = articleSchema({
      title: 'T', description: 'D', path: '/editorial/t', datePublished: '2026-08-04', authorName: 'A', image: 'https://cdn.example/x.jpg',
    });
    expect(a.image).toBe('https://cdn.example/x.jpg');
  });

  it('omits image entirely when the post has none', () => {
    const a = articleSchema({ title: 'T', description: 'D', path: '/editorial/t', datePublished: '2026-08-04', authorName: 'A' });
    expect(a).not.toHaveProperty('image');
  });
});

describe('jsonLdGraph', () => {
  it('wraps nodes in a single @context envelope', () => {
    const g = jsonLdGraph(organizationSchema(), websiteSchema());
    expect(g['@context']).toBe('https://schema.org');
    expect(g['@graph']).toHaveLength(2);
  });
});
