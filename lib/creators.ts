import { isProductionHost } from './deployEnv';
import type { Product } from './types';
import type { CardProduct } from './compactCatalogue';

/**
 * /creators — creator shops: a creator's own page with her picks from the
 * catalogue, grouped into collections, each piece with a short note in her
 * words. Design agreed with Tina on 2026-10-04
 * (docs/log/2026-10-04-creator-shops-mockup.md).
 *
 * STAGING ONLY, for now. The three creators below are FICTIONAL — AI-generated
 * photographs and made-up handles — so the whole section 404s on the real
 * domain (`creatorsEnabled`), keyed off the request host like robots.ts. Their
 * photos live in mockups/creator-shops/, served by a route with the same gate,
 * so not even the image files are reachable on production. Replace these
 * records with real creators (who have agreed, with their own words and
 * photos) before this section is ever enabled on production.
 *
 * Product ids, not URLs: `${brandSlug}:${shopifyId}` is the join key
 * (Invariant 1). Picks that are no longer live are skipped at render time, so a
 * nightly delisting shortens a collection rather than breaking it.
 */

export type CreatorCollection = {
  slug: string;
  title: string;
  /** One line in her voice, shown on the collection cover. */
  note: string;
  /** Her picks, in order, each with a short note. */
  picks: { id: string; note: string }[];
};

export type Creator = {
  slug: string;
  name: string;
  handle: string;
  city: string;
  bio: string;
  photo: string;
  collections: CreatorCollection[];
};

const MEDIA = '/mockups/creator-shops';

const pick = (ids: string[], notes: string[]) => ids.map((id, i) => ({ id, note: notes[i] ?? '' }));

export const CREATORS: Creator[] = [
  {
    slug: 'layla',
    name: 'Layla',
    handle: 'laylaelamrani',
    city: 'London',
    bio: 'Neutral tones, good tailoring, one statement piece. Uni by day, dinners by night.',
    photo: `${MEDIA}/layla.jpg`,
    collections: [
      {
        slug: 'layers-for-fall',
        title: 'Layers for fall',
        note: 'coats and blazers that go over everything',
        picks: pick(
          ['bait-hanayen:15425348075631', 'zayda:9399787389160', 'meriam-abdulaziz:10525063708950', 'whiteicy:15666941493588', 'manzaram:15728301736261', 'zuhre:8462042103945', 'la-petite-parisienne:15491765567828'],
          ['the trench of my dreams', 'smart but easy', 'warm without bulk', 'instant outfit', 'the perfect camel', 'office to dinner', 'oversized in the best way'],
        ),
      },
      {
        slug: 'tailoring-i-live-in',
        title: 'Tailoring I live in',
        note: 'sharp but never stiff',
        picks: pick(
          ['sei-sorelle:7095557292113', 'oomah:7656653455439', 'nihan:15142840828267', 'baqa:9315137487099', 'jennah-boutique:7861174501552', 'ilovemodesty:10009570935105', 'chic-modesty:10323116589394', 'beyza:10136416583864'],
          ['the perfect wide leg', 'office to dinner', 'fits like it was made for me', 'my interview outfit', 'looks expensive, isn’t', 'goes with every hijab', 'the cut is everything', 'my most-worn trousers'],
        ),
      },
      {
        slug: 'neutral-knits',
        title: 'Neutral knits',
        note: 'soft, warm, goes with everything',
        picks: pick(
          ['ellem-atelier:11050571170135', 'try-modest:15395772104928', 'zora:9156774461603', 'lafemme:32899', 'mondo-the-label:7935860572222', 'modista:9641747054882', 'inayah:9974655680792', 'ilovemodesty:9870226882881'],
          ['cosiest thing I own', 'layers over everything', 'the perfect oatmeal', 'wore it all winter', 'soft, not itchy', 'so easy to style', 'my sunday uniform', 'instant cosy'],
        ),
      },
    ],
  },
  {
    slug: 'amira',
    name: 'Amira',
    handle: 'ammiri',
    city: 'Rotterdam',
    bio: 'If there’s a nikah, a walima or an Eid dinner, I’ve already planned the outfit.',
    photo: `${MEDIA}/amira.jpg`,
    collections: [
      {
        slug: 'wedding-guest-season',
        title: 'Wedding guest season',
        note: 'for every nikah, walima and engagement',
        picks: pick(
          ['modern-hijabi:9389146505430', 'lafemme:32347', 'store-wf:16075670487420', 'modest-timeless:8519061471450', 'zahraa:7658947739735', 'manzaram:15721994912069', 'mukistore:15639299817737'],
          ['wore it to my cousin’s nikah', 'photographs so well', 'the cut is everything', 'dance-floor approved', 'elegant without trying', 'got three compliments', 'the fabric moves beautifully'],
        ),
      },
      {
        slug: 'abayas-id-buy-again',
        title: 'Abayas I’d buy again',
        note: 'the ones that earned their place',
        picks: pick(
          ['hawaa:15924114391413', 'feradje:6745914540093', 'cult-abaya:8700648161340', 'kamin:9180597354713', 'chi-ka:8281796772001', 'latifi:8870799933689', 'feeya:10187385569586', 'illi-studio:8763427356824'],
          ['the drape', 'my everyday abaya', 'looks far more expensive', 'perfect for Jummah', 'travel-proof', 'classic forever', 'statement sleeves', 'fits like a dream'],
        ),
      },
      {
        slug: 'satin-for-eid',
        title: 'Satin for Eid',
        note: 'Eid, sorted, every year',
        picks: pick(
          ['labayah:15232747798863', 'malikaat:15723609129333', 'chi-ka:8477333029025', 'fares:8467614335167', 'fatima-diallo:8836044816620', 'manzaram:15819447140677', 'hijabipop:8173838467125', 'summer-evenings:9310922604794'],
          ['the sheen in photos', 'Eid morning outfit', 'dressy without trying', 'the colour is unreal', 'flows beautifully', 'compliments all day', 'wore it to three dinners', 'my favourite this year'],
        ),
      },
    ],
  },
  {
    slug: 'yasmin',
    name: 'Yasmin',
    handle: 'yaszzmi_x',
    city: 'Brussels',
    bio: 'Easy outfits for real days: uni, errands, coffee. One bright piece, the rest simple.',
    photo: `${MEDIA}/yasmin.jpg`,
    collections: [
      {
        slug: 'my-everyday-uniform',
        title: 'My everyday uniform',
        note: 'what I actually wear five days a week',
        picks: pick(
          ['inayah:10356967932184', 'bemu:10301260595491', 'esme-ny:8195045392477', 'arakai:10944862093658', 'zora:9205750825123', 'veiled:7691894587497', 'nasiba:10538582835509', 'jawda:16069869109628'],
          ['lives in my suitcase', 'the colour sold me', 'my uni uniform, honestly', 'softest thing I own', 'pairs with everything', 'wore it three days in a row', 'everyone asks where it’s from', 'weekend favourite'],
        ),
      },
      {
        slug: 'co-ords-on-repeat',
        title: 'Co-ords on repeat',
        note: 'one outfit, zero thinking',
        picks: pick(
          ['zahraa:7658948067415', 'khair-archives:10266196181321', 'modesty-in-style:10367028658486', 'modista:9758663475490', 'golden-dune:11067705950551', 'mondo-the-label:8139334058046', 'parladusa:15678223122758', 'nihan:15142830735723'],
          ['wear together or apart', 'my lazy-day hero', 'looks put together', 'travel essential', 'so comfortable', 'uni approved', 'three ways to wear it', 'bought it in two colours'],
        ),
      },
      {
        slug: 'hijabs-i-swear-by',
        title: 'Hijabs I swear by',
        note: 'no slipping, no fuss, all day',
        picks: pick(
          ['dignitii:6852874928210', 'culture-hijab:10194225692970', 'haute-hijab:7761941954656', 'vela:9119980716188', 'jaida:8763206467783', 'klay:9317951176856', 'maison-hijab:15932530721093', 'merrachi:15643739357567'],
          ['stays put all day', 'my go-to jersey', 'the perfect nude', 'so breathable', 'no pins needed', 'pretty for occasions', 'soft on the skin', 'every colour, please'],
        ),
      },
    ],
  },
];

/** Moments group collections across creators, by collection slug. */
export const MOMENTS: { slug: string; name: string; collections: string[] }[] = [
  { slug: 'wedding-guest', name: 'Wedding guest', collections: ['wedding-guest-season', 'satin-for-eid'] },
  { slug: 'everyday', name: 'Everyday', collections: ['my-everyday-uniform', 'co-ords-on-repeat', 'neutral-knits'] },
  { slug: 'abayas', name: 'Abayas', collections: ['abayas-id-buy-again'] },
  { slug: 'fall-layers', name: 'Fall layers', collections: ['layers-for-fall', 'tailoring-i-live-in', 'neutral-knits'] },
];

/** The newest collections, newest first. */
export const LATEST: [creator: string, collection: string][] = [
  ['yasmin', 'co-ords-on-repeat'],
  ['amira', 'satin-for-eid'],
  ['layla', 'tailoring-i-live-in'],
  ['amira', 'wedding-guest-season'],
  ['yasmin', 'my-everyday-uniform'],
  ['layla', 'neutral-knits'],
];

/** Off on the real domain until real creators replace the fictional ones. */
export function creatorsEnabled(host: string | null | undefined): boolean {
  return !isProductionHost(host);
}

export const creatorBySlug = (slug: string) => CREATORS.find((c) => c.slug === slug);
export const collectionBySlug = (c: Creator, slug: string) => c.collections.find((k) => k.slug === slug);
export const momentBySlug = (slug: string) => MOMENTS.find((m) => m.slug === slug);

export function collectionsForMoment(slug: string): { creator: Creator; collection: CreatorCollection }[] {
  const m = momentBySlug(slug);
  if (!m) return [];
  return CREATORS.flatMap((creator) =>
    creator.collections.filter((k) => m.collections.includes(k.slug)).map((collection) => ({ creator, collection })),
  );
}

export type CreatorPick = { card: CardProduct; note: string };

/** Live picks only, in her order, as the 9-field card the grid renders. */
export function resolvePicks(collection: CreatorCollection, live: Map<string, Product>): CreatorPick[] {
  return collection.picks.flatMap(({ id, note }) => {
    const p = live.get(id);
    if (!p) return [];
    const card: CardProduct = {
      id: p.id,
      brandSlug: p.brandSlug,
      garment: p.garment,
      title: p.title,
      brandName: p.brandName,
      price: p.price,
      currency: p.currency,
      image: p.image,
      url: p.url,
      ...(p.altUrl ? { altUrl: p.altUrl } : {}),
    };
    return [{ card, note }];
  });
}
