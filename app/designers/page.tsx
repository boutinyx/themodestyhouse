import type { Metadata } from 'next';
import Link from 'next/link';
import { CaretLeft, CaretRight, Sparkle } from '@phosphor-icons/react/dist/ssr';
import { houses, type House } from '@/lib/houses';
import { BRANDS } from '@/data/brands';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { pageMetadata } from '@/lib/seoCopy';
import { designerPageCount, clampDesignerPage } from '@/lib/designerPaging';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, brandListSchema, jsonLdGraph } from '@/lib/schema';
import { withUtm } from '@/lib/outbound';
import { hasBrandPage } from '@/lib/brandPages';
import { regionFromSlug, regionOf, regionSlug } from '@/lib/brandRegions';

// Each page of the index self-canonicalises to its own URL (page 1 -> the
// bare path), rather than all pages pointing at page 1 — Google's current
// guidance treats rel=prev/next as retired signal and expects paginated
// series to be independently indexable. Page >1 also gets an explicit
// canonical for the first time; previously it inherited none at all.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string; region?: string }> }): Promise<Metadata> {
  // Clamped against the REAL page count, not just the lower bound. Previously
  // ?page=99 (or 1e9) returned 200 with page 4's content and a self-canonical
  // echoing 99, so anything linking an out-of-range page could mint an endless
  // family of self-canonicalising duplicates. houses() is deliberately NOT
  // called here — it routes through getProducts() and re-parses 10.9 MB
  // uncached (CLAUDE.md §8) — and it maps 1:1 over BRANDS, so BRANDS.length is
  // the same count the body derives.
  const sp = await searchParams;
  const region = regionFromSlug(sp.region);
  // A ?region= view CANONICALISES TO THE BARE INDEX. It is a filter over a list
  // the unfiltered page already contains in full, so left self-canonicalising it
  // would mint five near-duplicates of /designers — the same duplicate-minting
  // this function was already hardened against for ?page=. Making these
  // independently indexable ("modest fashion brands in Europe") is arguably
  // worth doing, but that is an SEO/editorial call for Tina, not a side effect
  // of adding a filter. → docs/log/2026-08-25-designers-region-filter.md
  if (region) return pageMetadata('/designers', '/designers');
  const total = BRANDS.length;
  const page = clampDesignerPage(sp.page, designerPageCount(total, PER_PAGE));
  return pageMetadata('/designers', page === 1 ? '/designers' : `/designers?page=${page}`);
}

// Phosphor Sparkle rather than the ✦ character these labels used to carry
// (CLAUDE.md §6) — the same badge mark as the homepage rail and the spotlight.
const BADGE: Record<string, string> = {
  verified: 'Verified',
  'editors-pick': "Editor's Pick",
};

/** Reading order for the vetted row, as Tina gave them. MEMBERSHIP is not set
 *  here — that is the `badge` in data/brands.ts, the one source of truth, which
 *  the homepage rail reads too. This only decides who stands where; a house
 *  badged later and not listed here simply falls in after them. */
const VERIFIED_ORDER = ['veiled', 'aab', 'summer-evenings', 'inayah', 'glow-modesty'];
const rank = (slug: string) => {
  const i = VERIFIED_ORDER.indexOf(slug);
  return i === -1 ? VERIFIED_ORDER.length : i;
};

const PER_ROW = 5;
const ROWS_PER_PAGE = 6;
const PER_PAGE = PER_ROW * ROWS_PER_PAGE;

/**
 * A house that HAS a page of ours links to it; one that does not goes straight
 * to its own storefront.
 *
 * That split is the point. Until 2026-08-19 every tile here was an outbound
 * link, so this page passed all of its ranking signal off-site and the
 * editorial could name a brand without being able to link it. Where an internal
 * page exists, the tile points at it, and the outbound link with
 * rel="sponsored" lives on that page instead — one clear destination each,
 * rather than a tile that tries to be both.
 *
 * THE TEST IS `hasBrandPage`, NOT `b.description`, as of 2026-08-26. Those were
 * the same thing when this was written: a brand page existed only for a house
 * with an editorial description, and there were five. On 2026-08-24 the gate
 * moved to `MIN_PRODUCTS >= 24 || description` and brand pages went 5 -> 91
 * (`docs/log/2026-08-24-brand-pages-404-fix.md`) — but this line was not moved
 * with it, so **86 real pages had zero internal links from anywhere on the
 * site**. Measured 2026-08-26 by crawling the site's own HTML: 5 hrefs to
 * /designers/*, and Search Console had exactly those 5 indexed with the other
 * 86 "URL is unknown to Google" despite all 91 sitting in sitemap.xml. A
 * sitemap entry gets a URL considered; internal links are what get it crawled.
 *
 * The generalisable trap: two places encoded the same rule, one moved, and
 * nothing failed — no type error, no test, no broken page. `hasBrandPage` is
 * now the single source of truth, so the next gate change carries both.
 */
function Tile({ b, eager, seal }: { b: House; eager: boolean; seal: boolean }) {
  const internal = hasBrandPage(b.slug) ? `/designers/${b.slug}` : null;
  const Wrapper = internal ? Link : 'a';
  const linkProps = internal
    ? { href: internal }
    : { href: withUtm(b.homepage, 'designers'), target: '_blank' as const, rel: 'noopener noreferrer sponsored' };
  return (
    <Wrapper
      {...linkProps}
      data-brand={b.slug}
      data-surface="designers"
      className="group block"
    >
      {/* The arch. A 3:4 portrait, because fashion is shot vertically and a
          square crop cuts most of these garments off at the waist.

          aspectRatio reserves the box before the image loads, so the grid does
          not shift as the photographs arrive — the site has no next/image and
          CLS on grids is a known landmine. */}
      <span
        className="relative block overflow-hidden"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: '999px 999px 4px 4px',
          background: 'var(--bone)',
          border: '1px solid var(--hairline)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shopifyImage(b.image, 600)}
          srcSet={shopifySrcSet(b.image)}
          /* The three regimes this grid actually has (see `grid` below):
             two-up under sm, three-up from sm, five-up from lg — inside a
             1220px container with 32px gutters and a 20px gap, so a tile stops
             growing at (1220 - 80) / 5 = 228px.
             It read "(max-width: 820px) 50vw, 200px" before, which described a
             breakpoint this grid does not have and then asked for 200px at every
             width above it — under-fetching for the three-up band between 820
             and 1024, where a tile is nearer 300px. */
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 31vw, 228px"
          alt={b.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          /* Pulled down from the top: the arch eats the upper corners, and on a
             model shot that is where the head and neckline sit. */
          style={{ objectPosition: 'center 22%' }}
        />
      </span>

      {/* Nothing is set on the photograph. No scrim, so the image is never
          dimmed to make room for type, and the name never has to fight a busy
          picture — which matters when 58 shops means 58 different backgrounds. */}
      <span className="block text-center mt-3">
        <span
          className="serif block"
          style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--ink)' }}
        >
          {b.name}
        </span>
        <span className="eyebrow block mt-1.5">{b.city}</span>
        {/* The seal shows in the vetted row only. Everywhere else the chip is a
            repetition of what that row already says, and it is the only thing
            breaking the even rhythm of the grid. */}
        {seal && b.badge && (
          <span className="badge mt-2">
            <Sparkle size={10} weight="fill" />
            {BADGE[b.badge]}
          </span>
        )}
      </span>
    </Wrapper>
  );
}

/* A 4-up step at lg. Without it the grid went 3-up straight to 5-up at 1024,
   which made the tiles at 1024 the SMALLEST of any width above a phone:
   measured 237px at 819, then 178px at 1024 — narrower than a 430px phone's
   185px. Widening the window made every designer's photograph shrink, which is
   the opposite of what a reader expects. With 4-up at lg it is 225px there, and
   the sequence climbs monotonically: 150 / 165 / 185 / 220 / 237 / 225 / 227. */
const grid = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-5 gap-y-9';

export default async function DesignersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; region?: string }>;
}) {
  const sp = await searchParams;
  // null for anything unrecognised, which then reads as "no filter" rather than
  // "no results" — a hand-typed ?region=banana shows the whole index instead of
  // an empty page.
  const region = regionFromSlug(sp.region);

  const all = houses(1); // variant 1: a different photo per house than the homepage rail

  // The vetted houses lead, and there are exactly five, so they fill the first
  // row on their own. Everyone else follows in catalogue order. No house is
  // listed twice: the pick and the vetted set are now the same five.
  const vetted = all.filter((h) => h.badge).sort((a, b) => rank(a.slug) - rank(b.slug));
  const ordered = [...vetted, ...all.filter((h) => !h.badge)];
  // Filtered AFTER the vetted-first ordering, so a region page keeps the same
  // reading order as the index rather than reverting to catalogue order.
  const index = region ? ordered.filter((h) => regionOf(h.city) === region) : ordered;

  const pages = designerPageCount(index.length, PER_PAGE);
  const page = clampDesignerPage(sp.page, pages);
  const shown = index.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Pagination has to carry the filter or page 2 of Europe silently becomes
  // page 2 of everything.
  const qs = (p: number) => {
    const parts = [region ? `region=${regionSlug(region)}` : '', p > 1 ? `page=${p}` : ''].filter(Boolean);
    return parts.length ? `/designers?${parts.join('&')}` : '/designers';
  };
  const path = qs(page);

  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-12 md:pt-16 pb-24">
      {/* This was the least structured page on the site: it emitted only the
          sitewide Organization + WebSite graph, while every lane page already
          emits CollectionPage + ItemList + BreadcrumbList. It is also the one
          page whose subject IS the brands, which is the site's most citable
          asset. Scoped to `shown` — the tiles actually on this page — so the
          structured data and the visible page cannot disagree. */}
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Designers', path: '/designers' },
            ...(region ? [{ name: region, path }] : []),
          ]),
          brandListSchema({
            name: region ? `Designers in ${region}` : 'Designers',
            description: 'A curated index of modest fashion, brand by brand — vetted for craft and taste.',
            path,
            brands: shown.map((b) => ({ name: b.name, url: b.homepage, image: b.image })),
          }),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl mt-2">
        {region ? `Designers in ${region}` : 'Designers'}
      </h1>
      <p className="mt-3 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        {region
          ? `${index.length} ${index.length === 1 ? 'house' : 'houses'} based in ${region}, from the same index — vetted for craft and taste.`
          : 'A curated index of modest fashion, brand by brand — vetted for craft and taste.'}
      </p>
      {/* Without this a filtered view is a dead end: nothing else on the page
          clears the region, and the visitor arrived from the homepage band
          rather than from a control they can see. */}
      {region && (
        <Link href="/designers" className="nav-link inline-flex items-center gap-1.5 mt-5">
          <CaretLeft size={12} weight="bold" /> All designers
        </Link>
      )}

      <div className={`${grid} mt-14`}>
        {shown.map((b, i) => (
          <Tile
            key={b.slug}
            b={b}
            eager={i < PER_ROW}
            // Only the first row of page one is the vetted row.
            // Only the first row of page one of the UNFILTERED index is the
            // vetted row; inside a region the first five are just the first
            // five, and badging them would claim a seal they may not hold.
            seal={!region && page === 1 && i < PER_ROW}
          />
        ))}
      </div>

      {pages > 1 && (
        // Real links, not state: every page is its own URL, so a crawler can
        // reach the houses below the fold. Almost none of the catalogue is
        // reachable today because grids reveal more client-side (§8).
        <nav className="flex items-center justify-center gap-8 mt-16" aria-label="Index pages">
          {page > 1 ? (
            <Link className="nav-link inline-flex items-center gap-1.5" href={qs(page - 1)}>
              <CaretLeft size={12} weight="bold" /> Previous
            </Link>
          ) : (
            <span className="nav-link inline-flex items-center gap-1.5" aria-disabled="true" style={{ opacity: 0.45 }}>
              <CaretLeft size={12} weight="bold" /> Previous
            </span>
          )}
          <span className="eyebrow">
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link className="nav-link inline-flex items-center gap-1.5" href={qs(page + 1)}>
              Next <CaretRight size={12} weight="bold" />
            </Link>
          ) : (
            <span className="nav-link inline-flex items-center gap-1.5" aria-disabled="true" style={{ opacity: 0.45 }}>
              Next <CaretRight size={12} weight="bold" />
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
