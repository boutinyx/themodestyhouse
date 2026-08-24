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

// Each page of the index self-canonicalises to its own URL (page 1 -> the
// bare path), rather than all pages pointing at page 1 — Google's current
// guidance treats rel=prev/next as retired signal and expects paginated
// series to be independently indexable. Page >1 also gets an explicit
// canonical for the first time; previously it inherited none at all.
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  // Clamped against the REAL page count, not just the lower bound. Previously
  // ?page=99 (or 1e9) returned 200 with page 4's content and a self-canonical
  // echoing 99, so anything linking an out-of-range page could mint an endless
  // family of self-canonicalising duplicates. houses() is deliberately NOT
  // called here — it routes through getProducts() and re-parses 10.9 MB
  // uncached (CLAUDE.md §8) — and it maps 1:1 over BRANDS, so BRANDS.length is
  // the same count the body derives.
  const page = clampDesignerPage((await searchParams).page, designerPageCount(BRANDS.length, PER_PAGE));
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
 * A house with a `description` has a page of ours; one without still goes
 * straight to its own storefront.
 *
 * That split is the point. Until 2026-08-19 every tile here was an outbound
 * link, so this page passed all of its ranking signal off-site and the
 * editorial could name a brand without being able to link it. Where an internal
 * page exists, the tile now points at it, and the outbound link with
 * rel="sponsored" lives on that page instead — one clear destination each,
 * rather than a tile that tries to be both.
 */
function Tile({ b, eager, seal }: { b: House; eager: boolean; seal: boolean }) {
  const internal = b.description?.trim() ? `/designers/${b.slug}` : null;
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
  searchParams: Promise<{ page?: string }>;
}) {
  const all = houses(1); // variant 1: a different photo per house than the homepage rail

  // The vetted houses lead, and there are exactly five, so they fill the first
  // row on their own. Everyone else follows in catalogue order. No house is
  // listed twice: the pick and the vetted set are now the same five.
  const vetted = all.filter((h) => h.badge).sort((a, b) => rank(a.slug) - rank(b.slug));
  const index = [...vetted, ...all.filter((h) => !h.badge)];

  const pages = designerPageCount(index.length, PER_PAGE);
  const page = clampDesignerPage((await searchParams).page, pages);
  const shown = index.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const path = page === 1 ? '/designers' : `/designers?page=${page}`;

  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-24">
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
            { name: 'Designers', path },
          ]),
          brandListSchema({
            name: 'Designers',
            description: 'A curated index of modest fashion, brand by brand — vetted for craft and taste.',
            path,
            brands: shown.map((b) => ({ name: b.name, url: b.homepage, image: b.image })),
          }),
        )}
      />
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>

      <div className={`${grid} mt-14`}>
        {shown.map((b, i) => (
          <Tile
            key={b.slug}
            b={b}
            eager={i < PER_ROW}
            // Only the first row of page one is the vetted row.
            seal={page === 1 && i < PER_ROW}
          />
        ))}
      </div>

      {pages > 1 && (
        // Real links, not state: every page is its own URL, so a crawler can
        // reach the houses below the fold. Almost none of the catalogue is
        // reachable today because grids reveal more client-side (§8).
        <nav className="flex items-center justify-center gap-8 mt-16" aria-label="Index pages">
          {page > 1 ? (
            <Link className="nav-link inline-flex items-center gap-1.5" href={page === 2 ? '/designers' : `/designers?page=${page - 1}`}>
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
            <Link className="nav-link inline-flex items-center gap-1.5" href={`/designers?page=${page + 1}`}>
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
