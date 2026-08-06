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
  // NOT ADDED: /\brobe\b/ for French "Robe" = dress. It cannot go anywhere safe:
  // above `trousers` it turns English "Waffle Knit Robe Cardigan" and "Robe
  // Skirt Set" into dresses, and below `trousers` it never fires for the one
  // product that needs it. One French denim dress stays tagged trousers; that is
  // cheaper than four English misclassifications. Revisit only if French brands
  // grow beyond this one.
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
  // PASS 3 — the description lead, last resort only.
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
