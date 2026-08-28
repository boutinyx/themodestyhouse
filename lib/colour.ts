import { word } from '@/lib/tag';
import { splitColourSuffix } from '@/lib/colorVariants';
import OVERRIDES from '@/data/colour-overrides.json';

/**
 * Which colour family a product belongs to, for the grid's Colour filter.
 *
 * Tina, 2026-08-28: *"is there a tool of anything so we can colorcode
 * everything so we can select on colors?"*
 *
 * MEASURED BEFORE BUILDING (§10.11). Against the 18,713 published rows, the
 * product TITLE alone yields a family for 70.2% of them — 34.6% from the
 * colour suffix the catalogue already parses for `lib/colorVariants.ts`, and
 * a further 35.6% from a colour word elsewhere in the title. Two richer
 * sources were checked and rejected: product tags add only ~5pp and would
 * need a new field on `Product` plus a pipeline change, and the Shopify feed's
 * own `options: [{name: "Color"}]` is present for only 12.5% of products
 * across a 12-brand sample. Title-only is where the evidence is.
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
 * specificity ranking — the order is, in three tiers:
 *   1. COMPOUND-NAME FAMILIES FIRST, so a compound reaches its own family
 *      before the family whose word it contains. "Navy Blue" (209 rows) must
 *      reach `navy` before `blue` sees it, and `cream`'s "off-white" must
 *      reach `cream` before `white`. ("Light Brown", 53 rows, reaches `brown`
 *      whatever the order — no family claims "light" — so it is tested as
 *      documentation of the pattern, not because it depends on position.)
 *   2. AN ARBITRARY TIE-BREAK for everything else. Nothing derives the
 *      remaining positions; they are fixed only because moving one
 *      reclassifies rows. `black` sits 14th of 15 for no better reason.
 *   3. `multi` LAST, so a black floral files as black and only a garment
 *      naming no colour at all falls through to the pattern bucket.
 * Known consequence of tier 2, so it is not a surprise later: of the 2,134
 * titles naming black, 123 file under an earlier family — mostly defensible
 * two-tone items ("Miraal - Black & White"), a few plainly wrong ("Black
 * Cotton Maxi Dress with Beige Grosgrain Trim" -> beige). A new family goes at
 * the end of tier 2 unless it is a compound, in which case it goes above the
 * family it contains.
 *
 * WHAT IS DELIBERATELY ABSENT, and why — each of these was in the first draft
 * and was removed after checking what it matched:
 *   linen, satin, silk, cotton, jersey, modal  — fabrics, not colours. "Linen
 *     Maxi Dress" is 1,100+ rows and none of them is beige by virtue of that.
 *   denim                                      — a fabric on the same footing,
 *     and the ONE deliberate exception to that rule: it is KEPT, in `blue`,
 *     together with the garment word `jeans`, because denim reads as a colour
 *     to someone using a colour filter. 141 rows match `blue` on the body word
 *     alone, and the cost is accepted and known — "The Barrel Denim [Black]"
 *     files as blue.
 *   natural, smoked, mink                      — real suffixes in the data,
 *     but they name a finish or a material, and mink is a fur.
 *   nude                                       — kept, but only in `beige`,
 *     because it is a real and common colourway name in this catalogue.
 * Spaces are written `[ -]?` so "off white", "off-white" and "offwhite" all
 * match one entry.
 *
 * THE SECOND PASS, 2026-08-28. `scripts/colour-coverage.mjs` prints the colour
 * suffixes that no rule matched, ordered by frequency; every one of the 59 words
 * added below came off that list and only after `word()`-matching it against all
 * 18,917 published rows and reading what it hit. The vocabulary alone moved
 * coverage 13,161 -> 13,753 (+592 rows); the HARDWARE_OR_TRIM guard below then
 * withdrew 9, landing at 13,744, 72.7%. Each addition is carried by an assertion
 * in lib/colour.test.ts using a literal catalogue title.
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
 *               null as a POSITIVE statement ("this term is not a colour").
 *   'suffix'    matched inside the colourway suffix — 25 characters the brand
 *               set aside to name a colour, so a match there is near-certain.
 *   'weak'      matched in the body of the title, where the same word is as
 *               likely to be a style name ("Mystic Rose Hijab") as a colour.
 *   'none'      no family. Distinct from a null override: 'none' means nobody
 *               has decided, so the term is still worth putting in front of a
 *               human.
 */
export type ColourConfidence = 'override' | 'suffix' | 'weak' | 'none';

export interface ColourVerdict {
  family: ColourFamily | null;
  confidence: ColourConfidence;
  /** The colourway suffix, lowercased — the key into colour-overrides.terms.
   *  Null when the title has no parseable suffix. */
  term: string | null;
  /** Every family whose rule matched the suffix, in priority order. More than
   *  one is the ambiguous case; `family` is the first of them. */
  candidates: ColourFamily[];
  /** The literal text that matched in the body of the title, for a 'weak'
   *  verdict — the key (lowercased) into colour-overrides.weakWords. */
  matchedWord: string | null;
}

const TERM_OVERRIDES = OVERRIDES.terms as Record<string, ColourFamily | null>;
const WEAK_WORD_OVERRIDES = OVERRIDES.weakWords as Record<string, ColourFamily | null>;

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
 */
export function classifyColour(title: string): ColourVerdict {
  const split = splitColourSuffix(title);
  const term = split ? split.colour.toLowerCase() : null;

  // 1. An explicit call by Tina always wins, including a null one. `in` rather
  //    than a truthiness check, because null is a real recorded decision.
  if (term !== null && term in TERM_OVERRIDES) {
    return { family: TERM_OVERRIDES[term], confidence: 'override', term, candidates: [], matchedWord: null };
  }

  // 2. The suffix. Every family that matched is reported, not just the winner.
  if (split) {
    const candidates = RULES.filter(([, re]) => re.test(split.colour)).map(([f]) => f);
    if (candidates.length > 0) {
      return { family: candidates[0], confidence: 'suffix', term, candidates, matchedWord: null };
    }
  }

  // 3. The body of the title. Weakest evidence — a colour word here is as
  //    likely to be a style name ("Rose Dress") as a colour.
  for (const [family, re] of RULES) {
    const m = re.exec(title);
    if (!m) continue;
    const matchedWord = m[0];
    const key = matchedWord.toLowerCase();
    if (key in WEAK_WORD_OVERRIDES) {
      const forced = WEAK_WORD_OVERRIDES[key];
      if (forced === null) continue;   // switched off here; keep looking
      return { family: forced, confidence: 'override', term, candidates: [], matchedWord };
    }
    return { family, confidence: 'weak', term, candidates: [family], matchedWord };
  }

  return { family: null, confidence: 'none', term, candidates: [], matchedWord: null };
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
