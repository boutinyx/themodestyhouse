/**
 * Schema.org JSON-LD builders.
 *
 * Product-level JSON-LD is deliberately NOT here — docs/launch-readiness.md
 * records the decision to hold off until price freshness is solved (stale
 * prices in structured data risk a Google manual action). ItemList entries
 * below carry only name/url/image, never price or availability.
 */

export const SITE_URL = 'https://themodestyhouse.com';
const SITE_NAME = 'The Modesty House';

/**
 * The site as an entity.
 *
 * Every field here is reused from somewhere it was already stated, never
 * invented: `description` is app/layout.tsx's own metadata string,
 * `contactPoint` is the address published in content/legal/terms.md and on
 * /contact, and `addressCountry` is what content/legal/privacy.md already
 * declares ("The Modesty House, based in the Netherlands").
 *
 * `sameAs` — ADDED 2026-09-03, on the terms the note that stood here set: the
 * day a real account exists, and not before. Tina gave the handle directly
 * (`themodestyhouse.hq`); it is not inferred, and inference would have been
 * indefensible here because THREE unrelated Instagram accounts use this exact
 * brand name — `@themodestyhouse` is a Catholic modesty label
 * (contactmodestyhouse@gmail.com), plus `@the.modesty.house`.
 *
 * WHY IT MATTERS MORE HERE THAN ON MOST SITES. `sameAs` is the field that
 * drives entity resolution, and this brand name is contested by at least four
 * websites — modestyhouse.ca, modestyhaus.com, modestyhome.com,
 * modestystyleco.com — plus a Rotterdam shop, "House of Modesty", that owns the
 * local knowledge panel on google.nl. Searching the phrase "the modesty house"
 * on 2026-09-03 returned all four and not us; searching the literal string
 * `themodestyhouse` returned us at #1 with an AI Overview citing the site.
 * Google has no reason yet to treat these as one entity and us as a distinct
 * one. → docs/log/2026-09-03-brand-name-entity-confusion.md
 *
 * PINTEREST AND TIKTOK ARE STILL ABSENT, and the original reasoning stands for
 * them unchanged: components/Footer.tsx still links to bare pinterest.com and
 * tiktok.com because no profile has been named. Pointing `sameAs` at a
 * platform's homepage claims an identity that does not exist, which is worse
 * than omitting it. Add each the day its handle is given.
 *
 * ALSO ABSENT — `alternateName` and `founder`. The first would be invented
 * brand copy (§10.18); the second has no public subject, and app/about/page.tsx
 * documents that as a deliberate privacy choice rather than an oversight.
 */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: ['https://www.instagram.com/themodestyhouse.hq/'],
    description: 'The archive for everything modest. A curated index of modest brands and pieces.',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NL',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@themodestyhouse.com',
      availableLanguage: 'en',
    },
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/new-in?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  path: string; // site-relative, e.g. '/new-in'
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

export interface ListedItem {
  title: string;
  /** Outbound brand URL. /product/[brandSlug]/[shopifyId] does exist, but is
   *  deliberately noindex for Google/Bing (see that file's header), so it is
   *  not a legitimate ItemList target either. */
  url: string;
  image: string;
}

/**
 * CollectionPage + ItemList for a lane/directory page. Capped at the first
 * `limit` items — matching what the grid actually paints before client-side
 * reveal (STEP = 24 in DirectoryBrowser/FilterableGrid) — rather than the
 * full lane, which can run into the thousands and would bloat the page for
 * no indexing benefit (a crawler gets the same signal from 24 as 2,400).
 *
 * Each entry is a BARE ListItem — name/url/image and nothing else. It used to
 * nest an `item` typed `'@type': 'Product'`, which Tina caught with a live GSC
 * inspection on 2026-08-19: "24 ongeldige items gedetecteerd — 'offers',
 * 'review' of 'aggregateRating' moet zijn gespecificeerd", on every lane and
 * on /directory. Google's Product spec requires one of those three, and the
 * file-level comment above records exactly why we will not ship prices.
 *
 * Adding `offers` was therefore not the fix, and neither was pointing the url
 * at our own /product page. Google's summary-page spec
 * (developers.google.com/search/docs/appearance/structured-data/carousel)
 * asks a ListItem for only `position` + `url`, and requires that "All URLs in
 * the list must be unique, but live on the same domain": ours are the brand's
 * own storefront, so this page was never eligible for a carousel rich result
 * under ANY typing, and the Product claim bought nothing while asserting
 * something false about 24 items per page. Same reasoning the brandListSchema
 * below already applies to Brand nodes.
 *
 * The list still earns its place: it is the machine-readable statement of what
 * this page contains, which is what an AI crawler reads (CLAUDE.md GEO work).
 */
export function collectionPageSchema(opts: { name: string; description: string; path: string; items: ListedItem[]; limit?: number }) {
  const items = opts.items.slice(0, opts.limit ?? 24);
  return {
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.title,
        url: it.url,
        image: it.image,
      })),
    },
  };
}

export interface ListedBrand {
  name: string;
  /** The brand's own storefront — brands have no page of ours to point at.
   *  app/designers/[slug] does not exist (Tier 3 of the 2026-08-19 audit). */
  url: string;
  image?: string;
}

/**
 * CollectionPage + ItemList of Brand nodes for /designers.
 *
 * collectionPageSchema is not reused here because a designer entry carries a
 * real Brand node, which a bare ListItem cannot express. (Until 2026-08-19
 * the stronger reason was that collectionPageSchema hardcoded
 * '@type': 'Product' per item, and a brand is not a Product — emitting one
 * would assert that "Aab" is a purchasable item with no offers, price or
 * availability. That objection turned out to apply to the products too.)
 *
 * Scope this to the tiles actually rendered on the requested page, not the
 * full 113-brand index, so the structured data and the visible page agree.
 * There is no rich result for Brand; the value is entity clarity for AI
 * retrieval and consistency with the pattern every lane page already follows.
 */
export function brandListSchema(opts: { name: string; description: string; path: string; brands: ListedBrand[] }) {
  return {
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.brands.length,
      itemListElement: opts.brands.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Brand',
          name: b.name,
          url: b.url,
          ...(b.image ? { logo: b.image } : {}),
        },
      })),
    },
  };
}

/**
 * A single house's page: the Brand as the page's subject, plus an ItemList of
 * what it makes.
 *
 * Entries are BARE ListItems (position/name/url/image). They are deliberately
 * NOT typed 'Product' — 05563fe removed exactly that across 14 pages after a
 * live GSC inspection returned "24 invalid items: offers, review or
 * aggregateRating must be specified". A Product node without offers is invalid,
 * adding offers reverses the no-prices-in-structured-data decision, and the
 * urls point at the brand's own storefront rather than this domain, so these
 * lists were never eligible for a carousel under any typing. Same reasoning
 * applies here; do not reintroduce Product.
 */
export function brandPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  homepage: string;
  logo?: string;
  items: ListedItem[];
  limit?: number;
}) {
  const items = opts.items.slice(0, opts.limit ?? 24);
  return {
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    // The page is ABOUT the brand; the list is what the brand makes. `about`
    // carries the entity, mainEntity carries the listing, which keeps the two
    // claims separate rather than asserting the page *is* a list.
    about: {
      '@type': 'Brand',
      name: opts.name,
      description: opts.description,
      url: opts.homepage,
      // `sameAs` is what tells Google the entity this page is ABOUT is the same
      // entity as the storefront it names — the association a brand-name query
      // is resolved against. `url` alone is a property of our claim; `sameAs`
      // is an identity statement, and it is the one structured-data field that
      // speaks to "is this page about MERRACHI, or does it merely mention it".
      // The homepage is the only identifier we hold that is verifiably theirs
      // (data/brands.ts, and we fetch their feed from it); no social profile is
      // asserted, because guessing one would be a claim about a real company.
      sameAs: [opts.homepage],
      ...(opts.logo ? { logo: opts.logo } : {}),
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.title,
        url: it.url,
        image: it.image,
      })),
    },
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished: string; // ISO yyyy-mm-dd
  authorName: string;
  image?: string;
}) {
  return {
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: `${SITE_URL}${opts.path}`,
    datePublished: opts.datePublished,
    author: { '@type': 'Organization', name: opts.authorName },
    publisher: { '@id': `${SITE_URL}/#organization` },
    ...(opts.image ? { image: opts.image.startsWith('http') ? opts.image : `${SITE_URL}${opts.image}` } : {}),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(items: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}

/**
 * Product + single Offer, for the ONE page it is legitimate on:
 * `/product/[brandSlug]/[shopifyId]`. Two prior decisions in this file
 * constrain this and neither one blocks it:
 *
 * 1. The file-level "hold off on Product JSON-LD" note is about Google
 *    showing a stale price in a rich result. This page carries
 *    `robots: { googleBot: { index: false } }` (see that file's header) —
 *    Google will not build a rich result from a page it will not index. The
 *    same carve-out already governs the `product:price:*` OG meta tags
 *    rendered directly in that page for Meta's Commerce catalogue; this is
 *    the schema.org form of the identical, already-accepted exception.
 * 2. `collectionPageSchema`'s comment above records a REAL past failure:
 *    typing ItemList entries as `Product` got 24 items flagged invalid in a
 *    live GSC inspection, because a lane page's items link to the BRAND's
 *    domain, which Google's carousel/ItemList spec requires to be the SAME
 *    domain as the page. That constraint is specific to ItemList/carousel
 *    markup. A standalone Product node describing the one product an
 *    indexed-elsewhere page is ABOUT has no such same-domain rule — `offers.url`
 *    pointing at the brand is exactly Google's documented pattern for an
 *    aggregator/reseller page (a Product you don't sell yourself).
 *
 * `availability` is hardcoded InStock, not read from a field, because
 * `scripts/build-data.mjs` only ever publishes `inStock` rows (Invariant 4)
 * — an out-of-stock product cannot reach this function to begin with, so a
 * conditional here would be dead code asserting a state that can't occur.
 */
export function productSchema(p: { id: string; title: string; brandName: string; price: number; currency: string; url: string; image: string }) {
  return {
    '@type': 'Product',
    name: p.title,
    image: p.image,
    brand: { '@type': 'Brand', name: p.brandName },
    sku: p.id,
    offers: {
      '@type': 'Offer',
      url: p.url,
      priceCurrency: p.currency,
      price: p.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

/** Wraps one or more schema nodes in a @context envelope ready to serialize. */
export function jsonLdGraph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
