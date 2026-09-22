import { GARMENT_LABELS } from './tag';
import type { Garment } from './types';

/**
 * Descriptive alt text for a product photograph, built from data the pipeline
 * already classifies — never invented per product. Every product image on the
 * site rendered plain `alt={p.title}` until 2026-09-22: many brand titles are
 * a proper noun with no descriptive word at all ("Zahra Dress", "Mirage Pant
 * Black"), and none of them ever named which HOUSE the piece is from, which is
 * exactly the context a screen reader or an image-search crawler is missing.
 *
 * Deliberately does NOT add colour: `lib/colour.ts`'s own classifier covers
 * ~72% of the catalogue and is a best-effort text match, not a verified fact
 * (see its own header) — asserting a colour in alt text that turns out wrong
 * is worse than the plain title. `garment` is safe to state because Invariant
 * 9 means every non-'other' classification has been checked against real
 * catalogue titles (§10.10, §10.31); 'other' means "the tagger couldn't name
 * it", not a garment word, so it is suppressed rather than surfaced.
 */
export function productAltText(p: { title: string; brandName: string; garment: Garment }): string {
  const label = p.garment !== 'other' ? GARMENT_LABELS[p.garment] : null;
  // Skip the garment word when the title already says it ("Zahra Dress"
  // doesn't need "— dress by Zahra" repeating "dress" a second time).
  const garmentWord = label && !p.title.toLowerCase().includes(label.toLowerCase()) ? `${label.toLowerCase()} ` : '';
  return `${p.title} — ${garmentWord}by ${p.brandName}`;
}
