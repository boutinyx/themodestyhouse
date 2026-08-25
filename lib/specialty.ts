import type { Product } from '@/lib/types';
import type { LayeringSubtype, OuterwearSubtype, HijabSubtype } from '@/lib/types';

// Re-exported so existing call sites (lib/compactCatalogue.ts) don't need
// to change their import — the type itself now lives in lib/types.ts to
// avoid a circular import (Product carries a field of this type).
export type { LayeringSubtype, OuterwearSubtype, HijabSubtype };

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

// PRAYER_RE: one Layering Basics group, Tina's call 2026-08-15 (morning) —
// prayer wear generally. Broad and deliberate — her explicit call was "every
// prayer-titled product, all garments", not just garment:'set'. 184 raw rows
// checked, spanning dress (21), abaya (114), set (18), skirt (25), trousers
// (4) and hijab (2) — mostly complete standalone salah outfits (jersey
// prayer dresses, jilbab/prayer-set dresses with elasticated sleeves), which
// would normally never be considered "layering" by this file's own
// under-the-clothes definition. Moved anyway per her explicit scope choice —
// prayer wear goes over regular clothes as its own kind of covering layer, a
// different sense of "layering" than the rest of this category, but still
// what she asked for.
//
// UNDERCAP_RE and KHIMAR_ABAYA_RE (undercaps, and abaya-length prayer
// khimaars) were ALSO moved here that same morning, then moved back OUT to
// Hijabs & Scarves that same evening (2026-08-15) at Tina's explicit
// follow-up call — she wants both grouped with jilbabs there instead. See
// isKhimarAbaya() and the modest-hijabs lane match in lib/lanes.ts. Kept the
// two regexes here (not deleted) since isKhimarAbaya() below still needs
// KHIMAR_ABAYA_RE; UNDERCAP_RE is inlined into isUndercap() the same way.
const KHIMAR_ABAYA_RE = /\bkhimaa?rs?\b/i;
const UNDERCAP_RE = /\bunder.?caps?\b/i;
const PRAYER_RE = /\bprayer\b/i;

// Gated to garment:'abaya' only. Of 211 khimar-titled rows checked
// 2026-08-15, ~190 are garment:'hijab' cape-style headcovers (e.g. "Khimar
// Medina silk", "Modal Khimar Black") — a standalone hijab style, always
// routed to Hijabs & Scarves via the plain garment==='hijab' check and not
// what this function is for. The ~20 garment:'abaya' rows (e.g. "Mastour
// Khimaar Burnished Lilac", "Heup Khimaar Lexus EggWhite") are full-length
// prayer coverings worn as an outer layer for salah — those need this
// explicit check since their garment field says 'abaya', not 'hijab'.
export function isKhimarAbaya(p: Product): boolean {
  return p.garment === 'abaya' && KHIMAR_ABAYA_RE.test(p.title);
}

// 313 rows checked 2026-08-15, effectively all garment:'hijab' already — a
// "Full Coverage Undercap" is definitionally worn under a hijab wrap, so it
// would already match modest-hijabs' plain garment==='hijab' check. This
// export exists for the rare non-'hijab'-garment title and for readability
// at the lanes.ts call site.
export function isUndercap(p: Product): boolean {
  return UNDERCAP_RE.test(p.title);
}

/**
 * Prayer wear — mukenas, telekungs, prayer sets and prayer dresses.
 *
 * MOVED FROM LAYERING BASICS TO HIJABS & SCARVES, 2026-08-26. Tina: "put
 * prayer sets under hijabs", confirmed via a clarifying question as moving the
 * PRODUCTS, not just the menu link. Before this, `isLayering()` opened with
 * `if (PRAYER_RE.test(title)) return true` — an explicit exception added
 * 2026-08-15 — and the modest-hijabs lane carried `&& !isLayering(p)` partly to
 * keep prayer-titled jilbabs/khimars off it. Both of those now point the other
 * way.
 *
 * Same broad, garment-agnostic rule as before ("every prayer-titled product,
 * all garments" — her 2026-08-15 call), so the SET of products is unchanged;
 * only the lane they land on is. Measured: 184 published rows carry `prayer` in
 * the title — 113 abayas, 25 skirts, 21 dresses, 19 sets, 4 trousers, 2 hijabs.
 */
export function isPrayer(p: Product): boolean {
  // LEGACY OVERRIDE MARKER. 22 rows in data/lane-overrides.json were pinned by
  // hand to `{lane: 'layering-basics', subtype: 'prayer-set'}` — genuine prayer
  // sets whose titles say nothing about prayer ("Salma", "Shara Mukena Set",
  // "Golden Nujum set", "Black Nujum set"), so PRAYER_RE cannot find them.
  //
  // That pairing is baked into data/products.json at PUBLISH time, so those
  // rows carry it today and would otherwise stay stranded on Layering Basics
  // after this move, splitting prayer wear across two lanes. Reading the
  // subtype rather than the lane is what moves them without a republish: the
  // staff decision recorded there was "this is a prayer set", and that is still
  // true — only the lane prayer sets live on has changed.
  //
  // The tidy-up this defers: ForcedLane (lib/types.ts) has no 'modest-hijabs'
  // member, so those entries cannot yet be rewritten to point at the new lane.
  // Doing that properly needs ForcedLane extended, build-data.mjs updated, the
  // 22 entries rewritten, and a republish. Until then this line is what keeps
  // the catalogue consistent, and it is why 'prayer-set' is compared as a raw
  // string — it is no longer a member of LayeringSubtype.
  if ((p.forcedLayeringSubtype as string | undefined) === 'prayer-set') return true;
  return PRAYER_RE.test(p.title);
}

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
  // `&& !isPrayer(p)`: a staff override marked prayer-set no longer belongs to
  // this lane (2026-08-26). Without it the forcedLane short-circuit would win
  // and pin those 22 rows here, against the move.
  if (p.forcedLane) return p.forcedLane === 'layering-basics' && !isPrayer(p);
  // Checked ahead of the hijab/underscarf/bonnet exclusion below — an
  // exception to that older rule, not subject to it. Undercaps and
  // abaya-length khimaars used to be here too (2026-08-15 morning) but moved
  // to Hijabs & Scarves that same evening — see isKhimarAbaya()/isUndercap()
  // above and the modest-hijabs lane match in lib/lanes.ts.
  // Prayer wear left this lane on 2026-08-26 (see isPrayer above). This line
  // used to `return true`; it returns FALSE now, and stays first for the same
  // reason it was first before — it has to beat every rule below it, several of
  // which (LAYERING_RE, UNDER_DRESS_RE) match prayer-set titles.
  if (PRAYER_RE.test(p.title)) return false;
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
  // 'prayer-set' moved to HIJAB_SUBTYPE_LABELS, 2026-08-26.
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
  // Narrowest/most-specific groups first — same reasoning as the checks in
  // isLayering() above. Undercap/khimar removed 2026-08-15 evening — those
  // titles no longer reach here at all, isLayering() returns false for them.
  // The prayer branch that stood here until 2026-08-26 is gone — isLayering()
  // now returns false for prayer titles, so they never reach this function.
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

// Anything that must stay out of the general/category listings. Jilbab,
// abaya-length khimaars and undercaps are folded in here (rather than
// getting their own lane) because the mechanism — "excluded from every lane
// except one dedicated one" — is exactly what modest-hijabs already needs to
// do for them; see the `specialty: true` on that lane in lib/lanes.ts.
// isKhimarAbaya() matters here specifically: those products are
// garment:'abaya', so without this they'd ALSO satisfy modest-abayas'
// `garment === 'abaya'` match and show on both lanes at once — caught while
// adding the Hijabs & Scarves Type filter, 2026-08-15 evening.
export function isSpecialty(p: Product): boolean {
  // isPrayer added 2026-08-26 with the move to Hijabs & Scarves. It is
  // load-bearing, not tidy-up: productsForLane strips isSpecialty items from
  // every non-specialty lane, and it is what keeps prayer wear out of the
  // everyday dress/skirt/abaya grids now that isLayering() no longer claims it.
  // Without this line the move would have quietly published 184 prayer pieces
  // into /modest-abayas and /modest-skirts.
  return isSwim(p) || isActivewear(p) || isLayering(p) || isPrayer(p) || isJilbab(p) || isKhimarAbaya(p) || isUndercap(p) || isOuterwear(p);
}

// Sub-categories WITHIN Hijabs & Scarves, for the header flyout / Type
// filter — same mechanism as Layering Basics and Outerwear, added 2026-08-15
// evening (Tina: "i want a dropdown that give khimars and jilbabs undercap
// et etc"). Order here is the canonical filter order: the plain, everyday
// case first, then the two things she specifically asked to see broken out.
export const HIJAB_SUBTYPE_LABELS: Record<HijabSubtype, string> = {
  'hijab': 'Hijabs',
  'khimar-jilbab': 'Khimars & Jilbabs',
  'undercap': 'Undercaps',
  // Moved here from LAYERING_SUBTYPE_LABELS, 2026-08-26.
  'prayer-set': 'Prayer Sets',
};

/** Returns null for anything that isn't on the Hijabs & Scarves lane at all
 *  — always call after (or alongside) the lane's own match check, never as
 *  a substitute for it. Mirrors the modest-hijabs lane's match predicate in
 *  lib/lanes.ts exactly: `(garment==='hijab' || isJilbab || isKhimarAbaya ||
 *  isUndercap) && !isLayering`. Narrowest/most-specific first, same
 *  reasoning as layeringSubtype(). */
export function hijabSubtype(p: Product): HijabSubtype | null {
  if (isLayering(p)) return null;
  // Prayer FIRST, ahead of undercap/khimar-jilbab. Prayer-set titles very
  // commonly also say jilbab or khimar ("Two-Piece Jilbab / Prayer Set Dress"),
  // and Tina asked for Prayer Sets as their own group under Hijabs — so where a
  // title is both, prayer wins. Measured the cost of that ordering before
  // shipping it; see the log entry.
  if (isPrayer(p)) return 'prayer-set';
  if (isUndercap(p)) return 'undercap';
  if (isKhimarAbaya(p) || isJilbab(p)) return 'khimar-jilbab';
  if (p.garment === 'hijab') return 'hijab';
  return null;
}

// Outerwear = blazers, vests, cardigans, sweaters, coats. Tina's call
// 2026-08-13: one combined family pulled out of Tops, with a Type filter
// breaking it into sub-categories, same mechanism as Layering Basics.
// Split into three separate NAV-FACING lanes 2026-08-21 (Tina, after
// comparing H&M's category names: "i want outerwear gone and i want you to
// add those new ones" — Blazers & Vests / Cardigans & Sweaters / Jackets &
// Coats, confirmed via clarifying question as the literal H&M split rather
// than inventing a Jackets subtype H&M's own copy doesn't actually need —
// see the isOuterwear name note below and lib/lanes.ts). The underlying
// classifier here is UNCHANGED in shape on purpose: `isOuterwear`/
// `outerwearSubtype` still model one family with five subtypes; only
// lib/lanes.ts's match predicates changed, grouping those five subtypes
// into three lanes instead of showing all five flat under one. Renaming
// this function to match would have widened an already-large refactor's
// blast radius (isSpecialty, compactCatalogue, FilterableGrid, staff
// tooling, the `outerwear` ForcedLane value) for no behavioural gain — it
// is still, internally, one family of specialty tops.
//
// GATED ON garment === 'top'. Measured against the real catalogue before
// shipping this: 946 published titles match one of the four (now five)
// words, but only 756 are garment:'top'. The other 190 are dresses, abayas,
// sets, skirts and trousers that merely MENTION "blazer"/"vest"/"coat" as a
// styling descriptor — "Capo Blazer Dress" (zayda, a dress), "The Oversized
// Blazer Abaya In Sage Green" (madiha, an abaya), "Vest And Skirt Set"
// (touche-prive, a skirt), "Ahd Abaya (Trench Coat)" (bait-hanayen, an abaya
// styled like a trench coat). Matching on title alone, the §10.10 mistake
// this project has already made once with unanchored substrings, would have
// pulled all 190 out of their correct lanes into Outerwear. `\b`-anchoring
// alone does not fix this — every one of those 190 titles contains the
// exact whole word. "Sweater" carries the identical risk on the same
// garment-field gate — measured 2026-08-21: 139 catalogue titles contain
// "sweater", but only 80 are garment:'top' ("Sweater Dress" (29), "Sweater
// Skirt"/skirt bigrams (12) etc. are real dresses/skirts using it as a
// fabric/style word, not sweaters to pull out) — same shape, same fix.
const OUTERWEAR_RE = /\b(blazers?|vests?|cardigans?|sweaters?|coats?)\b/i;

export function isOuterwear(p: Product): boolean {
  if (p.forcedLane) return p.forcedLane === 'outerwear';
  if (isLayering(p)) return false; // checked empirically: 0 overlap today, but stay defensive — same pattern isActivewear() already uses against isSwim/isLayering
  return p.garment === 'top' && OUTERWEAR_RE.test(p.title);
}

export const OUTERWEAR_SUBTYPE_LABELS: Record<OuterwearSubtype, string> = {
  blazer: 'Blazers',
  vest: 'Vests',
  cardigan: 'Cardigans',
  sweater: 'Sweaters',
  coat: 'Coats',
};

// Order matters here only as the fallback iteration order when two matches
// land at the exact same index (impossible in practice — no word is a
// substring of another among these five — kept in the order Tina named the
// original four, sweater added where it groups with cardigan in lib/lanes.ts).
const OUTERWEAR_SUBTYPE_RES: [OuterwearSubtype, RegExp][] = [
  ['blazer', /\bblazers?\b/i],
  ['vest', /\bvests?\b/i],
  ['cardigan', /\bcardigans?\b/i],
  ['sweater', /\bsweaters?\b/i],
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
  if (p.forcedLane === 'outerwear' && p.forcedOuterwearSubtype) return p.forcedOuterwearSubtype;
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
