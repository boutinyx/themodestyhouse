/**
 * Merchant self-flagged quality issues, read from Shopify tags.
 *
 * WHY THIS EXISTS: a lameera-moda listing ("Luxe Silky Spandex Maxi Skirt -
 * Light Pink") went live showing a Shopify CDN glitch — the exact image URL
 * intermittently served unrelated content (floral note cards) instead of the
 * product photo. Found only because Tina happened to browse into it. Its own
 * tags already said "retakephotos" and "RECOUNTFORONLINESALE" — the merchant
 * had already flagged this exact listing as having a problem, and nothing in
 * the pipeline was reading that signal. 15 more products across 3 brands
 * carry the same class of tag (measured against the full corpus, 2026-08-12).
 *
 * This does NOT hold products back from publishing — most flagged items turn
 * out fine (9 of 10 checked by hand for lameera-moda's "retakephotos" tag
 * were correct, matching photos). It surfaces them into the review queue so
 * a human can spot-check the flagged ones periodically, instead of the first
 * signal being a customer (or Tina) seeing something broken live.
 */

const QUALITY_FLAG_PATTERNS: RegExp[] = [
  /retake/i,
  /re[\s-]?shoot/i,
  /placeholder/i,
  /\bdraft\b/i,
  /needs?[\s-]?photo/i,
  /old[\s-]?photo/i,
  /no[\s-]?photo/i,
  /missing[\s-]?photo/i,
  /broken[\s-]?(image|photo)/i,
  /fix[\s-]?photo/i,
  /bad[\s-]?image/i,
  /wrong[\s-]?image/i,
  /update[\s-]?photo/i,
  /pending[\s-]?photo/i,
];

/** The first tag matching a known quality-flag pattern, or null. */
export function qualityFlagTag(tags: string[] | undefined): string | null {
  if (!tags) return null;
  for (const tag of tags) {
    if (QUALITY_FLAG_PATTERNS.some((re) => re.test(tag))) return tag;
  }
  return null;
}
