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
import { pageTitle } from './metaTitle';

export interface SeoCopy {
  title: string;
  description: string;
}

// Same image app/layout.tsx falls back to for the root OG/Twitter card — kept
// as a literal here (not imported) since app/ and lib/ don't share a runtime
// boundary for this. See the DEFAULT_OG_IMAGE comment there for why this is a
// NEW filename rather than new bytes at the old one.
const OG_IMAGE = '/og-card-1.jpg';
const OG_ALT = 'The Modesty House — the archive for everything modest';

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
    // pageTitle(), not the bare string: the layout appends ' | The Modesty
    // House' to every title, and on a long one that tail is what pushes the
    // rendered <title> past what Google prints. OpenGraph and Twitter below
    // deliberately keep the plain title — a shared card is read by a person,
    // not truncated in a SERP.
    title: pageTitle(title),
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: OG_ALT }],
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
    // BRAND FIRST, changed 2026-09-03 at Tina's choice. This was
    // 'Modest Fashion Online — Shop Curated Modest Brands' from 2026-08-11 —
    // keyword-forward and, uniquely on this site, silent about whose site it
    // is. Every other page carries "| The Modesty House" from app/layout.tsx's
    // template; the homepage does not, because a page-level `title` string
    // replaces the template rather than feeding it. So the ONE page that has to
    // win the brand's own name was the one page that never stated it — while
    // modestyhouse.ca, modestyhaus.com, modestyhome.com and modestystyleco.com
    // all have the name in theirs.
    //
    // The trigger: searching `themodestyhouse` on google.nl autocorrects to the
    // phrase "the modesty house" and returns those four and not us. 41
    // characters, so nothing is truncated, and "Modest Fashion Online" — the
    // phrase the old title was written for — is kept.
    // → docs/log/2026-09-03-brand-name-entity-confusion.md
    title: 'The Modesty House — Modest Fashion Online',
    description: 'Shop modest dresses, abayas, hijabs and more from independently vetted modest fashion brands — curated, aspirational, all in one place.',
  },
  '/new-in': {
    title: 'New In — The Latest Modest Arrivals',
    description: 'The newest modest clothing added to The Modesty House: recent arrivals from selected independent houses, linking straight to the brand.',
  },
  '/modest-dresses': {
    title: 'Modest Dresses Online — Long-Sleeve & Maxi Dresses',
    description: 'Shop modest dresses online: long-sleeve, high-neck and maxi dresses from independent modest fashion brands, styled for every occasion.',
  },
  '/modest-abayas': {
    // Inoma Digital's October plan (2026-09-28) asked for category titles led by
    // the target keyword. Search Console, Jul-Sep 2026, says what this page is
    // already shown for: "abaya", "abayas for women", "abaya online".
    title: 'Abayas for Women Online — Open, Closed & Kimono Abayas',
    description: 'Shop abayas for women online: open, closed, kimono and butterfly abayas, plain or embellished, from independent modest fashion houses.',
  },
  '/modest-hijabs': {
    // Same plan. Shown for "best hijab store online" (57 impressions at ~70)
    // and "buy hijabs (online)" in Jul-Sep 2026, and "cotton hijab" is the
    // October article it will be linked from.
    title: 'Buy Hijabs Online — Chiffon, Jersey & Cotton Hijabs',
    description: 'Buy hijabs online from independent hijab stores: chiffon, jersey, cotton, satin and crinkle hijabs, shawls and underscarves, in one place.',
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
    // Same plan. Shown for "modest co ord sets" (50 impressions at ~48) and
    // "modest 2 piece set" in Jul-Sep 2026.
    title: 'Modest Co-ord Sets — Matching 2-Piece Sets for Women',
    description: 'Shop modest co-ord sets for women: matching 2-piece sets and co-ords, styled to go, from independent modest fashion brands.',
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
  '/modest-summer-outfits': {
    title: 'Modest Summer Outfits Online — Lightweight & Breathable',
    description: 'Shop modest summer outfits online: lightweight, breathable pieces for warm days, from independent modest fashion brands.',
  },
  // The single '/outerwear' entry above split into these three paths
  // 2026-08-21, matching the lib/lanes.ts split of the same day.
  '/blazers-vests': {
    // 2026-10-12: "modest blazer" at position 9.6, up from 1 to 11 impressions
    // in a month. "for Women" is how the category searches are phrased.
    title: 'Modest Blazers & Vests for Women',
    description: 'Shop modest blazers and vests online: tailored layers to wear over dresses, tops and abayas, from independent modest fashion brands.',
  },
  '/cardigans-sweaters': {
    // 2026-10-12: "modest knitwear" had 61 impressions at position 32.7 while
    // "modest cardigan/sweater" sat at 6-10 — the word was in the page body but
    // not in the title or description.
    title: 'Modest Knitwear — Cardigans & Sweaters for Women',
    description: 'Shop modest knitwear online: cardigans, sweaters and knit layers to wear over dresses, tops and abayas, from independent modest fashion brands.',
  },
  '/jackets-coats': {
    // 2026-10-12: "modest coats/coat/jackets" all at positions 6-8 and rising
    // with the season (page impressions 76 -> 174 in a month). Coats lead
    // because coat is the bigger query; trench because 92 of the lane's 232
    // pieces are trench coats (counted that day).
    title: 'Modest Coats for Women — Trench Coats & Jackets',
    description: 'Shop modest coats and jackets for women: trench coats and jackets to wear over abayas and dresses, from independent modest fashion brands.',
  },

  // SUBTYPE PAGES (`/lane?type=x`), read by subtypeSeo() in lib/laneSubtypes.ts,
  // which falls back to a template for any subtype not listed here. Written
  // 2026-10-12 for the subtypes with demand in Search Console (blouses 87
  // impressions, hijabs 21 at 13.8, wide-leg 25 at 14.6, knitwear) and their
  // siblings, so one lane's chips don't mix written and templated titles.
  // Functional SEO strings, not brand voice (§10.18): no claims beyond what
  // the grid holds.
  '/modest-tops?type=blouse': {
    title: 'Modest Blouses for Women — Shop Blouses Online',
    description: 'Shop modest blouses for women online, from independent modest fashion brands. Compare prices across houses in your own currency, checked nightly.',
  },
  '/modest-tops?type=tunic': {
    title: 'Modest Tunics for Women — Tunic Tops Online',
    description: 'Shop modest tunics and tunic tops for women, from independent modest fashion brands. Compare prices across houses in your own currency, checked nightly.',
  },
  '/modest-tops?type=shirt': {
    title: 'Modest Shirts for Women — Shop Shirts Online',
    description: 'Shop modest shirts for women, from independent modest fashion brands. Compare prices across houses in your own currency, checked nightly.',
  },
  '/modest-tops?type=tshirt': {
    title: 'Modest T-Shirts for Women — Shop Tees Online',
    description: 'Shop modest t-shirts and tees for women, from independent modest fashion brands. Compare prices across houses in your own currency, checked nightly.',
  },
  '/cardigans-sweaters?type=cardigan': {
    title: 'Modest Cardigans for Women — Knit Cardigans Online',
    description: 'Shop modest cardigans for women: knit layers to wear over dresses, tops and abayas, from independent modest fashion brands. Prices checked nightly.',
  },
  '/cardigans-sweaters?type=sweater': {
    title: 'Modest Sweaters for Women — Knitwear Online',
    description: 'Shop modest sweaters and knitwear for women, from independent modest fashion brands. Compare prices across houses in your own currency, checked nightly.',
  },
  '/blazers-vests?type=blazer': {
    title: 'Modest Blazers for Women — Shop Blazers Online',
    description: 'Shop modest blazers for women: tailored layers to wear over dresses and abayas, from independent modest fashion brands. Prices checked nightly.',
  },
  '/blazers-vests?type=vest': {
    title: 'Modest Vests & Waistcoats for Women',
    description: 'Shop modest vests and waistcoats for women, to layer over shirts, dresses and abayas, from independent modest fashion brands. Prices checked nightly.',
  },
  '/modest-sets?type=two-piece': {
    title: 'Modest Two-Piece Sets for Women',
    description: 'Shop modest two-piece sets for women: matching tops and bottoms, from independent modest fashion brands. Prices checked nightly.',
  },
  '/modest-hijabs?type=hijab': {
    title: 'Modest Hijabs — Everyday Hijab Scarves Online',
    description: 'Shop modest hijabs online: everyday hijab scarves in jersey, chiffon, modal and more, from independent hijab stores. Prices checked nightly.',
  },
  '/modest-trousers?type=wide-leg': {
    title: 'Wide-Leg Trousers for Women — Modest Wide-Leg Pants',
    description: 'Shop modest wide-leg trousers and pants for women, from independent modest fashion brands. Compare prices across houses in your own currency.',
  },

  // THE REMAINING SUBTYPES, written 2026-10-13 so none falls back to the
  // template (lib/laneSubtypes.test.ts now asserts it). Same method as the 11
  // above: every material, style or garment named in a description was counted
  // in that subtype's published rows first (counts in brackets, 2026-10-13
  // catalogue). Where a word the searches use is NOT in the grid it is left out:
  // Search Console shows "eid dresses" and "wedding guest dress" around the
  // occasion page, and no occasion row is titled either.
  // -> docs/log/2026-10-13-subtype-titles-and-lane-h1s.md
  '/modest-abayas?type=open': {
    // 376 rows / 24 houses: 59 embellished, 37 chiffon, 20 lace, 15 satin.
    title: 'Open Abayas for Women — Embellished & Chiffon Open Abayas',
    description: 'Shop open abayas for women: front-open abayas in chiffon, satin and lace, plain or embellished, from independent modest fashion houses.',
  },
  '/modest-abayas?type=kimono': {
    // 138 / 28: 27 kimono sets, 14 linen, 6 satin.
    title: 'Kimono Abayas for Women — Kimono Abayas & Sets',
    description: 'Shop kimono abayas for women: kimono-cut abayas and matching kimono sets in linen, satin and more, from independent modest fashion houses.',
  },
  '/modest-abayas?type=butterfly': {
    // 108 / 24: 8 titled kaftan.
    title: 'Butterfly Abayas for Women — Shop Butterfly Abayas',
    description: 'Shop butterfly abayas for women: wide-winged abayas and kaftans that fall loose from the shoulders, from independent modest fashion houses.',
  },
  '/modest-abayas?type=closed': {
    // 76 / 11: 9 plain, 8 embellished, 7 with a zip.
    title: 'Closed Abayas for Women — Shop Closed Abayas Online',
    description: 'Shop closed abayas for women: abayas with no front opening, plain or embellished, from independent modest fashion houses.',
  },
  '/modest-hijabs?type=khimar-jilbab': {
    // 48 / 12: ~30 khimars, 18 jilbabs, 7 abaya-and-khimar sets.
    title: 'Khimars & Jilbabs for Women — Shop Online',
    description: 'Shop khimars and jilbabs for women: jersey khimars, full-length jilbabs and abaya-and-khimar sets, from independent modest fashion brands.',
  },
  '/modest-hijabs?type=undercap': {
    // 82 / 13: tube, tie-back and satin-lined undercaps all present by title.
    title: 'Hijab Undercaps — Tube, Tie-Back & Satin Undercaps',
    description: 'Shop hijab undercaps: tube, tie-back and satin-lined undercaps to wear under a hijab, from independent hijab stores.',
  },
  '/modest-hijabs?type=prayer-set': {
    // 122 / 17: 53 titled jilbab, 43 set, 33 prayer abaya, 26 prayer skirt,
    // 21 "prayer dress". Search Console: prayer sets 33.8 -> 7.4, autocomplete
    // "prayer dress". This page used to inherit the HIJABS lane's intro
    // ("Chiffon, jersey, satin and crinkle hijabs…") as its description.
    title: 'Prayer Dresses & Prayer Sets for Women',
    description: 'Shop prayer dresses and prayer sets for women: one-piece and two-piece jilbabs, prayer abayas and prayer skirts, from independent modest brands.',
  },
  '/modest-dresses?type=everyday': {
    // 240 / 49: 62 maxi, 23 cotton, 11 linen, 10 jersey.
    title: 'Everyday Modest Dresses — Casual Maxi Dresses',
    description: 'Shop everyday modest dresses: maxi dresses in cotton, linen and jersey for daily wear, from independent modest fashion brands.',
  },
  '/modest-dresses?type=occasion': {
    // 94 / 13: ~20 gowns, ~15 cape dresses, 6 lace, 3 embellished. No row says
    // eid or wedding, so neither word is used.
    title: 'Modest Occasion & Evening Dresses — Gowns & Cape Dresses',
    description: 'Shop modest occasion and evening dresses: gowns, cape dresses and lace or embellished maxi dresses, from independent modest fashion brands.',
  },
  '/modest-dresses?type=slip': {
    title: 'Modest Slip Dresses for Women',
    description: 'Shop slip dresses for women from independent modest fashion brands, in one place. Compare prices across houses, checked nightly.',
  },
  '/modest-skirts?type=maxi': {
    // 92 / 29: 12 linen, 7 jersey, 3 satin.
    title: 'Modest Maxi Skirts for Women — Long Skirts Online',
    description: 'Shop modest maxi skirts for women: full-length skirts in linen, jersey, satin and more, from independent modest fashion brands.',
  },
  '/modest-skirts?type=pleated': {
    // 46 / 19: 9 maxi, 5 chiffon, 4 knit.
    title: 'Modest Pleated Skirts for Women',
    description: 'Shop modest pleated skirts for women: pleated maxi skirts in chiffon, knit and more, from independent modest fashion brands.',
  },
  '/modest-skirts?type=a-line': {
    title: 'Modest A-Line Skirts for Women',
    description: 'Shop modest A-line skirts for women, from independent modest fashion brands. Compare prices across houses, checked nightly.',
  },
  '/modest-trousers?type=tailored': {
    title: 'Modest Tailored Trousers for Women — Tailored Pants',
    description: 'Shop modest tailored trousers and pants for women, from independent modest fashion brands. Compare prices across houses, checked nightly.',
  },
  '/modest-sets?type=co-ord': {
    // Canonicalises to /modest-sets (CONSOLIDATED_INTO_LANE), so this is never
    // the indexed title; written only so it does not fall back to the template.
    title: 'Modest Co-ords for Women',
    description: 'Shop modest co-ords for women: matching pieces from independent modest fashion brands, in one place. Prices checked nightly.',
  },
  '/modest-swimwear?type=burkini': {
    // 55 / 11: 12 sets.
    title: 'Burkinis for Women — Full-Coverage Burkini Swimsuits',
    description: 'Shop burkinis for women: full-coverage burkini swimsuits and burkini sets, from independent modest swimwear brands.',
  },
  '/modest-swimwear?type=swim-legging': {
    title: 'Swim Leggings & Swim Pants for Women',
    description: 'Shop swim leggings and swim pants for women, to wear with a swim top or swim dress, from independent modest swimwear brands.',
  },
  '/modest-swimwear?type=swim-dress': {
    // 30 / 6: 20 swim dresses, 5 swim skirts.
    title: 'Modest Swim Dresses & Swim Skirts',
    description: 'Shop modest swim dresses and swim skirts for women, from independent modest swimwear brands. Prices checked nightly.',
  },
  '/modest-swimwear?type=swim-hijab': {
    title: 'Swim Hijabs & Swim Caps for Women',
    description: 'Shop swim hijabs and swim caps for women, made to be worn in the water, from independent modest swimwear brands.',
  },
  '/modest-swimwear?type=swim-top': {
    // 26 / 7: 16 titled swimsuit.
    title: 'Modest Swim Tops & Swimsuits for Women',
    description: 'Shop modest swim tops and swimsuits for women, from independent modest swimwear brands. Compare prices across houses, checked nightly.',
  },
  '/modest-swimwear?type=cover-up': {
    title: 'Modest Swim Cover-Ups for Women',
    description: 'Shop modest swim cover-ups for women, to wear over swimwear at the beach and pool, from independent modest fashion brands.',
  },
  '/modest-activewear?type=sports-hijab': {
    title: 'Sports Hijabs for Women — Hijabs for Training',
    description: 'Shop sports hijabs for women, made for training and everyday movement, from independent modest activewear brands.',
  },
  '/modest-activewear?type=active-set': {
    title: 'Modest Activewear Sets & Co-ords',
    description: 'Shop modest activewear sets and co-ords for women: matching sports pieces from independent modest activewear brands.',
  },
  '/modest-activewear?type=active-top': {
    // 39 / 8: 18 tops, 7 jackets, 5 hoodies.
    title: 'Modest Sports Tops & Jackets for Women',
    description: 'Shop modest sports tops, hoodies and jackets for women, for training and everyday wear, from independent modest activewear brands.',
  },
  '/modest-activewear?type=active-legging': {
    title: 'Modest Leggings & Sports Bottoms for Women',
    description: 'Shop modest leggings and sports bottoms for women, from independent modest activewear brands. Prices checked nightly.',
  },
  '/modest-activewear?type=sports-dress': {
    title: 'Modest Sports Dresses for Women',
    description: 'Shop modest sports dresses for women, made for training and movement, from independent modest activewear brands.',
  },
  '/layering-basics?type=neck-cover': {
    title: 'Neck Covers & Dickeys — Modest Layering',
    description: 'Shop neck covers and dickeys to wear under a lower neckline for extra coverage, from independent modest fashion brands.',
  },
  '/layering-basics?type=sleeve-extender': {
    title: 'Sleeve Extenders & Arm Covers',
    description: 'Shop sleeve extenders and arm covers to lengthen a short sleeve for full coverage, from independent modest fashion brands.',
  },
  '/layering-basics?type=shirt-extender': {
    title: 'Shirt Extenders — Modest Layering',
    description: 'Shop shirt extenders to lengthen a top worn over trousers or a skirt, from independent modest fashion brands.',
  },
  '/layering-basics?type=base-layer-top': {
    title: 'Base-Layer Tops — Modest Layering Tops',
    description: 'Shop base-layer tops to wear under dresses, abayas and sleeveless pieces, from independent modest fashion brands.',
  },
  '/layering-basics?type=cropped-body-shirt': {
    // 13 rows from ONE house, so the description does not say "brands".
    title: 'Cropped Body Shirts — Modest Layering',
    description: 'Shop cropped body shirts to wear under tops and dresses for sleeve and neck coverage. Prices checked nightly.',
  },
  '/layering-basics?type=under-dress': {
    // 121 / 23: mostly inner slip dresses and sleeveless underdresses.
    title: 'Under-Dresses & Inner Slip Dresses',
    description: 'Shop under-dresses and inner slip dresses to wear beneath abayas and sheer pieces, from independent modest fashion brands.',
  },
  '/designers': {
    title: 'Modest Fashion Brands & Designers — Curated Directory',
    description: 'A curated index of modest fashion brands, vetted for craft and taste — browse every designer in The Modesty House directory.',
  },
  '/editorial': {
    title: 'Blog — Modest Fashion Stories & Styling Guides',
    description: 'Stories, edits and styling guides on modest fashion from The Modesty House.',
  },
  /* Added 2026-08-26 with the /edits index route. Both strings are FUNCTIONAL —
     a page needs a title and a description to exist in a search result, and
     these state what the page contains rather than selling it (§10.18: no
     invented brand voice). "Edits" and the three edit names are Tina's own
     words; the rest is a plain description of the list. */
  '/edits': {
    title: 'The Edits — Curated Modest Fashion Selections',
    description: 'Every edit from The Modesty House: hand-picked selections of modest pieces from across the directory, chosen and grouped by theme.',
  },
  '/faq': {
    title: 'FAQ — How The Modesty House Works',
    description: 'Common questions about The Modesty House: how brands are chosen, how buying works, prices and currency, and what modest fashion means.',
  },
};
