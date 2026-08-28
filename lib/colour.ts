import { word } from '@/lib/tag';
import { splitColourSuffix } from '@/lib/colorVariants';

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
 * Ordered most-specific first. Order is load-bearing and is the same principle
 * as GARMENT_RULES in lib/tag.ts (Invariant 6): the first rule that matches
 * wins, so a compound name has to sit above the family whose word it contains.
 * "Navy Blue" (209 rows) must reach `navy` before `blue` sees it; "Light
 * Brown" (53) must reach `brown` before... nothing, but the pairing is stated
 * so the next person does not reorder it. `multi` is LAST, so a black floral
 * files as black and only a garment naming no colour at all falls through to
 * the pattern bucket.
 *
 * WHAT IS DELIBERATELY ABSENT, and why — each of these was in the first draft
 * and was removed after checking what it matched:
 *   linen, satin, silk, cotton, jersey, modal  — fabrics, not colours. "Linen
 *     Maxi Dress" is 1,100+ rows and none of them is beige by virtue of that.
 *   natural, smoked, mink                      — real suffixes in the data,
 *     but they name a finish or a material, and mink is a fur.
 *   nude                                       — kept, but only in `beige`,
 *     because it is a real and common colourway name in this catalogue.
 * Spaces are written `[ -]?` so "off white", "off-white" and "offwhite" all
 * match one entry.
 */
const RULES: [ColourFamily, RegExp][] = ([
  ['navy',   'navy|midnight[ -]?blue'],
  ['red',    'claret|burgundy|wine|maroon|crimson|cherry|brick|scarlet|ruby|reds?|rouges?|kırmızı'],
  ['orange', 'orange|apricot|terracotta|copper|bronze|rust|tangerine|pumpkin'],
  ['yellow', 'yellow|mustard|gold(?:en)?|lemon|butter|honey|amber|saffron|sarı'],
  ['pink',   'pink|blush|rose|fuchsia|fuschia|magenta|coral|salmon|peach|pembe'],
  ['purple', 'purple|lilac|lavender|plum|mauve|aubergine|violet|orchid|grape|mor'],
  ['brown',  'brown|chocolate|coffee|mocha|cocoa|espresso|tan|camel|caramel|walnut|hazelnut|toffee|chestnut|cognac|tobacco|kahve(?:rengi)?|marron'],
  ['beige',  'beige|sand|oat(?:meal)?|nude|taupe|stone|biscuit|latte|almond|wheat|greige|khaki|bej'],
  ['cream',  'cream|ecru|vanilla|bone|eggshell|off[ -]?white'],
  ['white',  'white|ivory|blanc|beyaz'],
  ['grey',   'gr[ae]y|charcoal|slate|ash|graphite|silver|anthracite|gris|gri'],
  ['green',  'green|olive|sage|emerald|mint|forest|pistachio|moss|army|vert|yeşil'],
  ['blue',   'blue|denim|jeans?|indigo|cobalt|sky|teal|turquoise|aqua|azure|petrol|bleu|mavi'],
  ['black',  'black|noire?s?|jet|onyx|ebony|siyah|zwart'],
  ['multi',  'multi(?:[ -]?colou?r)?|prints?|printed|floral|strip(?:e|ed|es)|leopard|check(?:ed)?|plaid|tie[ -]?dye|patterned|animal|ombr[ée]|colou?r[ -]?block'],
] as [ColourFamily, string][]).map(([f, alt]) => [f, word(alt)]);

/**
 * `"Amara Maxi Dress - Sage Green"` -> `'green'`, else null.
 *
 * The SUFFIX is tried first and on its own. That matters for precision: the
 * suffix is 25 characters the brand set aside to name a colourway, so a match
 * inside it is near-certain, whereas the same word in the body of a title can
 * be a style name ("Rose Dress"). Only if the suffix names no family does the
 * whole title get tried.
 */
export function colourFamily(title: string): ColourFamily | null {
  const split = splitColourSuffix(title);
  if (split) {
    for (const [family, re] of RULES) if (re.test(split.colour)) return family;
  }
  for (const [family, re] of RULES) if (re.test(title)) return family;
  return null;
}
