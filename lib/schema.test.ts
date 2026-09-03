import { describe, it, expect } from 'vitest';
import { organizationSchema, websiteSchema, breadcrumbSchema, collectionPageSchema, articleSchema, faqPageSchema, jsonLdGraph } from './schema';

describe('organizationSchema', () => {

  it('sameAs names a PROFILE, never a bare platform homepage', () => {
    // The whole point of the field. A note in lib/schema.ts kept `sameAs` empty
    // for weeks precisely because components/Footer.tsx linked to
    // https://instagram.com — the platform's front door — and pointing sameAs
    // there claims an identity that does not exist. This fails if anyone ever
    // fills it that way again.
    const org = organizationSchema() as { sameAs?: string[] };
    expect(org.sameAs, 'sameAs must exist once a real account is known').toBeTruthy();
    for (const url of org.sameAs!) {
      const u = new URL(url);
      expect(u.pathname.replace(/\/+$/, ''), `${url} is a bare platform homepage, not a profile`).not.toBe('');
      expect(u.protocol).toBe('https:');
    }
  });
  it('carries the site identity', () => {
    const org = organizationSchema();
    expect(org['@type']).toBe('Organization');
    expect(org.url).toBe('https://themodestyhouse.com');
  });
});

describe('websiteSchema', () => {
  // /directory was replaced by /new-in on 2026-09-01. The SearchAction must
  // track the header magnifier's own destination (components/HeaderSearch.tsx)
  // — a urlTemplate pointing at a redirect is a working search box that tells
  // Google the wrong address for it.
  it('points its SearchAction at /new-in?q=', () => {
    const site = websiteSchema();
    expect(site.potentialAction.target.urlTemplate).toBe('https://themodestyhouse.com/new-in?q={search_term_string}');
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
  }));

  it('caps the ItemList at the default limit rather than shipping the whole lane', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items });
    expect(page.mainEntity.itemListElement).toHaveLength(24);
  });

  it('never puts a price or availability on a listed item', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items });
    for (const el of page.mainEntity.itemListElement) {
      expect(el).not.toHaveProperty('offers');
      expect(el).not.toHaveProperty('price');
    }
  });

  it('uses the outbound brand URL, since no INDEXABLE internal product page exists', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items: items.slice(0, 1) });
    expect(page.mainEntity.itemListElement[0].url).toBe('https://brand.example/products/item-0');
  });

  // Regression: Tina ran a live GSC inspection of /modest-skirts on 2026-08-19
  // and got "24 ongeldige items gedetecteerd — 'offers', 'review' of
  // 'aggregateRating' moet zijn gespecificeerd". Every card was emitted as a
  // schema.org Product with no offers, which is invalid by Google's Product
  // spec. We cannot fix it by ADDING offers (the docs require a summary
  // page's ListItem urls to be same-domain, and ours point at the brand's
  // own storefront), so the fix is to stop claiming Product at all.
  it('never types a listed item as a Product', () => {
    const page = collectionPageSchema({ name: 'Abayas', description: 'desc', path: '/modest-abayas', items });
    for (const el of page.mainEntity.itemListElement) {
      expect(el['@type']).toBe('ListItem');
      expect(JSON.stringify(el)).not.toContain('Product');
    }
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

describe('faqPageSchema', () => {
  it('maps question/answer pairs into schema.org Question/Answer nodes', () => {
    const faq = faqPageSchema([{ question: 'Is this a shop?', answer: 'No.' }]);
    expect(faq.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'Is this a shop?',
      acceptedAnswer: { '@type': 'Answer', text: 'No.' },
    });
  });
});

describe('jsonLdGraph', () => {
  it('wraps nodes in a single @context envelope', () => {
    const g = jsonLdGraph(organizationSchema(), websiteSchema());
    expect(g['@context']).toBe('https://schema.org');
    expect(g['@graph']).toHaveLength(2);
  });
});
