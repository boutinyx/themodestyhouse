/**
 * Schema.org JSON-LD builders.
 *
 * Product-level JSON-LD is deliberately NOT here — docs/launch-readiness.md
 * records the decision to hold off until price freshness is solved (stale
 * prices in structured data risk a Google manual action). ItemList entries
 * below carry only name/url/image, never price or availability.
 */

const SITE_URL = 'https://themodestyhouse.com';
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
  /** Outbound brand URL — the only URL a card currently has (ProductCard has
   *  no internal href; see CLAUDE.md §8 "Zero products are hyperlinked"). */
  url: string;
  image: string;
  brandName: string;
}

/**
 * CollectionPage + ItemList for a lane/directory page. Capped at the first
 * `limit` items — matching what the grid actually paints before client-side
 * reveal (STEP = 24 in DirectoryBrowser/FilterableGrid) — rather than the
 * full lane, which can run into the thousands and would bloat the page for
 * no indexing benefit (a crawler gets the same signal from 24 as 2,400).
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
        item: {
          '@type': 'Product',
          name: it.title,
          brand: { '@type': 'Brand', name: it.brandName },
          url: it.url,
          image: it.image,
        },
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
