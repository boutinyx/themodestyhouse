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

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
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
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/directory?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface Crumb {
  name: string;
  path: string; // site-relative, e.g. '/directory'
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

/** Wraps one or more schema nodes in a @context envelope ready to serialize. */
export function jsonLdGraph(...nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
