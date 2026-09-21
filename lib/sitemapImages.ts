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

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The body of /sitemap-images.xml: one <url> per page, each listing that page's photographs.
 * Kept apart from sitemap.xml on purpose (2026-09-21, Tina): the page list stays small and readable,
 * and the image list can be dropped or judged on its own. Entries with no images are skipped.
 */
export function imageSitemapXml(entries: { url: string; images: string[] }[]): string {
  const body = entries
    .filter((e) => e.images.length > 0)
    .map((e) => `<url><loc>${esc(e.url)}</loc>${e.images.map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`).join('')}</url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>\n`;
}
