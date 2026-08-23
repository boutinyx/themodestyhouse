import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { BRANDS } from '@/data/brands';
import { productsForBrand } from '@/lib/products';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { FilterableGrid } from '@/components/FilterableGrid';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, brandPageSchema, jsonLdGraph } from '@/lib/schema';
import { formatPrice } from '@/lib/price';
import { withUtm } from '@/lib/outbound';

/**
 * /designers/[slug] — one page per house.
 *
 * ONLY generated for a house carrying `description` in data/brands.ts. That
 * single condition does two jobs:
 *   1. Thin content. 5 brands have under 10 published products and 21 have
 *      under 25 — thinner than a single grid. A page of pure derived data over
 *      3 products is the exact pattern /product/[...] was noindexed to avoid.
 *   2. Nothing about a real company ships without a human having written words
 *      about it (CLAUDE.md §10.18).
 * Adding a description is therefore how a brand page comes into existence, and
 * removing one is how it goes away — including from the sitemap, which reads
 * the same predicate.
 */

const described = () => BRANDS.filter((b) => b.description?.trim());

export function generateStaticParams() {
  return described().map((b) => ({ slug: b.slug }));
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = BRANDS.find((x) => x.slug === slug && x.description?.trim());
  if (!b) return { title: 'Not found', robots: { index: false, follow: false } };
  const title = `${b.name} — Modest Fashion Brand`;
  const description = b.description!.slice(0, 158);
  const canonical = `/designers/${b.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'website', url: canonical, images: [{ url: '/hero-poster.jpg' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/hero-poster.jpg'] },
  };
}

/** Plain-language label for what a house mostly makes, from its own catalogue. */
const GARMENT_LABEL: Record<string, string> = {
  abaya: 'abayas', hijab: 'hijabs', dress: 'dresses', top: 'tops',
  trousers: 'trousers', skirt: 'skirts', set: 'co-ord sets', swim: 'swimwear',
};

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = BRANDS.find((b) => b.slug === slug && b.description?.trim());
  if (!brand) notFound();

  const products = productsForBrand(brand.slug);
  if (products.length === 0) notFound();

  const catalogue = encodeCatalogue(products, BRANDS);
  const listed = catalogue.rows.title.slice(0, 24).map((_, i) => {
    const c = decodeCard(catalogue, i);
    return { title: c.title, url: c.url, image: c.image, brandName: c.brandName };
  });

  // Derived facts — every one of these is measured, never asserted.
  const counts = products.reduce<Record<string, number>>((a, p) => {
    a[p.garment] = (a[p.garment] ?? 0) + 1;
    return a;
  }, {});
  const makes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .filter(([g]) => GARMENT_LABEL[g]);
  const prices = products.map((p) => p.price).filter((n) => n > 0).sort((a, b) => a - b);
  // Kept in the house's OWN currency and never converted (ADR-0002) — a single
  // converted figure would claim a precision the site deliberately does not.
  const lo = prices[0];
  const hi = prices[prices.length - 1];

  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-12">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Designers', path: '/designers' },
            { name: brand.name, path: `/designers/${brand.slug}` },
          ]),
          brandPageSchema({
            name: brand.name,
            description: brand.description!,
            path: `/designers/${brand.slug}`,
            homepage: brand.homepage,
            items: listed,
          }),
        )}
      />

      <nav className="eyebrow" style={{ color: 'var(--muted)' }} aria-label="Breadcrumb">
        <Link href="/designers" style={{ color: 'inherit' }}>Designers</Link>
      </nav>
      <h1 className="section-heading text-3xl md:text-4xl mt-3">{brand.name}</h1>

      <p className="mt-4 max-w-2xl" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>
        {brand.description}
      </p>

      {/* Measured facts, not claims. */}
      <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm" style={{ color: 'var(--muted)' }}>
        <div>
          <dt className="eyebrow" style={{ color: 'var(--brass)' }}>Pieces</dt>
          <dd className="mt-1" style={{ color: 'var(--ink)' }}>{products.length.toLocaleString('en-GB')}</dd>
        </div>
        {prices.length > 0 && (
          <div>
            <dt className="eyebrow" style={{ color: 'var(--brass)' }}>Price range</dt>
            <dd className="mt-1" style={{ color: 'var(--ink)' }}>
              {formatPrice(lo, brand.currency)} – {formatPrice(hi, brand.currency)}
            </dd>
          </div>
        )}
        {makes.length > 0 && (
          <div>
            <dt className="eyebrow" style={{ color: 'var(--brass)' }}>Mostly</dt>
            <dd className="mt-1" style={{ color: 'var(--ink)' }}>
              {makes.map(([g]) => GARMENT_LABEL[g]).join(', ')}
            </dd>
          </div>
        )}
        {brand.city && (
          <div>
            <dt className="eyebrow" style={{ color: 'var(--brass)' }}>Based</dt>
            <dd className="mt-1" style={{ color: 'var(--ink)' }}>{brand.city}</dd>
          </div>
        )}
      </dl>

      {/* The only outbound link on the page, and the only one that needs
          rel="sponsored" (CLAUDE.md §6 — FTC, not decoration). The tiles in the
          grid below carry their own. */}
      <p className="mt-8">
        <a
          href={withUtm(brand.homepage, 'brand-page')}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-surface="brand-page"
          className="btn-pill inline-flex items-center gap-2"
        >
          Visit {brand.name}
          <ArrowUpRight size={14} weight="bold" />
        </a>
      </p>

      <div className="mt-14">
        <FilterableGrid catalogue={catalogue} />
      </div>
    </main>
  );
}
