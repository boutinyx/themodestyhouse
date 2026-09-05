import { describe, it, expect } from 'vitest';
import { getPosts, getPost, seo } from './posts';

const hasData = getPosts().length > 0;

describe('seo()', () => {
  it('falls back to the headline and dek when a post has no override', () => {
    const p = { slug: 'x', title: 'A Headline', dek: 'A dek.', category: '', author: '', date: '', body: '' };
    expect(seo(p)).toEqual({ title: 'A Headline', description: 'A dek.' });
  });

  it('uses the override when the post has one', () => {
    const p = {
      slug: 'x', title: 'A Headline', dek: 'A dek.', category: '', author: '', date: '', body: '',
      seoTitle: 'Search Shaped Title', seoDescription: 'Search shaped description.',
    };
    expect(seo(p)).toEqual({ title: 'Search Shaped Title', description: 'Search shaped description.' });
  });

  // Each field falls back on its own — setting a title must not blank the description.
  it('falls back per field, not all or nothing', () => {
    const p = { slug: 'x', title: 'A Headline', dek: 'A dek.', category: '', author: '', date: '', body: '', seoTitle: 'Just The Title' };
    expect(seo(p)).toEqual({ title: 'Just The Title', description: 'A dek.' });
  });
});

describe.skipIf(!hasData)('the published posts', () => {
  // app/layout.tsx renders `%s | The Modesty House` — 20 characters this file
  // does not control. Google shows roughly 60 before it truncates, and the part
  // that gets cut is the end, so an over-long <title> loses the brand name.
  const SUFFIX = ' | The Modesty House'.length;

  it('keeps every <title> inside what a SERP will display', () => {
    const long = getPosts()
      .map((p) => ({ slug: p.slug, len: seo(p).title.length + SUFFIX, title: seo(p).title }))
      .filter((x) => x.len > 60 && getPost(x.slug)?.seoTitle);
    expect(long, `these posts set an seoTitle that still truncates: ${JSON.stringify(long)}`).toEqual([]);
  });

  it('keeps every overridden meta description inside ~160 characters', () => {
    const long = getPosts()
      .filter((p) => p.seoDescription)
      .map((p) => ({ slug: p.slug, len: p.seoDescription!.length }))
      .filter((x) => x.len > 160);
    expect(long, `these descriptions will be cut off: ${JSON.stringify(long)}`).toEqual([]);
  });

  it('never lets an SEO override be identical to the headline it replaces', () => {
    const pointless = getPosts().filter((p) => p.seoTitle && p.seoTitle === p.title).map((p) => p.slug);
    expect(pointless).toEqual([]);
  });
});
