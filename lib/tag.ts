import type { Garment } from '@/lib/types';

const GARMENT_RULES: [Garment, RegExp][] = [
  ['swim', /swim|burkini|bathing|swimsuit|board ?short|beachwear/i],
  ['abaya', /abaya|jilbab|kaftan|kimono/i],
  ['hijab', /hijab|scarf|shawl|khimar|turban|headband|underscarf/i],
  ['dress', /dress|gown/i],
  ['skirt', /skirt|\bjupe\b/i],
  // OUTERWEAR + French tops, deliberately placed BEFORE `trousers` AND before
  // the `robe` rule below. Two separate reasons, both load-bearing:
  //
  // 1. In French "jean" is the MATERIAL (denim), not the garment — "Veste trench
  //    en Jean Louise" is a denim trench coat. The trousers rule matches /jean/,
  //    so without this sitting first, every French denim jacket, shirt and coat
  //    published as trousers. The garment noun must beat the fabric.
  // 2. English "robe" is a LAYERING piece, not a dress ("Waffle Knit Robe
  //    Cardigan", "Cape Robe" trench). Those must resolve here, before `robe`
  //    is allowed to mean dress.
  //
  // English denim is unaffected: "Wide Leg Jeans" matches nothing here and still
  // falls through to trousers. This also classifies English "Trench Coat",
  // "Jacket" and "Coat", which matched no rule at all before — 20 real products.
  // Kept deliberately NARROW: only French nouns plus `trench`. `cardigan`,
  // `coat` and `jacket` were tried here and had to be moved back down — this
  // rule sits above `set`, so "Cardigan 2-Piece Set" and "Jacket and Pants Set"
  // stopped being sets and became tops. Outerwear that is part of a multi-piece
  // set must reach the `set` rule first.
  //
  // French "Robe" = dress is NOT here, and deliberately so — inside this list it
  // has no safe position: above `trousers` it turns English "Waffle Knit Robe
  // Cardigan" and "Cape Robe trench" into dresses, below it the rule never fires.
  // RESOLVED 2026-08-06: it lives in FOREIGN_RULES instead, which runs only after
  // this list has already failed. English layering pieces match `top` here and
  // never reach it, while "Robe évasée Lilas Pastel" does. Verified against both.
  ['top', /\b(veste|trench|manteau|chemisier|chemise|haut)\b/i],
  ['trousers', /trouser|pant|jean|legging|culotte|wide.?leg/i],
  ['set', /set|co.?ord|two.?piece|coordinate|\bensemble\b/i],
  // `coat` and `jacket` are new here (below `set`, so sets still win): they
  // matched NO rule before, leaving ~94 real outerwear products unclassified.
  ['top', /top|blouse|shirt|tunic|sweater|cardigan|bolero|blazer|vest|coat|jacket/i],
  // Length-only fallback — "maxi"/"midi" describe LENGTH, not garment. A bare
  // "…Maxi" with no explicit garment word reads as a dress, but this must stay
  // LAST so "Maxi Skirt", "Maxi Skirt Set" etc. resolve to their real garment.
  ['dress', /\b(maxi|midi)\b/i],
];

/** Non-English garment words, applied ONLY as a fallback (see tagDiscovery pass 3).
 *  fr = French, de = German, nl = Dutch — the languages actually present in the
 *  catalogue's feeds. Words that collide with English are deliberately absent. */
const FOREIGN_RULES: [Garment, RegExp][] = [
  ['dress',    /\brobes?\b|\bkleid(er)?\b|\bjurk(en)?\b/i],        // fr / de / nl
  ['skirt',    /\bjupes?\b|\brokken\b/i],                          // fr / nl  (not de "rock")
  ['trousers', /\bpantalons?\b|\bbroek(en)?\b/i],                   // fr / nl  (not de "Hose")
  ['top',      /\boberteil\b|\bchemisiers?\b/i],                    // de / fr
  ['set',      /\bensembles?\b|\bzweiteiler\b|\btwinsets?\b/i],    // fr / de / nl
  ['abaya',    /\bdjellabas?\b/i],
];

const OCCASION_RULES: [string, RegExp][] = [
  ['wedding', /wedding|bridal|bridesmaid/i],
  ['prom', /prom/i],
  ['formal', /formal|evening|gown|occasion|gala/i],
  ['work', /work|office|blazer|tailored|business/i],
];
const SEASON_RULES: [string, RegExp][] = [
  ['summer', /summer|linen|sundress|short ?sleeve/i],
  ['winter', /winter|wool|knit|sweater|coat|fleece/i],
];
const ACTIVITY_RULES: [string, RegExp][] = [
  ['swim', /swim|burkini|bathing|beach/i],
  ['gym', /active|sport|gym|workout|athleis/i],
];

function matchAll(rules: [string, RegExp][], hay: string): string[] {
  return rules.filter(([, re]) => re.test(hay)).map(([k]) => k);
}

/** The opening of a product description, where the garment is actually named,
 *  before the cross-sell copy that mentions other garments ("pairs well with our
 *  abayas…"). Deliberately short for that reason. */
function descriptionLead(bodyHtml?: string): string {
  return String(bodyHtml || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function tagDiscovery(input: {
  title: string;
  productType: string;
  tags: string[];
  /** Shopify body_html. Used ONLY as a last resort — see pass 3. */
  bodyHtml?: string;
}) {
  const hay = [input.title, input.productType, ...(input.tags || [])].join(' ');
  // Trust the TITLE first (most accurate), then fall back to type/tags.
  let garment: Garment = 'other';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(input.title)) { garment = g; break; }
  }
  if (garment === 'other') {
    for (const [g, re] of GARMENT_RULES) {
      if (re.test(hay)) { garment = g; break; }
    }
  }
  // PASS 3 — non-English garment vocabulary, FALLBACK ONLY.
  //
  // WHY: several brands publish in their own language. Chic & Modesty (FR) names
  // dresses "Robe évasée…", Losyana (DE) sets product_type to "Kleid"/"Zweiteiler".
  // Those classified as 'other' and were dropped outright.
  //
  // WHY FALLBACK-ONLY: measured as an equal-priority rule it changed 206 existing
  // classifications, including "Abaya Essential" -> dress, because some feeds put
  // "Robe" in product_type for what this catalogue calls an abaya. Abaya is a
  // distinct category here, so English/product-specific results must always win.
  //
  // Deliberately EXCLUDED for collision with English: German "rock" (skirt) vs
  // rock/rocky, German "Hose" (trousers) vs hose/hosiery, French "pull" (sweater)
  // vs pull-on.
  if (garment === 'other') {
    for (const [g, re] of FOREIGN_RULES) {
      if (re.test(input.title) || re.test(input.productType || '')) { garment = g; break; }
    }
  }

  // PASS 4 — the description lead, last resort only.
  //
  // WHY: several brands name products by COLOURWAY alone with no product_type —
  // ABYYA ships "Coffee Bean", "Hazelnut", "Sepia Rose", all of which are bamboo
  // jersey hijabs described as such in the body. Without this they classify as
  // 'other' and normalizeProduct drops them: ABYYA published 5 of 26 real items.
  //
  // SAFETY: this can only ever run when title, product_type AND tags have all
  // failed, so it cannot change a classification that already works. Measured
  // across 4,694 live products: 321 rescued, 0 existing results changed.
  if (garment === 'other') {
    const lead = descriptionLead(input.bodyHtml);
    if (lead) {
      for (const [g, re] of GARMENT_RULES) {
        if (re.test(lead)) { garment = g; break; }
      }
    }
  }
  return {
    garment,
    occasion: matchAll(OCCASION_RULES, hay),
    season: matchAll(SEASON_RULES, hay),
    activity: matchAll(ACTIVITY_RULES, hay),
  };
}
