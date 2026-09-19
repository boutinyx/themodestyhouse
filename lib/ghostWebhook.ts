import { createHmac } from 'node:crypto';
import { safeEqual } from './adminAuth';

/**
 * Pure pieces of the Ghost webhook (app/api/ghost/revalidate/route.ts), split out so
 * they can be tested without a request.
 *
 * Ghost signs `X-Ghost-Signature: sha256=<hex>, t=<ms>` where
 * hex = HMAC-SHA256(secret, rawBody + t). The body must be the RAW text: re-serialising
 * parsed JSON changes bytes and the digest with it.
 */

const MAX_SKEW_MS = 5 * 60_000;

export function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  now: number,
): boolean {
  if (!secret || !header) return false; // fail closed: an unset secret never authenticates anything
  const m = header.match(/^sha256=([0-9a-f]{64}),\s*t=(\d+)$/i);
  if (!m) return false;
  const t = Number(m[2]);
  if (!Number.isFinite(t) || Math.abs(now - t) > MAX_SKEW_MS) return false;
  const expected = createHmac('sha256', secret).update(rawBody + m[2]).digest('hex');
  return safeEqual(m[1].toLowerCase(), expected);
}

type Side = { slug?: unknown } | null | undefined;

/**
 * Every slug the event touches. `previous` holds only the CHANGED keys, so on a rename
 * `previous.slug` is the old slug, and on a delete `current` is empty and `previous` is the
 * only source. Both must be revalidated or a renamed/deleted post lingers at its old URL.
 */
export function collectSlugs(payload: unknown): string[] {
  const post = (payload as { post?: { current?: Side; previous?: Side } } | null)?.post;
  const out = new Set<string>();
  for (const side of [post?.current, post?.previous]) {
    if (typeof side?.slug === 'string' && side.slug) out.add(side.slug);
  }
  return [...out];
}

/** Only a plain slug becomes a path: a stray `/` or `..` must not reach revalidatePath or a purge. */
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i;

export function pathsToRevalidate(slugs: string[]): string[] {
  return [
    '/',
    '/editorial',
    ...slugs.filter((s) => SAFE_SLUG.test(s)).map((s) => `/editorial/${s}`),
    '/sitemap.xml',
    '/llms.txt',
    '/llms-full.txt',
    '/index.md',
  ];
}
