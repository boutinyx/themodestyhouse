// Negative evidence for a women's modest-CLOTHING directory. Answers exactly one
// question: "is the thing being sold here a garment?"
//
// WHY THIS EXISTS: the garment rules in lib/tag.ts are greedy keyword matches, so
// "The Prayer Room — Set of 6" (a set of prayer MATS) classified as a co-ord
// `set`, and ~60 metal hijab magnets classified as `hijab`. Positive keyword
// matching alone cannot tell a garment from an accessory that mentions one.
//
// DESIGN: deliberately biased toward KEEPING. A false veto deletes real inventory;
// a miss only leaves an item for the review queue. Precision over recall.
//
// MEASURED: 248 rejects / 13,435 raw rows, 0 false positives (all 248 read by
// hand during design). Validate against data/raw-products.json, never
// products.json — `inStock` flips on every scrape and hides false positives.
//
// See docs/data-pipeline.md and lib/nonApparel.test.ts before changing anything.

export type VetoReason =
  | 'hardware' | 'jewellery' | 'prayer-goods' | 'bags' | 'home' | 'beauty'
  | 'fragrance' | 'non-product' | 'hair' | 'care' | 'digital';

export type VetoTier = '0' | 'A' | 'B' | 'S';

export interface VetoInput {
  title: string;
  url?: string;
  /** Shopify product_type. Absent on rows scraped before this change. */
  productType?: string;
  tags?: string[];
  /** false when no variant requires shipping => digital / service line-item. */
  requiresShipping?: boolean;
}

export interface VetoResult {
  rejected: boolean;
  tier?: VetoTier;
  reason?: VetoReason;
  /** The exact substring that fired. Written to data/rejected.json. */
  evidence?: string;
  /** Set when a PROTECT rule kept an otherwise-suspicious title. */
  protectedBy?: string;
}

type Rule = [VetoReason, RegExp];

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

/** Fabric / quality words. Presence AFTER a suspicious noun proves the noun was
 *  a colourway ("Ballet Slipper Premium Jersey" is a hijab). */
const FABRIC = /\b(cotton|chiffon|modal|jersey|satin|silk|viscose|bamboo|crinkle|georgette|voile|linen|rayon|crepe|nida|nidha|medina|wool|knit|denim|velvet|lace|tulle|organza|twill|poplin|ribbed|cupro|tencel|polyester|mesh|corduroy|premium|luxury)\b/i;

/** Pattern / decoration words. Presence AFTER a suspicious noun proves the noun
 *  was a motif name ("Tasbeeh Print" is a printed hijab, not prayer beads). */
const MOTIF = /\b(print|printed|pattern|patterned|weave|woven|motif|jacquard|embroider\w*|applique|design|stitch|trim|edge|fringe)\b/i;

/** Head-noun arbitration vocabulary. GLOBAL flag — always reset lastIndex. */
export const GARMENT_NOUN = /\b(abayah?s?|jilbabs?|kaftans?|caftans?|kimonos?|hijabs?|scarf|scarves|shawls?|khimars?|dress(es)?|gowns?|skirts?|tops?|blouses?|shirts?|tunics?|sweat(er|shirt)s?|cardigans?|cardis?|boleros?|blazers?|vests?|trousers?|pants?|jeans|leggings?|culottes?|swimsuits?|swimwear|burkinis?|bikinis?|jumpsuits?|jumpers?|coats?|jackets?|capes?|ponchos?|rompers?|bodysuits?|hoodies?|tees?|isdal|telekung|mukena|undercaps?|underscarf|shrugs?|kurungs?|bishts?|outerwear|nightdress(es)?|sundress(es)?|underdress(es)?|niqabs?|amiras?|tudungs?|slips?|robes?|knitwear|loungewear|activewear|modest\s*wear)\b/gi;

// ---------------------------------------------------------------------------
// PROTECT — wearables whose names collide with homeware/hardware.
// Runs AFTER TIER_0 so it can never shadow an absolute.
// ---------------------------------------------------------------------------
export const PROTECT: [string, RegExp][] = [
  // Wearable prayer garments. The word after "prayer" is constrained:
  // "Prayer Set" is a telekung; "Prayer Mat"/"Prayer Room" are not.
  ['prayer-garment', /\bprayer\s*(set|suit|abaya|dress|outfit|gown|khimar|jilbab|isdal|garment|wear|kaftan|clothes|clothing|robe)s?\b/i],
  ['prayer-garment', /\b(isdal|telekung|mukena|salah\s*(set|outfit|dress|wear)|solat\s*(set|outfit))\b/i],
  // NOTE the [\s-]: "Under Cap"/"Under Scarf" with a space are live titles.
  ['headwear', /\bunder[\s-]?(caps?|scarf|scarves)\b/i],
  // Brand coinages included: Vela spells its balaclava "velaclava".
  ['headwear', /\b(inner\s*caps?|ninja\s*caps?|bonnets?|neck[\s-]?covers?|hijab\s*caps?|tie[\s-]?backs?|volumi[sz]\w*|balaclavas?|[a-z]+clavas?|beanies?|swim\s*caps?|turbans?|niqabs?|al[\s-]?amiras?|amiras?|tudungs?|khimars?|head[\s-]?wraps?|head[\s-]?pieces?|bandanas?)\b/i],
  // Grip / no-slip / volume bands are worn under a hijab. Policy: keep.
  ['headwear', /\b(grip|no[\s-]?slip|anti[\s-]?slip|volume)[\w\s-]{0,12}\b(bands?|headbands?)\b/i],
  ['garment-closure', /\b(instant|slip[\s-]?on|one[\s-]?piece|ready[\s-]?to[\s-]?wear)\s+hijabs?\b/i],
  // A magnetic-CLOSURE abaya is clothing, not hardware.
  ['garment-closure', /\bmagnet(ic)?\s*(closure|fastening|snap|button)\b/i],
];

// ---------------------------------------------------------------------------
// TIER 0 — absolutes. Position-independent, evaluated before PROTECT, so every
// token here was checked against all 13,435 titles for zero garment collisions.
// Deliberately absent: bare tasbeeh/misbaha/magnet/kohl/decor — all collide with
// real garment titles (colourways, prints, closures).
// ---------------------------------------------------------------------------
export const TIER_0: Rule[] = [
  ['non-product', /\b(gift|e)[\s-]?cards?\b/i],
  ['non-product', /\be[\s-]?gift\b/i],
  ['non-product', /\bgift\s*(wrap|wrapping|voucher)\b/i],
  ['non-product', /\bvouchers?\b/i],
  ['non-product', /\b(shipping|package)\s*protection\b/i],
  ['non-product', /\b(blind\s*box|mystery\s*(box|bag))\b/i],
  ['non-product', /\bmws_fee|_fee_generated\b/i],
  ['non-product', /\b(coming\s*soon|test\s*product|do\s*not\s*(buy|order))\b/i],
  ['non-product', /\b\d+\s+(abayas?|dresses|hijabs?|items?|pieces?)\s+for\s*[$£€]/i],

  ['prayer-goods', /\bprayer\s*(mats?|rugs?|rooms?|beads?|carpets?)\b/i],
  ['prayer-goods', /\b(janamaz|jaynamaz|sajjada|sajadah|sajjadah|seccade|musalla|musallah)\b/i],

  ['jewellery', /\b(jewell?ery|jewell?ry)\b/i],

  ['home', /\b(table[\s-]?top|desk[\s-]?top|counter[\s-]?top|placemats?|dinner\s*sets?|dinnerware|tableware|cutlery|crockery)\b/i],
  ['home', /\b(wall\s*(art|decor)|photo\s*frames?|picture\s*frames?|folding\s*screens?|fairy\s*lights?)\b/i],
  ['home', /\b(fridge|refrigerator)\s*magnets?\b/i],

  ['fragrance', /\b(perfumes?|parfum|eau\s*de|cologne|body\s*(spray|mist)|attars?|itr|oud\s*(oil|chips)|bakhoor|bukhoor|mabkhara|incense|censers?|diffusers?|air\s*freshener)\b/i],
  ['fragrance', /\b(incense|bakhoor|oud|charcoal)\s*burners?\b/i],

  // 'kohl'/'kajal' need a cosmetic companion — "Kohl" is a live hijab colourway.
  ['care', /\b(deodorants?|shampoos?|miswaks?|siwaks?|body\s*butter|lip\s*balms?|hair\s*oils?|face\s*serums?)\b/i],
  // Anchored to the BODY PART, never to the product word alone. Added
  // 2026-08-29 after Chador's "Silk Smooth Hand Cream" published onto
  // /modest-swimwear (its garment had been tagged `swim`, and nothing here
  // vetoed it first). A bare /\bcream\b/ is the §10.10 trap in its purest
  // form: measured against the live catalogue it matches 205 PUBLISHED
  // products, because cream is a colour — "Cream Closed Abayah", "Butter
  // Cream Jersey Hijab", "Isla (Cream)". The phrase-anchored version below
  // matches exactly one row, which is the one that is actually a hand cream.
  ['care', /\b(hand|body|face|foot|skin)\s*(creams?|lotions?|balms?|scrubs?|washes?|oils?)\b|\bbody\s*mists?\b|\bhand\s*sanitis?zers?\b/i],
  ['care', /\b(kohl|kajal)\s*(kajal|kohl|liners?|pencils?|sticks?|eyeliners?)\b/i],

  ['beauty', /\b(makeup|make[\s-]?up|cosmetics?)\s*(brush(es)?|sponges?|blenders?|kits?|bags?|cases?)\b/i],
  ['beauty', /\b(beauty\s*blenders?|blender\s*(kits?|sets?)|puff\s*(sets?|blenders?)|nail\s*(polish|files?)|tweezers?|lip\s*gloss)\b/i],

  ['hardware', /\bno[\s-]?snag\b/i],
  ['hardware', /\bmask\s*(extenders?|chains?|straps?)\b/i],
];

// ---------------------------------------------------------------------------
// TIER A — ANCHORED compounds only. Each rule carries its own qualifier, so the
// phrase can only name an accessory. Safe position-independently within the head.
// NOTE (pin|clip)\s+(wheel|…) uses \s+ NOT \s* — \s* matched the single word
// "Pinwheel" and deleted "Caramel Pinwheel Bati Dress".
// ---------------------------------------------------------------------------
export const TIER_A: Rule[] = [
  ['hardware', /\b(hijabs?|scarf|scarves|shawls?|straight|safety|dressmaker|magnetic|pearl|metal)\s*-?\s*(pins?|clips?|rings?|tapes?|clasps?|buckles?|fasteners?|holders?|stoppers?|grips?|magnets?|brooch(es)?)\b/i],
  ['hardware', /\b(hijabs?|scarf|scarves|shawls?|hair)\s*accessor(y|ies)\b/i],
  ['hardware', /\b(hijabs?|scarf|scarves)\s*(tape|glue)\b/i],
  ['hardware', /\benamel\s*pins?\b/i],
  ['hardware', /\b(glasses|eyeglass|spectacle)\s*chains?\b/i],
  ['hardware', /\b(pin|clip)\s+(wheel|pack|cushion)\b/i],
  ['hardware', /\bentire\s*wheel\b/i],

  ['jewellery', /\b(forehead|neck|body)\s*chains?\b/i],
  ['jewellery', /\b(zircon|ear[\s-]?cuffs?|tiaras?)\b/i],

  // tasbeeh/misbaha REQUIRE a companion noun — bare /tasbeeh/ deleted Vela's
  // "Tasbeeh Print", which is a printed hijab.
  ['prayer-goods', /\b(tasbeeh|tasbih|tesbih|misbaha|masbaha|subha)\s*(sets?|beads?|counters?)\b/i],
  ['prayer-goods', /\bdhikr\s*counters?\b/i],
  ['prayer-goods', /\b(qur'?ans?|korans?|mushaf|rehal|duas?\s*books?)\b/i],

  ['bags', /\b(hand|tote|shoulder|cross[\s-]?body|shopping|wash|laundry|dust|evening|banquet|storage|gift|garment)\s*bags?\b/i],
  ['bags', /\b(backpacks?|duffels?|wallets?|luggage|suitcases?|coin\s*purses?|key[\s-]?chains?|keyrings?)\b/i],

  ['home', /\b(candle|lamp|lantern|incense|phone|ring)\s*(holders?|stands?)\b/i],
  ['home', /\b(cushion\s*covers?|bed\s*sheets?|duvets?|throw\s*blankets?)\b/i],

  ['non-product', /\bgift\s*(receipt|note)\b/i],
  // NOT bare /sadaqah/ — "Sadaqah Blue" is a live Vela colourway.
  ['non-product', /\b(donations?|zakat|sadaqah\s*(donation|fund))\b/i],
  ['non-product', /\b(fabric\s*)?(swatch(es)?|samples?\s*packs?|sample\s*cards?)\b/i],
  ['non-product', /\b(custom|bespoke|made[\s-]to[\s-]order)\s*(clothing|order|tailoring)\b/i],
  ['non-product', /\b(deposit|balance\s*payment|top[\s-]?up\s*(fee)?|surcharge|loyalty\s*points)\b/i],
  ['non-product', /\b(style\s*guides?|lookbooks?|e[\s-]?books?)\b/i],

  ['care', /\b(garment|clothes)\s*steamers?\b/i],
  ['care', /\b(lint\s*rollers?|fabric\s*shavers?|sewing\s*kits?|shoe\s*care)\b/i],
  ['care', /\bbutton\s*(covers?|clips?)\b/i],
  ['care', /\b(phone\s*cases?|laptop\s*sleeves?|air\s?pods?)\b/i],

  ['hair', /\bhair\s*(ties?|ribbons?|bands?|claws?|clips?|bows?|elastics?|pins?)\b/i],
];

// ---------------------------------------------------------------------------
// TIER B — bare category nouns. These legitimately appear as a garment's
// component, fabric or motif ("Zoya Brooch Maxi Dress"), so they veto ONLY when
// they follow the last garment noun in the head AND are not followed by a
// fabric/motif descriptor.
// ---------------------------------------------------------------------------
export const TIER_B: Rule[] = [
  ['hardware', /\b(magnets?|pins?|clips?|rings?|studs?|fasteners?|buckles?|clasps?|brooch(es)?)\b/i],
  ['jewellery', /\b(necklaces?|earrings?|bracelets?|bangles?|anklets?|pendants?|chokers?)\b/i],
  ['bags', /\b(bags?|totes?|purses?|clutch(es)?|pouch(es)?|cases?|tins?)\b/i],
  ['home', /\b(lanterns?|lamps?|candles?|trays?|frames?|plates?|bowls?|baskets?|boxes?|vases?|mugs?|tumblers?|coasters?|ornaments?|figurines?|decor|decorations?|garlands?|buntings?)\b/i],
  ['hair', /\bscrunchies?\b/i],
  ['care', /\b(belts?|combs?|brushes?|mirrors?|hangers?)\b/i],
  ['care', /\b(slippers?|sandals?|shoes?|trainers?|sneakers?|socks?|footwear)\b/i],
  ['care', /\b(sunglasses|eyewear|notebooks?|journals?|stationery|bookmarks?|cards?)\b/i],
];

// ---------------------------------------------------------------------------
// Title segmentation
// ---------------------------------------------------------------------------

export function normTitle(s: string): string {
  return String(s || '')
    .replace(/[’‘]/g, "'")
    .replace(/[–—‒]/g, '-')
    .replace(/[·•｜|（]/g, ' - ')
    .replace(/[）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripNoise(s: string): string {
  return s
    .replace(/\([^)]*\)/g, ' ')                       // "(2 Pack)", "(MAC418)"
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(?:uk)?m[a-z]{0,3}\d{3,4}\b/gi, ' ')  // MAC418 / MMU030 / UKMA113
    .replace(/\s+/g, ' ')
    .trim();
}

function gIndexes(s: string): number[] {
  const out: number[] = [];
  GARMENT_NOUN.lastIndex = 0;
  for (const m of s.matchAll(GARMENT_NOUN)) out.push(m.index as number);
  GARMENT_NOUN.lastIndex = 0;
  return out;
}
function lastGarment(s: string): number { const g = gIndexes(s); return g.length ? g[g.length - 1] : -1; }
function hasGarment(s: string): boolean { return lastGarment(s) >= 0; }

/** Strips a trailing COLOURWAY only. "Rayon crinkle - Magnet" is a hijab in a
 *  colourway called Magnet; "Modal Matching Hijab Set- Incense" likewise. */
export function productSegment(title: string): string {
  const t = stripNoise(normTitle(title));
  // The third alternative handles the unspaced-left dash "Set- Incense" while
  // leaving true hyphenates ("Tie-Back", "No-Snag", "Cross-body") intact.
  const parts = t.split(/\s-\s|\s-(?=[A-Za-z])|(?<=\w)-\s+/);
  if (parts.length < 2) return t;
  const head = parts.slice(0, -1).join(' - ');
  const tail = parts[parts.length - 1];
  const short = tail.trim().split(/\s+/).length <= 3;
  if (short && !hasGarment(tail) && (FABRIC.test(head) || hasGarment(head))
      && !/\bset\b|\bpack\b|\bpcs?\b/i.test(tail)) return head;
  return t;
}

// 'plus' is deliberately NOT an alternative — it collides with the size
// descriptor "Plus Size" (~180 live titles), which truncated those heads to a
// bare SKU token and disabled Tiers A and B.
const SUBORDINATE = /\s(?:with|w\/|featuring|feat\.?|includes?|incl\.?)\s/i;
const TRAILING = /,|\s*-\s*/;

/** The part of the title that names the PRODUCT. */
export function headSegment(title: string): string {
  const seg = productSegment(title);
  let t = seg;

  // 1. Subordinate clause — only when the prefix actually names the product.
  const sub = t.match(SUBORDINATE);
  if (sub) {
    const prefix = t.slice(0, sub.index);
    if (hasGarment(prefix) || FABRIC.test(prefix)) t = prefix;
  }

  // 2. Trailing clause — only after a garment noun has been named.
  if (gIndexes(t).length) {
    GARMENT_NOUN.lastIndex = 0;
    const m0 = GARMENT_NOUN.exec(t) as RegExpExecArray;
    const firstEnd = m0.index + m0[0].length;
    GARMENT_NOUN.lastIndex = 0;
    const m = t.slice(firstEnd).match(TRAILING);
    if (m) t = t.slice(0, firstEnd + (m.index as number));
  }

  // 3. COLLAPSE GUARD: a head shrunk to a bare SKU/stopword carries no evidence
  //    and would silently disable Tiers A and B. Fall back to the segment.
  //    EXCEPT when the collapsed head names a garment — "Abaya" is one word but
  //    is conclusive evidence, and falling back re-exposed the subordinate
  //    clause, vetoing "Abaya With Lantern Sleeves" as home decor.
  if (t.trim().split(/\s+/).filter((w) => /[a-z]{3}/i.test(w)).length < 2 && !hasGarment(t)) return seg;
  return t;
}

// ---------------------------------------------------------------------------

export function isNonApparel(input: VetoInput): VetoResult {
  const title = normTitle(input.title);
  const seg = productSegment(title);
  const head = headSegment(title);
  const gIdx = lastGarment(head);

  // Digital / service line-items. The only structural signal trusted to veto
  // alone, because requires_shipping is a fact, not a merchandising label.
  if (input.requiresShipping === false) {
    return { rejected: true, tier: 'S', reason: 'digital', evidence: 'requires_shipping=false' };
  }

  /** A fabric/motif token among the next TWO tokens means the suspicious noun
   *  was a colourway or print name. Adjacency-bounded and blocked by a
   *  subordinate marker, so "Clutch with Woven Inset" is NOT excused. */
  const descriptorAfter = (idx: number): boolean => {
    const next = head.slice(idx).trim().split(/\s+/).slice(0, 2);
    if (!next.length) return false;
    if (next.some((w) => /^(with|w\/|featuring|includes?|and|&|for)$/i.test(w))) return false;
    return next.some((w) => MOTIF.test(w) || FABRIC.test(w));
  };

  // TIER 0 first, so PROTECT can never shadow an absolute.
  for (const [reason, re] of TIER_0) {
    const m = seg.match(re);
    if (m) return { rejected: true, tier: '0', reason, evidence: m[0] };
  }

  for (const [reason, re] of PROTECT) {
    if (re.test(seg)) return { rejected: false, protectedBy: reason as string };
  }

  for (const [reason, re] of TIER_A) {
    const m = head.match(re);
    if (m) return { rejected: true, tier: 'A', reason, evidence: m[0] };
  }

  // Garment-bundle amnesty: a bundle whose head names a garment sells the
  // garment. Runs AFTER Tier A, so "Hijab & Candle Gift Set" is already gone.
  if (gIdx >= 0 && /\b(sets?|bundles?|packs?|co-?ords?|outfits?|collections?|pieces?)\s*$/i.test(head)) {
    return { rejected: false, protectedBy: 'garment-bundle' };
  }

  for (const [reason, re] of TIER_B) {
    // Scan EVERY occurrence: in "Earring Fringe Chain Necklaces Sets" the first
    // hit is masked by the descriptor "Fringe", but "Necklaces" is a clean hit.
    for (const m of head.matchAll(new RegExp(re.source, 'gi'))) {
      const at = m.index as number;
      if (at <= gIdx) continue;                          // pre-modifier of a garment
      if (descriptorAfter(at + m[0].length)) continue;   // colourway / print name
      return { rejected: true, tier: 'B', reason, evidence: m[0] };
    }
  }

  // product_type — a merchant-set structured category label every check
  // above never sees (all of them read only `title`, despite VetoInput
  // accepting productType/tags — verified 2026-08-12: neither field was
  // referenced ANYWHERE in this file). Found via a real miss: "New Year
  // Preload Card — Prepare for a Mindful Ramadan" (Mariam's Collection) has
  // no "gift"/"card" match possible in the title text alone reaching TIER_0,
  // but its product_type is literally "gift card". Checked against TIER_0
  // ONLY — absolute, position-independent, already validated with zero
  // false positives against 13,435 real titles, safe to apply to a short
  // category string too. Deliberately NOT `tags`: measured in the same
  // audit that tags are full of unrelated marketing/promo noise
  // ("free-gift-eligible", "gift for women") that would reintroduce exactly
  // the false-positive class this file exists to avoid.
  if (input.productType) {
    const type = normTitle(input.productType);
    for (const [reason, re] of TIER_0) {
      const m = type.match(re);
      if (m) return { rejected: true, tier: '0', reason, evidence: m[0] };
    }
  }

  return { rejected: false };
}
