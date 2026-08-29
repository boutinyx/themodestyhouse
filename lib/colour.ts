import { word } from '@/lib/tag';
import { splitColourSuffix } from '@/lib/colorVariants';
import OVERRIDES from '@/data/colour-overrides.json';

/**
 * Which colour family a product belongs to, for the grid's Colour filter.
 *
 * Tina, 2026-08-28: *"is there a tool of anything so we can colorcode
 * everything so we can select on colors?"*
 *
 * COVERAGE — the single current figure for this feature, and the one every
 * other file should quote. Measured 2026-08-29 with `npm run colour:coverage`
 * over the 18,908 published rows in data/products.json: the product TITLE
 * alone yields a family for 13,632 of them, 72.1%. Of those, 6,968 (36.9% of
 * the catalogue) come from the colourway suffix `lib/colorVariants.ts` already
 * parses, 6,646 (35.1%) from a colour word elsewhere in the title, and 18 from
 * data/colour-overrides.json. Re-run the command rather than trusting this
 * line: coverage is a property of the CATALOGUE, not of this code, and the
 * nightly refresh moves the catalogue on its own schedule (§10.35). Every
 * figure in this file carries the base and the date it was measured against,
 * for the same reason.
 *
 * MEASURED BEFORE BUILDING (§10.11), on that day's smaller base: 70.2% of the
 * 18,713 rows then published, which is what justified building on titles at
 * all. Two richer sources were checked and rejected: product tags add only
 * ~5pp and would need a new field on `Product` plus a pipeline change, and the
 * Shopify feed's own `options: [{name: "Color"}]` is present for only 12.5% of
 * products across a 12-brand sample. Title-only is where the evidence is.
 *
 * DERIVED, NEVER STORED. This runs at encode time in lib/compactCatalogue.ts,
 * exactly like lib/hijabTypeFilter.ts, so a change here reaches the site on
 * the next build with no re-scrape (contrast §10.12, where a correct fix to
 * lib/normalize.ts changed nothing because raw rows are frozen at ingest).
 *
 * NO `\b` ANYWHERE. §10.31: JavaScript's `\b` is defined against `[A-Za-z0-9_]`,
 * so in a Turkish or French title it finds a boundary mid-word. `word()` from
 * lib/tag.ts is the Unicode-aware version and is the only boundary used here.
 */
export type ColourFamily =
  | 'black' | 'grey' | 'white' | 'cream' | 'beige' | 'brown'
  | 'navy' | 'blue' | 'green' | 'yellow' | 'orange' | 'red'
  | 'pink' | 'purple' | 'multi';

export const COLOUR_FAMILY_LABELS: Record<ColourFamily, string> = {
  black: 'Black', grey: 'Grey', white: 'White', cream: 'Cream',
  beige: 'Beige & Tan', brown: 'Brown', navy: 'Navy', blue: 'Blue',
  green: 'Green', yellow: 'Yellow & Gold', orange: 'Orange',
  red: 'Red & Burgundy', pink: 'Pink', purple: 'Purple',
  multi: 'Print & Multi',
};

/** One representative hex per family, for the dot in the dropdown. These are
 *  swatches, not brand tokens — they must read as the colour they name at
 *  10px, which is why `white` and `cream` are given a visible border by the
 *  component rather than being darkened here. */
export const COLOUR_FAMILY_SWATCH: Record<ColourFamily, string> = {
  black: '#1a1a1a', grey: '#8d8d8d', white: '#ffffff', cream: '#f3ecdd',
  beige: '#d8c3a5', brown: '#6b4423', navy: '#1c2a4a', blue: '#3f6ea8',
  green: '#5a7247', yellow: '#c9a227', orange: '#c46a2f',
  red: '#8c2f39', pink: '#d99aa8', purple: '#6e4a6b',
  multi: '#a98a5b',
};

/**
 * Order is load-bearing and is the same principle as GARMENT_RULES in
 * lib/tag.ts (Invariant 6): the first rule that matches wins. It is NOT a
 * specificity ranking, and it is NOT three contiguous tiers — the compounds
 * are scattered through the list, `cream` being 9th of 15. What actually holds
 * is one RELATIVE constraint, one absolute one, and a default:
 *   1. EACH COMPOUND FAMILY SITS ABOVE THE FAMILY WHOSE WORD IT CONTAINS —
 *      above that one family, and nothing more is required of it. `navy` is
 *      above `blue`, so "Navy Blue" (209 rows) reaches navy; `cream` is above
 *      `white`, so "off-white" reaches cream. Neither has to be near the top,
 *      and neither is. ("Light Brown", 53 rows, reaches `brown` whatever the
 *      order — no family claims "light" — so it is tested as documentation of
 *      the pattern, not because it depends on position.)
 *   2. `multi` LAST, so a black floral files as black and only a garment
 *      naming no colour at all falls through to the pattern bucket.
 *   3. EVERY OTHER POSITION IS AN ARBITRARY TIE-BREAK. Nothing derives them;
 *      they are fixed only because moving one reclassifies rows. `black` sits
 *      14th of 15 for no better reason.
 * Known consequence of the tie-break, so it is not a surprise later: of the
 * 2,202 published titles containing a black word, 135 file under a family
 * whose rule sits earlier — mostly defensible two-tone items ("Classy Liquid
 * F25 – Black x Red" -> red, "The Wave Scarf In Black / Cream" -> cream), a
 * few plainly wrong ("Lujain Abaya - Noir Gold" -> yellow, "Black Cotton Maxi
 * Dress with Beige Grosgrain Trim" -> beige). Measured 2026-08-29 over the
 * 18,908 rows in data/products.json; the base is stated because the catalogue
 * moves nightly (§10.35) and both counts move with it. A new family joins the
 * arbitrary group unless it is a compound, in which case it goes above the
 * family it contains.
 *
 * WHAT IS DELIBERATELY ABSENT, and why — each of these was in the first draft
 * and was removed after checking what it matched:
 *   linen, satin, silk, cotton, jersey, modal  — fabrics, not colours. "Linen
 *     Maxi Dress" is 1,100+ rows and none of them is beige by virtue of that.
 *   denim                                      — a fabric on the same footing,
 *     and the ONE deliberate exception to that rule: it is KEPT, in `blue`,
 *     together with the garment word `jeans`, because denim reads as a colour
 *     to someone using a colour filter. 125 published rows reach `blue` on a
 *     BODY match of `denim`/`jeans` and nothing else — i.e. they are exactly
 *     the rows that would go unclassified without this exception (18,908 rows
 *     in data/products.json, measured 2026-08-29). The cost is accepted and
 *     known: 5 of those 125 name black in the same title, so "The Barrel Denim
 *     [Black]" files as blue.
 *   natural, smoked, mink                      — real suffixes in the data,
 *     but they name a finish or a material, and mink is a fur.
 *   nude                                       — kept, but only in `beige`,
 *     because it is a real and common colourway name in this catalogue.
 * Spaces are written `[ -]?` so "off white", "off-white" and "offwhite" all
 * match one entry.
 *
 * THE SECOND PASS, 2026-08-28. `npm run colour:coverage` prints the colour
 * suffixes that no rule matched, ordered by frequency; every one of the 59 words
 * added below came off that list and only after `word()`-matching it against all
 * 18,917 published rows and reading what it hit. The vocabulary alone moved
 * coverage 13,161 -> 13,753 (+592 rows); the HARDWARE_OR_TRIM guard below then
 * withdrew 9, landing at 13,744 of that day's 18,917 rows. Those are the
 * numbers of THAT PASS, on THAT base — the current coverage figure is the one
 * in the header above and nowhere else. Each addition is carried by an
 * assertion in lib/colour.test.ts using a literal catalogue title.
 *
 * The placements that are not self-evident, and the evidence for each:
 *   mulberry -> purple  it sits beside `plum`, not beside `wine`. One row says
 *                       "Mulberry Brown" and files as purple; 29 do not.
 *   cedar, oak -> brown the catalogue settles it itself: "Cedar Brown",
 *                       "Oak Brown", "Walnut Oak". Neither is a green here.
 *   coal, carbon,
 *   dove -> grey        `charcoal` and `silver` were already grey, and the
 *                       corpus writes "Coal Grey" and "Dove Grey" outright.
 *   buttercream -> cream  a pale off-white in these titles. The one row that
 *                       says "Buttercream Yellow" reaches yellow anyway,
 *                       because yellow sits above cream in tier 2.
 *   çağla -> green      Turkish for the green of an unripe almond, and 17 rows
 *                       of it are Nihan's. That brand's colourway suffixes are
 *                       colour names without exception — black(544) brown(275)
 *                       "navy blue"(198) ecru(117) thyme(17) — which is what
 *                       rules out the other reading, Çağla as a woman's name.
 *   polka dot -> multi  a pattern, and `multi` is last, so "Brown Polka Dot
 *                       Wrap Maxi Dress" still files as brown. Only a dotted
 *                       item naming no colour lands in the pattern bucket.
 *
 * REJECTED IN THAT PASS, with the row count each would have claimed. This list
 * is worth more than the accepted one: every entry is a word that reads like a
 * colour and is not one here, and the reason is always something only the real
 * corpus could say (§10.11). Counts are `word()` matches over the same 18,917
 * rows on 2026-08-28.
 *   sahara (31)      — a COLLECTION name, not a shade: "Sahara Dress Sand",
 *                      "Sahara Co-Ord Set Butter Yellow", "Sahara Linen Set".
 *                      Filing those under beige would fight the suffix that
 *                      already names the real colour.
 *   iron (49)        — 46 of them are "Trousers with Iron Traces", a pressed
 *                      finish. Not a grey.
 *   pearl (92)       — a decoration far more often than a shade: "Luxury Pearl
 *                      Bloom Embellished Cape", "Classic Open Abaya with Pearls".
 *   ivy (14)         — a style name ("Ivy Embroidered Panels Abaya", "Ivy Maxi")
 *                      as often as a green.
 *   heather (25)     — one brand's style name ("Heather in Black", "Heather in
 *                      Pink") and elsewhere a yarn treatment, "Heather Grey".
 *   sienna (19)      — a style name: "Sienna (Chocolate)", "Sienna (Soft Sky)".
 *   storm (18)       — a style name: "Black storm parka", "Taupe storm parka".
 *                      Grey sits above black here, so it would take those rows
 *                      off the Black chip.
 *   steel (16)       — dominated by "Steel Blue" (9 rows); putting it in grey
 *                      would beat the blue those titles actually name.
 *   midnight (112)   — "Midnight Blue" is already navy. Bare `midnight` also
 *                      appears in "Midnight Black", "Midnight Noir" and in
 *                      style names ("Midnight Serenity Abaya").
 *   snow (20)        — would take "Snow Leopard" and "Snow Cheetah" off multi
 *                      and file two prints as white.
 *   clay (56)        — a colour, but this file cannot say WHICH: the catalogue
 *                      writes both "Brown Clay" and "Burnt Clay"/"Canyon Clay",
 *                      i.e. brown and terracotta-orange. 56 rows is the largest
 *                      single win still on the table and it is left for human
 *                      review rather than guessed.
 *   periwinkle (10), chartreuse (5), ochre (4), marigold (7), strawberry (10),
 *   raspberry (11), auburn (5), marine (6), iris (10)
 *                    — all genuinely colours, all sitting ON a family border
 *                      (blue/purple, green/yellow, yellow/orange, red/pink,
 *                      brown/red). Same call as `clay`: an unclassified row is
 *                      cheap, a wrong chip is not.
 *   champagne (30)   — a shade name, still absent, and asserted as such in the
 *                      tests rather than only claimed here.
 *   powder (89), ice (46), acid (11), tile (10), amazon (3)
 *                    — Nihan's English renderings of Turkish colourways, where
 *                      the bare English word does not carry the colour: "pudra"
 *                      is pink but "powder" alone reads blue, "kiremit" is
 *                      terracotta but "tile" is a bathroom.
 */
/**
 * A metal name immediately before a fastening or trim noun is describing the
 * HARDWARE OR THE TRIM, not the garment. Found by the 40-row hand-check in Task
 * 2 (§10.11 again — the sample is the point): row 10 was "Luxury Viscose
 * Two-Piece Set with Gold Brooch" filed under Yellow & Gold, on a set whose own
 * colour the title never states.
 *
 * Measured on 2026-08-28 over all 18,917 published rows: 15 rows are misfiled
 * this way and every one of them is a metal. 6 of the 15 then reach the family
 * the title actually names ("Black Signature Knit Dress with Gold Button" ->
 * black, "denim gold button shirt" -> blue, "Flow Kaftan in Ivory with Gold
 * Button Detail" -> white); the other 9 correctly become unclassified, because
 * "Gold Buttoned Cupra Skirt" does not say what colour the skirt is.
 *
 * ONLY metals are guarded, deliberately. Buttons and zips are MADE of gold,
 * silver, bronze and copper, so those words before a fastening are about the
 * fastening. The same is not true of dyes: "Black Button abaya" and "White
 * Button Down Long Sleeve Tunic" are a black abaya and a white tunic, and
 * guarding them would lose rows that are right today.
 *
 * All 15 rows are `gold`. `silver`, `bronze` and `copper` carry the guard on
 * the same reasoning and change 0 rows today — stated rather than implied, so
 * that a later run finding otherwise knows this number is from 2026-08-28.
 *
 * THE LIMIT, stated so it is documented rather than discovered: the lookahead
 * inspects only the IMMEDIATELY following token, so any word between the metal
 * and the fastening defeats it. "Gold Metal Button Abaya" and "Gold-Tone Button
 * Dress" would still file as yellow, because what follows `gold` is
 * `Metal`/`Tone`. Neither shape exists today — 0 rows match either
 * (data/products.json, 18,917 rows, 2026-08-28) — and widening the lookahead to
 * skip an intervening adjective is the fix if one ever appears. The only rows
 * with anything between a metal and a fastening noun are the 5 "Golden beads
 * chain - <colourway>" accessories, which are not a misfile: the item itself is
 * gold, so yellow is the right family for them.
 *
 * ALSO DELIBERATELY UNGUARDED, on the same 2026-08-28 base: `platinum`,
 * `gunmetal` and `carbon` are metals in `grey` and carry no guard. They are on
 * exactly the footing the rationale above describes — a fastening can be made of
 * them — and they are left bare only because 0 of the 18,917 published rows put
 * any of the three before a fastening or trim noun. They should join the guard
 * the moment a row does.
 *
 * KNOWN RESIDUE, left alone because it is 3 rows and the fix would cost more
 * than it buys: "Butterfly Abaya in Pastel Green with White Piping" (x2) files
 * as white, and "Black Linen Cotton Kimono Abaya with Off-White Trim and Belt"
 * as cream. Both name the garment's real colour earlier in the title.
 */
const HARDWARE_OR_TRIM =
  '(?!\\s+(?:brooch|button|buckle|zip|clasp|chain|stud|hardware|trim|piping))';

const RULES: [ColourFamily, RegExp][] = ([
  ['navy',   'navy|midnight[ -]?blue'],
  ['red',    'claret|burgundy|wine|maroon|crimson|cherry|brick|scarlet|ruby|reds?|rouges?|kırmızı' +
             '|bordeaux|pomegranate|sangria'],
  ['orange', `orange|apricot|terracotta|copper${HARDWARE_OR_TRIM}|bronze${HARDWARE_OR_TRIM}|rust|tangerine|pumpkin`],
  ['yellow', `yellow|mustard|gold(?:en)?${HARDWARE_OR_TRIM}|lemon|butter|honey|amber|saffron|sarı` +
             '|banana|citron'],
  ['pink',   'pink|blush|rose|fuchsia|fuschia|magenta|coral|salmon|peach|pembe' +
             '|flamingo|rosewater'],
  ['purple', 'purple|lilac|lavender|plum|mauve|aubergine|violet|orchid|grape|mor' +
             '|mulberry|eggplant|amethyst|wisteria|purpur'],
  ['brown',  'brown|chocolate|choco|coffee|mocha|mocca|cocoa|espresso|tan|camel|caramel|walnut|hazelnut|hazel' +
             '|toffee|chestnut|cognac|tobacco|kahve(?:rengi)?|marron' +
             '|mahogany|truffle|umber|cinnamon|pecan|fudge|nutmeg|cappuccino|macchiato|praline|sepia|cedar|oak'],
  ['beige',  'beige|sand|oat(?:meal)?|nude|taupe|stone|biscuit|latte|almond|wheat|greige|khaki|bej' +
             '|mushroom|fawn|bisque'],
  ['cream',  'cream|cr[èe]me|buttercream|ecru|vanilla|bone|eggshell|off[ -]?white|roomwit'],
  ['white',  'white|ivory|blanc|blanco|beyaz'],
  ['grey',   `gr[ae]y|charcoal|slate|ash|graphite|silver${HARDWARE_OR_TRIM}|anthracite|gris|gri` +
             '|dove|granite|coal|pewter|carbon|gunmetal|platinum|donkergrijs'],
  ['green',  'green|olive|sage|emerald|mint|forest|pistachio|moss|army|vert|yeşil' +
             '|thyme|basil|matcha|çağla|evergreen|jade|kiwi|eucalyptus|seafoam|zaytoon'],
  ['blue',   'blue|denim|jeans?|indigo|cobalt|sky|teal|turquoise|aqua|azure|petrol|bleu|mavi' +
             '|ocean|sapphire|peacock|cerulean'],
  ['black',  'black|noire?s?|nero|jet|onyx|ebony|siyah|zwart'],
  ['multi',  'multi(?:[ -]?colou?r)?|prints?|printed|floral|strip(?:e|ed|es)|leopard|check(?:ed)?|plaid|tie[ -]?dye|patterned|animal|ombr[ée]|colou?r[ -]?block' +
             '|polka[ -]?dots?'],
] as [ColourFamily, string][]).map(([f, alt]) => [f, word(alt)]);

/**
 * How the family was arrived at, so the review page can sort by how much it
 * should be trusted:
 *   'override'  Tina said so, in data/colour-overrides.json. Nothing outranks
 *               it, and it is the only confidence that can carry a `family` of
 *               null as a POSITIVE statement ("this term is not a colour", and
 *               the rest of the title named nothing either — see
 *               classifyColour, where a null override suppresses the suffix
 *               but not the body pass).
 *   'suffix'    matched inside the colourway suffix — the text after the final
 *               ' - ' or inside the trailing '(...)', which is the slot a brand
 *               uses to name a colourway, so a match there is near-certain.
 *               The 25-character limit is OURS and not a fact about brands:
 *               splitColourSuffix matches `{2,25}` and vetoes size-shaped
 *               suffixes (lib/colorVariants.ts:74-81), so any longer text at
 *               the end of a title is simply not a suffix as far as this file
 *               is concerned — including a longer term hand-written into
 *               data/colour-overrides.json, which can then never fire.
 *   'weak'      matched in the body of the title, where the same word is as
 *               likely to be a style name ("Mystic Rose Hijab") as a colour.
 *   'none'      no family. Distinct from a null override: 'none' means nobody
 *               has decided, so the term is still worth putting in front of a
 *               human.
 */
export type ColourConfidence = 'override' | 'suffix' | 'weak' | 'none';

export interface ColourVerdict {
  /** The FIRST of `families`, or null when there are none.
   *
   *  Kept beside `families` rather than replaced by it because most callers
   *  want one answer and would otherwise all have to write `families[0] ??
   *  null` themselves — `colourFamily()` below, `npm run colour:coverage`, and
   *  scripts/colour-from-images.mjs all read it. It is a convenience over
   *  `families` and can never disagree with it. */
  family: ColourFamily | null;
  /** EVERY family that applies to this title — the thing the encoder turns into
   *  a bitmask, so a product can sit on more than one colour chip.
   *
   *  Tina, 2026-08-29: *"and i want to able to choose 2 colors or more"*, of a
   *  name like "black x red" that genuinely names two.
   *
   *  MORE THAN ONE ONLY EVER COMES FROM AN OVERRIDE, today. The vocabulary
   *  yields exactly one: RULES is an ordered list and the first match wins,
   *  which is deliberate and is what stops "Navy Blue" being filed under blue
   *  (see the RULES docstring, and Invariant 6's equivalent in lib/tag.ts). So
   *  this is `[]`, a one-element array, or — for a `terms`/`weakWords` entry in
   *  data/colour-overrides.json written as a JSON ARRAY — as many as she named.
   *  The two-tone colourways become expressible. Measured 2026-08-29 on
   *  19,019 published rows: 31 rows carry a suffix containing " x " or "&"
   *  across 23 distinct terms, but only about 20 of those rows name two
   *  COLOURS ("black & white" x3, "black x red" x2, "burgundy & gold" x2,
   *  "grey & blue", "clay & ash") — the rest name two GARMENTS ("top &
   *  bottom", "knit & flared skirt") and must stay unclassified. An earlier
   *  draft of this comment said "20 rows" of `black x red` alone, which was a
   *  different measurement (any title containing an "A x B" phrase, 23 of
   *  them, only 5 of which have a parseable suffix at all). Currently filed
   *  under whichever family's rule sorts first) become EXPRESSIBLE with this
   *  column and are not yet expressed: teaching RULES to return both is a
   *  separate change, and a possible follow-up.
   *
   *  Distinct from `candidates` below, which is about the SUFFIX only and is
   *  diagnostic. This is the answer. */
  families: ColourFamily[];
  confidence: ColourConfidence;
  /** The colourway suffix, lowercased — the key into colour-overrides.terms.
   *  Null when the title has no parseable suffix. */
  term: string | null;
  /** Every family whose rule matched, in RULES order; `family` is the first of
   *  them, and more than one is the ambiguous case the review page surfaces.
   *  WHICH text was matched depends on the verdict, so read this together with
   *  `confidence` and never alone: a 'suffix' verdict fills it from the SUFFIX
   *  and can hold several families, a 'weak' verdict fills it with the single
   *  family that matched in the title BODY, and 'override' and 'none' both
   *  leave it empty. A one-element array is therefore not evidence of a suffix
   *  match. */
  candidates: ColourFamily[];
  /** The literal text that matched in the body of the title, for a 'weak'
   *  verdict — the key (lowercased) into colour-overrides.weakWords. */
  matchedWord: string | null;
}

/** An override value is one family, several, or a recorded "not a colour".
 *
 *  The ARRAY is the multi-colour case and is the only way a title reaches more
 *  than one chip today (see `ColourVerdict.families`). `null` keeps exactly the
 *  meaning it has always had — it rules out the TERM, never the product. */
type OverrideValue = ColourFamily | ColourFamily[] | null;

const TERM_OVERRIDES = OVERRIDES.terms as Record<string, OverrideValue>;
const WEAK_WORD_OVERRIDES = OVERRIDES.weakWords as Record<string, OverrideValue>;

/** One override value as the list it stands for.
 *
 *  No validation here, deliberately, and this is the seam where a bad
 *  hand-edit travels: the cast above lets any JSON string through, so
 *  `["burgandy"]` arrives as a `ColourFamily[]` that type-checks. It is caught
 *  in two places that name the file — `encodeCatalogue` throws on an element
 *  that is not in the `colours` dictionary (lib/compactCatalogue.ts), and the
 *  validator in lib/colour.test.ts fails CI on the file itself. Both check
 *  EVERY element, which is the part an array adds. */
const asFamilies = (v: Exclude<OverrideValue, null>): ColourFamily[] =>
  Array.isArray(v) ? v : [v];

/**
 * `"Amara Maxi Dress - Sage Green"` -> a verdict of `green`, from the suffix.
 *
 * The SUFFIX is tried first and on its own. That matters for precision: a match
 * inside it is near-certain, whereas the same word in the body of a title can be
 * a style name. Only if the suffix names no family does the whole title get
 * tried, and a match there is reported as 'weak' rather than being silently
 * equal to a suffix match.
 *
 * Tina's file is consulted BEFORE the vocabulary in both places, because an
 * override exists precisely for the cases the vocabulary gets wrong.
 *
 * A NULL TERM OVERRIDE IS NOT A VERDICT ABOUT THE PRODUCT. It says "this SUFFIX
 * is not a colour", and the two are different things — the first implementation
 * conflated them by returning immediately on any override, and 64 of the 18,917
 * published rows lost a colour their own title plainly states (measured
 * 2026-08-29; "Luxury Black Cascade Four Piece Abaya Set - LIMITED EDITION" was
 * black and became null). So a null override does exactly two things:
 *   - it SUPPRESSES step 2, because Tina has said that text is not a colour and
 *     it must therefore not be matched against RULES either. The body pass then
 *     runs over `split.base` — the title with that suffix removed — so the
 *     suppressed text cannot re-enter through the back door.
 *   - it changes NOTHING else. If the rest of the title names a family, that is
 *     an ordinary 'weak' body match and is reported as one.
 *
 * WHEN THE REST OF THE TITLE NAMES NOTHING, the verdict is `family: null` with
 * confidence 'override' — NOT 'none'. This is load-bearing rather than
 * cosmetic: the review page skips every row whose confidence is 'override', so
 * that Tina is never re-asked about a term she has already answered. Reporting
 * 'none' would put `limited edition` back on her review list on the very next
 * run, which is the one thing the recorded null exists to prevent.
 *
 * A non-null term override is unchanged and still returns immediately: she has
 * said that suffix means that colour, and nothing here may outrank it. It may
 * name SEVERAL colours, as a JSON array — that is the one way a title reaches
 * more than one family, and every other path here fills `families` with at most
 * one. See `ColourVerdict.families`.
 */
export function classifyColour(title: string): ColourVerdict {
  const split = splitColourSuffix(title);
  const term = split ? split.colour.toLowerCase() : null;

  // 1. An explicit call by Tina. `in` rather than a truthiness check, because
  //    null is a real recorded decision — but it is a decision about the TERM,
  //    so only a non-null one answers the whole question.
  let nulledTerm = false;
  if (term !== null && term in TERM_OVERRIDES) {
    const forced = TERM_OVERRIDES[term];
    if (forced !== null) {
      const families = asFamilies(forced);
      return { family: families[0] ?? null, confidence: 'override', term, families, candidates: [], matchedWord: null };
    }
    nulledTerm = true;
  }

  // 2. The suffix. Every family that matched is reported, not just the winner.
  //    Skipped outright for a nulled term: she has said it is not a colour.
  if (split && !nulledTerm) {
    const candidates = RULES.filter(([, re]) => re.test(split.colour)).map(([f]) => f);
    if (candidates.length > 0) {
      // `families` is the FIRST candidate alone, not all of them. RULES is
      // ordered and the first match wins — "Navy Blue" is navy, not navy AND
      // blue — so reporting every candidate here would put 209 navy rows on the
      // Blue chip too and silently change what the vocabulary decides. The
      // other candidates travel as `candidates`, which the review page reads to
      // ASK about exactly those rows rather than to answer for them.
      return { family: candidates[0], confidence: 'suffix', term, families: [candidates[0]], candidates, matchedWord: null };
    }
  }

  // 3. The body of the title. Weakest evidence — a colour word here is as
  //    likely to be a style name ("Rose Dress") as a colour. A nulled term is
  //    read out of the text first, so it cannot match here either; every other
  //    path keeps the whole title, which is equivalent for an unmatched suffix
  //    (no rule matched its text, so no rule can match it inside the title).
  const body = nulledTerm && split ? split.base : title;
  for (const [family, re] of RULES) {
    // A SUPPRESSED WEAK WORD COSTS ONLY ITSELF. `weakWords: {"rose": null}`
    // says the word `rose` must not trigger pink from a title body; it does not
    // say "give up on pink". `exec` returns only the FIRST match, so abandoning
    // the family here would take "Rose Pink Etched Crepe Lace Abaya" — and 15
    // more of the 18,917 published rows, measured 2026-08-29 — off the Pink chip
    // on the strength of a word that was switched off. So the suppressed match
    // is stepped over and the SAME family's rule is re-run on what is left.
    //
    // `rest` shrinks by at least the length of the match on every iteration
    // (`m[0]` is never empty — every alternative in RULES has a literal), so the
    // loop terminates on a title naming the suppressed word any number of times.
    //
    // Slicing rather than a `g` flag is deliberate: RULES is module-level and
    // shared, so a `lastIndex` on it would be mutable state carried between
    // calls. Slicing is safe against `word()`'s lookbehind because the match's
    // own trailing `(?![\p{L}\p{M}\d])` guarantees `rest` never begins in the
    // middle of a word.
    let rest = body;
    for (;;) {
      const m = re.exec(rest);
      if (!m) break;
      const matchedWord = m[0];
      const key = matchedWord.toLowerCase();
      if (key in WEAK_WORD_OVERRIDES) {
        const forced = WEAK_WORD_OVERRIDES[key];
        if (forced === null) {
          rest = rest.slice(m.index + matchedWord.length);   // switched off here; keep looking
          continue;
        }
        const families = asFamilies(forced);
        return { family: families[0] ?? null, confidence: 'override', term, families, candidates: [], matchedWord };
      }
      return { family, confidence: 'weak', term, families: [family], candidates: [family], matchedWord };
    }
  }

  // Nothing anywhere. 'override' when Tina has already ruled on the term, so
  // the review page does not ask her about it again; 'none' when nobody has.
  return {
    family: null,
    families: [],
    confidence: nulledTerm ? 'override' : 'none',
    term,
    candidates: [],
    matchedWord: null,
  };
}

/**
 * `"Amara Maxi Dress - Sage Green"` -> `'green'`, else null.
 *
 * The whole answer, with none of the reasoning. This is what the encoder in
 * lib/compactCatalogue.ts wants; `classifyColour` above is what the review page
 * wants. One matching implementation, deliberately — §8 records the exclusion
 * logic duplicated between `build-data.mjs` and its own test, where changing
 * one silently stopped the other from testing anything.
 */
export function colourFamily(title: string): ColourFamily | null {
  return classifyColour(title).family;
}

/**
 * `"Amara Maxi Dress - Sage Green"` -> `['green']`, and `[]` for a title that
 * names nothing.
 *
 * What the encoder in lib/compactCatalogue.ts reads, because a row's
 * `colourMask` can carry more than one bit. `colourFamily` above answers the
 * narrower question and is what `npm run colour:coverage` counts — coverage is
 * "does this title reach a chip at all", which a second family does not change.
 */
export function colourFamilies(title: string): ColourFamily[] {
  return classifyColour(title).families;
}
