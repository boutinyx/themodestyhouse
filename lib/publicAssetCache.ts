/**
 * Cache policy for the files in public/ — the edit heroes, the homepage hero,
 * the editorial photographs, the Style-It cutouts. Read by next.config.ts.
 *
 * WHY THIS EXISTS. Next serves public/ with `Cache-Control: public, max-age=0`
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md),
 * because it cannot know the files will not change. Cloudflare honours the
 * origin's header, and for `max-age=0` it "caches and revalidates": the photo
 * is stored at the edge but stale on arrival, so EVERY request went back to
 * Railway before a byte was served. Measured on production 2026-09-10: every
 * edit hero `cf-cache-status: REVALIDATED`, never once `HIT`, ~175 ms added in
 * front of each photograph, and the lace hero blank for 609 ms on a 9 Mbps
 * phone. The `max-age=14400` a browser saw was Cloudflare's zone Browser Cache
 * TTL rewriting the header on the way OUT — Railway never sent it, which is why
 * the edge never benefited from it.
 *
 * max-age=14400 — 4h, the freshness browsers already had through that zone
 *   setting, so a browser holds a file no longer than it did before. CLAUDE.md
 *   §6 / §10.21 still apply unchanged: never replace a public/ file in place.
 * stale-while-revalidate=604800 — once the 4h pass, Cloudflare serves the copy
 *   it holds at once (`UPDATING`) and revalidates with Railway in the
 *   background, so no visitor waits on the origin for a file the edge has.
 *
 * NEVER add s-maxage, must-revalidate, proxy-revalidate or no-cache here. Each
 * one disables Cloudflare's asynchronous stale-while-revalidate
 * (developers.cloudflare.com/cache/concepts/revalidation) and puts every visitor
 * back behind the round trip. lib/publicAssetCache.test.ts fails if one appears.
 */
export const PUBLIC_ASSET_CACHE_CONTROL = 'public, max-age=14400, stale-while-revalidate=604800';

/**
 * Photographs, vectors and video, by extension, anywhere except /_next/.
 *
 * Deliberately NOT .xml / .txt / .json / .html / .ico: /sitemap.xml, /llms.txt
 * and /meta-catalogue.xml are routes whose freshness matters, and a rule written
 * for photographs must not let the edge hold them. /_next/static is excluded
 * because it is already `immutable` and Next overrides config headers there.
 */
export const PUBLIC_ASSET_SOURCE = '/((?!_next/).*)\\.(webp|png|jpe?g|svg|mp4)';
