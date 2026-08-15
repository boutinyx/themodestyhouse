import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { getProducts } from '@/lib/products';
import { formatPrice } from '@/lib/price';
import { shopifyImage, shopifySrcSet, DETAIL_WIDTHS } from '@/lib/shopifyImage';
import type { Product } from '@/lib/types';

/**
 * A page of OURS for a single product, so there is something on
 * themodestyhouse.com to share — every other path to a product (the
 * product-card anchor, quick-view's "Shop at {brand}") leaves the site
 * immediately. See components/QuickView.tsx's "Copy share link" button,
 * desktop-only, which is what links here.
 *
 * Deliberately NOT the 2026-08-05 product-pages attempt
 * (docs/log/2026-08-05-product-pages-and-descriptions.md), which was
 * reverted after mass-submitting ~7,700 pages of verbatim brand-copy
 * descriptions to Google Search Console risked burying real problems in
 * thin-content noise. This page carries no scraped description, is marked
 * noindex below, and is never added to app/sitemap.ts — a real working
 * link, invisible to search engines, so it can't repeat that mistake.
 *
 * No generateStaticParams: rendered on demand per request, same reasoning
 * the reverted attempt used (its own log, decision D2) to keep `npm run
 * build`'s route count from exploding to one per product.
 */

// Product id is `${brandSlug}:${shopifyId}` (Invariant 1) — reconstructed
// from the two route segments rather than adding a lookup field to Product,
// which would cost size × every row × every grid render (Invariant 15).
function findProduct(brandSlug: string, shopifyId: string): Product | undefined {
  const id = `${brandSlug}:${shopifyId}`;
  return getProducts().find((p) => p.id === id);
}

type Params = { brandSlug: string; shopifyId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { brandSlug, shopifyId } = await params;
  const p = findProduct(brandSlug, shopifyId);
  if (!p) return { title: 'Not found', robots: { index: false, follow: false } };
  const title = `${p.title} by ${p.brandName}`;
  const description = `${p.title} from ${p.brandName} — curated on The Modesty House.`;
  const image = shopifyImage(p.image, 900);
  return {
    title,
    description,
    // The whole point of this page: reachable and shareable, but never
    // indexed or crawled — see the file-level comment above for why.
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { brandSlug, shopifyId } = await params;
  const p = findProduct(brandSlug, shopifyId);
  if (!p) notFound();

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <Link href="/directory" className="nav-link inline-flex items-center gap-1 mb-8" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={16} />
        Back to the directory
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shopifyImage(p.image, 600)}
          srcSet={shopifySrcSet(p.image, DETAIL_WIDTHS)}
          sizes="(max-width: 768px) 100vw, 50vw"
          alt={p.title}
          className="w-full aspect-[3/4] object-cover"
          style={{ borderRadius: 6 }}
        />
        <div>
          <div className="brand-label">{p.brandName}</div>
          <h1 className="card-title card-title-xl mt-2">{p.title}</h1>
          <div className="price price-lg mt-3">{formatPrice(p.price, p.currency)}</div>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-brand={p.brandSlug}
            data-garment={p.garment}
            data-surface="product-page"
            className="btn-pill text-center inline-flex items-center justify-center gap-2 mt-8"
          >
            Shop at {p.brandName}
            <ArrowUpRight size={15} weight="bold" />
          </a>
        </div>
      </div>
    </main>
  );
}
