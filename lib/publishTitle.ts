import { normalizeTitle } from './normalize';

/**
 * The ONE rule for turning a raw feed title into the published one.
 *
 * Extracted from scripts/build-data.mjs on 2026-08-26 so a test can assert
 * against the real function rather than a copy of it — CLAUDE.md §8 records
 * what happened the last time filter logic was duplicated verbatim between a
 * script and its test ("change one and the test silently stops testing the
 * real filter").
 *
 * The cache is looked up under BOTH the cleaned and the raw title. Rows
 * scraped before a normalizeTitle change are keyed raw; everything
 * scripts/translate_titles.py writes is keyed by the raw feed title. Checking
 * both keeps old entries usable instead of silently missing and re-translating.
 *
 * KEY INVARIANT: exactly ONE lookup. The result is never fed back in. A cache
 * whose keys include its own outputs translates a title twice — see
 * lib/titleTranslations.test.ts and CLAUDE.md §10.46.
 */
export function publishTitle(
  rawTitle: string | undefined,
  brandSlug: string,
  translateBrands: Record<string, string>,
  titleCache: Record<string, string>,
): { title: string; translated: boolean; uncached: boolean } {
  const cleaned = normalizeTitle(rawTitle);
  if (!translateBrands[brandSlug]) return { title: cleaned, translated: false, uncached: false };
  const hit = titleCache[cleaned] ?? (rawTitle !== undefined ? titleCache[rawTitle] : undefined);
  if (hit) {
    const title = normalizeTitle(hit);
    return { title, translated: hit !== cleaned, uncached: false };
  }
  // Not a failure — just a title the cache has not seen. Counted and reported
  // so the gap is visible rather than silent; run scripts/translate_titles.py
  // locally to fill it.
  return { title: cleaned, translated: false, uncached: true };
}
