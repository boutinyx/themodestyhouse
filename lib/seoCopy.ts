/**
 * Keyword-facing `<title>`/meta-description copy, deliberately SEPARATE from
 * the visible on-page h1/intro (lib/lanes.ts `title`/`intro`, app/page.tsx's
 * hero). Search-snippet copy is conventionally more keyword-dense than a
 * site's own editorial voice — this file is where that density lives, so it
 * never has to compete with what a visitor actually reads on the page.
 *
 * Grounded in real research, not guesswork: no paid keyword-volume tool was
 * available (claude-seo's keyword_planner.py needs Google Ads API
 * credentials this environment doesn't have), so these are built from actual
 * competitor title tags (e.g. Aab's "Modest Fashion Online – Aab") and
 * documented search-behaviour findings, not invented from scratch. See
 * docs/seo-geo-aeo-plan.md for the research this is based on.
 *
 * Keyed by path. `lib/seoCopy.test.ts` asserts every LANES slug + static
 * path has an entry, and that lengths stay within normal SERP-snippet
 * bounds (title <= 60 chars, description 50-160).
 */
import type { Metadata } from 'next';

export interface SeoCopy {
  title: string;
  description: string;
}

// Same image app/layout.tsx falls back to for the root OG/Twitter card — kept
// as a literal here (not imported) since app/ and lib/ don't share a runtime
// boundary for this. Reused deliberately rather than commissioning new art;
// see the DEFAULT_OG_IMAGE comment in app/layout.tsx.
const OG_IMAGE = '/hero-poster.jpg';

/**
 * Builds a full per-page Metadata object, including openGraph/twitter.
 *
 * Every route below used to set only title/description/alternates, so a
 * child page's og:title, og:description and og:image fell through to the
 * generic ones in app/layout.tsx — every Pinterest/IG/WhatsApp share of any
 * page rendered the same card. openGraph is not deep-merged with the parent
 * layout's by Next, so every page that sets it at all must set it in full.
 */
export function buildMetadata({
  title,
  description,
  canonical,
}: {
  title: string;
  description: string;
  canonical: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: OG_IMAGE }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}

/** Same as buildMetadata, but reads title/description from SEO_COPY by path. */
export function pageMetadata(path: keyof typeof SEO_COPY, canonical: string = path): Metadata {
  const copy = SEO_COPY[path];
  return buildMetadata({ title: copy.title, description: copy.description, canonical });
}

export const SEO_COPY: Record<string, SeoCopy> = {
  '/': {
    title: 'Modest Fashion Online — Shop Curated Modest Brands',
    description: 'Shop modest dresses, abayas, hijabs and more from independently vetted modest fashion brands — curated, aspirational, all in one place.',
  },
  '/directory': {
    title: 'Shop Modest Clothing Online — Dresses, Abayas & Hijabs',
    description: "Browse modest clothing from every verified house — long-sleeve dresses, abayas, hijabs, skirts and more, linking straight to the brand.",
  },
  '/modest-dresses': {
    title: 'Modest Dresses Online — Long-Sleeve & Maxi Dresses',
    description: 'Shop modest dresses online: long-sleeve, high-neck and maxi dresses from independent modest fashion brands, styled for every occasion.',
  },
  '/modest-abayas': {
    title: 'Abayas Online — Shop Modest Abaya Dresses for Women',
    description: 'Shop abayas online: open, closed, kimono and butterfly styles, from plain-sharp to embellished-flowing, from independent modest houses.',
  },
  '/modest-hijabs': {
    title: "Hijabs & Scarves Online — Shop Women's Hijab Fashion",
    description: 'Shop hijabs and scarves online: chiffon, jersey, satin and crinkle hijabs, shawls and underscarves from independent modest brands.',
  },
  '/modest-skirts': {
    title: 'Modest Skirts Online — Maxi & A-Line Skirts for Women',
    description: 'Shop modest skirts online: maxi, pleated and A-line skirts with full coverage, from independent modest fashion brands.',
  },
  '/modest-tops': {
    title: 'Modest Tops Online — Tunics, Blouses & Layering Tops',
    description: 'Shop modest tops online: tunics, blouses, shirts and layering tops from independent modest fashion brands.',
  },
  '/modest-trousers': {
    title: 'Modest Trousers Online — Wide-Leg & Tailored Trousers',
    description: 'Shop modest trousers online: wide-leg, tailored and relaxed trousers from independent modest fashion brands.',
  },
  '/modest-sets': {
    title: 'Modest Co-ord Sets Online — Matching Two-Piece Sets',
    description: 'Shop modest co-ord sets online: matching two-piece sets and co-ords, styled to go, from independent modest fashion brands.',
  },
  '/modest-swimwear': {
    title: 'Modest Swimwear Online — Burkinis & Full-Coverage Swimsuits',
    description: 'Shop modest swimwear online: full-coverage swimsuits and burkinis for the beach and pool, from independent modest fashion brands.',
  },
  '/modest-activewear': {
    title: 'Modest Activewear Online — Covered Sportswear for Women',
    description: 'Shop modest activewear online: sports dresses, leggings and covered athleisure for training and everyday movement.',
  },
  '/layering-basics': {
    title: 'Layering Basics — Base Layers & Neck Covers',
    description: 'Shop layering basics online: base layers, dickeys and neck covers worn under abayas, blouses and dresses for extra coverage.',
  },
  '/modest-wedding-guest': {
    title: 'Modest Wedding Guest Dresses & Abayas — Occasion Wear',
    description: 'Shop modest wedding guest outfits: covered, elegant dresses and abayas for weddings and formal occasions.',
  },
  '/modest-summer-outfits': {
    title: 'Modest Summer Outfits Online — Lightweight & Breathable',
    description: 'Shop modest summer outfits online: lightweight, breathable pieces for warm days, from independent modest fashion brands.',
  },
  '/outerwear': {
    title: 'Modest Outerwear Online — Blazers, Vests & Coats',
    description: 'Shop modest outerwear online: blazers, vests, cardigans and coats to layer over dresses, tops and abayas.',
  },
  '/designers': {
    title: 'Modest Fashion Brands & Designers — Curated Directory',
    description: 'A curated index of modest fashion brands, vetted for craft and taste — browse every designer in The Modesty House directory.',
  },
  '/editorial': {
    title: 'The Edit — Modest Fashion Stories & Styling Guides',
    description: 'Stories, edits and styling guides on modest fashion from The Modesty House.',
  },
  '/faq': {
    title: 'FAQ — How The Modesty House Works',
    description: 'Common questions about The Modesty House: how brands are chosen, how buying works, prices and currency, and what modest fashion means.',
  },
};
