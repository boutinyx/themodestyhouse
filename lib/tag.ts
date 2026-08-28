import type { Garment } from '@/lib/types';

/**
 * A Unicode-aware word boundary, for rules that have to hold outside ASCII.
 *
 * JavaScript's `\b` is defined against `\w`, which is exactly [A-Za-z0-9_]. In
 * Turkish that makes `ı ş ğ ü ö ç İ` NON-word characters, so `\b` finds a
 * boundary in the middle of a word: `/\bkap\b/i` matches "Kapüşonlu" (hooded)
 * and "Kapitone" (quilted), which published a quilted HANDBAG as a top.
 *
 * §10.5 and §10.10 say "always use \b". That is necessary and, off the ASCII
 * range, not sufficient — every rule below written for a non-English feed uses
 * this instead. Guarded by the last test in `Turkish garment vocabulary`.
 */
export const word = (alternatives: string): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{M}\\d])(?:${alternatives})(?![\\p{L}\\p{M}\\d])`, 'iu');

/**
 * Turkish has four i's — i ı İ I — and `'İ'.toLowerCase()` is `i` followed by
 * U+0307 COMBINING DOT ABOVE, a two-code-point string no `/i/` regex folds:
 * `/elbise/i.test('ELBİSE')` is **false**. 37 catalogue rows are titled in
 * caps, so every Turkish rule spells its i's with this class. The dot is written
 * as the escape sequence U+0307 on purpose: the bare mark is invisible in source.
 */
const TR_I = '[iıİI]\\u0307?';

/**
 * Turkish/Malay set vocabulary, used by BOTH rule blocks and defined once so
 * they cannot drift apart (§8 records what duplicating filter logic between two
 * places cost last time).
 *
 * It has to appear in GARMENT_RULES as well as FOREIGN_RULES because
 * GARMENT_RULES already carries the Turkish `pantolon` in its trousers rule,
 * and FOREIGN_RULES only runs when GARMENT_RULES matched NOTHING. So
 * "Pantolon Tunik Takım" matched `pantolon`, returned trousers, and the Turkish
 * `takım` rule was never reached — 154 Nihan rows and every Beyza "Ceket ve
 * Pantolon Takım" filed as trousers. A foreign word in the primary block needs
 * its counterparts there too, or the pairing is one-sided and the fallback is
 * unreachable for exactly the titles that need it.
 */
const TR_SET = `tak${TR_I}m(?:${TR_I}|lar)?|alt ?-? ?üst|kurung`;

const GARMENT_RULES: [Garment, RegExp][] = [
  // `bikini` added 2026-08-27, and it is the SAME asymmetry that TR_SET fixes:
  // the word lived only in FOREIGN_RULES (`b${TR_I}k${TR_I}n${TR_I}`), which runs
  // as a fallback. Once `takım` entered the primary block, "Bikini Takımı"
  // matched `set` here and four Baqa bikini sets left the swim lane — and swim
  // never appears in a mixed grid (Invariant 5), so that is an editorial
  // regression, not a relabelling. `swim` sits above `set`, so naming the word
  // here restores it. Nothing else in the corpus contains "bikini".
  // `mayo` (tr, swimsuit) is the same case as `bikini` and is ANCHORED because
  // this rule is otherwise an unanchored substring match and `mayovera` is a
  // real brand slug in exclusions.json — \b stops "Mayovera" matching, since a
  // word character follows. Two Nihan "Tesettür Mayo Takımı" rows need it.
  ['swim', /swim|burkini|bikini|bathing|swimsuit|board ?short|beachwear|\bmayo(?:lar)?\b/i],
  ['abaya', /abaya|jilbab|kaftan|kimono/i],
  // `(open|ninja|tube) cap` are underscarf caps, not headwear in general — a
  // bare /\bcap\b/ would drag in baseball caps and men's taqiyahs. 148 corpus
  // hits, all of them hijab caps; without it Nour Al Houda's 14 published caps
  // match no rule at all once `set` is anchored.
  // "neck cover(s)" added 2026-08-12: a real accessory word for exactly the
  // hijab-adjacent category (underscarf/undercap-style neck coverage), added
  // after an iLoveModesty "Neck Cover" (no product_type, tags "Cover-Ups"/
  // "Neck Covers") landed as `dress` — the last-resort description pass
  // parsed unrelated cross-sell prose, and with no bodyHtml at publish time
  // it can never be re-verified (see lib/garmentReview.ts). Matching it here
  // means it classifies from the title/tag directly and never reaches that
  // risky fallback at all.
  // `shayla` added 2026-08-13: a common hijab-style name (Hijabi Pop's
  // "Snatched Lycra Shayla" had no product_type/tags to fall back on). Zero
  // collision risk measured against the full corpus — every existing "shayla"
  // hit is already a real hijab.
  ['hijab', /hijab|scarf|shawl|khimar|turban|headband|underscarf|neck\s*covers?|shaylas?|\b(?:open|ninja|tube) caps?\b/i],
  // sundress/underdress are real, common compounds with no space (32 + 1
  // corpus hits) — anchoring `dress` alone (below) cannot see a suffix with
  // no boundary before it, so they need their own alternative, same
  // treatment as the trousers/set compounds already in this file.
  // jumpsuit/romper added 2026-08-12 (overnight review-queue audit): one-piece
  // garments with no existing rule at all (30 + 2 corpus hits) — closest fit
  // among the existing Garment categories, alongside dress/gown.
  ['dress', word('dress(?:es)?|gowns?|sundress(?:es)?|underdress(?:es)?|jumpsuits?|rompers?')],
  ['skirt', word('skirts?|jupes?')],
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
  // BOUNDED 2026-08-10. Both of these were unanchored, which is the §10.10 bug
  // class the same section records as fixed — these two were missed. `set`
  // matched inside sun**set**, cor**set**, ro**sette** and Te**set**tür;
  // `pant` inside **pant**ies and Lou**jean**. Every alternative below is a
  // word that really occurs in the corpus, enumerated from it rather than
  // guessed: the compounds (sweatpants, twinset, joggingset, setje, seti) are
  // listed because a plain `\bsets?\b` would silently stop matching them.
  // `set` sits ABOVE `trousers` as of 2026-08-27. GARMENT_RULES is first-match,
  // so with `trousers` first every "Top & Pant Set", "Trouser Co-ord" and
  // "Tunic Set" matched `pants?`/`trousers?` and never reached `set` — 233
  // published rows filed as trousers with the word "set" in their own title,
  // 154 of them Nihan. Tina hand-moved 12 of them across two curate exports
  // before the pattern was traced to this line pair.
  //
  // The flip is one-directional and cannot unclassify anything: a title naming
  // BOTH a set and a legwear word now resolves to `set`, and a title naming only
  // legwear still falls through to `trousers` on the next line. Nothing can
  // become `other`, which is the destructive case §10.31 warns about.
  //
  // This is the order the rest of the block already assumes — the `coat`/`jacket`
  // comment below it says "below `set`, so sets still win". `trousers` was the
  // one rule sitting on the wrong side of that principle.
  ['set', word(`(?:twin|jogging)?sets?|set${TR_I}|setjes?|co.?ords?|two.?pieces?|coordinate|ensemble|${TR_SET}`)],
  ['trousers', word(`trousers?|(?:sweat|track|cargo)?pants?|jeans?|leggings?|culottes?|pantalons?|pantolon(?:lu)?|wide.?legs?`)],
  // `coat` and `jacket` are new here (below `set`, so sets still win): they
  // matched NO rule before, leaving ~94 real outerwear products unclassified.
  // overshirt/sweatshirt/tshirt/overcoat/waistcoat/trenchcoat (+ "trenhcoat",
  // a real typo variant found in-corpus) are compounds with no space —
  // measured against the full catalogue before adding (§10.11): anchoring
  // `shirt`/`coat` alone regressed 51 sweatshirt/tshirt rows and 25
  // overcoat/waistcoat/trenchcoat rows from `top` to unclassified.
  // tee/hoodie/cape/crewneck/button-up added 2026-08-12, found via the
  // overnight review-queue audit: merrachi/fares titles like "High Neck Tee"
  // and "Colour Block Buttery Crewneck" matched no GARMENT_RULES word at all
  // (product_type/tags explicitly say "Tops" for all of them) and fell
  // through to a noisy hay match on an unrelated "Sets" collection tag.
  // Measured against the full 38,074-row corpus before adding: 161 changed,
  // 159 confirmed correct. 2 ACCEPTED tradeoffs, both `cape`: German
  // "Zweiteiler mit Cape" (lit. "two-piece with cape") now matches `top` on
  // `cape` in GARMENT_RULES before it can ever reach FOREIGN_RULES' German
  // `zweiteiler` -> `set` mapping, which only runs as a fallback after
  // GARMENT_RULES fails entirely. A caped two-piece item is defensible as
  // either `top` or `set`; not worth a special case for 2 rows.
  // gilet/parka added same audit pass as tee/hoodie above (20 + 6 corpus hits).
  // "pull maille" (French, lit. "knit sweater") is the narrow, safe compound
  // for exactly 2 real corpus rows — bare French "pull" stays deliberately
  // excluded (see FOREIGN_RULES comment below: collides with English
  // "pull-on"), but "maille" never appears anywhere else in the whole
  // 38,096-row corpus, so this specific two-word phrase is zero-risk.
  // teeshirts? added 2026-08-13: an alternate spelling of t-shirt (La Petite
  // Parisienne) that "t-?shirts?" cannot see — no hyphen, so no boundary
  // between "tee" and "shirt" for the separate "tees?" alternative to match.
  ['top', word('tops?|blouses?|shirts?|tunics?|sweaters?|cardigans?|boleros?|blazers?|vests?|coats?|jackets?' +
    '|overshirts?|sweatshirts?|t-?shirts?|teeshirts?|overcoats?|waistcoats?|trenchcoats?|trenhcoats?' +
    '|tees?|hoodies?|capes?|crewnecks?|button.?ups?|gilets?|parkas?|pull\\s*maille')],
  // Length-only fallback — "maxi"/"midi" describe LENGTH, not garment. A bare
  // "…Maxi" with no explicit garment word reads as a dress, but this must stay
  // LAST so "Maxi Skirt", "Maxi Skirt Set" etc. resolve to their real garment.
  ['dress', /\b(maxi|midi)\b/i],
];

/** Non-English garment words, applied ONLY as a fallback (see tagDiscovery pass 3).
 *  fr = French, de = German, nl = Dutch, tr = Turkish, ms = Malay — the languages
 *  actually present in the catalogue's feeds. Words that collide with English are
 *  deliberately absent, and the non-ASCII rules use word() rather than \b. */
const FOREIGN_RULES: [Garment, RegExp][] = [
  // `kleid` is deliberately open on the LEFT: German compounds every noun, so
  // Aurora Abaya ships "Silkkleid" and "Baumwollkleid" as well as "Kleid". 31
  // corpus hits, all of them dresses; no English word ends in -kleid.
  ['dress',    /\brobes?\b|kleid(er)?\b|\bjurk(en)?\b/i],           // fr / de / nl
  // `unterrock` (de, underskirt/slip) is a real garment word, not the bare
  // "rock" this file already excludes for collision reasons — anchored on
  // both sides so it can never match bare "rock" inside another word.
  ['skirt',    /\bjupes?\b|\brokken\b|\bunterrock(?:e|es)?\b/i],    // fr / nl / de
  // `bermuda(s)` (fr, shorts) has no dedicated category here — mapped to
  // trousers, the nearest existing bucket, same as English shorts already are.
  ['trousers', /\bpantalons?\b|\bbroek(en)?\b|\bbermudas?\b/i],     // fr / nl
  // `bluse` is open on the LEFT like `kleid` above: German compounds nouns, so
  // Glamberry ships "Hemdbluse" (shirt-blouse) as well as bare "Bluse" — closed
  // on the left it matched only the latter. Measured against the full corpus
  // (§10.11 lesson): 4 existing "Bluse" hits, all already `top`, zero collisions
  // (no English word contains the substring "bluse"). `chemise`/`haut`/`veste`/
  // `trench`/`mantel`/`mäntel` added from La Petite Parisienne's and Golden
  // Dune's live feeds — none collide with an English word in this corpus.
  // `weste` (de, vest/waistcoat) is open on the LEFT for the same compounding
  // reason as `bluse`/`kleid` (Golden Dune's "Anzugweste"). Measured: the only
  // two corpus hits are "Western Style Abaya" (no boundary after "weste" in
  // "Western" — "r" is a word char, so `weste\b` cannot match inside it) and a
  // real German vest, so this is zero-risk.
  ['top',      /\boberteil\b|\bchemisiers?\b|\bchemises?\b|blusen?\b|\bhauts?\b|\bvestes?\b|\btrench\b|\bmantel\b|\bmäntel\b|westen?\b/i], // de / fr
  ['set',      /\bensembles?\b|\bzweiteiler\b|\btwinsets?\b/i],    // fr / de / nl
  // `gandoura`/`jellaba` (the second without the French "dj-" spelling) are
  // Moroccan robe garments — same family this catalogue already calls abaya.
  // Added for So Classy, whose entire feed uses these two words with no
  // product_type/tags to fall back on.
  ['abaya',    /\bdjellabas?\b|\bgandouras?\b|\bjellabas?\b/i],
  // `foulard(s)` (fr, silk square scarf) — La Petite Parisienne's "Carré de
  // soie Foulard" line. Zero corpus collision (word does not appear anywhere
  // else in the catalogue).
  ['hijab',    /\bfoulards?\b/i],

  // --- Turkish (baqa, beyza, ipekstil, nihan, zuhre) + Malay (alia-anggun) ---
  //
  // ADDED 2026-08-10, and not optional: anchoring `set`/`pant` above left ~296
  // PUBLISHED Turkish garments matching no rule at all, and `garment: 'other'`
  // is dropped by normalizeProduct. Every word was derived from the 36,754-
  // record feed corpus — mostly from each feed's own product_type, which is
  // clean where titles are not — and measured against the whole corpus before
  // being added (§10.16). Two candidates were measured and REJECTED: `bone`,
  // because in this catalogue it is a colour ("Abaya in Bone") and not the
  // Turkish word for an underscarf; and a bare `cap`, see the hijab rule above.
  //
  // ORDER MATTERS within this block, and mirrors GARMENT_RULES: `takım` means
  // "set", so without swim sitting first a "Bikini Takımı" publishes as a
  // co-ord — and §7 keeps swimwear on its own lane.
  ['swim',     word(`b${TR_I}k${TR_I}n${TR_I}(?:ler)?|mayo(?:lar)?`)],
  // A ferace is a full-length loose overgarment — the garment class this
  // catalogue already means by abaya|jilbab|kaftan. Tina's call, 2026-08-10.
  ['abaya',    word(`ferace(?:s${TR_I})?`)],
  ['hijab',    word(`selendang`)],                                  // ms — a shawl
  // tulum = jumpsuit/overalls, mapped to dress alongside the English
  // jumpsuit/romper addition above — 2 corpus hits, no collision risk
  // measured (the only other risk is "Tulum" the Mexican resort town, absent
  // from the corpus).
  ['dress',    word(`elb${TR_I}se(?:ler|s${TR_I})?|tulum(?:lar)?`)],
  ['skirt',    word(`etek(?:ler)?|eteğ${TR_I}`)],
  // `kurung` (ms) is a two-piece baju kurung. Mapped to `set` because that is
  // what those rows already classify as today — this rule keeps them alive
  // once `set` is anchored without also moving them to a different lane.
  ['set',      word(TR_SET)],
  ['top',      word(`tun${TR_I}k|bluz(?:lar)?|gömlek|kazak|h${TR_I}rka|ceket|tren` +
                    `çkot|trenç|kaban|panço(?:su)?|panco|peler${TR_I}n|yelek|` +
                    `g${TR_I}y ?ç${TR_I}k|kap|pardesü|yağmurluk|süveter`)],
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

export type ClassificationSource = 'title' | 'meta' | 'foreign' | 'description';

export const GARMENT_VALUES: Garment[] = [
  'dress', 'skirt', 'top', 'trousers', 'abaya', 'hijab', 'swim', 'set', 'other',
];
export const GARMENT_LABELS: Record<Garment, string> = {
  dress: 'Dress', skirt: 'Skirt', top: 'Top', trousers: 'Trousers', abaya: 'Abaya',
  hijab: 'Hijab', swim: 'Swim', set: 'Set', other: 'Other / unclassifiable',
};

/** Classifies from a Shopify product_type string alone — the title-tier rules
 *  only, no hay fallback, no foreign/description passes. Used as an
 *  independent second opinion against the title-based result (see
 *  lib/garmentReview.ts), not as another chance at the same fuzzy match. */
export function classifyFromType(productType: string): Garment {
  const type = productType || '';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(type)) return g;
  }
  return 'other';
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
  let source: ClassificationSource = 'meta';
  for (const [g, re] of GARMENT_RULES) {
    if (re.test(input.title)) { garment = g; source = 'title'; break; }
  }
  if (garment === 'other') {
    for (const [g, re] of GARMENT_RULES) {
      if (re.test(hay)) { garment = g; source = 'meta'; break; }
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
      if (re.test(input.title) || re.test(input.productType || '')) { garment = g; source = 'foreign'; break; }
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
        if (re.test(lead)) { garment = g; source = 'description'; break; }
      }
    }
  }
  return {
    garment,
    source,
    occasion: matchAll(OCCASION_RULES, hay),
    season: matchAll(SEASON_RULES, hay),
    activity: matchAll(ACTIVITY_RULES, hay),
  };
}
