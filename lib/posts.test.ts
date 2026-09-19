import { beforeAll, describe, it, expect } from 'vitest';
import { formatDate, getPosts, seo, type Post } from './posts';

const base: Post = { slug: 'x', title: 'A Headline', dek: 'A dek.', category: '', author: '', date: '', html: '', plaintext: '' };

describe('seo()', () => {
  it('falls back to the headline and dek when a post has no override', () => {
    const p = base;
    expect(seo(p)).toEqual({ title: 'A Headline', description: 'A dek.' });
  });

  it('uses the override when the post has one', () => {
    const p = { ...base, seoTitle: 'Search Shaped Title', seoDescription: 'Search shaped description.' };
    expect(seo(p)).toEqual({ title: 'Search Shaped Title', description: 'Search shaped description.' });
  });

  // Each field falls back on its own — setting a title must not blank the description.
  it('falls back per field, not all or nothing', () => {
    const p = { ...base, seoTitle: 'Just The Title' };
    expect(seo(p)).toEqual({ title: 'Just The Title', description: 'A dek.' });
  });
});

describe('formatDate()', () => {
  it('reads a bare date and a full ISO timestamp as the same UTC day', () => {
    expect(formatDate('2026-09-07')).toBe('7 September 2026');
    expect(formatDate('2026-09-07T23:30:00.000Z')).toBe('7 September 2026');
  });
  it('is empty for an empty string', () => {
    expect(formatDate('')).toBe('');
  });
});

// These read the REAL blog from Ghost, so they run only on a machine that has the
// keys. They are an authoring aid, not a build gate: CI never reaches Ghost, and a
// writer changing a title must not turn the build red (CLAUDE.md §10.19).
describe.skipIf(!process.env.GHOST_CONTENT_KEY)('the published posts', () => {
  let posts: Post[] = [];
  beforeAll(async () => {
    posts = await getPosts();
  });

  // app/layout.tsx renders `%s | The Modesty House` — 20 characters this file
  // does not control. Google shows roughly 60 before it truncates, and the part
  // that gets cut is the end, so an over-long <title> loses the brand name.
  const SUFFIX = ' | The Modesty House'.length;

  it('keeps every <title> inside what a SERP will display', () => {
    const long = posts
      .filter((p) => p.seoTitle)
      .map((p) => ({ slug: p.slug, len: seo(p).title.length + SUFFIX, title: seo(p).title }))
      .filter((x) => x.len > 60);
    expect(long, `these posts set an seoTitle that still truncates: ${JSON.stringify(long)}`).toEqual([]);
  });

  it('keeps every overridden meta description inside ~160 characters', () => {
    const long = posts
      .filter((p) => p.seoDescription)
      .map((p) => ({ slug: p.slug, len: p.seoDescription!.length }))
      .filter((x) => x.len > 160);
    expect(long, `these descriptions will be cut off: ${JSON.stringify(long)}`).toEqual([]);
  });

  it('never lets an SEO override be identical to the headline it replaces', () => {
    const pointless = posts.filter((p) => p.seoTitle && p.seoTitle === p.title).map((p) => p.slug);
    expect(pointless).toEqual([]);
  });
});
