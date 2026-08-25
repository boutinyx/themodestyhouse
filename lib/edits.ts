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
  /** The tile that fills the empty slot at the END of the grid — Tina:
   *  "put in the space where normally the card sits but now its emprty ... to
   *  send them to more hijabs so like: do you want more? and then link".
   *
   *  A curated edit almost never divides evenly by the column count, so the last
   *  row has a hole in it. This puts the obvious next step there instead of
   *  whitespace. It only renders once EVERY item is on screen — showing "want
   *  more?" while a Load more button is still sitting there would be telling
   *  someone they have finished when they have not. */
  more?: { href: string; label: string };
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
  /** The same, for phone and tablet, where the crop is portrait and the copy
   *  sits over the picture rather than beside it. Falls back to `heroWash`.
   *
   *  UNUSED by every edit as of 2026-08-25: Tina asked for one value on all
   *  screens ("evenly on both things"). Kept because a future edit may want a
   *  genuinely different small-screen crop, but do not reach for it to make a
   *  hero "a bit darker on phones" — that is what she rejected.
   *
   *  Split because the two crops are different photographs in effect: the
   *  jersey desktop shot has empty mirrored wall behind the type, the portrait
   *  crop has the model filling the frame. Tina asked for the small screens
   *  darker specifically.
   *
   *  "Mobile and tablet" here means below 1024px — the same line the story copy
   *  centres at, and the one that actually separates portrait devices from
   *  desktop. The old md (768) split left every iPad on the desktop wash. */
  heroWashMobile?: number;
  /** Zoom the PHONE hero in, as a scale factor. 1 (default) shows the whole
   *  photograph, since the box already takes the image's own ratio and so
   *  `object-cover` has nothing to crop.
   *
   *  Phone only: the portrait crop is the one where the subject reads small,
   *  and the desktop shot is already framed the way Tina wants it. Applied as
   *  a transform on the image inside an `overflow: hidden` box, so it crops
   *  evenly from all four edges rather than favouring one — the same reason the
   *  wash is flat here.
   *
   *  Keep it modest: this is upscaling pixels that are already close to native
   *  at 3x DPR, so past ~1.2 it starts to show. */
  heroZoomMobile?: number;
  /** Flat wash instead of a gradient — Tina, on the jersey hero: "i want the
   *  dark overlay to be like dark eveyrwhere so not like the hero darker on the
   *  left side i want the whole thing evenenly darkered".
   *
   *  The default is weighted toward the copy so the subject keeps its contrast,
   *  which is right when the type sits to one side of the frame. It is wrong
   *  when the type is CENTRED, as it is here: a left-weighted ramp under
   *  centred type darkens one half of a symmetrical mirrored shot and reads as
   *  a mistake. */
  heroWashEven?: boolean;
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
 *  fabric word and are plainly not feature pieces.
 *
 *  The cap/undercap/underscarf terms were added 2026-08-25 for Fall
 *  Essentials, whose hijab rule is a COLOUR rule — so "Velvet Cap Grip - Rust"
 *  and "Full Coverage Hijab Cap - Mulberry" reach it on their colour alone and
 *  nothing about the fabric or the garment stops them.
 *
 *  NOTE the shape of the cap terms. A bare /\bcap\b/ was tried and rejected:
 *  it kills every "Cap Sleeve" garment in the catalogue, which is a real and
 *  common cut. Each term is therefore spelled out. */
const NOT_A_GARMENT =
  /\bpin\b|magnet|\bsock\b|glove|\bbag\b|clutch|jewel|earring|necklace|\bgrip\b|gift card|\bcard\b|\bundercap\b|under[-\s]?cap|under[-\s]?scarf|\bbonnet\b|hijab cap|cap grip/i;

/**
 * A cape SLEEVE is not a cape.
 *
 * Checked 2026-08-25 while sizing the Fall Essentials grid: /\bcape\b/ matches
 * 227 in-stock products and almost every one is a cape-sleeve dress or abaya —
 * "Crystal Beaded Waist Cape Sleeve Maxi Dress(MS499)", "Cape Swim Dress -
 * Earth", "Lace Butterfly Cape Top in Sky Blue". The outerwear cape Tina's
 * moodboard shows is a handful of pieces hiding inside that.
 *
 * Exactly §10.10 again: a keyword match is evidence FOR a category, never
 * proof. Without this the edit's biggest bucket would have been dresses.
 */
const CAPE_SLEEVE = /cape[-\s]?sleeve|sleeve[-\s]?cape|cape\s+(dress|abaya|top|maxi|swim)|butterfly\s+cape/i;

/**
 * The thickness ceiling. Tina, 2026-08-25: *"Denim skirts, capes, and
 * outerwear, but not too thick, so you can think about trench coats"*.
 *
 * This is a TRANSITIONAL edit — trench weight, not winter weight — so the
 * padded and pile-lined pieces are out even though the catalogue has them.
 *
 * `quilted` is deliberately NOT here. It was, on the first pass, and it
 * removed the quilted wool gilet that is panel 3 of her own moodboard. A
 * quilted gilet is the piece; a quilted parka is not.
 */
const TOO_THICK = /\bteddy\b|\bsherpa\b|\bborg\b|\bpuffer\b|\bpadded\b|\bparka\b|down[-\s]?filled/i;

/** A t-shirt is not a blouse. Needed as its own guard rather than folded into
 *  the shirt rule, because "Long-sleeved T-shirt in Aube polo material"
 *  qualifies via the long-sleeve branch before the shirt branch is consulted. */
const TSHIRT = /\bt[-\s]?shirts?\b/i;

/**
 * Tina's fall palette, 2026-08-25 — *"the shades that make any outfit look
 * expensive this season"*: Burgundy · Chocolate · Olive · Camel · Cream · Rust.
 *
 * WHY EACH COLOUR IS A FAMILY. Brands do not write the six words on her card.
 * They write mulberry, espresso, khaki, latte, ecru, terracotta. Every term
 * below was read off a real in-stock catalogue title rather than taken from a
 * colour list, which is why the families are lopsided — `rust` has eleven terms
 * and only 86 hijabs, `olive` has nine and has 281.
 *
 * Measured 2026-08-25 over in-stock rows: burgundy 141 hijabs / chocolate 241 /
 * olive 281 / camel 141 / cream 184 / rust 86. Union 1,060 of 5,031.
 *
 * TWO TERMS WERE REMOVED after checking what they matched, which is the §10.10
 * discipline and the only reason this comment is worth reading:
 *   - `almond` (camel) matched "Almond green premium jersey hijab" — green.
 *   - `butter` (cream) matched "Butter Yellow" — the spring colour.
 *
 * On \b: every term here is ASCII, so §10.31's Turkish trap does not apply to
 * the terms themselves. It WOULD apply to any non-English colour word added
 * later — \b is defined against [A-Za-z0-9_], so it finds a boundary in the
 * middle of a word containing i s g u o c with diacritics. Use the word()
 * helper in lib/tag.ts if a non-ASCII colour is ever added here.
 */
const FALL_PALETTE: Record<'burgundy' | 'chocolate' | 'olive' | 'camel' | 'cream' | 'rust', RegExp> = {
  burgundy: /\b(burgundy|bordeaux|merlot|maroon|wine|cherry|plum|damson|aubergine|fig|mulberry|berry)\b/i,
  chocolate: /\b(chocolate|cocoa|choco|espresso|coffee|mocha|walnut|chestnut|truffle|hazelnut|brownie)\b/i,
  olive: /\b(olive|khaki|sage|moss|forest|pistachio|army|fern|matcha)\b/i,
  camel: /\b(camel|caramel|toffee|tan|honey|biscuit|latte|butterscotch|cappuccino)\b/i,
  cream: /\b(cream|ecru|ivory|oatmeal|bone|milk|vanilla|eggshell|off[-\s]?white)\b/i,
  rust: /\b(rust|terracotta|terra[-\s]?cotta|brick|copper|cinnamon|burnt[-\s]orange|amber|clay|ochre|paprika|pumpkin|ginger|sienna|auburn)\b/i,
};

const IN_FALL_PALETTE = (title: string): boolean =>
  Object.values(FALL_PALETTE).some((re) => re.test(title));

/**
 * THE LAYER — the piece that goes over everything else.
 *
 * Gilet appears in 4 of Tina's 12 moodboard panels, more than any other item,
 * and it is the one word this catalogue is thin on (15 titles) while being deep
 * in its synonyms (`vest`, 230). Both are taken, restricted to tops and sets so
 * "floor length vest" abayas do not arrive through the back door.
 *
 * The knit/trench/corduroy/cape branches are deliberately NOT garment-restricted:
 * a knitted dress and a corduroy open abaya are both fall layers, and Tina named
 * "coat cords" and "sets that are a little bit thicker in texture" explicitly.
 */
const FE_LAYER = (p: Product): boolean =>
  ((p.garment === 'top' || p.garment === 'set') && /\bgilet\b|\bvest\b|\bwaistcoat\b/i.test(p.title)) ||
  /\bcardigan\b|\bsweater\b|\bjumper\b|\bknit(ted|wear)?\b|\bturtle\s?neck\b|\broll\s?neck\b/i.test(p.title) ||
  /\btrench\b|\bcorduroy\b|\bponcho\b/i.test(p.title) ||
  (/\bcape\b/i.test(p.title) && !CAPE_SLEEVE.test(p.title));

/**
 * THE BLOUSE — Tina: *"pop-of-color blouses"*, and *"The striped ones are
 * really, really popular"*. "Blouse pop of color" is on 5 of the 12 panels and
 * a striped long sleeve on 2 more.
 *
 * Restricted to `garment === 'top'`, which is why a striped ABAYA does not
 * qualify here. That is a choice, not an oversight: every striped piece on the
 * moodboard is a long-sleeve top, and letting the print in on abayas would pull
 * from a 5,218-row pool on a pattern rather than on the season. Tina can still
 * hand-pick one.
 */
const FE_TOP = (p: Product): boolean =>
  p.garment === 'top' &&
  !TSHIRT.test(p.title) &&
  /\bblouse\b|\bstripe[ds]?\b|\blong[-\s]?sleeve|\bshirt\b/i.test(p.title);

/**
 * THE BOTTOM — Tina: *"thick trousers"*, *"Denim skirts ... balloon skirts, and
 * A-line skirts"*, plus the satin column skirt that appears twice on the board.
 *
 * The trouser half needs a FALL SIGNAL. Without one the bucket is 1,392 pieces
 * — effectively every trouser in the catalogue, summer linen included — which
 * would have made the edit's largest category the one thing about it that is
 * not seasonal.
 */
const FALL_TROUSER = /\bwide[-\s]?leg\b|\bpleated\b|\btailored\b|\bcorduroy\b|\bwool\b|\bdenim\b|\bjeans?\b|\bthick\b|\bcargo\b|\bbarrel\b/i;

const FE_BOTTOM = (p: Product): boolean =>
  (p.garment === 'trousers' && FALL_TROUSER.test(p.title)) ||
  (p.garment === 'skirt' && /\ba[-\s]?line\b|\bballoon\b|\bbubble\b|\bsatin\b|\bdenim\b|\bcorduroy\b/i.test(p.title));

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
    more: { href: '/modest-abayas', label: 'All abayas' },
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
    // The lane, not the directory: someone at the end of a jersey edit wants
    // more hijabs, not more of everything.
    more: { href: '/modest-hijabs', label: 'All hijabs & scarves' },
    eyebrow: 'The Edit · Autumn 2026',
    dek: 'The one you actually wear.',
    // Tina's own shots, 2026-08-24. The phone one is a real 1792x2400 portrait
    // rather than a crop of the landscape, so nothing is thrown away.
    // Ceiling worth knowing: the desktop source is 1672px, so there is no 1920
    // variant and a wider viewport gets the native file.
    // Back to the originals, 2026-08-25 ("revert back to the old pics") after
    // a v2 pair was tried and rejected the same day.
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
    // ONE value, every screen — "evenly on both things".
    //
    // 0.40, not the 0.66 this was first set to. Worth writing down WHY that was
    // wrong, because the number looked right: 0.66 was the PEAK of a gradient
    // that ran 0.66 -> 0.33 -> 0.04 down the frame, so its average was about
    // 0.34. Carrying the same number over to a FLAT wash applied it everywhere
    // and roughly doubled the actual darkening — "overlay is too dark now".
    //
    // A peak and an average are not the same measurement, and switching from a
    // gradient to a flat fill silently swaps one for the other. 0.40 sits a
    // little above the old mobile average, so it still reads darker than the
    // hero did before she asked for darker, without the flat wash flattening
    // the gold in the mirrors.
    // 0.40 -> 0.32, "overlay a tiny bit less". Still one flat value on every
    // screen. For scale: the gradient this replaced averaged ~0.34, so this now
    // sits just under what the hero carried before she asked for it darker.
    heroWash: 0.32,
    // "zoom mobile a lil more in" — 12%, which crops ~6% off each edge of the
    // portrait frame and brings the model up without cutting her hands or the
    // hijab's drape. Measured rather than guessed; see the commit.
    heroZoomMobile: 1.12,
    heroWashEven: true,
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
      // Added last from a product URL Tina sent, 2026-08-25.
      'jennah-boutique:8046836121776', // Jennah Boutique — Cinnamon Rhinestone Baclava Jersey
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
  {
    slug: 'fall-essentials',
    title: 'Fall Essentials',
    eyebrow: 'The Edit · Autumn 2026',
    // NOT featured — `featured` only decides which banner comes FIRST on the
    // homepage, and Jersey Hijabs holds it. All three render.
    more: { href: '/directory', label: 'The whole directory' },

    // HERO — Tina's own pair, supplied 2026-08-25, replacing the placeholder
    // that reused the lace hero. Done exactly as the placeholder's own
    // instructions required: new filenames (§6/§10.21 — public/ is served with
    // a 4h cache and is not fingerprinted), ratios MEASURED from the files
    // rather than rounded, and the width lists below are only what
    // `node scripts/optimise-images.mjs` actually wrote.
    //
    // Desktop is 2674x1504, so 2674 is the ceiling — the optimiser never
    // upscales, and the lace hero's 3200/3840 entries would have silently
    // produced nothing and left 404s in the srcset. Phone is 3584x4800
    // (0.74667), effectively the same shape as the lace phone hero (0.7468),
    // so EditBanner's --edit-hero-ratio handling needs no change.
    image: '/edit-fall-hero.jpg',
    imageMobile: '/edit-fall-hero-mobile.jpg',
    imageRatio: 2674 / 1504,
    imageMobileRatio: 3584 / 4800,
    imageWidths: [640, 1024, 1440, 1920, 2400, 2674],
    imageMobileWidths: [390, 780, 1170, 1560, 1920],
    imageAlt:
      'A woman in a beige hijab and a plum wool cape over a cream shirt and trousers, a gold chain belt at the waist and a navy top-handle bag in her hand, reaching towards dark red and pink flowers on a carved wooden table against a painted woodland backdrop',

    seoTitle: 'Fall Essentials — Gilets, Knits, Blouses and Fall Skirts',
    seoDescription:
      'The fall layers from independent modest houses worldwide — gilets, knits, trench coats, striped blouses and satin skirts, in burgundy, chocolate, olive, camel, cream and rust.',

    styling: {
      h2: 'How to build a fall outfit',
      // DRAFT, 2026-08-25 — every claim traces to something Tina said the same
      // day: "the striped ones are really, really popular"; "sets that are a
      // little bit thicker in texture"; "outerwear, but not too thick";
      // "pop-of-color blouses"; "denim skirts ... balloon skirts, and A-line
      // skirts"; and the six colours are hers verbatim.
      //
      // Nothing here is invented brand voice — §10.18 is why that distinction
      // is worth a comment rather than a shrug. Until she has cut it, this is a
      // draft that happens to be deployed to staging, not copy.
      paragraphs: [
        'Fall dressing is three pieces, not one: a layer, a blouse, and a bottom. Get the layer right and the rest is easy — a [gilet](/blazers-vests) over a white shirt is a whole outfit, and it is the same shirt you already wear in summer.',
        'Keep the outerwear light. A trench or a corduroy coat does everything a padded one does until it is genuinely cold, and it keeps the shape of what is underneath instead of hiding it. Texture is what makes it read as autumn — [corduroy](/jackets-coats), wool, a thicker knit — not weight.',
      ],
      paragraphsBelow: [
        'Stripes are the easiest top to own this season, and a striped long sleeve goes under a gilet, over jeans, and with a satin [skirt](/modest-skirts) without you thinking about it. If you want one thing that is not neutral, make it the blouse.',
        'The six shades to buy in: burgundy, chocolate, olive, camel, cream and rust. They all work with each other, which is the point — any two of them are already an outfit.',
      ],
    },

    /**
     * Fall Essentials, from Tina's 12-panel moodboard (`flyingworm1376`) and her
     * fall palette card, both supplied 2026-08-25.
     *
     * TWO GATES, NOT ONE, and that is the whole design. Asked whether hijabs
     * belong, she said: *"im gonna send you a photo of the color pallate i want
     * you to take that and take hijabs with that vibe"*. So:
     *   - CLOTHING is gated by the moodboard's garment vocabulary (FE_LAYER /
     *     FE_TOP / FE_BOTTOM).
     *   - HIJABS are gated by the PALETTE — colour, not garment.
     *
     * `includeHijabs` is therefore set for a different reason than the other two
     * edits: not because the theme happens to include scarves, but because the
     * theme IS a colour story and the scarves are where a colour story lives.
     *
     * Measured 2026-08-25 over in-stock rows: 3,429 pieces, 83 brands —
     * 1,450 tops · 884 hijabs · 526 trousers · 255 skirts · 157 dresses ·
     * 107 abayas · 50 sets.
     *
     * This is the FALLBACK. Tina picks in /staff/curate and those ids replace it
     * entirely, exactly as they do for the other two edits.
     */
    /**
     * Tina's own picks, 2026-08-25 — her favourites list, sent as *"these are
     * the items i want"*. 277 entries pasted, 276 distinct products, and
     * **every single one resolved** against the live catalogue. One entry,
     * Nasiba's "Solace Wide Leg Pants - Charcoal", appeared twice in the list
     * and is kept once.
     *
     * This is far larger than the other two edits (24 and 32) and that is her
     * call, not a defect. It is still 276 chosen pieces rather than the 3,429
     * the fallback below sweeps in.
     *
     * ORDERED BY MINIMAL REPAIR, not by the greedy interleave the jersey edit
     * used, and the difference matters. Her paste already carried an order; a
     * greedy re-sort would have thrown all of it away to fix 17 adjacent pairs.
     * Instead each piece keeps its place unless it would sit beside its own
     * house or beside another hijab, in which case the nearest later piece that
     * does not is pulled forward.
     *
     * Measured: 3 same-house and 14 hijab-on-hijab pairs as pasted, 0 and 0
     * after. Mean position drift 0.23, max 4, and 232 of 276 pieces did not
     * move at all. Both properties are asserted by lib/edits.test.ts rather
     * than trusted to this comment.
     *
     * Deepest houses: White Icy 17, Arakai 15, Nour Al Houda 12, Eynaa Paris
     * and Summer Evenings 10 each. 64 houses, 62 hijabs.
     *
     * THE FAILURE MODE, same as the other two edits: a picked id that leaves the
     * catalogue simply vanishes and the page still renders fine with one fewer
     * piece. The picked-ids test is what turns that into a red test locally
     * instead of an edit that quietly shrinks.
     */
    productIds: [
      'diversity-modest:10104226939214', // Diversity Modest — Airy Jersey Scarf Mocha Brown
      'hijab-boutique:10699265966419', // Hijab Boutique — Ruffle Blouse - Taupe
      'vela:9119980716188', // Vela Scarves — Deep Berry Fringe
      'nasiba:10538582835509', // Nasiba — Solace Versatile Shirt - Charcoal
      'oomah:7656653455439', // Oomah — Fold Up Jeans
      'chic-modesty:10323185467730', // Chic & Modesty — Hijab ready to tie burgundy Medina silk
      'zahraa:7658948067415', // Zahraa The Label — Tasneem Denim Top and Pant Set - Batroun Blue
      'oomah:7624224440399', // Oomah — Essential Wool Trousers
      'nasiba:10538582376757', // Nasiba — Solace Wide Leg Pants - Charcoal
      'hawaa:15922214306165', // Hawaa Clothing — Espresso Satin Skirt
      'jennah-boutique:8046836121776', // Jennah Boutique — Cinnamon Rhinestone Baclava Jersey
      'lafemme:32124', // La Femme Collectie — Breeze Blouse
      'eynaa-paris:10293749252439', // Eynaa Paris — Hijab Jersey Premium Soft [Cappuccino]
      'we-are-elegance:16003783688574', // We Are Elegance — Oversized Pinstripe Shirt Blue
      'mondo-the-label:8112147890238', // Mondo The Label — Yasmine Shirt
      'glamberry:15633978130697', // Glamberry Shop — Shirt blouse with waist belt made of cotton-viscose blend
      'vela:9119979864220', // Vela Scarves — Light Olive Fringe
      'zora:9156774461603', // Zora Designers — The Heartline Jumper in Sugar Pink
      'headed-somewear:8421668552862', // Headed Somewear — Chocolate Brown - Modal Plain Hijab
      'kimodesty:15116', // KIMODESTY — Cotton Balloon Skirt – Taupe
      'whiteicy:15666941788500', // White Icy — Safiya flared denim skirt
      'nasiba:10538582311221', // Nasiba — Solace Wide Leg Pants - Midnight
      'ellem-atelier:10941297787223', // Ellem Atelier — The Classic trousers in Denim blue
      'whiteicy:15666941722964', // White Icy — Mei denim dress with mandarin collar
      'headed-somewear:8421666947230', // Headed Somewear — Pale Olive - Modal Plain Hijab
      'kimodesty:15112', // KIMODESTY — Cotton Balloon Skirt – Creme
      'eynaa-paris:10852401086807', // Eynaa Paris — Bamboo Jersey Hijab [Olive]
      'mondo-the-label:7935860572222', // Mondo The Label — Anya Crochet Knit Pant
      'aurora-abaya:15930866139466', // Aurora Abaya — Matcha viscose rami hijab
      'emlavish:10703959753043', // EM Lavish — Pleated Crinkle Blouse - Black
      'vela:9119979438236', // Vela Scarves — Ivory Cascading Ruffle
      'lafemme:31064', // La Femme Collectie — Basic Striped Shirt
      'la-petite-parisienne:15488480706900', // La Petite Parisienne — White GAZE blouse
      'merrachi:15639009329535', // MERRACHI — Breathable Jersey Scarf | White Honey
      'la-petite-parisienne:12482835284308', // La Petite Parisienne — NORA yellow shirt (H13035)
      'lameera-moda:9064622850216', // LaMeera Moda — Premium Modal Scarf- Sage
      'mondo-the-label:7935813419070', // Mondo The Label — Mona Crochet Knit Cardigan
      'arakai:10944839647578', // Arakai Studio — Farha Belted Poplin Blouse White
      'madiha:14817368047999', // Madiha — The Trench Abaya In Camel
      'merrachi:15639038361983', // MERRACHI — Liquid Jersey Scarf | Peach Cream
      'whiteicy:15666941493588', // White Icy — Louise denim trench jacket
      'modista:9641747054882', // Modista — Knit Wear Coord Set - Top & Skirt
      'eynaa-paris:10879061098839', // Eynaa Paris — COTTON SHIRT DRESS [White]
      'bait-hanayen:15425182498927', // Bait Hanayen — Roaya Abaya (Trench Coat)
      'mondo-the-label:7708888006718', // Mondo The Label — Dana Knit Skirt
      'inayah:9974655680792', // Inayah — Ummie Cross Knit Sweater Dress
      'arakai:10944834732378', // Arakai Studio — Farha Belted Poplin Blouse Dark Brown
      'hijab-boutique:10644046938451', // Hijab Boutique — Oversized Cotton Blouse - Soft Blue
      'nurmire:9967193620809', // Nurmirè — Premium Jersey Hijab - Mulberry
      'inayah:9974653747480', // Inayah — Giselle Sweater Set
      'modesty-in-style:10797100106038', // Modesty in Style — Khaki Jersey Set
      'lafemme:30415', // La Femme Collectie — Balloon Sleeve Blouse
      'hijab-boutique:10644044906835', // Hijab Boutique — Oversized cotton blouse - Butteryellow
      'eynaa-paris:10852254384471', // Eynaa Paris — OVER SHIRT [Mediterranean blue]
      'jennah-boutique:8046769176752', // Jennah Boutique — Lemon striped shirt
      'eynaa-paris:10769232036183', // Eynaa Paris — ROUNDED A-LINE SKIRT [Navy]
      'whiteicy:15666877858132', // White Icy — Celia Denim Skirt
      'lafemme:30093', // La Femme Collectie — Basic Oversized Shirt
      'merrachi:15643657109887', // MERRACHI — Striped Volume Shirt | Cherry Stripe
      'veiled:7631431401577', // Veiled — Asymmetric Knit Top & Pants Set - Black
      'modista:9641314222370', // Modista — Long Buttoned Shirt
      'ilovemodesty:10284417909057', // iLoveModesty — Cyra Lilac A-line Cardigan
      'veiled:7631423701097', // Veiled — Asymmetric Ruffle Hem Knit Top - Ivory
      'emlavish:10639388541267', // EM Lavish — Silk Wide Leg Trouser
      'eynaa-paris:10769231905111', // Eynaa Paris — ROUNDED A-LINE SKIRT [Black]
      'lafemme:29940', // La Femme Collectie — Balloon Skirt
      'aeon-abaya:8904668577844', // Aeon Abaya — Laurel Vest
      'whiteicy:15666877792596', // White Icy — Marina denim set
      'by-hasanat:15634266882421', // ByHasanat — Soft Moss Modal Hijab
      'eynaa-paris:10769231413591', // Eynaa Paris — ROUNDED A-LINE SKIRT [Butter cream]
      'yasmin-jay:8080451862704', // Yasmin Jay — Liquid Jersey Burgundy
      'baqa:9051601535227', // BAQA — Wide Leg Linen Trousers
      'merrachi:15643657175423', // MERRACHI — Striped Volume Shirt | Biscotti Stripe
      'modesty-in-style:10797097484598', // Modesty in Style — Milk Jersey Set
      'touche-prive:10083939942728', // Touché Privé — Side-Tie Wrap Poplin Shirt
      'kimodesty:15023', // KIMODESTY — Cotton Denim Skirt
      'emlavish:10700341707091', // EM Lavish — Asymmetric Linen Blouse - Beige
      'nihan:15086344241515', // Nihan — Pleated Linen Trousers with Iron Traces - Beige
      'niswa:10028359188778', // Niswa Fashion — Solid Modal - Cream
      'malikaat:15696801923445', // Malikaat — Malikaat Abaya Trench
      'arakai:10942537204058', // Arakai Studio — Navy Waist-Tie Poplin Shirt
      'mondo-the-label:7708892266558', // Mondo The Label — Mariya Knit Cardigan Abaya
      'chic-modesty:10323092668754', // Chic & Modesty — Chocolate flared satin skirt
      'zahraa:7485978443863', // Zahraa The Label — Deniz Knit Matching Set - Almond
      'arakai:10942536089946', // Arakai Studio — Camel Waist-Tie Poplin Shirt
      'by-hasanat:15634266128757', // ByHasanat — Mulberry Modal Hijab
      'nasiba:10469151736117', // Nasiba — Solace Versatile Shirt - Mocha
      'yasmin-jay:8080449044656', // Yasmin Jay — Liquid Jersey Chestnut
      'whiteicy:15668178059604', // White Icy — Yamina - Oversized poplin shirt
      'modesty-in-style:10788103684406', // Modesty in Style — Sylvia Knit Set
      'nihan:15086334476651', // Nihan — Asymmetric Closure Wide Leg Modal Trousers - Black
      'modest-timeless:8466216157402', // Modest & Timeless — Blue Satin Skirt
      'lafemme:28890', // La Femme Collectie — Soft Breeze Gilet
      'maison-hijab:14899627327813', // Maison Hijab — Chestnut Brown Jersey Hijab
      'summer-evenings:9254147490042', // Summer Evenings — Navy Balloon Top & Maxi Skirt Set
      'fares:7858204999871', // Fares — Bow Detail Cardigan - Icy Blue
      'losyana:10677822456146', // Losyana — Instant Hijab - coffee
      'ilovemodesty:10284398248257', // iLoveModesty — Sage Green Bell Sleeve Cardigan Set
      'hum:9031247003860', // HUM Clothing — Grey Square Neck Top & A-line Maxi Skirt Co-ord Set
      'kimodesty:14961', // KIMODESTY — Stripe Cotton Top 3/4 – Green
      'whiteicy:15668177994068', // White Icy — Irene classic poplin shirt
      'nihan:15086334411115', // Nihan — Asymmetric Closure Wide Leg Modal Trousers - Indigo
      'nour-al-houda:7865218465840', // Nour Al Houda (BNAH) — Instant Bamboo Jersey Wrap Set - Forest
      'summer-evenings:8793881870586', // Summer Evenings — Orchid Pink Balloon Top & Maxi Skirt Set
      'losyana:10677821964626', // Losyana — Instant Hijab - olive
      'mukistore:15627414601993', // Mukistore — Elegant Waistcoat with Waist Cord
      'hum:9031246807252', // HUM Clothing — Pink Square Neck Top & A-line Maxi Skirt Co-ord Set
      'emlavish:10609114251603', // EM Lavish — Linen Blend A-Line Maxi Skirt
      'nihan:15086332641643', // Nihan — Asymmetric Closure Wide Leg Modal Trousers - Camel
      'niswa:10028360204586', // Niswa Fashion — Solid Modal - Oatmeal
      'jennah-boutique:8044400574640', // Jennah Boutique — Pantalon barrel coton marron
      'summer-evenings:8793880723706', // Summer Evenings — Ivory Balloon Top & Maxi Skirt Set
      'emlavish:10603446239571', // EM Lavish — Cotton Relaxed Collared Blouse
      'losyana:10677822685522', // Losyana — Instant Hijab - army green
      'whiteicy:15668177830228', // White Icy — Maeva shirt – Flared Vichy poplin
      'kimodesty:14831', // KIMODESTY — Longsleeve Cotton Top – Marine
      'baqa:9354018423035', // BAQA — Blouse with Scarf Detail on the Collar
      'klay:8538823000216', // KlayTheLabel — Amber Premium Modal
      'manzaram:15728264446277', // Manzaram — Striped blouse
      'diversity-modest:10500751130958', // Diversity Modest — Ice Silk Jersey Scarf Cream White
      'whiteicy:15668177797460', // White Icy — Amaya shirt – Pleated poplin
      'by-hasanat:15634265211253', // ByHasanat — Chicory Coffee Modal Hijab
      'modesty-in-style:10765790052662', // Modesty in Style — Isra Knit Tunic
      'eynaa-paris:10643285279063', // Eynaa Paris — Bamboo Jersey Hijab [Cherry]
      'arakai:10939043283290', // Arakai Studio — Sorayah Linen Blouse with Slit Detail - Anthracite
      'lameera-moda:9423934455976', // LaMeera Moda — Premium Modal Scarf- Cinnamon
      'manzaram:15722034135365', // Manzaram — Blouse with collar and button closure
      'hawaa:15870274863477', // Hawaa Clothing — Deep Mulberry Modal Lace Hijab
      'whiteicy:15630250639700', // White Icy — Élina shirt – Asymmetrical poplin
      'arakai:10942403445082', // Arakai Studio — Ecru Dress with Detachable Scarf Accessory
      'noureen:56690', // NOUREEN Modest Fashion — Sweater Dress S26 Powder Rose
      'klay:8538797670552', // KlayTheLabel — Golden Moss Premium Modal
      'eynaa-paris:10628487774551', // Eynaa Paris — BARREL TROUSERS [Black]
      'lameera-moda:9423933636776', // LaMeera Moda — Premium Modal Scarf- Tan
      'ilovemodesty:10284340183361', // iLoveModesty — Warm Beige Embroidered Scallop A-Line Cardigan Set
      'nasiba:10469157011765', // Nasiba — Solace Wide Leg Pants - Blanco
      'noureen:56683', // NOUREEN Modest Fashion — Sweater Dress S26 Lila
      'nour-al-houda:7721719758896', // Nour Al Houda (BNAH) — Bamboo Jersey Hijab Set - Espresso
      'modesty-in-style:10724653564214', // Modesty in Style — Siyah Sweater
      'diversity-modest:10887562330446', // Diversity Modest — The Everyday Poncho Chocolate Brown
      'kimodesty:14553', // KIMODESTY — Striped Longsleeve Top – Taupe
      'losyana:10677824454994', // Losyana — Instant Hijab - bordeaux
      'zahraa:7433242280023', // Zahraa The Label — Lauren Cape Tunic - Taupe
      'lafemme:30420', // La Femme Collectie — Oversized Gilet
      'jennah-boutique:7764200423600', // Jennah Boutique — Chocolate satin flared skirt
      'niswa:10028356501802', // Niswa Fashion — Solid Modal - Burnt Clay
      'modesty-in-style:10758026953014', // Modesty in Style — Keiko Sweater
      'esme-ny:7997865328733', // Esme New York — ESMÉ Cinched Waist Shirt
      'lameera-moda:9423926591656', // LaMeera Moda — Premium Modal Scarf- Army Green
      'whiteicy:15474463572308', // White Icy — MAEVA long trench coat
      'baqa:9177934004475', // BAQA — Pleated Detailed Beltless Trousers
      'nour-al-houda:7954932006960', // Nour Al Houda (BNAH) — Textured Knit Maxi Dress - Pale Oak
      'lameera-moda:9423923577000', // LaMeera Moda — Premium Modal Scarf- Sienna
      'summer-evenings:8635819950330', // Summer Evenings — Black & Cream Cape Tunic Set
      'hum:9028286611668', // HUM Clothing — Beige Square Neck Top & A-line Maxi Skirt Co-ord Set
      'chador:200021', // Chador — Tailored Gilet
      'hawaa:15860139557237', // Hawaa Clothing — Sage Bamboo Jersey Hijab
      'nour-al-houda:7954928205872', // Nour Al Houda (BNAH) — Textured Knit Maxi Dress - Frost Blue
      'kimodesty:13967', // KIMODESTY — Staple Scarf – Soft Olive
      'nour-al-houda:7950536179760', // Nour Al Houda (BNAH) — Mock Neck Knit Abaya - Oat
      'niswa:10028032622890', // Niswa Fashion — Solid Modal - Plum Veil
      'whiteicy:15673292849492', // White Icy — Elisabeth trench coat
      'hawaa:15860139098485', // Hawaa Clothing — Olive Bamboo Jersey Hijab
      'hum:9027999138004', // HUM Clothing — Denim A-line Maxi Skirt
      'haute-hijab:6583963484256', // Haute Hijab — Premium Jersey Hijab - Khaki
      'baqa:9313789411579', // BAQA — Wide Leg Trousers
      'merrachi:15287592223103', // MERRACHI — Premium Jersey Scarf | Light Plum
      'whiteicy:15673292816724', // White Icy — Naëlys trench coat
      'losyana:10645916713298', // Losyana — Vela Jersey - bordeaux
      'nour-al-houda:7700823867440', // Nour Al Houda (BNAH) — Amelie Pleated Pants - Black
      'chic-modesty:10830652801362', // Chic & Modesty — Almond Linen & Cotton Long Shirt
      'chador:197160', // Chador — Volume Sleeve Shirt
      'summer-evenings:9149105602810', // Summer Evenings — Plum Floor Length Vest
      'elaa-the-label:7219446218885', // ELAA The Label — Lileian Knit Dress Set (Espresso)
      'summer-evenings:8803198533882', // Summer Evenings — Brown Signature SE Wide Leg Pants
      'arakai:10911194317146', // Arakai Studio — Aliza Belted Linen Blouse - Moss Beige
      'whiteicy:15673292783956', // White Icy — Héloïse trench coat
      'kimodesty:13715', // KIMODESTY — Printed Vest – Brown
      'hawaa:15860138377589', // Hawaa Clothing — Espresso Bamboo Jersey Hijab
      'summer-evenings:9149103079674', // Summer Evenings — Cream Floor Length Vest
      'arakai:10902651928922', // Arakai Studio — Sorayah Linen Blouse with Slit Detail - Olive
      'whiteicy:15673292718420', // White Icy — Sélène hooded trench coat
      'aeon-abaya:8897513095220', // Aeon Abaya — Tessa Vest
      'summer-evenings:8711044399354', // Summer Evenings — Black Signature SE Wide Leg Pants
      'whiteicy:15673292685652', // White Icy — Éloane Short Trench Coat
      'emlavish:10764368085331', // EM Lavish — Crinkle Belted Blouse
      'fatima-diallo:8094593548524', // Fatima Diallo — Wide Sleeve Maxi Knit Dress - Ivory
      'arakai:10896406151514', // Arakai Studio — Sorayah Linen Blouse with Slit Detail - Red
      'summer-evenings:9149100720378', // Summer Evenings — Sage Blue Tailored SE Pants
      'emlavish:10236653994323', // EM Lavish — Cape Jacket With Belt
      'chador:197170', // Chador — Tailored Gilet Set
      'losyana:10645916254546', // Losyana — Vela Jersey - pistachio
      'glamberry:15518548656393', // Glamberry Shop — Two-piece set with structured floral skirt & fitted vest
      'eynaa-paris:9615659336023', // Eynaa Paris — Hijab Jersey Premium Soft [Brownie]
      'nour-al-houda:7937231388720', // Nour Al Houda (BNAH) — Crossover Cotton Shirt - Graphite
      'arakai:10896388882778', // Arakai Studio — Retaj Linen Shirt Anthracite
      'merrachi:8759464395061', // MERRACHI — Premium Jersey Scarf | Soft Bordeaux
      'touche-prive:9919281234248', // Touché Privé — Ruffled Satin Skirt
      'losyana:10645916189010', // Losyana — Vela Jersey - espresso
      'jennah-boutique:8049113432240', // Jennah Boutique — Lemon oversized shirt
      'kimodesty:12259', // KIMODESTY — Staple Scarf – Matcha
      'modesty-in-style:10758670057782', // Modesty in Style — Anna Knit Set
      'parladusa:15535403893062', // Parladusa — Mirella short cardigan
      'summer-evenings:9149096263930', // Summer Evenings — Plum Tailored SE Pants
      'nour-al-houda:7937231749168', // Nour Al Houda (BNAH) — Crossover Cotton Shirt - Black
      'hawaa:14943970492789', // Hawaa Clothing — Moss Jersey Hijab
      'chador:190018', // Chador — Popeline Blouse
      'chic-modesty:10828270109010', // Chic & Modesty — Burgundy bamboo balaclava hijab
      'amariah:7430856573153', // Amariah — Arabella Wide Leg Trousers - Black
      'jennah-boutique:8046769897648', // Jennah Boutique — Pink striped shirt
      'touche-prive:9358369849672', // Touché Privé — Ribbon Detailed Oversize Shirt
      'arakai:10896382755162', // Arakai Studio — Retaj Linen Shirt Terracotta
      'diversity-modest:10434283241806', // Diversity Modest — The Comfy Shirt Beige
      'nour-al-houda:7901544251440', // Nour Al Houda (BNAH) — Nes Cinched Blouse - White
      'touche-prive:9895675625800', // Touché Privé — Gathered Shoulder Cupra Gilet
      'nour-al-houda:7935612321840', // Nour Al Houda (BNAH) — Canvas Trench Coat - Evergreen Fog
      'la-petite-parisienne:12488256848212', // La Petite Parisienne — Brown VICTORY shirt (KC842)
      'jennah-boutique:7957418377392', // Jennah Boutique — JNA khaki barrel pants
      'bayt-el-hayat:15475417776502', // Bayt El Hayat — Corduroy Two Piece Set – Dark Grey
      'vela:7027379830940', // Vela Scarves — Truffle Mushroom
      'whiteicy:15692490998100', // White Icy — Gilet Lyra – Maille torsadée zippée
      'zahraa:7389671391319', // Zahraa The Label — Yusra Knit Pant- Taupe
      'touche-prive:10100262175048', // Touché Privé — Asymmetrical Poplin Shirt
      'aurora-abaya:10008032117066', // Aurora Abaya — Cardigan tailored
      'bayt-el-hayat:15476291010934', // Bayt El Hayat — Knitted ribbed dress - Black
      'nour-al-houda:7898773553200', // Nour Al Houda (BNAH) — Amani Two Tone Trench Coat - Beige
      'manzaram:15385256558917', // Manzaram — Knitted oversized cardigan with structure
      'aeon-abaya:8892088909876', // Aeon Abaya — Chocolate Vest
      'chador:189932', // Chador — Essential Shirt
      'mukistore:15460879794441', // Mukistore — Super Stretch Wide Leg Jeans – H896-5
      'arakai:10893539869018', // Arakai Studio — Bella Belted Linen Shirt Sage Green
      'aeon-abaya:8892022489140', // Aeon Abaya — Blake Vest
      'bait-hanayen:7877489819759', // Bait Hanayen — Brown Trench Coat Abaya
      'mukistore:15460878090505', // Mukistore — Super Stretch Full Wide Leg Jeans – H986-1
      'touche-prive:8687763751240', // Touché Privé — Asymmetric Button Detail Shirt
      'urban-modesty:7509246148683', // Urban Modesty — Cider Sweater and Pants Set
      'bemu:10095871525155', // Bemu — Maxi Satin Skirt- Beige
      'aeon-abaya:8889973964852', // Aeon Abaya — Pistachio Vest
      'chador:192671', // Chador — Essential Gilet Set
      'modesty-in-style:10742800679222', // Modesty in Style — Naya Knit Sweater
      'chador:192661', // Chador — Cropped Gilet Top
      'zora:8922177896611', // Zora Designers — The Lauren Pleated Pants in Snow
      'aurora-abaya:15231606227274', // Aurora Abaya — Denim blouse
      'arakai:10893529121114', // Arakai Studio — Monroe Draped Blouse Yellow
      'aurora-abaya:15231647547722', // Aurora Abaya — Suede blouse beige
      'parladusa:15151701426502', // Parladusa — Cassy trench coat
      'arakai:10893526991194', // Arakai Studio — Monroe Draped Blouse Blue
      'jawda:16038517014908', // Jawda — Olive Linen Cotton Wide Leg Trousers
      'fares:8272707682495', // Fares — Straight Leg Knit Pants - Olive
      'hijab-boutique:10116734320979', // Hijab Boutique — Sweater - Soft green
      'parladusa:15151699951942', // Parladusa — Leila trench coat
      'aurora-abaya:15647494504778', // Aurora Abaya — Polka dot cotton blouse
      'chic-modesty:10594625093970', // Chic & Modesty — Hijab easy chocolate
      'jawda:16038516687228', // Jawda — Chocolate Linen Cotton Wide Leg Trousers
      'les-atelier:15725952008565', // LES Atelier — Nora Modal Longsleeve Cacao Brown
      'fares:8272699916479', // Fares — Straight Leg Knit Pants - Brownie
      'mukistore:15453031399689', // Mukistore — Super Stretch Wide Leg Jeans – H876-8
      'aurora-abaya:15647456690506', // Aurora Abaya — Chiffon blouse
      'nour-al-houda:7930209599536', // Nour Al Houda (BNAH) — Chiffon Button Up Blouse - Fudge
      'parladusa:15129858113862', // Parladusa — Corduroy two-piece suit
      'chic-modesty:10594614870354', // Chic & Modesty — Hijab easy brownie
      'modesty-in-style:10742796190006', // Modesty in Style — Lyla Leather Maxi Trench
      'touche-prive:9660172796232', // Touché Privé — Knit Sweater Winit Zipper
      'aurora-abaya:10008040079690', // Aurora Abaya — Asymmetrical vest
      'fares:8272730390719', // Fares — Tailored Elastic Waist Pants - Stone
      'bayt-el-hayat:15083591860598', // Bayt El Hayat — Waterproof Trench Coat - Black
      'arakai:10860879806810', // Arakai Studio — Aliza Belted Linen Blouse - Red
      'bemu:9811749241123', // Bemu — Maxi Satin Skirt- Black
      'touche-prive:9704639922504', // Touché Privé — Oversized Sweater With Knitting Details
      'mukistore:15435519328521', // Mukistore — Midi Double-Breasted Trench Coat with Waist Belt
      'la-petite-parisienne:15051544330580', // La Petite Parisienne — Brown 2-pocket blouse (L2096)
      'mukistore:15395301589257', // Mukistore — Knitted Wide-Leg Set with Long Top & Wide Sleeves 23535
      'veiled:7779260629097', // Veiled — Ombre Modal Hijab - Chocolate
      'losyana:10287466348882', // Losyana — the legacy shirt - olive
      'chador:189194', // Chador — Satin Skirt
      'bayt-el-hayat:7174444908605', // Bayt El Hayat — Navy Leather Trench Coat
    ],

    match: (p) =>
      p.garment !== 'swim' &&
      !NOT_A_GARMENT.test(p.title) &&
      !TOO_THICK.test(p.title) &&
      (p.garment === 'hijab' ? IN_FALL_PALETTE(p.title) : FE_LAYER(p) || FE_TOP(p) || FE_BOTTOM(p)),

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
