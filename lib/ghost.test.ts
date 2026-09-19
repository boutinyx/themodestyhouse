import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllPosts, fetchPostBySlug, ghostPostToPost, type GhostRaw } from './ghost';

// Reduced from a Content API v6.62 post object: only the keys the mapper reads.
// Not recorded from a live Ghost (none existed when this was written); the
// staging check in the plan covers the real shape.
const raw = (over: Partial<GhostRaw> = {}): GhostRaw => ({
  slug: 'quiet-luxury',
  title: 'Quiet luxury',
  custom_excerpt: 'A short dek.',
  excerpt: 'First five hundred characters of the body.',
  published_at: '2026-09-07T23:30:00.000Z',
  feature_image: 'https://cms.themodestyhouse.com/content/images/2026/09/a.jpg',
  feature_image_alt: 'A coat',
  html: '<p>Hello</p>',
  plaintext: 'Hello',
  meta_title: 'SEO title',
  meta_description: 'SEO description',
  primary_tag: { name: 'Guides' },
  primary_author: { name: 'Amina' },
  ...over,
});

describe('ghostPostToPost', () => {
  it('maps every field', () => {
    expect(ghostPostToPost(raw())).toEqual({
      slug: 'quiet-luxury',
      title: 'Quiet luxury',
      dek: 'A short dek.',
      category: 'Guides',
      author: 'Amina',
      date: '2026-09-07',
      image: 'https://cms.themodestyhouse.com/content/images/2026/09/a.jpg',
      imageAlt: 'A coat',
      html: '<p>Hello</p>',
      plaintext: 'Hello',
      seoTitle: 'SEO title',
      seoDescription: 'SEO description',
    });
  });

  it('falls back to the excerpt when there is no custom_excerpt', () => {
    expect(ghostPostToPost(raw({ custom_excerpt: null })).dek).toBe(
      'First five hundred characters of the body.',
    );
  });

  it("defaults the category to 'Story' and the author to the house", () => {
    const p = ghostPostToPost(raw({ primary_tag: null, primary_author: null }));
    expect(p.category).toBe('Story');
    expect(p.author).toBe('The Modesty House');
  });

  it('turns empty SEO fields and missing images into undefined', () => {
    const p = ghostPostToPost(
      raw({ meta_title: '', meta_description: null, feature_image: null, feature_image_alt: null }),
    );
    expect(p.seoTitle).toBeUndefined();
    expect(p.seoDescription).toBeUndefined();
    expect(p.image).toBeUndefined();
    expect(p.imageAlt).toBeUndefined();
  });
});

describe('Content API client', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.GHOST_URL = 'https://cms.example.test';
    process.env.GHOST_CONTENT_KEY = 'k';
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  const page = (n: number, count: number, total: number, next: number | null) => ({
    ok: true,
    status: 200,
    json: async () => ({
      posts: Array.from({ length: count }, (_, i) => raw({ slug: `p${n}-${i}` })),
      meta: { pagination: { page: n, pages: 3, total, next } },
    }),
  });

  it('paginates to the end and reconciles the total', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(page(1, 100, 250, 2))
      .mockResolvedValueOnce(page(2, 100, 250, 3))
      .mockResolvedValueOnce(page(3, 50, 250, null));
    vi.stubGlobal('fetch', f);
    expect(await fetchAllPosts()).toHaveLength(250);
    expect(f.mock.calls[0][0]).toContain('limit=100');
    expect(f.mock.calls[0][0]).toContain('include=tags%2Cauthors');
    expect(f.mock.calls[0][1].headers['Accept-Version']).toBe('v6.62');
  });

  it('throws when a page comes back short (negative control)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(page(1, 100, 250, 2))
        .mockResolvedValueOnce(page(2, 40, 250, 3))
        .mockResolvedValueOnce(page(3, 50, 250, null)),
    );
    await expect(fetchAllPosts()).rejects.toThrow(/250/);
  });

  it('returns undefined on 404 and throws on anything else', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }));
    expect(await fetchPostBySlug('nope')).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
    await expect(fetchPostBySlug('x')).rejects.toThrow(/500/);
  });

  it('throws a clear error when the env is missing', async () => {
    delete process.env.GHOST_CONTENT_KEY;
    await expect(fetchAllPosts()).rejects.toThrow(/GHOST_CONTENT_KEY/);
  });
});
