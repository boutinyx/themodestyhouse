import type { Metadata } from 'next';

/**
 * Dropping the site-name suffix from a <title> that is already too long.
 *
 * `app/layout.tsx` sets `template: '%s | The Modesty House'`, so every page
 * title carries a fixed 20-character tail. That is the right default — it puts
 * the house name in the SERP — but it is also 20 characters a long headline
 * cannot afford. Measured across all 160 sitemap URLs on 2026-09-15, chasing
 * Inoma Digital's "5 titles too long": five pages ran 76-79 characters, and the
 * suffix is the whole difference on four of them.
 *
 * Tina's decision, the same day: drop the site name on the pages where the
 * combined title runs over, rather than rewrite the headlines (which are copy,
 * §10.18). This is that rule, expressed once so it keeps working as titles
 * change rather than being five hard-coded slugs.
 *
 * Threshold is deliberately 75, not 60. Twenty-five titles exceed 60 characters
 * today and stripping the house name from all of them was not what she chose;
 * the rest go to whoever writes the shorter headlines.
 */

export const TITLE_SUFFIX = ' | The Modesty House';

/** Longest a rendered <title> may be before the suffix is dropped. */
export const TITLE_MAX = 75;

/**
 * What to hand Next's `metadata.title`.
 *
 * Returns the bare string when the templated title fits — so the layout adds
 * the suffix as usual — and `{ absolute }` when it does not, which is Next's
 * way of saying "ignore the parent template".
 */
export function pageTitle(title: string): Metadata['title'] {
  return title.length + TITLE_SUFFIX.length > TITLE_MAX ? { absolute: title } : title;
}
