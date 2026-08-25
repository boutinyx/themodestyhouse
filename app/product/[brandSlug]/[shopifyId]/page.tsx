import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { getProducts } from '@/lib/products';
import { formatPrice } from '@/lib/price';
import { shopifyImage, shopifySrcSet, DETAIL_WIDTHS } from '@/lib/shopifyImage';
import { SITE_URL } from '@/lib/schema';
import type { Product } from '@/lib/types';
import EditorsRail from '@/components/EditorsRail';
import { withUtm } from '@/lib/outbound';

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
  const url = `${SITE_URL}/product/${p.brandSlug}/${shopifyId}`;
  return {
    title,
    description,
    // The whole point of this page: reachable and shareable, but never
    // indexed by a SEARCH engine — see the file-level comment above for why.
    // Bot-scoped, not the generic `<meta name="robots">` (which `{ index:
    // false, follow: false }` at the top level would emit): found 2026-08-17
    // when Tina reported Pinterest wasn't picking up the preview when she
    // pasted a "Copy share link" URL. Social/link-preview crawlers
    // (Pinterestbot, facebookexternalhit, Twitterbot, etc.) have no reserved
    // directive name of their own, so the ONLY meta-robots tag they ever
    // read is the generic "robots" one — the same tag meant for search
    // engines. A blanket noindex there is exactly the kind of signal their
    // own docs describe as blocking a page from being crawled at all,
    // whether or not it was ever meant for them. `googleBot` + the `other`
    // bingbot tag below are bot-specific meta names (`googlebot`,
    // `bingbot`) that ONLY Google/Bing recognise as addressed to them —
    // every other crawler, Pinterest included, ignores a directive that
    // isn't under its own name and falls through to reading the OG/Twitter
    // tags normally. Preserves the original goal (keep this out of search
    // indexes, avoiding a repeat of the 2026-08-05 thin-content mistake)
    // without collaterally blocking the page's only intended use: being
    // shared.
    robots: {
      googleBot: { index: false, follow: false },
    },
    other: {
      bingbot: 'noindex, nofollow',
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'The Modesty House',
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

// "You might also love" — same garment as the product being viewed, one per
// brand (seeded with the current brand so its OWN other products don't fill
// the row) so it reads as a spread across the catalogue rather than one
// brand's back-catalogue. Cross-brand by construction, which also means it
// never needs isSpecialty()/browseProducts() gating (Invariant 5): a hijab
// page only ever draws from other hijabs, an abaya page from other abayas,
// so hijabs/specialty items never get mixed into an unrelated grid — they
// just recommend within their own community.
function relatedPicks(p: Product): Product[] {
  const seenBrand = new Set<string>([p.brandSlug]);
  return getProducts()
    .filter((item) => item.garment === p.garment && item.id !== p.id && item.inStock && item.image)
    .filter((item) => {
      if (seenBrand.has(item.brandSlug)) return false;
      seenBrand.add(item.brandSlug);
      return true;
    })
    .slice(0, 6);
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { brandSlug, shopifyId } = await params;
  const p = findProduct(brandSlug, shopifyId);
  if (!p) notFound();
  const related = relatedPicks(p);

  return (
    <main className="max-w-3xl mx-auto px-8 pt-12 md:pt-16 pb-16">
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
          /* 3/4 -> 2/3 and the radius dropped, 2026-08-25: one card shape
             across the site, matching ProductCard and the homepage rails. */
          className="w-full aspect-[2/3] object-cover"
          style={{ background: '#fff' }}
        />
        <div>
          <div className="brand-label">{p.brandName}</div>
          <h1 className="card-title card-title-xl mt-2">{p.title}</h1>
          <div className="price price-lg mt-3">{formatPrice(p.price, p.currency)}</div>
          <a
            href={withUtm(p.url, 'product-page')}
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
      {/* Fills the open space under "Shop at {brand}" — on desktop that's the
          right column below the button; on a phone, below the whole stacked
          block. Tina's own spec: a scrollable row, a couple of cards visible
          at a time, up to ~5-6 to scroll through. Cross-brand, same garment
          as the product above (relatedPicks) — never the homepage's own
          editorial selection, so this page still says something about THIS
          product. badgeLabel={null}: these are algorithmically similar, not
          hand-picked, so the Sparkle "Editor's pick" badge would overclaim. */}
      {related.length >= 2 && (
        <section className="mt-16 md:mt-20">
          <h2 className="card-title card-title-lg mb-6">You might also love</h2>
          <EditorsRail picks={related} surface="product-page-related" badgeLabel={null} />
        </section>
      )}
    </main>
  );
}
