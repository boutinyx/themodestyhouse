import type { Product } from './types';

/**
 * /edits/[slug] — a shoppable EDIT: campaign hero, then the pieces.
 *
 * Not an editorial post. Tina, 2026-08-24, after I proposed a written
 * explainer: *"this is for a normal blogpost what i was talking about more was
 * something like this"* + the aabcollection.com "The Art Of Summer / HIGH
 * SUMMER 2026 / SHOP NEW IN" hero. Then, on the lace one specifically:
 * *"its going to be only items and maybe somewhere an explanation how you can
 * style it but mostly items"*.
 *
 * So the shape is deliberate and the ratio is the point: hero, grid, and one
 * short styling block placed AFTER the grid — the same ordering rule
 * lib/laneAnswers.ts already follows, for the same reason. A shopper wants the
 * pieces first.
 *
 * WHY THIS IS ITS OWN ROUTE and not a lane. A lane is a garment category
 * (`lib/lanes.ts`) and every lane owns a permanent slice of the catalogue. An
 * edit is a THEME cutting across categories — lace runs through abayas,
 * dresses, tops, skirts and hijabs at once — and it is allowed to be seasonal
 * and to be retired. Adding "lace" to LANES would have put it in the nav, the
 * footer and the category grid as though it were a permanent department.
 *
 * SEO note: an edit page is a COLLECTION page, which matters more than it
 * sounds. Checked on 2026-08-24: the SERPs for commercial queries like
 * `lace hijab` and `modest dress` are made of collection and product pages, not
 * articles — so a written post cannot rank for them and a page of this shape
 * can. That is the whole reason this route exists rather than a fourth blog
 * post. → docs/log/2026-08-24-modest-trend-research-for-edit.md
 */
export type Edit = {
  slug: string;
  /** Big display title over the hero. */
  title: string;
  /** Small caps line under it — the "HIGH SUMMER 2026" slot. */
  eyebrow: string;
  /**
   * One line of hero copy under the title. OPTIONAL — Tina removed Everyday
   * Lace's ("Not saved for the occasion.") on 2026-08-24, so both surfaces that
   * render it (EditBanner and the edit page hero) guard on it. An edit with no
   * dek shows title + eyebrow only.
   */
  dek?: string;
  /** Hero photograph, from public/. Give a NEW filename when replacing it —
   *  public/ is served with a 4h cache and is not fingerprinted (CLAUDE.md §6). */
  image: string;
  /** Phone hero — a SEPARATE 5:8 portrait crop, not the desktop file squeezed.
   *  The two ratios (16:9 / 5:8) are far enough apart that object-cover has to
   *  throw away most of the frame to get from one to the other, and on this
   *  image it would crop the model out entirely: she stands right of frame. */
  imageMobile: string;
  /** The photographs' REAL pixel ratios, `w / h`.
   *
   *  Here rather than hard-coded in CSS because "do not crop it" is only
   *  achievable if the box is the shape of the image inside it, and that shape
   *  belongs to the image, not to the layout. The two heroes are genuinely
   *  different shapes — 1.7917 and 0.7468 — and a future edit's will be
   *  different again, so a shared `.edit-hero { aspect-ratio: 16/9 }` would
   *  silently start cropping the moment someone swaps a photograph.
   *
   *  Measure them; do not round. 5/8 (0.625) was close enough to the old phone
   *  crop and is 16% off this one, which would have trimmed both sides. */
  imageRatio: number;
  imageMobileRatio: number;
  /** srcset widths actually generated for each, by scripts/optimise-images.mjs.
   *  Listed rather than assumed: that script never upscales, so asking for a
   *  width the source cannot supply silently yields no file and a 404 in the
   *  srcset. */
  imageWidths: number[];
  imageMobileWidths: number[];
  imageAlt: string;
  /** Which edit the homepage banner shows. Exactly one should carry it.
   *
   *  An explicit flag rather than `EDITS[0]`, which is what the banner used
   *  while there was only one edit. An array position is not a decision — the
   *  moment a second edit is added, whichever happens to be written first wins
   *  the homepage, silently. This makes the choice something you can see and
   *  change in one place.
   *
   *  If none is flagged the banner falls back to the first, so the homepage can
   *  never end up with no banner because someone removed a flag. */
  featured?: boolean;
  /** Where the copy sits in the HOMEPAGE banner: 'left' (default) or 'center'.
   *
   *  Per-edit because it depends on the photograph. Everyday Lace has the model
   *  hard right against an empty door, so left is the only place the type can
   *  go. Jersey Hijabs is a mirrored interior with the subject on both sides of
   *  the frame and nothing to sit beside, so centred reads better.
   *
   *  The wash follows it: left-aligned copy gets a left-weighted gradient,
   *  centred copy gets a vertical one, because a left-weighted wash under
   *  centred type darkens the wrong half of the picture. */
  bannerAlign?: 'left' | 'center';
  /** How dark the wash over the hero goes, as the gradient's MAX alpha.
   *
   *  Per-edit because it depends entirely on the photograph. Everyday Lace is a
   *  bright daylight shot and needed 0.26 ("not too dark just littke bit");
   *  Jersey Hijabs is a dark gold-mirrored interior where the copy lands on
   *  the photograph itself, so it takes more. A single site-wide value would
   *  either wash out the bright one or lose the type on the dark one.
   *  Defaults to 0.26 when unset. */
  heroWash?: number;
  /** <title> and meta description. Written to the query the page is FOR. */
  seoTitle: string;
  seoDescription: string;
  /**
   * Street photographs that sit with the styling text.
   *
   * `credit` is the Instagram handle WITHOUT the @, or null where the owner is
   * not known. Three of the five here are uncredited — one was labelled
   * "@unknown" on Tina's own moodboard — and that is recorded honestly rather
   * than papered over: a missing credit is a thing to go and find, not a
   * cosmetic gap. Nothing renders a fake attribution.
   *
   * Note the FILENAMES describe the photograph, never the credit. The first cut
   * named them after handles and the @basma_k credit turned out to be on the
   * wrong photo (her moodboard placed labels BESIDE images, and I read one as
   * belonging to the image below it). Correcting the credit then left a file
   * called `-basma-k` that was not hers. A credit can move; what is in the
   * picture cannot.
   *
   * These are other people's photographs. Flagged to Tina 2026-08-24: on a
   * commercial affiliate site that needs the owner's permission, and three of
   * these five have no identified owner to ask. Her call; recorded here so the
   * next person knows it was a decision and not an oversight.
   */
  storyImages?: { src: string; alt: string; credit: string | null }[];
  /** The styling block. `paragraphs` sit ABOVE the photographs, `paragraphsBelow`
   *  under them — Tina, 2026-08-24, naming the denim and contrast paragraphs
   *  specifically: "put this one under the pictures". The split is data, not a
   *  slice index, so moving a paragraph across is an edit to this file rather
   *  than a change to the component.
   *
   *  Tina's words, not generated — she wrote the lace one on 2026-08-24 and
   *  §10.18 is the reason that matters: the mechanism is mine, the voice is
   *  hers. Anything written here that she has not said should be marked as a
   *  placeholder, the way the first draft of this block was.
   *
   *  FOLLOW-UP she raised in the same message: *"in the future I wanna make a
   *  list of what it means by structure. Or by proportion or silhouette,
   *  because I'm gonna use that a lot"*. A shared glossary of those terms would
   *  be linkable from every edit's styling block rather than re-explained in
   *  each one. Not built — noted here so it is not lost. */
  styling: { h2: string; paragraphs: string[]; paragraphsBelow?: string[] };
  /**
   * Which pieces belong, when nobody has hand-picked them. A predicate over the
   * published catalogue rather than a fixed id list, because the catalogue
   * turns over nightly (`.github/workflows/refresh.yml`) and a fixed list goes
   * stale on its own.
   *
   * Still required even when `productIds` is set: it is what the edit falls
   * back to, and what a new edit starts life as before anyone curates it.
   */
  match: (p: Product) => boolean;
  /**
   * Hand-picked pieces, in the order they should appear. Wins over `match`
   * entirely when present — Tina, 2026-08-24: "i want to be able to pic the
   * items ill do it with the curate page spend you the list".
   *
   * Ids are the catalogue's own `${brandSlug}:${shopifyId}` (Invariant 1).
   *
   * THE FAILURE MODE TO KNOW: a picked id that leaves the catalogue — brand
   * delists it, or it goes out of stock — simply vanishes from the edit, and
   * the page still renders fine with one fewer piece. That is silent, and this
   * catalogue delists something most nights. `lib/edits.test.ts` asserts every
   * picked id still resolves, so it turns up as a red test locally instead of
   * as an edit that quietly shrinks over a month. It skips in CI for the reason
   * §10.19 gives: a test over bot-mutated data is an authoring aid, not a build
   * gate.
   */
  productIds?: string[];
  /**
   * Whether hijabs may appear.
   *
   * READ THIS BEFORE COPYING IT. CLAUDE.md Invariant 5 says hijabs never appear
   * in mixed grids — they belong to their own lane. That rule exists so a
   * general clothing grid is not diluted by 3,000 scarves, and it stands.
   *
   * An edit is the case the rule did not anticipate: a THEME, where excluding
   * hijabs would remove the part that makes the theme true. For lace it would
   * cut the 41 lace hijabs — which are the cheapest lace in the directory
   * ($6.90) and therefore the entire evidence for calling the edit "everyday".
   * So this is opt-in, per edit, and defaults to OFF so no future edit inherits
   * the exception by accident.
   */
  includeHijabs?: boolean;
};

/** Accessories and oddments that match a fabric word but are not the edit.
 *  Same class of false positive as CLAUDE.md §10.10 — a keyword is evidence,
 *  never proof. Checked against real titles: "Velvet Cap Grip" (an AUD11
 *  undercap grip) and "Leather Cap with Embroidery Detail" both matched their
 *  fabric word and are plainly not feature pieces. */
const NOT_A_GARMENT = /\bpin\b|magnet|\bsock\b|glove|\bbag\b|clutch|jewel|earring|necklace|\bgrip\b|gift card|\bcard\b/i;

/**
 * "lace-up" is a FASTENING, not the fabric.
 *
 * Caught 2026-08-24 while checking whether the catalogue really holds the item
 * types Tina described. `/\blace\b/` matched **57 of 428** pieces that contain
 * no lace at all — "Lace-Up Corset Cotton Shirt", "Eyelet Lace Up Maxi Dress",
 * "Lace Up Back Tencel Maxi Dress - Denim". Cotton poplin, tencel and denim
 * garments with a drawstring, sitting in an edit about lace.
 *
 * 13% of the grid. Straight out of CLAUDE.md §10.10: a keyword match is
 * evidence FOR a category, never proof, and every rule over third-party titles
 * needs its negative case tested before it ships. I shipped this one without
 * doing that.
 */
const LACE_UP = /lace[-\s]?up/i;

export const EDITS: Edit[] = [
  {
    slug: 'everyday-lace',
    title: 'Everyday Lace',
    eyebrow: 'The Edit · Autumn 2026',
    // Tina's own shot, supplied 2026-08-24, replacing the borrowed placeholder.
    // It is the lace belt from her own list of lace types — a black lace sash
    // tied over a structured butter-yellow jacket and a brown satin column
    // skirt — which makes it the edit's styling argument in one frame: lace
    // against structure, and hard contrast so the lace reads.
    // v2, 2026-08-24: a Magnific upscale (5504x3072) plus a purpose-shot
    // portrait for the phone (1920x2571), replacing the 1672x941 original whose
    // ceiling capped desktop at 1672 and left the phone crop a ~2x stretch.
    image: '/edit-lace-hero-v2.jpg',
    imageMobile: '/edit-lace-hero-mobile-v2.jpg',
    imageRatio: 5504 / 3072,
    imageMobileRatio: 1920 / 2571,
    imageWidths: [640, 1024, 1440, 1920, 2400, 3200, 3840],
    imageMobileWidths: [390, 780, 1170, 1560, 1920],
    imageAlt:
      'A woman in a brown hijab and sunglasses leaning in a doorway, wearing a black lace sash tied over a butter-yellow jacket and a brown satin maxi skirt',
    seoTitle: 'Everyday Lace — Lace Hijabs, Abayas and Dresses',
    seoDescription:
      'Lace across the directory, from £5 lace-trim hijabs to lace abayas — from independent modest houses worldwide. Prices and links to each brand.',
    storyImages: [
      { src: '/edits/lace-story-1-belt.jpg', credit: null,
        alt: 'A woman in a brown blazer and cream satin skirt with a white lace belt tied at the waist' },
      { src: '/edits/lace-story-2-overskirt.jpg', credit: 'basma_k',
        alt: 'A woman in a plain black top and black wide-leg trousers with a white lace overskirt at the hip' },
      { src: '/edits/lace-story-3-black-coat.jpg', credit: 'jenifersibali',
        alt: 'A woman in an oversized black coat and black trousers with a white lace skirt showing beneath' },
      { src: '/edits/lace-story-4-taupe-suit.jpg', credit: null,
        alt: 'A woman in a taupe suit with a black lace hem showing under the jacket' },
      { src: '/edits/lace-story-5-abaya.jpg', credit: null,
        alt: 'A woman in a sage green open abaya with floral lace trim down the front, worn over jeans' },
    ],
    styling: {
      h2: 'Why lace works, and what to put it with',
      paragraphs: [
        'Lace adds detail without changing the outfit. That is the whole reason it earns a place in an everyday wardrobe — you are not rebuilding a look, you are giving one you already own the bit of flair it was missing. If something feels boring, you do not need a different outfit. You need one lace piece in it.',
        'The rule is to wear it with something structured. Structured does not mean stiff, and it does not mean the opposite of flowy — a satin [skirt](/modest-skirts) is flowy and still structured, because it falls in one straight line. It moves, but it never goes soft. Soft is the thing to avoid: lace against soft reads as one blurry texture and you lose the lace completely.',
      ],
      paragraphsBelow: [
        'Denim is the easiest version of this. It works because it is soft against hard, and those two are about as far apart as fabrics get, so each one makes the other more obvious. A lace top under a denim jacket. A lace-trim scarf with jeans. You do not have to think about it beyond that.',
        'Then contrast, which lace loves. Black lace against white pulls every eye straight to the lace, because nothing else in the outfit is competing for the attention. Put that same black lace on black and it quietly disappears into everything around it.',
      ],
    },
    /**
     * Tina's own picks from /staff/curate, 2026-08-24, in her order with two
     * rules she gave with them: "mix the hijabs up dont put them all next ot
     * eachother and put the manzaram one towards the end".
     *
     * She sent them with all four hijabs bunched at the end and Manzaram first.
     * Reordered to honour both asks, and while doing it, so no two pieces from
     * the SAME HOUSE sit next to each other either — Bemu appears three times,
     * Vela three, Abayas Boutique, Modesty in Style and Hawaa twice each, and
     * side by side they read as one brand's shelf rather than a directory's
     * edit.
     *
     * Resulting spread: hijabs at 3, 7, 12 and 17; Manzaram at 22 of 24; no
     * repeated house adjacent. Verified by lib/edits.test.ts rather than by
     * eye, so a future re-order cannot quietly undo it.
     *
     * All 24 resolved and were in stock when added — the last, Ellem Atelier,
     * added afterwards from a product URL Tina sent. If one stops resolving the
     * edit silently loses a piece — that is what the picked-ids test exists to
     * catch.
     */
    productIds: [
      'esme-ny:8193039827037', // Esme New York — Lace Butterfly Cape Top in Sky Blue
      'bayt-el-hayat:15832657559926', // Bayt El Hayat — Lace Abaya and Hijab Set, Nude
      'vela:9119980880028', // Vela Scarves — Jasmine White Lace
      'zora:8777906946211', // Zora Designers — The Alba Lace Skirt
      'abayabuth:16101218976122', // AbayaButh — Premium Elara Lace Open Abaya, Rose Taupe
      'bemu:10121028469027', // Bemu — Lace Drape Top, Beige
      'hawaa:15866723762549', // Hawaa Clothing — Espresso Lace Modal Hijab
      'abayas-boutique:32410', // Abayas Boutique — Lace Abaya Set, Ruby
      'modern-hijabi:9388333498582', // Modern Hijabi — Lace Skirt/Shirt Set, Floral
      'modesty-in-style:10683424899382', // Modesty in Style — Liana Maxi Lace Top
      'awrah-abayas:11600384557324', // Awrah Abayas — Mocha Lace Abaya
      'vela:9119981011100', // Vela Scarves — Powder Blue Lace
      'ilovemodesty:10303139283265', // iLoveModesty — White Self-Textured Lace Jacket Matching Set
      'by-hasanat:15098402079093', // ByHasanat — Lace Flower Abaya in Sage
      'bemu:10070437134627', // Bemu — Lace Maxi Skirt, Taupe
      'merrachi:15638951723391', // MERRACHI — Lace Detailed Top, Khaki
      'hawaa:15910989365621', // Hawaa Clothing — Black Polka Modal Lace Hijab
      'urban-modesty:8057437651019', // Urban Modesty — Beige Lace Trim Open Abaya and Hijab Set
      'modesty-in-style:10614938075446', // Modesty in Style — Lila Lace Set
      'vela:8350999085212', // Vela Scarves — Black Lace Abaya
      'bemu:10148012753187', // Bemu — Lace Abaya Set, Beige
      'manzaram:15746672918853', // Manzaram — Satin top with lace detail
      'abayas-boutique:24224', // Abayas Boutique — Lace Set
      'ellem-atelier:10493655384407', // Ellem Atelier — Warm beige lace abaya set
    ],
    match: (p) => /\blace\b/i.test(p.title) && !LACE_UP.test(p.title) && !NOT_A_GARMENT.test(p.title),
    includeHijabs: true,
  },
  {
    slug: 'jersey-hijabs',
    title: 'Jersey Hijabs',
    // Both edits show on the homepage as of 2026-08-25; `featured` now only
    // decides which one comes FIRST.
    featured: true,
    bannerAlign: 'center',
    eyebrow: 'The Edit · Autumn 2026',
    dek: 'The one you actually wear.',
    // Tina's own shots, 2026-08-24. The phone one is a real 1792x2400 portrait
    // rather than a crop of the landscape, so nothing is thrown away.
    // Ceiling worth knowing: the desktop source is 1672px, so there is no 1920
    // variant and a wider viewport gets the native file.
    image: '/edit-jersey-hero.jpg',
    imageMobile: '/edit-jersey-hero-mobile.jpg',
    imageRatio: 1672 / 941,
    imageMobileRatio: 1792 / 2400,
    imageWidths: [640, 1024, 1440, 1672],
    imageMobileWidths: [390, 780, 1170, 1560, 1792],
    imageAlt:
      'A woman adjusting a brown jersey hijab in a gold mirrored lift, wearing a cream blazer',
    // Darker than the lace hero's 0.26 — "i want a darker overlay on this one".
    // The copy sits on the photograph here rather than on empty background, and
    // the gold reflections behind it are bright enough to eat white type.
    heroWash: 0.46,
    // Written to the query this page is FOR. `jersey hijab` is the largest term
    // in this territory — 5x `lace abaya`, 2.2x `hijab styles`, 3x `instant
    // hijab` on one shared Trends scale — and its SERP is entirely collection
    // and product pages, which is the format this route already is.
    // Deliberately NOT "guide to..." or "how to wear...": measured, `jersey
    // hijab tutorial` and `jersey hijab styles` are both 0.00, and `hijab
    // tutorial` (0.73) is video intent that YouTube owns. The how-to-wear
    // section lives INSIDE the page instead.
    // The three modifiers in the subtitle are the real rising ones: premium
    // +130%, bamboo +160%, liquid jersey +950% in the UK.
    seoTitle: 'Jersey Hijabs — Premium, Bamboo and Liquid Jersey',
    seoDescription:
      'Jersey hijabs from independent modest houses worldwide — premium, bamboo, liquid jersey and instant styles, from £5. Prices and links to each brand.',
    styling: {
      h2: 'What makes a good jersey hijab',
      // SHORT ON PURPOSE. The first cut ran 411 words and Tina killed it —
      // "nobody is reading that shit i want you to only write what people will
      // care about". This is ~150. What survived the cut is what changes a
      // buying decision: it grips, the four names mean different things, the
      // length is the thing that disappoints people, and which one to wear
      // when. What went: the 950% search stat, the fabric-composition
      // citation, and every sentence that was interesting to write rather than
      // useful to read.
      paragraphs: [
        'Jersey grips. It holds against itself and against your undercap, so it stays put with no pin — that is the whole appeal. A bad one is either too smooth, and slides, or too thin, and goes see-through the moment there is a light behind you.',
        'The four words are not interchangeable. **Premium** is the densest and most opaque. **Bamboo** is softer and cooler, drapes closer, grips a little less. **Liquid** is the silkiest, with the most fall. **Ribbed** has the most grip and holds its shape.',
      ],
      paragraphsBelow: [
        'Check the length — almost nobody lists it, and it is where the disappointment comes from. **Standard** is about 68 x 32 inches: wraps twice with enough left to drape. **Mini** is about 62 x 20 — narrower rather than shorter, so no drape down the front. If a listing does not say, assume mini and ask.',
        'Buy for the day, not the photograph. Liquid and bamboo look best and slip most. Premium and ribbed stay put.',
      ],
    },
    /**
     * Tina's picks from /staff/curate, 2026-08-25. 31 pieces, all hijabs, all
     * in stock when added.
     *
     * Reordered so no house sits next to itself — Hawaa Clothing appears five
     * times, Diversity Modest, Eynaa Paris and Yasmin Jay three each, and five
     * more twice. Placed by the standard greedy interleave (always take the
     * brand with the most remaining that is not the one just placed), which
     * works because no house holds more than ceil(31/2). Result: zero adjacent
     * pairs, asserted by lib/edits.test.ts.
     *
     * The hijab-adjacency rule does NOT apply here and the test now says so
     * explicitly: every piece in this edit is a hijab, so "never two in a row"
     * is unsatisfiable rather than violated.
     *
     * Her last line arrived truncated — "Misty Rose Jersey Scarf" with no house.
     * Resolved to Yasmin Jay's: the only jersey scarf of that name in the
     * catalogue (the other Misty Rose hits are a chiffon, a viscose and an
     * abaya set).
     */
    productIds: [
      'hawaa:15860139655541', // Hawaa Clothing — Mauve Bamboo Jersey Hijab
      'diversity-modest:10104226939214', // Diversity Modest — Airy Jersey Scarf Mocha Brown
      'hawaa:15860139098485', // Hawaa Clothing — Olive Bamboo Jersey Hijab
      'eynaa-paris:10852396892503', // Eynaa Paris — Hijab Jersey Premium Soft [Beige]
      'yasmin-jay:8080732553392', // Yasmin Jay — Liquid Jersey Rose Taupe
      'hawaa:15024853746037', // Hawaa Clothing — Black Bamboo Jersey Hijab
      'diversity-modest:15846428934478', // Diversity Modest — Airy Jersey Scarf Powder Blue
      'eynaa-paris:10293749252439', // Eynaa Paris — Hijab Jersey Premium Soft [Cappuccino]
      'jennah-boutique:7784159510704', // Jennah Boutique — Jersey Breath ruby
      'nurmire:9967193620809', // Nurmirè — Premium Jersey Hijab - Mulberry
      'yasmin-jay:8080445440176', // Yasmin Jay — Liquid Jersey Powder
      'losyana:9778842599762', // Losyana — Premium Jersey - sky blue
      'hidayah:10530799976795', // Hidayah — Hidayah Bloom Printed Jersey (Arya)
      'hawaa:15707655733621', // Hawaa Clothing — Walnut Cloud Jersey Hijab
      'voile-chic:8878418886909', // Voile Chic — Ribbed Jersey Hijab - Charcoal Grey
      'diversity-modest:10500751393102', // Diversity Modest — Ice Silk Jersey Scarf Taupe
      'eynaa-paris:9615662219607', // Eynaa Paris — Premium Soft Jersey Hijab [Gree]
      'nour-al-houda:7781509070896', // Nour Al Houda (BNAH) — Bamboo Jersey Hijab Set - Cedar
      'jennah-boutique:7764216709296', // Jennah Boutique — Jersey Breath navy
      'nurmire:9798333202761', // Nurmirè — Satin Jersey Hijab - Beige
      'chic-modesty:10323101811026', // Chic & Modesty — Almond green premium jersey hijab
      'yasmin-jay:7910436208816', // Yasmin Jay — Misty Rose Jersey Scarf
      'modesty-in-style:10797100106038', // Modesty in Style — Khaki Jersey Set
      'urban-modesty:7500430508107', // Urban Modesty — Ombré Jersey Hijab
      'losyana:10645916582226', // Losyana — Vela Jersey - light beige
      'culture-hijab:10186618437930', // Culture Hijab Co — Premium Jersey Hijab
      'hidayah:7603885670571', // Hidayah — Premium Plain Jersey (Peru)
      'hawaa:15633575641461', // Hawaa Clothing — Pink Bamboo Jersey Hijab
      'haute-hijab:10490069959', // Haute Hijab — Premium Jersey Hijab - Mocha
      'voile-chic:8129717469437', // Voile Chic — Bamboo Ribbed Jersey Hijab - Mocha Brown
      'fares:8272751132863', // Fares — Matching Jersey Hijab Set - Real Teal
    ],
    /**
     * Jersey hijabs only, until Tina curates in /staff/curate.
     *
     * `\bjersey\b` on the title AND garment === 'hijab': the word alone also
     * catches jersey skirts, dresses and abayas (195 of the 1,595 jersey pieces
     * are not hijabs), and this edit is named for the hijab.
     */
    match: (p) => /\bjersey\b/i.test(p.title) && p.garment === 'hijab' && !NOT_A_GARMENT.test(p.title),
    // Not optional here — the entire edit is hijabs, so the Invariant 5
    // exception is the point rather than a compromise. See the flag's own note.
    includeHijabs: true,
  },
];

export function editBySlug(slug: string): Edit | undefined {
  return EDITS.find((e) => e.slug === slug);
}

/* NOTE ON WHAT IS *NOT* IN THIS FILE.
 * `productsForEdit()` lives in lib/products.ts, not here, and the only import
 * above is a TYPE import (erased at compile time). That is deliberate: this
 * module is imported by components/Footer.tsx to list the live edits, and
 * anything that reaches lib/products.ts reaches `node:fs`. Footer happens to be
 * a server component today, but Invariant 10 exists because that is exactly the
 * kind of thing that changes later and fails confusingly. Keeping the edit
 * DEFINITIONS client-safe means no future 'use client' file can break by
 * importing them. */
