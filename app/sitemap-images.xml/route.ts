import { BRANDS } from '@/data/brands';
import { hasBrandPage } from '@/lib/brandPages';
import { productsForBrand } from '@/lib/products';
import { imageSitemapXml, sitemapImages } from '@/lib/sitemapImages';

/**
 * Image sitemap: the first 48 photographs of every designer page. See lib/sitemapImages.ts.
 * Gated on hasBrandPage, the same predicate app/sitemap.ts and the route use, so it cannot list a page that 404s.
 * Listed in app/robots.ts, and submitted in Search Console by hand (the API token here is read-only).
 */
export const revalidate = 3600;

export async function GET() {
  const entries = BRANDS.filter((b) => hasBrandPage(b.slug)).map((b) => ({
    url: `https://themodestyhouse.com/designers/${b.slug}`,
    images: sitemapImages(productsForBrand(b.slug)),
  }));
  return new Response(imageSitemapXml(entries), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
