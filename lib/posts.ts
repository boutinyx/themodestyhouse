import { fetchAllPosts, fetchPostBySlug, ghostPostToPost } from './ghost';

export type Post = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  author: string;
  date: string; // ISO yyyy-mm-dd
  image?: string; // cover image, e.g. /editorial/outfit-crop.jpg
  imageAlt?: string;
  html: string; // sanitised at render time by components/GhostHtml.tsx
  plaintext: string; // for /llms-full.txt
  /**
   * The <title> and meta description, when they should differ from the headline
   * on the page. Optional — `seo()` falls back to `title`/`dek`, so a post that
   * says nothing about SEO behaves exactly as before.
   *
   * They exist because the two jobs genuinely conflict. `title` is the h1 and
   * the thing shared to social, where a human is reading a sentence; `seoTitle`
   * is a 40-character line competing in a SERP, where the query has to be in
   * it and app/layout.tsx's `%s | The Modesty House` template eats 20 more
   * characters. Measured on the abayas post: "Abayas Under $100 That Don't Look
   * Under $100" is a good headline and a bad <title>, because the SERP for
   * "abayas under $100" is entirely shop collection pages — Aab, Vela, Veiled,
   * Etsy, Amazon — and an article cannot win a transactional query. The SERP
   * for "affordable abayas that look expensive" is entirely articles.
   *
   * OpenGraph and Twitter deliberately keep using `title`: a shared link is
   * read by a person, not ranked. Article schema keeps `title` too, because its
   * headline is supposed to match the visible one.
   */
  seoTitle?: string;
  seoDescription?: string;
};

/**
 * All published posts, newest first. Backed by Ghost's Content API (lib/ghost.ts).
 *
 * Sorted on the full ISO `published_at` BEFORE mapping to `yyyy-mm-dd`, so two
 * posts published on one day keep their real order. Throws rather than returning
 * `[]` when Ghost is unreachable or short: an empty blog must never ship silently.
 */
export async function getPosts(): Promise<Post[]> {
  const rows = await fetchAllPosts();
  return rows
    .slice()
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .map(ghostPostToPost);
}

/**
 * What the <title> and meta description should be for a post — the SEO override
 * when it has one, the headline and dek when it does not. One function so the
 * fallback cannot be implemented differently in two places.
 */
export function seo(p: Post): { title: string; description: string } {
  return { title: p.seoTitle || p.title, description: p.seoDescription || p.dek };
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const raw = await fetchPostBySlug(slug);
  return raw ? ghostPostToPost(raw) : undefined;
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  // Accepts a bare `yyyy-mm-dd` or a full ISO timestamp; either way the calendar
  // date is the UTC one, matching how ghostPostToPost() cuts it.
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
