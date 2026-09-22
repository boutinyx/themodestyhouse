import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { metaFeedXml, feedItem, feedLink, feedDescription, xmlEscape, FEED_UTM, PINTEREST_FEED_UTM } from './metaFeed';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'aab:10059358863674',
  brandSlug: 'aab',
  brandName: 'Aab',
  title: 'Pinstripe Maxi Shirt Navy',
  price: 43,
  currency: 'USD',
  image: 'https://cdn.shopify.com/s/files/1/0038/4584/9152/files/0O5A5706.jpg?v=1776816422',
  url: 'https://us.aabcollection.com/products/pinstripe-maxi-shirt-navy',
  inStock: true,
  garment: 'top',
  community: 'hijabi',
  occasion: [],
  season: [],
  activity: [],
  firstSeen: null,
} as Product;

describe('feedLink', () => {
  it('points at OUR product page, not the brand, and rebuilds the id per Invariant 1', () => {
    expect(new URL(feedLink(base)).pathname).toBe('/product/aab/10059358863674');
    expect(new URL(feedLink(base)).origin).toBe('https://themodestyhouse.com');
  });

  it('survives a brand slug containing a hyphen', () => {
    expect(new URL(feedLink({ id: 'nour-al-houda:7860816379952', brandSlug: 'nour-al-houda' })).pathname)
      .toBe('/product/nour-al-houda/7860816379952');
  });

  it('carries the campaign tag, so a product-tag tap is attributable in Pulse', () => {
    const q = new URL(feedLink(base)).searchParams;
    expect(q.get('utm_source')).toBe('instagram');
    expect(q.get('utm_medium')).toBe('product_tag');
    expect(q.get('utm_campaign')).toBe('meta_shop');
  });

  it('sets the medium, which is the whole point — Instagram is already a known referrer', () => {
    // Without utm_medium every Instagram surface collapses into one row.
    expect(FEED_UTM.utm_medium).toBeTruthy();
    expect(FEED_UTM.utm_medium).not.toBe(FEED_UTM.utm_source);
  });

  it('can be built untagged, so a future Google/Pinterest feed is not forced to say instagram', () => {
    expect(feedLink(base, null)).toBe('https://themodestyhouse.com/product/aab/10059358863674');
  });

  it('changes only the query string — the path a shopper lands on is unchanged', () => {
    expect(new URL(feedLink(base)).pathname).toBe(new URL(feedLink(base, null)).pathname);
  });

  it('the Pinterest tag is a real, distinct value — never falls back to the Meta one', () => {
    // A Pinterest-driven visit must never be counted as Instagram in Pulse.
    expect(PINTEREST_FEED_UTM.utm_source).toBe('pinterest');
    expect(PINTEREST_FEED_UTM.utm_source).not.toBe(FEED_UTM.utm_source);
    expect(PINTEREST_FEED_UTM.utm_medium).not.toBe(FEED_UTM.utm_medium);
    expect(PINTEREST_FEED_UTM.utm_campaign).not.toBe(FEED_UTM.utm_campaign);
  });

  it('feedItem and metaFeedXml thread a utm override through to feedLink', () => {
    const q = (xml: string) => new URL(xml.match(/<g:link>(.*?)<\/g:link>/)![1].replace(/&amp;/g, '&')).searchParams;
    expect(q(feedItem(base, PINTEREST_FEED_UTM)).get('utm_source')).toBe('pinterest');
    expect(q(metaFeedXml([base], PINTEREST_FEED_UTM)).get('utm_source')).toBe('pinterest');
    // The default (no override passed) is unchanged — the Meta route's own
    // call sites never learned about Pinterest and must keep working as is.
    expect(q(feedItem(base)).get('utm_source')).toBe('instagram');
    expect(q(metaFeedXml([base])).get('utm_source')).toBe('instagram');
  });
});

describe('xmlEscape', () => {
  it('escapes & first so entities are not double-escaped', () => {
    expect(xmlEscape('Salt & Pepper')).toBe('Salt &amp; Pepper');
    expect(xmlEscape('a & <b> "c"')).toBe('a &amp; &lt;b&gt; &quot;c&quot;');
  });

  it('strips characters XML 1.0 forbids — one would break the WHOLE feed', () => {
    expect(xmlEscape('Bad\u0000Title\u0007Here')).toBe('BadTitleHere');
  });

  it('keeps legal whitespace and non-ASCII', () => {
    expect(xmlEscape('Kapitone Puf Çanta\tVİZON\n')).toBe('Kapitone Puf Çanta\tVİZON\n');
  });
});

describe('feedItem', () => {
  const xml = feedItem(base);

  it('carries every field Meta lists as required', () => {
    for (const tag of ['g:id', 'g:title', 'g:description', 'g:availability',
      'g:condition', 'g:price', 'g:link', 'g:image_link', 'g:brand']) {
      expect(xml, `missing required field ${tag}`).toContain(`<${tag}>`);
    }
  });

  it('formats price as "43.00 USD" — number, period decimal, ISO code', () => {
    expect(xml).toContain('<g:price>43.00 USD</g:price>');
  });

  it('keeps a non-USD currency rather than converting (Invariant 15)', () => {
    expect(feedItem({ ...base, price: 2399.94, currency: 'TRY' }))
      .toContain('<g:price>2399.94 TRY</g:price>');
  });

  it('requests an image wide enough for Meta’s 500x500 minimum', () => {
    const m = xml.match(/<g:image_link>(.*?)<\/g:image_link>/)!;
    expect(new URL(m[1].replace(/&amp;/g, '&')).searchParams.get('width')).toBe('1200');
  });

  it('maps each garment to a category, and never guesses a leaf for an unknown one', () => {
    expect(feedItem({ ...base, garment: 'abaya' } as Product))
      .toContain('Traditional &amp; Ceremonial Clothing');
    expect(feedItem({ ...base, garment: 'hijab' } as Product))
      .toContain('Scarves &amp; Shawls');
    expect(feedItem({ ...base, garment: 'something-new' } as unknown as Product))
      .toContain('<g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>');
  });

  it('truncates a title past Meta’s 200-character limit', () => {
    const long = 'x'.repeat(260);
    const t = feedItem({ ...base, title: long }).match(/<g:title>(.*?)<\/g:title>/)![1];
    expect(t.length).toBeLessThanOrEqual(200);
  });

  it('escapes a title containing an ampersand', () => {
    expect(feedItem({ ...base, title: 'Salt & Pepper Abaya' }))
      .toContain('<g:title>Salt &amp; Pepper Abaya</g:title>');
  });
});

describe('feedDescription', () => {
  it('states only facts, and names the brand as the seller', () => {
    const d = feedDescription(base);
    expect(d).toContain('Pinstripe Maxi Shirt Navy');
    expect(d).toContain('Sold and shipped by Aab');
    expect(d.length).toBeLessThan(9999);
  });
});

describe('metaFeedXml over the real catalogue', () => {
  const products = JSON.parse(
    readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'),
  ) as Product[];

  it('every published product gets exactly one item', () => {
    const xml = metaFeedXml(products);
    expect(xml.match(/<item>/g) ?? []).toHaveLength(products.length);
  });

  it('produces structurally sound XML — an unparseable file is rejected whole', () => {
    // Structural checks, not a parser: there is no XML parser in this project's
    // dependencies and adding one for a test is not worth it. A genuine parse of
    // the FULL feed is run as a verification step instead, and is recorded in
    // the log — this guards the shape on every commit, that guards the bytes
    // before a deploy.
    const xml = metaFeedXml(products.slice(0, 800));
    const open = (xml.match(/<item>/g) ?? []).length;
    const close = (xml.match(/<\/item>/g) ?? []).length;
    expect(open).toBe(close);
    // No stray raw '&' survived escaping — every one must start an entity.
    const stray = xml.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)/g) ?? [];
    expect(stray, `unescaped ampersands: ${stray.length}`).toHaveLength(0);
  });

  it('every id is unique — Meta requires it and a clash silently drops a row', () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no product carries a zero or negative price', () => {
    expect(products.filter((p) => !(p.price > 0))).toEqual([]);
  });
});
