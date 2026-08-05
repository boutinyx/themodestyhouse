import type { Product } from '@/lib/types';

// "Specialty" = swimwear + activewear. These should NOT intermix with everyday
// clothing (dresses, trousers, tops…). They only surface on their own lanes
// (modest-swimwear, modest-activewear). Kept deliberately HIGH-PRECISION so we
// never hide a real dress: the stored `activity: 'gym'` flag is noisy (it
// mislabels floral dresses, prayer outfits and plain maxi skirts), so we only
// trust it on activewear-typical garments and otherwise require the title to say so.

const SWIM_RE = /burkini|swim|bathing ?suit|beachwear/i;
const ACTIVE_RE = /\b(sports?|activewear|athleis\w*|athletic|gym|workout|yoga|running)\b/i;
const ACTIVE_GARMENTS = new Set(['trousers', 'top', 'set']);

export function isSwim(p: Product): boolean {
  return p.garment === 'swim' || SWIM_RE.test(p.title);
}

export function isActivewear(p: Product): boolean {
  if (isSwim(p)) return false; // swimwear belongs to the swim lane, not activewear
  if (ACTIVE_RE.test(p.title)) return true;
  const a = p.activity || [];
  return (a.includes('gym') || a.includes('swim')) && ACTIVE_GARMENTS.has(p.garment);
}

// Anything that must stay out of the general/category listings.
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p);
}
