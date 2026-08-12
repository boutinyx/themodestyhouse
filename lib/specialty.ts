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
// a "one piece swimsuit". `\bcropped .{0,20}body shirt\b` is scoped to the
// CROPPED variant only — ilovemodesty also sells an uncropped, standard-
// length "Full Body Shirt" line (checked via photo: a plain full-length
// high-neck top, a real standalone garment) that Tina did not flag and this
// must not catch. The cropped one photographs as a midriff-baring top, which
// only makes sense as something worn UNDER a high-waisted skirt/trouser —
// exactly this category, not a contradiction of "modest". Deliberately
// excludes hijab/underscarf/bonnet titles: those stay in Hijabs per Tina's
// call, even when they also happen to cover the neck. Deliberately excludes
// "cover-up" entirely — checked, and it's a real name for cardigans, full
// abayas and swim cover-ups (all complete, standalone garments already in
// the right lane), not a signal for this category the way "neck cover" or
// "dickey" is.
const LAYERING_RE = /\bneck cover\b|\bdicke?y\b|\bmodesty panel\b|\bbase layer\b(?!\s+(?:abaya\s+)?dress)|\bshoulder.?cover\b|\bsleeve (?:cover|extender|add.?on)s?\b|\barm sleeves?\b|\bone.?piece sleeves?\b|\bshirt extenders?\b|\bcollar (?:cover|insert)\b|\binner top\b|\bbody top\b|\bcropped .{0,20}body shirt\b|\bsecond skin top\b|\bcore top\b|\bluxe basic top\b|\bunder.?shirts?\b|\bsinglet\b/i;
const LAYERING_HIJAB_RE = /\bhijab\b|\bunderscarf\b|\bbonnet\b/i;

// Dress-length underlayers — "Under Dress"/"Inner Dress"/"Underdress", worn
// under a sheer or open abaya/kimono. Tina's explicit call 2026-08-12: move
// ALL of these to Layering Basics regardless of styling or price, after
// seeing that some (kamin's sheer black mesh "Ruqa Underdress", chi-ka's
// $245 "Under Dress") are photographed as complete standalone looks. 87 raw
// rows checked across 19 brands. Deliberately gated on `garment !== 'abaya'`
// — NOT part of the text pattern, because the distinguishing signal here
// isn't in the words. 37 of the 87 raw rows are garment:'abaya', and EVERY
// one of those is a bundled multi-piece SET LISTING where "with inner
// dress"/"& Underdress" describes an included component of a single sold-
// together product ("The Shamsa Abaya & Underdress" — kamin, 520 AED;
// "2pcs Set Kimono + Underdress" — mukistore; "3-Piece Abaya Set... with
// Inner Dress" — mariams/lumos/bazar-al-haya). Those are complete abaya
// outfits, not accessories, and moving the whole SET LISTING into an
// accessories page would be a real mistake — deliberately left in Abayas.
const UNDER_DRESS_RE = /\bunder.?dress\b|\binner dress\b/i;

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
  if (UNDER_DRESS_RE.test(p.title) && p.garment !== 'abaya') return true;
  return p.brandSlug === 'ria-miranda' && RIA_MIRANDA_LAYERING_RE.test(p.title);
}

/**
 * Sub-categories WITHIN Layering Basics, for the "Type" filter on that lane
 * (components/FilterableGrid.tsx). Tina's call 2026-08-12, after reviewing
 * the natural split of the 146 published items at the time: 5 groups —
 * order here is the canonical filter-dropdown order, independent of
 * catalogue interleaving. Checked once via layeringSubtype's own test
 * (lib/specialty.test.ts) that every currently-published isLayering() item
 * gets a non-null subtype — a silent `null` would mean an item vanishes
 * from every Type filter option while still being on the page, unfindable
 * by type.
 *
 * Each regex reuses the exact vocabulary LAYERING_RE/UNDER_DRESS_RE were
 * already built from — this function only decides WHICH group a match
 * belongs to, never whether something is layering at all (that's still
 * isLayering()'s job, called first).
 */
export type LayeringSubtype =
  | 'neck-cover'
  | 'sleeve-extender'
  | 'cropped-body-shirt'
  | 'under-dress'
  | 'base-layer-top';

export const LAYERING_SUBTYPE_LABELS: Record<LayeringSubtype, string> = {
  'neck-cover': 'Neck Covers & Dickeys',
  'sleeve-extender': 'Sleeve Extenders',
  'base-layer-top': 'Base-Layer Tops',
  'cropped-body-shirt': 'Cropped Body Shirts',
  'under-dress': 'Under-Dresses',
};

const NECK_COVER_RE = /\bneck cover\b|\bdicke?y\b|\bmodesty panel\b|\bcollar (?:cover|insert)\b/i;
const SLEEVE_EXTENDER_RE = /\bsleeve (?:cover|extender|add.?on)s?\b|\barm sleeves?\b|\bone.?piece sleeves?\b|\bshirt extenders?\b/i;
const CROPPED_BODY_SHIRT_RE = /\bcropped .{0,20}body shirt\b/i;

/** Returns null for anything that isn't a layering piece at all — always
 *  call after (or alongside) isLayering(), never as a substitute for it. */
export function layeringSubtype(p: Product): LayeringSubtype | null {
  if (!isLayering(p)) return null;
  if (NECK_COVER_RE.test(p.title)) return 'neck-cover';
  if (SLEEVE_EXTENDER_RE.test(p.title)) return 'sleeve-extender';
  if (CROPPED_BODY_SHIRT_RE.test(p.title)) return 'cropped-body-shirt';
  if (UNDER_DRESS_RE.test(p.title)) return 'under-dress';
  return 'base-layer-top'; // base layer / body top / core top / singlet / ria-miranda's Comfy line / etc.
}

export function isActivewear(p: Product): boolean {
  if (isSwim(p)) return false; // swimwear belongs to the swim lane, not activewear
  if (isLayering(p)) return false; // e.g. ria-miranda's ri-flex line carries a noisy activity:"gym" tag
  if (ACTIVE_RE.test(p.title)) return true;
  const a = p.activity || [];
  return (a.includes('gym') || a.includes('swim')) && ACTIVE_GARMENTS.has(p.garment);
}

// "Jilbab" is inconsistent across this catalogue's brands: for eastessence
// and bazar-al-haya it's a regional synonym for a regular fashion abaya
// (denim jackets, corduroy coats — real everyday garments); for others it
// specifically means a two-piece prayer set (telekung/mukena-style —
// "2-Piece Prayer Set (Jilbab)", "One-Piece Jilbab / Prayer Dress"). Tina's
// explicit call 2026-08-12, after seeing both: route every jilbab-titled
// product to the Hijabs & Scarves lane regardless of which kind it is, same
// as any other item she doesn't want intermixed into general browsing. 332
// raw rows across 15 brands. This does NOT change `garment` — a jilbab
// product's structured data/breadcrumbs still say what it structurally is —
// it only changes which lane displays it (see lib/lanes.ts modest-hijabs).
const JILBAB_RE = /\bjilbabs?\b/i;

export function isJilbab(p: Product): boolean {
  return JILBAB_RE.test(p.title);
}

// Anything that must stay out of the general/category listings. Jilbab is
// folded in here (rather than getting its own lane) because the mechanism —
// "excluded from every lane except one dedicated one" — is exactly what
// modest-hijabs already needs to do for it; see the `specialty: true` on
// that lane in lib/lanes.ts.
export function isSpecialty(p: Product): boolean {
  return isSwim(p) || isActivewear(p) || isLayering(p) || isJilbab(p);
}
