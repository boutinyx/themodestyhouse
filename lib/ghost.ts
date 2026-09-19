import type { Post } from './posts';

/**
 * Ghost Content API client. Server-only.
 *
 * Two rules from the design that are easy to break:
 *  - Never `?fields=`: it silently drops `primary_tag` / `primary_author`.
 *  - Ghost 6 coerces any `limit` above 100 to 100 and has no `limit=all`, so
 *    we paginate and reconcile against `meta.pagination.total` — a truncated
 *    page must never read as a small blog (CLAUDE.md §10.52).
 */

export type GhostRaw = {
  slug: string;
  title: string;
  custom_excerpt: string | null;
  excerpt: string;
  published_at: string;
  feature_image: string | null;
  feature_image_alt: string | null;
  html: string;
  plaintext: string;
  meta_title: string | null;
  meta_description: string | null;
  primary_tag: { name: string } | null;
  primary_author: { name: string } | null;
};

const API_VERSION = 'v6.62';
const PAGE_SIZE = 100;
const REVALIDATE_SECONDS = 3600;
const INCLUDE = 'tags,authors';
const FORMATS = 'html,plaintext';

function config(): { url: string; key: string } {
  const url = process.env.GHOST_URL;
  const key = process.env.GHOST_CONTENT_KEY;
  if (!url) throw new Error('GHOST_URL is not set');
  if (!key) throw new Error('GHOST_CONTENT_KEY is not set');
  return { url, key };
}

async function ghostFetch(path: string, params: Record<string, string>, tags: string[]): Promise<Response> {
  const { url, key } = config();
  const qs = new URLSearchParams({ key, ...params });
  const res = await fetch(`${url}/ghost/api/content/${path}?${qs}`, {
    headers: { 'Accept-Version': API_VERSION },
    next: { tags, revalidate: REVALIDATE_SECONDS },
  });
  return res;
}

function fail(path: string, res: { status: number }): never {
  throw new Error(`Ghost Content API ${path} returned ${res.status}`);
}

export async function fetchAllPosts(): Promise<GhostRaw[]> {
  const rows: GhostRaw[] = [];
  let page: number | null = 1;
  let total = 0;
  while (page !== null) {
    const res = await ghostFetch(
      'posts/',
      { include: INCLUDE, formats: FORMATS, limit: String(PAGE_SIZE), page: String(page) },
      ['ghost-posts'],
    );
    if (!res.ok) fail('posts/', res);
    const body = (await res.json()) as {
      posts: GhostRaw[];
      meta: { pagination: { total: number; next: number | null } };
    };
    rows.push(...body.posts);
    total = body.meta.pagination.total;
    page = body.meta.pagination.next;
  }
  if (rows.length !== total) {
    throw new Error(`Ghost returned ${rows.length} posts but reports a total of ${total}`);
  }
  return rows;
}

export async function fetchPostBySlug(slug: string): Promise<GhostRaw | undefined> {
  const path = `posts/slug/${encodeURIComponent(slug)}/`;
  const res = await ghostFetch(path, { include: INCLUDE, formats: FORMATS }, [
    'ghost-posts',
    `ghost-post:${slug}`,
  ]);
  if (res.status === 404) return undefined;
  if (!res.ok) fail(path, res);
  const body = (await res.json()) as { posts: GhostRaw[] };
  return body.posts[0];
}

/** Pure mapper, exported for tests. `date` is UTC; ordering is done on the full ISO before mapping. */
export function ghostPostToPost(raw: GhostRaw): Post {
  return {
    slug: raw.slug,
    title: raw.title,
    dek: raw.custom_excerpt || raw.excerpt,
    category: raw.primary_tag?.name || 'Story',
    author: raw.primary_author?.name || 'The Modesty House',
    date: raw.published_at.slice(0, 10),
    image: raw.feature_image || undefined,
    imageAlt: raw.feature_image_alt || undefined,
    html: raw.html,
    plaintext: raw.plaintext,
    seoTitle: raw.meta_title || undefined,
    seoDescription: raw.meta_description || undefined,
  };
}
