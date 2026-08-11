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
// this concept — 86 rows across 14 brands, last swept 2026-08-12, the second
// pass done visually (Playwright screenshots of every ambiguous "basics"-
// sounding title in the live /directory, not just a text grep — see
// docs/log/2026-08-11-layering-basics-category.md addendum 3) — not a
// guessed pattern; each term is unambiguous on its own (a "dickey" or "neck
// cover" is never a complete outfit). `\bbase layer\b` excludes a trailing
// "dress"/"abaya" because a full-length base-layer DRESS (e.g. mariams'
// MS157/MS190) is still a complete, standalone garment — only the
// accessory-scale pieces belong here. Same reasoning kept `\bsecond skin
// top\b` and `\bcore top\b` narrow to the exact phrase — BNAH's visually
// near-identical "Core Ribbed Tank" (branded, $40, styled as a going-out
// tank) and "Comfort Top"/"Comfort High Neck Top"/"Modal Turtleneck Top"
// (all $28-66, styled as complete outfits with a model) were checked via
// screenshot and are real standalone tops, NOT included — only "Core Top"
// ($23, plain, unbranded, same silhouette as "Core Cotton Body Top") and
// "Luxe Basic Top" ($8, photographed peeking out from under a hijab cap,
// the classic underlayer merchandising shot) cleared the bar. `\bone.?piece
// sleeves?\b` requires "sleeves" right after "one piece" so it never catches
// a "one piece swimsuit". Deliberately excludes hijab/underscarf/bonnet
// titles: those stay in Hijabs per Tina's call, even when they also happen
// to cover the neck. Deliberately excludes "cover-up" entirely — checked,
// and it's a real name for cardigans, full abayas and swim cover-ups (all
// complete, standalone garments already in the right lane), not a signal
// for this category the way "neck cover" or "dickey" is.
const LAYERING_RE = /\bneck cover\b|\bdicke?y\b|\bmodesty panel\b|\bbase layer\b(?!\s+(?:abaya\s+)?dress)|\bshoulder.?cover\b|\bsleeve (?:cover|extender|add.?on)s?\b|\barm sleeves?\b|\bone.?piece sleeves?\b|\bshirt extenders?\b|\bcollar (?:cover|insert)\b|\binner top\b|\bbody top\b|\bsecond skin top\b|\bcore top\b|\bluxe basic top\b|\bunder.?shirts?\b|\bsinglet\b/i;
const LAYERING_HIJAB_RE = /\bhijab\b|\bunderscarf\b|\bbonnet\b/i;

// ria-miranda's "ri-flex" line (their own base-layer sub-brand — logo reads
// "ri•flex, feel light, flexibly you" on the product photo itself, no title
// vocabulary in common with the rest of LAYERING_RE) is tagged `activity:
// ["gym"]` on the feed, same as their real activewear. Checked all three via
// screenshot: plain flat-lay mock-neck tops, no branding, nothing like the
// "Shera Inner Tee" a few rows over — a zip-collar, logo-printed top clearly
// styled as a complete athletic outfit, correctly left as activewear.
// Brand-scoped rather than a bare "comfy ... top" match: that phrase is
// generic enough that another brand could use it for something unrelated,
// and this is the only brand it was verified against.
const RIA_MIRANDA_LAYERING_RE = /\bcomfy (?:sleeveless|long sleeve|short sleeve) top\b/i;

export function isSwim(p: Product): boolean {
  return p.garment === 'swim' || SWIM_RE.test(p.title);
}

export function isLayering(p: Product): boolean {
  if (LAYERING_HIJAB_RE.test(p.title)) return false;
  if (LAYERING_RE.test(p.title)) return true;
  return p.brandSlug === 'ria-miranda' && RIA_MIRANDA_LAYERING_RE.test(p.title);
}

export function isActivewear(p: Product): boolean {
  if (isSwim(p)) return false; // swimwear belongs to the swim lane, not activewear
  if (isLayering(p)) return false; // e.g. ria-miranda's ri-flex line carries a noisy activity:"gym" tag
  if (ACTIVE_RE.test(p.title)) return true;
  const a = p.activity || [];
  return (a.includes('gym') || a.includes('swim')) && ACTIVE_GARMENTS.has(p.garment);
}

// Anything that must stay out of the general/category listings.
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p) || isLayering(p);
}
