import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react/dist/ssr';
import { BRANDS } from '@/data/brands';
import { productsForBrand } from '@/lib/products';
import { brandPageSlugs, hasBrandPage } from '@/lib/brandPages';
import { regionOf, brandsInRegion } from '@/lib/brandRegions';
import { encodeCatalogue, decodeCard } from '@/lib/compactCatalogue';
import { FilterableGrid } from '@/components/FilterableGrid';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, brandPageSchema, faqPageSchema, jsonLdGraph } from '@/lib/schema';
import { formatPrice } from '@/lib/price';
import { withUtm } from '@/lib/outbound';
import { clampText, fitSentences } from '@/lib/metaDescription';
import { pageTitle } from '@/lib/metaTitle';

/**
 * /designers/[slug] — one page per house.
 *
 * WHAT CHANGED 2026-08-24, and why. This page used to exist ONLY for a house
 * carrying `description` in data/brands.ts. Five houses had one, so
 * **108 of 113 brand pages returned 404** — including MERRACHI, whose name is
 * searched roughly twice as often as the phrase "modest fashion" itself, and
 * which is the #1 related query for "hoofddoek" in the Netherlands. The
 * directory was serving nothing for the queries it is best placed to win.
 *
 * The old gate's two reasons were both sound, and neither of them is actually
 * "a human wrote a paragraph":
 *
 *   1. THIN CONTENT is a real risk — a page of derived data over 3 products is
 *      the pattern /product/[...] was noindexed to avoid. But the honest test
 *      for that is HOW MUCH THE HOUSE HAS, not whether someone got round to
 *      writing about it. MIN_PRODUCTS below is that test, set at one full grid.
 *   2. NOT SHIPPING INVENTED COPY (CLAUDE.md §10.18) still holds completely,
 *      and is honoured by rendering the description only when it exists and
 *      falling back to MEASURED facts — piece count, city, price range — never
 *      to generated prose about a real company.
 *
 * So a description is now an enhancement, not the price of admission.
 * Effect: 5 pages -> 89.
 */

export function generateStaticParams() {
  return [...brandPageSlugs()].map((slug) => ({ slug }));
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = BRANDS.find((x) => x.slug === slug);
  if (!b || !hasBrandPage(slug)) return { title: 'Not found', robots: { index: false, follow: false } };
  // Falls back to MEASURED facts, never to invented prose about a real company
  // (§10.18). `productsForBrand` is fine here: generateMetadata runs once per
  // page, unlike the 113-brand loop that eligibleSlugs() exists to avoid.
  const items = productsForBrand(b.slug);
  const n = items.length;
  // WHAT THE SEARCHER ASKED. These pages rank on the house's OWN NAME — 319
  // impressions for "merrachi" at position 6.5 in three days, with zero clicks
  // (Search Console, 2026-08-29). At that position the only thing left to fix
  // is the two lines Google prints, so both now lead with the count and the
  // price range rather than the phrase "Modest Fashion Brand", which says
  // nothing a searcher who typed the brand's name does not already know.
  // pageTitle(): four brand pages (noureen, nour-al-houda, la-petite-parisienne,
  // rutba-abaya) render past 60 characters once the layout appends the house
  // name, purely because the brand's own name is long.
  const title = `${b.name} — ${n.toLocaleString('en-GB')} pieces & prices`;
  const priced = items.map((p) => p.price).filter((x) => x > 0).sort((a, b2) => a - b2);
  const range = priced.length
    ? `, ${formatPrice(priced[0], b.currency)}–${formatPrice(priced[priced.length - 1], b.currency)}.`
    : '.';
  // Length is decided by lib/metaDescription.ts: whole trailing clauses are
  // dropped rather than characters, so Google never prints a half word. 47 of
  // the 91 brand pages ran 161-168 characters before this (measured on the
  // live sitemap, 2026-09-15) because the fallback below is composed from data
  // and a long house name or city pushes it over.
  const description =
    b.description?.trim()
      ? clampText(b.description.trim())
      : fitSentences([
          `Every ${b.name} piece we track: ${n.toLocaleString('en-GB')} items${range}`,
          b.city ? `Based in ${b.city}.` : '',
          // Split from the hostname clause deliberately: as one 81-character
          // sentence it never fit beside the two above, so the whole thing was
          // dropped and the descriptions came out at 74-80 characters. Split,
          // the pricing half survives and only the link half falls off.
          'Prices in your own currency, checked nightly.',
          `Links straight to ${new URL(b.homepage).hostname}.`,
        ]);
  const canonical = `/designers/${b.slug}`;
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical },
    // Same card as everywhere else — see the DEFAULT_OG_IMAGE comment in app/layout.tsx.
    openGraph: { title, description, type: 'website', url: canonical, images: [{ url: '/og-card-1.jpg', width: 1200, height: 630, alt: 'The Modesty House — the archive for everything modest' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-card-1.jpg'] },
  };
}

/** Plain-language label for what a house mostly makes, from its own catalogue. */
const GARMENT_LABEL: Record<string, string> = {
  abaya: 'abayas', hijab: 'hijabs', dress: 'dresses', top: 'tops',
  trousers: 'trousers', skirt: 'skirts', set: 'co-ord sets', swim: 'swimwear',
};

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = BRANDS.find((b) => b.slug === slug);
  if (!brand || !hasBrandPage(slug)) notFound();

  const products = productsForBrand(brand.slug);
  if (products.length === 0) notFound();

  // embedCards + source belong together: the grid can only fetch the rows this
  // omits if it knows what they are indices INTO. See FilterableGrid's `source`
  // prop. → docs/superpowers/plans/2026-08-26-split-catalogue-payload.md
  const catalogue = encodeCatalogue(products, BRANDS, { embedCards: 48 });
  // See the note in app/[lane]/page.tsx on why filter(Boolean) rather than `!`.
  const listed = catalogue.rows.title.slice(0, 24)
    .map((_, i) => decodeCard(catalogue, i))
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => ({ title: c.title, url: c.url, image: c.image, brandName: c.brandName }));

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
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  /** The full garment breakdown, not the top four the summary line uses. */
  const breakdown = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .filter(([g]) => GARMENT_LABEL[g]);
  /** Sibling houses, for an internal-link mesh between the 89 brand pages.
   *  WHY THIS EXISTS: /designers/merrachi had exactly ONE internal link on the
   *  whole site — from /designers?page=2 — so Google reached it through the
   *  sitemap and nothing passed to it. Region is the relation the site already
   *  models (lib/brandRegions.ts), so this borrows it rather than inventing a
   *  similarity of its own. */
  const region = brand.city ? regionOf(brand.city) : null;
  const regionPeers = region
    ? brandsInRegion(region).filter((b) => b.slug !== brand.slug && hasBrandPage(b.slug))
    : [];
  // A RING, not the first eight. `.slice(0, 8)` gave every European house the
  // same eight alphabetical neighbours — Aab, Abaya Lounge, AbayaButh… — which
  // is a hub pointing at eight pages, not a mesh. Starting the window at this
  // house's own position spreads the links evenly: each page links to the eight
  // after it, so each page is linked FROM about eight others. Deterministic, so
  // the internal link graph does not churn on every build.
  const ringStart = region ? brandsInRegion(region).findIndex((b) => b.slug === brand.slug) : 0;
  const siblings = regionPeers.length
    ? Array.from({ length: Math.min(8, regionPeers.length) }, (_, i) =>
        regionPeers[(Math.max(ringStart, 0) + i) % regionPeers.length])
    : [];
  const storefront = new URL(brand.homepage).hostname.replace(/^www\./, '');

  /**
   * The three measured sections below the grid, built ONCE here and then both
   * PAINTED and emitted as FAQPage Q&A (2026-09-02).
   *
   * One string per answer, not two, and that is the whole point: Google's
   * structured-data guidelines require the question and the answer to be
   * visible on the page, and the way that stops being true is never a decision
   * — it is a rendered version and a schema version drifting apart. There is
   * nothing here to drift.
   *
   * WHY THESE PAGES AND NOT ANOTHER. They rank on the house's own name and
   * almost nothing else: Search Console, 28 days to 2026-08-30, has "merrachi"
   * at 380 impressions and position 6.5 with ZERO clicks, plus "jawda modest"
   * 169, "hawaa clothing" 123, "abaya buth" 113, all the same shape. Beating a
   * brand's own storefront for its own name is not winnable and should not be
   * attempted; the winnable query is the modifier — what do they make, what do
   * they cost, where do you buy them — which is exactly what these three
   * answer, from counted rows and never from a claim (§10.18).
   *
   * The headings became QUESTIONS in the same change. They were statements
   * ("What MERRACHI makes", "MERRACHI prices", "Where to buy MERRACHI") and the
   * content is unchanged; a question-form heading is what makes the pair
   * legible as a Q&A to an answer engine, and it is the shape lib/laneAnswers.ts
   * already argues for on every lane page.
   */
  const makesQ = `What does ${brand.name} make?`;
  const makesA = breakdown.map(([g, c]) => `${GARMENT_LABEL[g]} ${c.toLocaleString('en-GB')}`).join(' · ');
  const pricesQ = `How much do ${brand.name} pieces cost?`;
  const pricesA = prices.length
    ? `${products.length.toLocaleString('en-GB')} pieces, ${formatPrice(lo, brand.currency)} to ${formatPrice(hi, brand.currency)}. ` +
      `Half are under ${formatPrice(median, brand.currency)}. Listed in ${brand.currency}; the currency switcher converts them.`
    : '';
  const whereQ = `Where can you buy ${brand.name}?`;
  const whereA =
    `${brand.city ? `${brand.name} is based in ${brand.city} and sells` : `${brand.name} sells`} from ${storefront}. ` +
    `Every piece here links straight there; we do not sell anything ourselves.`;
  const faqs = [
    ...(makesA ? [{ question: makesQ, answer: makesA }] : []),
    ...(pricesA ? [{ question: pricesQ, answer: pricesA }] : []),
    { question: whereQ, answer: whereA },
  ];

  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-12 md:pt-16 pb-12">
      <JsonLd
        data={jsonLdGraph(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Designers', path: '/designers' },
            { name: brand.name, path: `/designers/${brand.slug}` },
          ]),
          brandPageSchema({
            name: brand.name,
            description: brand.description?.trim() || `${brand.name} — ${products.length.toLocaleString('en-GB')} pieces listed in The Modesty House directory.`,
            path: `/designers/${brand.slug}`,
            homepage: brand.homepage,
            items: listed,
          }),
          faqPageSchema(faqs),
        )}
      />

      <nav className="eyebrow" style={{ color: 'var(--muted)' }} aria-label="Breadcrumb">
        <Link href="/designers" style={{ color: 'inherit' }}>Designers</Link>
      </nav>
      <h1 className="section-heading text-3xl md:text-4xl mt-3">{brand.name}</h1>

      {/* Only when a human has actually written one (§10.18). The measured
          facts below stand on their own for the other 84 houses. */}
      {brand.description?.trim() && (
        <p className="mt-4 max-w-2xl" style={{ color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>
          {brand.description}
        </p>
      )}

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

      {/* "Is this your house?" — the claim entry point.
          MOVED HERE 2026-09-02, from the foot of the page. It was placed below
          the grid and the measured sections on the theory that it is addressed
          to one reader in a thousand and a shopper should never have to read
          past it. Measured, that theory was wrong by a mile: 6,008px down a
          7,329px page on a phone — 82% of the way to the bottom, past all 24
          cards, seven screens of scrolling. Tina, looking for it: "i dont see
          it." Quiet is a matter of SIZE and COLOUR, not of distance; it stays
          small and muted, and now sits where the house's own row already is,
          under the button that goes to their storefront. */}
      <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
        Is this your house?{' '}
        <Link
          href={`/contact?topic=claim&brand=${brand.slug}`}
          style={{ color: 'var(--plum)', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          Claim this page
        </Link>
        .
      </p>

      <div className="mt-14">
        {/* NO INDEX CONSOLE, 2026-08-26 — Tina: "i want the search bar inside each
            of those things to be gone like the whole block the search the filters".
            The console is not just unhelpful on a brand page, it is meaningless: the
            catalogue here is ONE brand, so its Brand dropdown offers a choice between
            "All" and the house whose page you are already on. Filtering and sorting
            still work underneath — only the controls are gone. */}
        <FilterableGrid catalogue={catalogue} showConsole={false} source={{ brand: brand.slug }} />
      </div>

      {/* MEASURED SECTIONS, 2026-08-31. BELOW THE GRID, which is where this
          site already puts answer content: lib/laneAnswers.ts renders the same
          shape under every lane's products, for the same reason — the page is
          a picture of a catalogue first, and 600px of prose above the first
          photograph is a worse page for the person who actually arrived.
          Placement costs nothing in indexing; Google reads the whole document. Everything below is counted from this
          house's own rows — no sentence here asserts anything the catalogue
          does not already say (§10.18). They exist because these pages rank on
          the house's NAME and then say almost nothing about it: before this,
          the page's own words were an h1, four `dt` labels and a button, which
          is thin for a query Google has to choose an answer for. The headings
          also carry the modifiers people actually search alongside the name —
          Search Console has "merrachi clothing", "merrachi store",
          "merrachi amsterdam", "merrachi canada" — each of which this page can
          now answer above the fold. */}
      <section className="max-w-2xl mt-20 pt-12" style={{ borderTop: '1px solid var(--hairline)' }}>
        <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>{makesQ}</h2>
        <p className="mt-3" style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.7 }}>
          {breakdown.map(([g, c], i) => (
            <span key={g}>
              {i > 0 && ' · '}
              {GARMENT_LABEL[g]} <span style={{ color: 'var(--muted)' }}>{c.toLocaleString('en-GB')}</span>
            </span>
          ))}
        </p>
      </section>

      {prices.length > 0 && (
        <section className="max-w-2xl mt-10">
          <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>{pricesQ}</h2>
          <p className="mt-3" style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.7 }}>{pricesA}</p>
        </section>
      )}

      <section className="max-w-2xl mt-10">
        <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>{whereQ}</h2>
        <p className="mt-3" style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.7 }}>{whereA}</p>
      </section>

      {siblings.length > 0 && (
        <section className="max-w-2xl mt-10">
          <h2 className="eyebrow" style={{ color: 'var(--brass)' }}>More houses in {region}</h2>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: 15 }}>
            {siblings.map((b) => (
              <Link key={b.slug} href={`/designers/${b.slug}`} style={{ color: 'var(--plum)' }}>
                {b.name}
              </Link>
            ))}
          </p>
        </section>
      )}

    </main>
  );
}
