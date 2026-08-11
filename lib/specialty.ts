import type { Product } from '@/lib/types';

// "Specialty" = swimwear + activewear + layering. These should NOT intermix
// with everyday clothing (dresses, trousers, tops…). They only surface on
// their own lanes (modest-swimwear, modest-activewear, layering-basics).
// Kept deliberately HIGH-PRECISION so we never hide a real dress: the stored
// `activity: 'gym'` flag is noisy (it mislabels floral dresses, prayer
// outfits and plain maxi skirts), so we only trust it on activewear-typical
// garments and otherwise require the title to say so.

const SWIM_RE = /burkini|swim|bathing ?suit|beachwear/i;
const ACTIVE_RE = /\b(sports?|activewear|athleis\w*|athletic|gym|workout|yoga|running)\b/i;
const ACTIVE_GARMENTS = new Set(['trousers', 'top', 'set']);

// Coverage pieces worn UNDER another garment (base layers, dickeys, standalone
// neck covers, sleeve extenders) rather than as an outfit on their own — Tina
// flagged examples including BNAH's sleeveless mock-neck "singlet" top,
// ilovemodesty's "Black Neck Cover" and ilovemodesty's shrug-shaped "One
// Piece Sleeves" (just a shoulder cap + sleeves, no torso) — all scattered
// across dress/set/top because nothing in the classifier distinguished them.
// Vocabulary below is every phrase actually found in the raw catalogue for
// this concept — 65 rows across 11 brands, checked 2026-08-11 — not a
// guessed pattern; each term is unambiguous on its own (a "dickey" or "neck
// cover" is never a complete outfit). `\bbase layer\b` excludes a trailing
// "dress"/"abaya" because a full-length base-layer DRESS (e.g. mariams'
// MS157/MS190) is still a complete, standalone garment — only the
// accessory-scale pieces belong here. `\bone.?piece sleeves?\b` requires
// "sleeves" right after "one piece" so it never catches a "one piece
// swimsuit". Deliberately excludes hijab/underscarf/bonnet titles: those
// stay in Hijabs per Tina's call, even when they also happen to cover the neck.
const LAYERING_RE = /\bneck cover\b|\bdicke?y\b|\bmodesty panel\b|\bbase layer\b(?!\s+(?:abaya\s+)?dress)|\bshoulder.?cover\b|\bsleeve (?:cover|extender|add.?on)s?\b|\barm sleeves?\b|\bone.?piece sleeves?\b|\bcollar (?:cover|insert)\b|\binner top\b|\bbody top\b|\bsinglet\b/i;
const LAYERING_HIJAB_RE = /\bhijab\b|\bunderscarf\b|\bbonnet\b/i;

export function isSwim(p: Product): boolean {
  return p.garment === 'swim' || SWIM_RE.test(p.title);
}

export function isActivewear(p: Product): boolean {
  if (isSwim(p)) return false; // swimwear belongs to the swim lane, not activewear
  if (ACTIVE_RE.test(p.title)) return true;
  const a = p.activity || [];
  return (a.includes('gym') || a.includes('swim')) && ACTIVE_GARMENTS.has(p.garment);
}

export function isLayering(p: Product): boolean {
  return LAYERING_RE.test(p.title) && !LAYERING_HIJAB_RE.test(p.title);
}

// Anything that must stay out of the general/category listings.
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p) || isLayering(p);
}
