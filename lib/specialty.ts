import type { Product } from '@/lib/types';
import type { LayeringSubtype, OuterwearSubtype } from '@/lib/types';

// Re-exported so existing call sites (lib/compactCatalogue.ts) don't need
// to change their import — the type itself now lives in lib/types.ts to
// avoid a circular import (Product carries a field of this type).
export type { LayeringSubtype, OuterwearSubtype };

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

// "Ruched Body Top" (modesty-in-style, $14-20) — the one "body top" title in
// the whole catalogue that's a real styled piece, not a plain base layer.
// Tina flagged it 2026-08-12: checked the photo, a turtleneck top with
// visible ruched/draped fabric detail, styled with a skirt and jewelry as a
// complete outfit. "Body Top" alone is a solid signal — the other 20
// published hits are all plain/unbranded basics confirmed via photo earlier
// (nour-al-houda's "Jersey Body Top", modern-hijabi's "Sema Basic Body
// Top") — but "ruched" signals deliberate, VISIBLE styling, the opposite of
// something meant to disappear under another garment. Checked: no other
// brand combines "ruched" with "body top", so this stays narrow rather than
// weakening `\bbody top\b` itself.
const RUCHED_BODY_TOP_RE = /\bruched\b.{0,20}\bbody top\b/i;

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

// "Maxi Dress with Floral Print and Fixed Inner Dress" (mukistore, €46,
// garment:'dress') — Tina flagged this 2026-08-12: it's one complete maxi
// dress, not two pieces. The raw feed title is Dutch ("Vaste Binnenjurk"),
// translated to this English title by build-data.mjs at publish time
// (CLAUDE.md §4) before it ever reaches data/products.json — and this
// function runs on THAT published title (getProducts() reads
// data/products.json), which is how "inner dress" ends up matching at all.
// "Vast" = fixed/attached: the inner lining is SEWN IN as a construction
// detail of this one garment, the same "bundled, not a separate accessory"
// situation the `garment !== 'abaya'` guard above exists for — except this
// is garment:'dress', so that guard doesn't catch it. Checked: the only
// title in the whole published catalogue combining "fixed" with "inner
// dress"/"under dress", so this stays narrow rather than a garment-wide
// carve-out.
const FIXED_INNER_RE = /\bfixed\b.{0,20}(?:\binner dress\b|\bunder.?dress\b)/i;

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

// A staff `forcedLane` (lib/types.ts, set via the inline edit controls —
// see docs/log/2026-08-12-lane-overrides.md) is authoritative and
// EXCLUSIVE: it short-circuits every classifier below rather than adding to
// what title/garment regex would already find, so a corrected item can't
// simultaneously "belong" to two lanes. Modest Swimwear has no such
// override because `garment === 'swim'` (the existing garment-override
// mechanism) already satisfies isSwim() below.
export function isSwim(p: Product): boolean {
  if (p.forcedLane) return false;
  return p.garment === 'swim' || SWIM_RE.test(p.title);
}

export function isLayering(p: Product): boolean {
  if (p.forcedLane) return p.forcedLane === 'layering-basics';
  if (LAYERING_HIJAB_RE.test(p.title)) return false;
  if (RUCHED_BODY_TOP_RE.test(p.title)) return false;
  if (FIXED_INNER_RE.test(p.title)) return false;
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
 * A 6th group, `shirt-extender`, was split out the same day after Tina
 * flagged ria-miranda's "Fleurel/Elva/Lisa/Linaya Shirt Extender" and
 * jaida's "Modest Shirt Extender Slip" (5 items total) — checked photos:
 * these are a waist-tied wrap panel that hangs down to extend a top's HEM
 * length, nothing to do with sleeves or arm coverage. They'd been lumped
 * into `sleeve-extender` on the word "extender" alone, which was wrong —
 * different body part, different function, deserved their own group.
 *
 * Each regex reuses the exact vocabulary LAYERING_RE/UNDER_DRESS_RE were
 * already built from — this function only decides WHICH group a match
 * belongs to, never whether something is layering at all (that's still
 * isLayering()'s job, called first). `LayeringSubtype` itself now lives in
 * lib/types.ts — see the comment on that declaration.
 */
export const LAYERING_SUBTYPE_LABELS: Record<LayeringSubtype, string> = {
  'neck-cover': 'Neck Covers & Dickeys',
  'sleeve-extender': 'Sleeve Extenders',
  'shirt-extender': 'Shirt Extenders',
  'base-layer-top': 'Base-Layer Tops',
  'cropped-body-shirt': 'Cropped Body Shirts',
  'under-dress': 'Under-Dresses',
};

const NECK_COVER_RE = /\bneck cover\b|\bdicke?y\b|\bmodesty panel\b|\bcollar (?:cover|insert)\b/i;
const SLEEVE_EXTENDER_RE = /\bsleeve (?:cover|extender|add.?on)s?\b|\barm sleeves?\b|\bone.?piece sleeves?\b/i;
const SHIRT_EXTENDER_RE = /\bshirt extenders?\b/i;
const CROPPED_BODY_SHIRT_RE = /\bcropped .{0,20}body shirt\b/i;

/** Returns null for anything that isn't a layering piece at all — always
 *  call after (or alongside) isLayering(), never as a substitute for it. */
export function layeringSubtype(p: Product): LayeringSubtype | null {
  if (!isLayering(p)) return null;
  if (p.forcedLane === 'layering-basics' && p.forcedLayeringSubtype) return p.forcedLayeringSubtype;
  if (NECK_COVER_RE.test(p.title)) return 'neck-cover';
  if (SHIRT_EXTENDER_RE.test(p.title)) return 'shirt-extender';
  if (SLEEVE_EXTENDER_RE.test(p.title)) return 'sleeve-extender';
  if (CROPPED_BODY_SHIRT_RE.test(p.title)) return 'cropped-body-shirt';
  if (UNDER_DRESS_RE.test(p.title)) return 'under-dress';
  return 'base-layer-top'; // base layer / body top / core top / singlet / ria-miranda's Comfy line / etc.
}

export function isActivewear(p: Product): boolean {
  if (p.forcedLane) return p.forcedLane === 'modest-activewear';
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
  return isSwim(p) || isActivewear(p) || isLayering(p) || isJilbab(p) || isOuterwear(p);
}

// Outerwear = blazers, vests, cardigans, coats. Tina's call 2026-08-13: one
// combined lane pulled out of Tops, with a Type filter breaking it into the
// four sub-categories, same mechanism as Layering Basics.
//
// GATED ON garment === 'top'. Measured against the real catalogue before
// shipping this: 946 published titles match one of the four words, but only
// 756 are garment:'top'. The other 190 are dresses, abayas, sets, skirts and
// trousers that merely MENTION "blazer"/"vest"/"coat" as a styling
// descriptor — "Capo Blazer Dress" (zayda, a dress), "The Oversized Blazer
// Abaya In Sage Green" (madiha, an abaya), "Vest And Skirt Set" (touche-prive,
// a skirt), "Ahd Abaya (Trench Coat)" (bait-hanayen, an abaya styled like a
// trench coat). Matching on title alone, the §10.10 mistake this project has
// already made once with unanchored substrings, would have pulled all 190 out
// of their correct lanes into Outerwear. `\b`-anchoring alone does not fix
// this — every one of those 190 titles contains the exact whole word.
const OUTERWEAR_RE = /\b(blazers?|vests?|cardigans?|coats?)\b/i;

export function isOuterwear(p: Product): boolean {
  if (p.forcedLane) return p.forcedLane === 'outerwear';
  if (isLayering(p)) return false; // checked empirically: 0 overlap today, but stay defensive — same pattern isActivewear() already uses against isSwim/isLayering
  return p.garment === 'top' && OUTERWEAR_RE.test(p.title);
}

export const OUTERWEAR_SUBTYPE_LABELS: Record<OuterwearSubtype, string> = {
  blazer: 'Blazers',
  vest: 'Vests',
  cardigan: 'Cardigans',
  coat: 'Coats',
};

// Order matters here only as the fallback iteration order when two matches
// land at the exact same index (impossible in practice — no word is a
// substring of another among these four — kept in the order Tina named them).
const OUTERWEAR_SUBTYPE_RES: [OuterwearSubtype, RegExp][] = [
  ['blazer', /\bblazers?\b/i],
  ['vest', /\bvests?\b/i],
  ['cardigan', /\bcardigans?\b/i],
  ['coat', /\bcoats?\b/i],
];

/**
 * Picks ONE of the four sub-types for a title naming more than one — e.g.
 * "Belted Blazer Vest - Black" (nihan) or "Tailored Blazer Coat". Real
 * catalogue titles checked before shipping this (19 multi-word titles found):
 * the RIGHTMOST matching word is consistently the actual garment, with
 * everything before it a styling adjective — "Blazer VEST", "Blazer COAT",
 * "Vest Trench COAT". This mirrors ordinary English compound-noun order
 * (head noun last).
 *
 * Checked BEFORE any "|" first, falling back to the whole title only if
 * nothing before the pipe matches. Mariam's Collection titles this catalogue
 * already carries put the real product name before a "|" and a marketing
 * subtitle after it — "Sleeveless Cape Vest | Minimalist Long Wool-Blend
 * Gilet Coat (MS204)" is a VEST; picking the rightmost match against the
 * WHOLE title would have said "coat", wrong, because "Gilet Coat" is
 * describing the silhouette in the subtitle, not naming the product.
 */
export function outerwearSubtype(p: Product): OuterwearSubtype | null {
  if (!isOuterwear(p)) return null;
  const head = p.title.split('|')[0];
  let best: OuterwearSubtype | null = null;
  let bestIndex = -1;
  for (const [type, re] of OUTERWEAR_SUBTYPE_RES) {
    const m = head.match(re);
    if (m && m.index !== undefined && m.index > bestIndex) {
      best = type;
      bestIndex = m.index;
    }
  }
  if (best) return best;
  for (const [type, re] of OUTERWEAR_SUBTYPE_RES) {
    const m = p.title.match(re);
    if (m && m.index !== undefined && m.index > bestIndex) {
      best = type;
      bestIndex = m.index;
    }
  }
  return best;
}
