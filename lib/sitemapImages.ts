/**
 * Image entries for a page's <url> in sitemap.xml.
 *
 * Google Images finds photographs from the page's HTML, and a designer page renders 24 cards
 * there; the 25th-48th arrive on "Load more" from the embedded payload. Listing the first 48
 * (the same `embedCards: 48` app/designers/[slug]/page.tsx embeds) tells Google about the
 * second half without changing the page. Full-size URL, not the `&width=400` render variant:
 * Google prefers the larger file for image results.
 *
 * Only https URLs, de-duplicated, in catalogue order. A colour variant group shares one image.
 */
export const SITEMAP_IMAGES_PER_PAGE = 48;

export function sitemapImages(products: { image: string }[], limit = SITEMAP_IMAGES_PER_PAGE): string[] {
  const seen = new Set<string>();
  for (const p of products) {
    if (seen.size >= limit) break;
    if (typeof p.image === 'string' && p.image.startsWith('https://')) seen.add(p.image);
  }
  return [...seen];
}
