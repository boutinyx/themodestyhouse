/**
 * Reads a product's remaining size availability, so the publish step can drop
 * anything whose smallest in-stock size is XL or bigger.
 *
 * Tina's rule, 2026-08-28: "products that have only XL and XXL left — I want
 * them gone." Sizes sell out daily, so this is evaluated at PUBLISH time on
 * every nightly refresh, never written into decisions.json — a restocked S/M/L
 * republishes the product on the next run with no human action.
 *
 * Two properties are load-bearing and both are tested:
 *
 *  1. UNREADABLE IS NOT LARGE. Two thirds of the catalogue is not alpha-sized —
 *     one-size hijabs, 52-60 abaya sizing, US 10-22, cm dimensions — and
 *     WooCommerce brands expose no variants at all. Every one of those must be
 *     left alone. A rule that reads "no size data" as "only large sizes left"
 *     would empty the directory on its first publish (§10.31 rule 2: tightening
 *     a classifier is a destructive operation until you have measured it).
 *  2. EXACT TOKENS ONLY, never substring matching. "Slim", "Maxi", "Long" and
 *     "Mini" are all real size labels containing a size letter, and §10.5,
 *     §10.10 and §10.31 are three separate incidents caused by matching a short
 *     token inside a longer word. A label is ranked by looking the WHOLE string
 *     up first, then its separator-delimited tokens — no substring search
 *     anywhere, so no word-boundary escape hatch is needed.
 */
import type { VariantSize } from '@/lib/types';

export type { VariantSize };

/** Ordinal scale. Only the ORDER matters; the absolute numbers are private. */
const SIZES: Record<string, number> = {
  xxs: 0, '2xs': 0, 'xx-small': 0, 'xx small': 0,
  xs: 1, 'x-small': 1, 'x small': 1, 'extra small': 1,
  s: 2, small: 2,
  m: 3, medium: 3, med: 3,
  l: 4, large: 4,
  xl: 5, '1xl': 5, 'x-large': 5, 'x large': 5, 'extra large': 5,
  xxl: 6, '2xl': 6, 'xx-large': 6, 'xx large': 6,
  xxxl: 7, '3xl': 7, 'xxx-large': 7, 'xxx large': 7,
  '4xl': 8, xxxxl: 8,
  '5xl': 9,
  '6xl': 10,
};

/** The default cut-off: XL. Chosen by Tina — a product is dropped once nothing
 *  BELOW this size is still in stock. */
export const SIZE_FLOOR = SIZES.xl;

/** Splits a label into alternative sizes. A hyphen only separates when it has
 *  whitespace beside it ("XL -XXL"), so the hyphen inside "X-Large" survives. */
const SEPARATORS = /[/,|;+]|\s+-\s*|\s*-\s+|\s+/;

const normalise = (label: string) => String(label ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The size a label denotes, or `null` when this rule cannot read it.
 * A combined label ("XL/XXL", "M/L") takes the SMALLEST size it names — that is
 * the size a shopper can actually buy.
 */
export function sizeRank(label: string): number | null {
  const whole = normalise(label);
  if (!whole) return null;
  if (whole in SIZES) return SIZES[whole];

  let smallest: number | null = null;
  for (const token of whole.split(SEPARATORS)) {
    const rank = SIZES[token];
    if (rank === undefined) continue;
    if (smallest === null || rank < smallest) smallest = rank;
  }
  return smallest;
}

/**
 * True when the product is still buyable, but only in `floor` (default XL) and
 * above. False whenever that cannot be established — no size data, an
 * unreadable sizing system, an unreadable size still in stock, or nothing in
 * stock at all (which is `inStock`'s job to report, not this one's).
 */
export function onlyLargeSizesLeft(sizes?: VariantSize[], floor: number = SIZE_FLOOR): boolean {
  if (!sizes?.length) return false;
  const inStock = sizes.filter((s) => s.available);
  if (!inStock.length) return false;

  let smallest: number | null = null;
  for (const s of inStock) {
    const rank = sizeRank(s.label);
    // One unreadable size still on the shelf is enough to keep the product:
    // "One Size" in stock fits anyone.
    if (rank === null) return false;
    if (smallest === null || rank < smallest) smallest = rank;
  }
  return smallest !== null && smallest >= floor;
}
