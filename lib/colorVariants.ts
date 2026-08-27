import type { Product } from '@/lib/types';

/**
 * Collapsing "same garment, different colour" into ONE card.
 *
 * Tina, 2026-08-27: *"we have a lot of items that are the same just a different
 * color. can we put only 1 in the catalogue and if there are additional colors
 * just stating that in the bottom right corner with mini colors?"*
 *
 * Measured on the published catalogue before building any of this: **6,896
 * products (36.5%) sit in 1,562 colour groups**, so the grids lose 5,334
 * duplicate cards. Hijabs & Scarves nearly halves (5,099 -> 2,912) because that
 * is where the same scarf is listed in twenty colourways.
 *
 * --- Why the split is structural and needs no colour vocabulary ---
 *
 * Detection deliberately does NOT ask "is this word a colour?". It groups on
 * the shared PREFIX and treats whatever differs as the variant axis. That
 * sidesteps the trap Sec 10.16 and Sec 10.31 are both about - a colour word
 * list would have to be right in English, Turkish, Dutch, French and German,
 * and `\b` does not even mean what you want in Turkish. Here the evidence is
 * positional, not lexical, so the language never comes into it.
 *
 * Measured cost of that choice: of the 6,896 rows this groups, only **73**
 * (1.1%) have a suffix that is not a colour at all - "146 cm", "long sleeve",
 * "s/m 142 cm". NON_COLOUR_SUFFIX below excludes those, because grouping a
 * size run under one card would hide real choices rather than duplicates.
 *
 * --- What it deliberately does NOT do ---
 *
 * The LEADING-colour pattern ("Chocolate Linen Cotton Wrap Top", Jawda's whole
 * catalogue) is left alone. Structurally it looks identical - 1,064 groups,
 * 2,988 products - but it cannot be done without a colour vocabulary, and
 * measuring it showed why: the same rule also groups Sistrs' "The Riella Label"
 * with itself, and Esme NY's "Tulip"/"Batwing" tops, which are STYLE names, not
 * colours. Those would be two different garments merged into one card, which is
 * a worse failure than a duplicate. Revisit only with a real vocabulary.
 */

/** Suffixes that are a size, length or cut rather than a colour. Every entry
 *  was found in the real catalogue; together they cover all 73 non-colour
 *  suffixes measured across the 6,896 grouped rows. */
const NON_COLOUR_SUFFIX =
  /(\d+\s*cm\b|\d+\s*"|\bs\/m\b|\bl\/xl\b|\bx?s\b|\bx?l\b|\bxxl\b|\bmedium\b|\blarge\b|\bsmall\b|\bregular\b|\bpetite\b|\btall\b|\blong sleeve\b|\bshort sleeve\b|\bsleeveless\b)/i;

/**
 * `"Amara Maxi Dress - Sage Green"` -> `{ base, colour }`, else null.
 *
 * Two shapes, both measured on real titles: a dash separator (7,558 titles use
 * " - ", 639 an en dash) and a trailing parenthetical (278). The suffix is
 * capped at 25 characters and must contain no further dash, so a title that is
 * itself hyphenated ("Tie-Back Maxi Dress") does not split in the wrong place.
 */
export function splitColourSuffix(title: string): { base: string; colour: string } | null {
  let m = title.match(/^(.*?)\s+[-–—]\s+([^-–—]{2,25})$/);
  if (!m) m = title.match(/^(.*?)\s*\(([^)]{2,25})\)\s*$/);
  if (!m) return null;
  const base = m[1].trim();
  const colour = m[2].trim();
  // A base too short to be a product name is not one.
  if (base.length < 4 || !colour) return null;
  if (NON_COLOUR_SUFFIX.test(colour)) return null;
  return { base, colour };
}

/** The grouping key. Brand AND garment are both part of it: two houses can sell
 *  a "Linen Maxi Dress", and within one house an "Amara Set - Black" must not
 *  merge with an "Amara Dress - Black". */
function groupKey(p: Product, base: string): string {
  return `${p.brandSlug} ${p.garment} ${base.toLowerCase()}`;
}

/**
 * Collapse colour runs, preserving input order.
 *
 * The FIRST member encountered leads the group, so the caller's existing order
 * decides which colour fronts the card and nothing about the grid's ranking
 * changes. That is not a fallback for want of a better rule - it was measured:
 * across 40 sampled groups, **100% agreed on portrait-vs-not and 95% had
 * identical aspect ratios**, because brands shoot every colourway the same way.
 * A "prefer the best model photo" tiebreak had literally nothing to choose
 * between in any group, so it would have been ceremony, not selection.
 *
 * Returns leads only. Each lead is a COPY carrying `variantCount`; the input
 * products are never mutated, because `getProducts()` hands out a cached array
 * that other callers share.
 */
export function groupColourVariants(products: Product[]): Product[] {
  const leadIndexByKey = new Map<string, number>();
  const out: Product[] = [];
  const counts: number[] = [];

  for (const p of products) {
    const split = splitColourSuffix(p.title);
    if (!split) {
      out.push(p);
      counts.push(1);
      continue;
    }
    const key = groupKey(p, split.base);
    const at = leadIndexByKey.get(key);
    if (at === undefined) {
      leadIndexByKey.set(key, out.length);
      // The lead's title keeps its own colour suffix - "Amara Maxi Dress -
      // Sage Green", not "Amara Maxi Dress". The card shows a real photograph
      // of a specific colourway and links to that exact product, so stripping
      // the suffix would make the label disagree with both.
      out.push(p);
      counts.push(1);
    } else {
      counts[at]++;
    }
  }

  return out.map((p, i) => (counts[i] > 1 ? { ...p, variantCount: counts[i] } : p));
}
