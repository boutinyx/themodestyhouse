/**
 * Keeping a <meta name="description"> inside the length Google will print.
 *
 * Google renders roughly 155-160 characters of a description before cutting
 * it, and where it cuts is not a word boundary — a sentence sliced mid-word is
 * what a searcher reads. Two length faults existed on this site, both measured
 * 2026-09-15 against the live sitemap while checking Inoma Digital's audit:
 *
 *   - 47 of 91 /designers/<slug> pages ran 161-168 characters, because the
 *     fallback description is COMPOSED from data (piece count, price range,
 *     city, storefront hostname) and a long brand name or city pushes it over.
 *   - the description for a house that HAS prose was `.slice(0, 158)`, which
 *     cuts mid-word.
 *
 * Both are fixed by dropping whole trailing sentences rather than characters,
 * so what ships is always a complete thought. Nothing here composes any new
 * wording (CLAUDE.md §10.18) — it only decides how much of an existing string
 * survives.
 */

export const META_DESCRIPTION_MAX = 160;

/**
 * Join `parts` (each a complete sentence or clause, already punctuated) with a
 * space, keeping only the leading parts that fit inside `max`.
 *
 * The first part is always kept: a description of nothing is worse than a long
 * one. If it alone exceeds `max` it is word-boundary truncated by clampText().
 */
export function fitSentences(parts: string[], max = META_DESCRIPTION_MAX): string {
  const kept: string[] = [];
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const next = kept.length ? `${kept.join(' ')} ${part}` : part;
    if (next.length <= max) {
      kept.push(part);
      continue;
    }
    // Nothing kept yet means this first part is itself too long.
    if (!kept.length) return clampText(part, max);
    break;
  }
  return kept.join(' ');
}

/**
 * Cut `text` to at most `max` characters, at a word boundary, with no trailing
 * punctuation left dangling. Returns the text unchanged when it already fits.
 */
export function clampText(text: string, max = META_DESCRIPTION_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  // A cut that lands exactly ON a space already ends on a whole word, so the
  // last word is kept rather than thrown away for nothing.
  const endsCleanly = /\s/.test(t[max] ?? '');
  const lastSpace = cut.lastIndexOf(' ');
  const body = endsCleanly || lastSpace <= 0 ? cut : cut.slice(0, lastSpace);
  return body.replace(/[\s,;:.–—-]+$/, '');
}
