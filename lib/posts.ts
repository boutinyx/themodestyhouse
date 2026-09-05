import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export type Post = {
  slug: string;
  title: string;
  dek: string;
  category: string;
  author: string;
  date: string; // ISO yyyy-mm-dd
  image?: string; // cover image, e.g. /editorial/outfit-crop.jpg
  imageAlt?: string;
  body: string; // markdown
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

const DIR = path.join(process.cwd(), 'content', 'editorial');

function parse(file: string): Post {
  const raw = readFileSync(path.join(DIR, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const fm: Record<string, string> = {};
  let body = raw;
  if (m) {
    body = m[2].trim();
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) {
        const k = line.slice(0, i).trim();
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        fm[k] = v;
      }
    }
  }
  return {
    slug: fm.slug || file.replace(/\.md$/, ''),
    title: fm.title || '',
    dek: fm.dek || '',
    category: fm.category || 'Story',
    author: fm.author || 'The Modesty House',
    date: fm.date || '',
    image: fm.image || undefined,
    imageAlt: fm.imageAlt || undefined,
    body,
    seoTitle: fm.seoTitle || undefined,
    seoDescription: fm.seoDescription || undefined,
  };
}

export function getPosts(): Post[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map(parse)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * What the <title> and meta description should be for a post — the SEO override
 * when it has one, the headline and dek when it does not. One function so the
 * fallback cannot be implemented differently in two places.
 */
export function seo(p: Post): { title: string; description: string } {
  return { title: p.seoTitle || p.title, description: p.seoDescription || p.dek };
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
