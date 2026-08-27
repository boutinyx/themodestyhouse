/**
 * Per-lane "What is X" answer blocks — AEO/GEO citability content
 * (claude-seo's seo-geo skill: 134-167 word self-contained answer blocks
 * under a question-form heading are the strongest citability signal) and,
 * separately, the fix for a real risk its seo-programmatic skill names
 * directly: 12 near-identical category-page templates with only the garment
 * name swapped is the textbook "thin/scaled content" pattern Google's policy
 * targets. Every block below covers different, genuine facts about that
 * garment category — fabric, construction, occasions — not a find-replace
 * of the same sentence. Generic, verifiable fashion knowledge, not a claim
 * about this site or its brands.
 *
 * Rendered BELOW the product grid (see app/[lane]/page.tsx), not above it —
 * a shopper landing on a category page wants the products first; this is
 * the standard e-commerce pattern of informational copy after the grid, not
 * a case for burying it out of caution.
 */
export interface LaneAnswer {
  h2: string;
  body: string;
  /** 2 contextually-related lane slugs, rendered as a small links row —
   *  real internal linking (claude-seo's seo-content/seo-programmatic
   *  skills both call for 3-5 internal links per 1000 words; the footer
   *  already covers sitewide nav, this is page-specific relevance on top
   *  of it), not a duplicate of the footer's full lane list. */
  related: [string, string];
}

export const LANE_ANSWERS: Record<string, LaneAnswer> = {
  'modest-dresses': {
    h2: 'What makes a dress modest?',
    body: 'A modest dress covers more than a standard one: long sleeves rather than short, a higher neckline, and a hemline that falls below the knee or to the ankle. Fabric matters as much as cut — a dress can be full-length and still cling, so modest dresses tend to use structured or slightly heavier fabrics like crepe, cotton and ponte rather than thin jersey. Maxi silhouettes are the most common shape, since a single long line covers the leg without needing an underlayer. Many modest dresses are designed to be worn as-is for everyday, with a separate abaya or coat layered over the top for more formal or conservative settings. Belted waists are a common way to add shape to an otherwise loose cut, and long sleeves are usually left unlined so the dress still suits warmer weather. The practical question a photograph cannot answer is opacity. A dress can be full-length, long-sleeved and still sheer across the shoulders or the skirt, which is why lining matters as much as hemline and why a slip or a base layer is worth owning before it is needed. Weight is the readable signal: satin, knit, linen and cotton make up most of what is listed here, and the heavier the drape, the less an underlayer is required. Occasion changes the brief entirely — an everyday jersey dress and a wedding-guest piece share a silhouette and almost nothing else in fabric or finish. Sizing is the real friction in shopping across many houses rather than one: cuts are drafted to different regional standards, so a size that fits in one house may not in the next, and a measurement chart is more reliable than a label. Loose cuts are forgiving, which is also why so many of these dresses work through pregnancy and nursing without being sold for it. The difference between a well-made modest dress and a cheap one shows up in the parts you don\'t see in a photograph. Lining is the first: a dress cut in a light fabric and sold unlined is passing a cost to you, because you\'ll buy a slip to wear under it. Look at the seams next — French or bound seams inside mean the maker expects the dress to last, while raw overlocked edges are the fastest thing to fray. Sleeves are where cheap construction is hardest to hide: a properly set sleeve lets you lift your arm without dragging the whole bodice up with it. And weight beats price as a signal — a heavier crepe or ponte will hang and wash better than a thin jersey costing the same, which is why two dresses at one price can wear so differently.',
    // Was ['modest-abayas', 'modest-wedding-guest'] until that lane was retired
    // on 2026-08-27. `related` is a fixed pair by design (see the interface), so
    // this needed a second slug rather than a shorter list. layering-basics is
    // what the body above already argues for in two separate sentences — "a slip
    // or a base layer is worth owning before it is needed", and "the heavier the
    // drape, the less an underlayer is required" — so it is the link the copy
    // was already making, not a new editorial claim. Two other lanes pair with it
    // for the same reason.
    related: ['modest-abayas', 'layering-basics'],
  },
  'modest-abayas': {
    h2: 'What is an abaya?',
    // SHORTENED 2026-08-26, in the same pass as modest-hijabs — Tina: "damn
    // this text under hijabs is long fix it", then "check the rest too while
    // youre on it". 494 words -> 225. It was the longest of the 14 by a
    // wide margin; the house median is 137 and the remaining twelve sit
    // between 126 and 197, which is why only these two were touched.
    // CUT, not rewritten — her sentences survive verbatim where they survive.
    // Dropped as padding: the colour-range sentence, regional cuts, care
    // instructions, the bisht aside, the under-dress paragraph, the pricing
    // comparison, the hem/sleeve-edge detail, the hold-it-to-a-window weight
    // test, and the embellishment note.
    // KEPT: the definition (the literal answer to the h2), the open/closed and
    // kimono/fitted cuts, sizing over the layer beneath, the four fabrics that
    // actually recur in THIS catalogue, the kaftan/jilbab/khimar distinction,
    // and the single best quality tell (the shoulder seam). One quality test
    // that a reader can act on beats four they will not finish reading.
    body: "An abaya is a loose, full-length outer garment, traditionally worn as a robe over regular clothing rather than as the outfit itself. Open-front abayas fasten like a coat and layer over a dress or trousers; closed abayas pull on as one piece. Kimono and butterfly cuts use wide, dropped sleeves for a more relaxed drape, while a fitted or 'sharp' abaya follows the body more closely through the shoulders. Because it's an outer layer, an abaya is usually sized to fit over whatever's worn underneath, not to size. Fabric changes the season more than the shape does: across the abayas listed here, satin, linen, chiffon and crepe are the four that recur, with linen and chiffon reading as summer weights and crepe and satin holding structure in colder months. The vocabulary overlaps with neighbouring garments and is worth separating: a kaftan is cut wider and shorter and is often worn as the outfit rather than over one, a jilbab covers head and body together, and a khimar is a head covering, not an abaya at all. To tell a well-made abaya from a cheap one, check the shoulder first — on a good one the seam sits where your shoulder actually ends and the fabric falls straight from it, while a rushed cut drops the seam down the arm and the whole garment swings forward.",

    related: ['modest-dresses', 'modest-hijabs'],
  },
  'modest-hijabs': {
    h2: 'What fabric should I choose for a hijab?',
    // SHORTENED 2026-08-26 — Tina: "damn this text under hijabs is long fix it".
    // 434 words -> 178, against a house median of 137 across the 14
    // lanes (abayas is the other outlier at 494 — untouched, she only asked
    // about this one).
    // CUT, not rewritten: her sentences are kept verbatim where they survive.
    // Dropped as padding — square vs rectangular shape, instant/slip-on
    // hijabs, size and the second neck pass, per-fabric care instructions,
    // pilling, and checking colour in daylight.
    // KEPT deliberately: the four-fabric guide (it is the literal answer to the
    // h2), the jersey/modal line (the only claim here grounded in what this
    // catalogue actually stocks, and the thing a generic article would not
    // say), the undercap dependency, and the hem test. Those are what make
    // the block worth indexing rather than filler.
    body: "Fabric changes how a hijab wears more than colour or print does. Chiffon is lightweight and slightly sheer, drapes well for occasion wear, but usually needs an underscarf to stop it slipping. Jersey is stretchy and grips on its own, which makes it the easiest fabric for everyday wear and sport. Satin and silk have a formal sheen, but the same smoothness makes them prone to sliding, so they're pinned rather than tucked. Crinkle and crepe hold texture without ironing, a middle ground between jersey's grip and chiffon's drape. Two fabrics dominate what is actually listed here: jersey first, then modal, which drapes softer while keeping enough grip to wear without pins. Underneath matters as much as the scarf — an undercap holds hair back and gives a slippery fabric something to sit against, which is what makes chiffon and satin wearable at all. For quality, look at the hem: a good scarf has a narrow rolled or double-stitched edge that lies flat, while a cut-and-overlocked one shows as a hard ridge through the drape and unravels first.",

    // Was ['modest-abayas', 'hijabi-outfits']. /hijabi-outfits was retired
    // 2026-08-19 — its premise ('hijabi-owned brands') had dissolved, since
    // 112 of 113 brands carry community: 'hijabi'. Repointed at layering-basics,
    // which is the genuine companion to a hijab (undercaps, base layers).
    related: ['modest-abayas', 'layering-basics'],
  },
  'modest-skirts': {
    h2: 'What counts as a modest skirt?',
    body: "A modest skirt sits at or below the ankle, or at minimum well past the knee, and is cut loose enough not to define the leg through movement. Maxi skirts in a straight or A-line cut are the most common shape, since a single uninterrupted line covers fully without extra layering. Pleated skirts add movement while still falling long, and are popular for occasions where a stiffer maxi would look too plain. Fabric weight matters here too — a thin, clingy fabric undermines a full-length cut, so modest skirts tend toward cotton, crepe or lined fabrics that hold their own shape. Most are styled with a tucked-in top or a longer tunic layered over the waistband, and an elasticated or wrap waistband is common since a fitted waistband can dig in under a longer top.",
    // Was ['modest-tops', 'modest-hijabs']. Rebalanced 2026-08-19: hijabs was
    // the target of 7 of these 28 slots while layering-basics, outerwear and
    // modest-summer-outfits were the target of ZERO. A skirt is the canonical
    // reason to reach for an underskirt or base layer, so this pair is more
    // contextually honest than the one it replaces.
    related: ['modest-tops', 'layering-basics'],
  },
  'modest-tops': {
    h2: 'How do modest tops differ from regular tops?',
    body: "The main differences are length, fit and sleeve. A modest top is cut to sit at or below the hip rather than at the waist, since a shorter top gapes or rides up when paired with trousers or a skirt. Sleeves run to the wrist rather than stopping at the elbow, and necklines sit higher, at the collarbone rather than open. Tunic-length tops — long enough to wear over trousers without anything showing at the hip — are especially common, because they double as a layering piece over a co-ord or under an abaya. Looser, less fitted cuts through the torso are the norm, though the degree of fit varies brand to brand. Lighter cotton and viscose blends dominate warm-weather ranges, while heavier crepe and ponte tops carry into autumn and winter.",
    related: ['modest-trousers', 'modest-skirts'],
  },
  'modest-trousers': {
    h2: 'What are modest trousers?',
    body: "Modest trousers are cut looser through the leg than a standard fitted trouser — wide-leg and palazzo styles are the most common, since a wide leg falls straight without clinging, while a tailored modest trouser still allows some structure through a slightly relaxed fit rather than a slim one. Culottes, which sit between a skirt and trousers in silhouette, are a frequent alternative for the same reason. Because trousers alone don't cover the hip, they're almost always styled with a longer top or tunic layered over the waistband rather than tucked in, which is also why modest trouser lengths tend to run to the ankle rather than cropped. Elasticated or drawstring waistbands are common on wide-leg styles, where a fitted waistband would fight the loose drop of the leg.",
    related: ['modest-tops', 'modest-sets'],
  },
  'modest-sets': {
    h2: 'What is a modest co-ord set?',
    body: "A co-ord set is a top and bottom made from the same fabric and print, designed to be worn together as a single, deliberate outfit rather than mixed and matched. In modest fashion the bottom half is usually a skirt or wide-leg trouser rather than shorts, and the top is cut to the same longer, looser standard as a standalone modest top. The appeal is largely practical: a matching set removes the guesswork of pairing separates while still reading as more put-together than a single dress, and it photographs as one cohesive silhouette rather than two competing pieces. Sets are common in both everyday jersey fabrics and occasion-ready satins — a jersey set suits daily wear and travel, while a satin or embellished set is cut for evening and formal occasions.",
    related: ['modest-trousers', 'modest-dresses'],
  },
  'modest-swimwear': {
    h2: 'What is a burkini?',
    body: "A burkini is full-coverage swimwear built from the same quick-dry, chlorine-resistant fabrics as ordinary swimwear — usually a polyester-spandex blend — cut to cover the body the way a hijab and modest outfit would on land. The standard shape is a three-piece set: leggings, a longer tunic-length top, and an attached or separate hijab-style hood, so nothing needs pinning once it's on. Because it's meant to be worn IN water, the fit is closer to the body than land-based modest wear, and the fabric is chosen specifically to stay light and non-absorbent when wet rather than for drape. Most dry quickly enough to wear straight through from pool to poolside without a full change of clothes, and a swim cap or under-scarf is often worn beneath the hood for a more secure, less transparent fit once wet.",
    related: ['modest-activewear', 'modest-hijabs'],
  },
  'modest-activewear': {
    h2: 'What is modest activewear?',
    body: "Modest activewear applies the same coverage principles as everyday modest fashion — longer sleeves, higher necklines, full-length legs — to fabrics built for movement: moisture-wicking blends, four-way stretch, flat seams. Leggings and joggers are cut generously enough to avoid clinging under motion, and are usually paired with a longer sports top or tunic rather than a fitted crop, since the top needs to stay in place through a workout without riding up. A sports hijab — jersey or a technical wicking fabric, often with a closer, secured fit than an everyday hijab — is designed specifically to stay put through movement rather than for drape. Mesh panels at the underarm or back are common on more technical pieces, adding ventilation without opening up the coverage elsewhere.",
    // Was ['modest-swimwear', 'modest-hijabs'] — see modest-skirts above.
    // Warm-weather intent is the shared thread, and modest-summer-outfits was
    // the site's only true orphan: zero contextual links AND excluded from the
    // footer's CATEGORY_LANES filter.
    related: ['modest-swimwear', 'modest-summer-outfits'],
  },
  'layering-basics': {
    h2: 'What is a modesty layering piece?',
    body: "A layering piece is designed to be worn under another garment rather than as an outfit on its own — its job is to add coverage a main piece leaves out, not to be seen in full. A neck cover, sometimes called a dickey, is cut to sit at the collar and shoulders only, closing the gap left by a scoop or V-neck top without the bulk of a full undershirt. A base-layer or 'body' top goes further, covering the arms and torso under a sheer blouse or a three-quarter-sleeve dress so nothing shows through. Sleeveless versions, often labelled a singlet or inner top, sit under short-sleeve pieces without adding warmth under the arms, while a long-sleeve base layer solves the opposite problem: extending coverage past a garment's own hemline or cuff. Because they're worn hidden, most are cut in a slim, second-skin fit from stretch jersey or modal that won't add bulk under whatever goes over it.",
    // Was ['modest-tops', 'modest-hijabs'] — see modest-skirts above.
    // Layering pieces and outerwear are the two halves of the same cold-weather
    // decision, and outerwear had no inbound contextual link at all. Points at
    // jackets-coats specifically (of the three lanes the single 'outerwear'
    // entry below split into 2026-08-21) — the outermost, warmest layer is the
    // more direct cold-weather counterpart to a base layer than a blazer is.
    related: ['modest-tops', 'jackets-coats'],
  },
  'modest-summer-outfits': {
    h2: 'How do you dress modestly in the heat?',
    body: "Staying cool in full coverage comes down to fabric and cut more than how much skin is covered. Natural, breathable fibres — linen, cotton, viscose — let air move in a way synthetic blends don't, so a linen maxi dress in full sleeves can be cooler than a short synthetic one. Looser, flowier cuts help air circulate against the body rather than trapping heat the way a fitted silhouette does. Lighter colours reflect rather than absorb heat, which is why summer modest pieces skew pale. For hijabs specifically, a lightweight cotton voile or chiffon breathes far better through summer than a heavier jersey, even though jersey is easier to style. The trade-off is upkeep — linen and voile crease more readily than jersey, so summer pieces often need more ironing or steaming to stay crisp.",
    related: ['modest-dresses', 'modest-hijabs'],
  },
  // The single 'outerwear' entry above split into these three lanes
  // 2026-08-21 (Tina, comparing H&M's category names: "i want outerwear gone
  // and i want you to add those new ones" — confirmed as H&M's literal
  // split via clarifying question). Content below is the same factual,
  // non-branded garment education the rest of this file already uses
  // (CLAUDE.md §10.18 — no invented marketing copy), just divided along the
  // same lines as the lanes themselves rather than one block covering all
  // three garments' differences from each other.
  'blazers-vests': {
    h2: 'What is the difference between a blazer and a vest?',
    body: "A blazer and a vest are both tailored, structured layers, but they differ in sleeve and the job they do. A blazer is a full-sleeve, collared jacket borrowed from menswear tailoring, with lapels and (often) a single row of buttons; it works best over a fitted dress or a trouser co-ord for a sharper, more formal line, and is usually the outermost piece in an outfit. A vest is the sleeveless version of the same idea — structured through the shoulders and body but with no arm coverage — which is why it's frequently layered under a coat rather than worn as the final layer, adding warmth and shape without the bulk a full sleeve would bring. Both are cut close enough through the body to read as tailoring rather than as a cosy layering piece, which is the main thing that separates either from a cardigan: a blazer or vest is structured, a cardigan is soft-knit. Double-breasted cuts, wide lapels and belted waists are common on both, and both are usually worn open rather than fastened all the way, so the dress or top underneath still shows.",
    related: ['cardigans-sweaters', 'modest-dresses'],
  },
  'cardigans-sweaters': {
    h2: 'What is the difference between a cardigan and a sweater?',
    body: "The difference is the opening: a cardigan fastens down the front, usually with buttons or a zip, while a sweater is a closed, pull-over piece with no front opening at all. That single difference changes how each is worn. A cardigan can be put on and taken off over other clothing without disturbing a hijab or an already-set outfit, and can be worn open as a loose layer or fastened as a closer one, which is why it's the more common everyday layering choice over a plain top or dress. A sweater has to go on over the head, so it's worn as a single fixed layer rather than adjusted through the day, but it sits closer to the body and holds its shape better since there's no front seam to pull against. Both are soft-knit and unstructured — closer to a cosy layering piece than the tailored cut of a blazer or vest — and both run from lightweight cotton knits for milder weather through to heavier wool blends for winter. Chunky and ribbed knits are common on both, and an oversized fit is typical of sweaters specifically, since there's no front closure to fit around.",
    related: ['blazers-vests', 'modest-tops'],
  },
  'jackets-coats': {
    h2: 'What is the difference between a jacket and a coat?',
    body: "Length and weight are the main differences. A jacket is typically hip-length or shorter and cut from a lighter material, so it works as a mid-layer for cooler-but-not-cold weather — a denim or trench-style jacket over a dress is a common everyday combination. A coat is longer, usually falling to the knee or further, and cut from a heavier material — wool, heavier blends, sometimes fur or faux-fur trims — built as the outermost layer for genuinely cold or wet weather rather than a light layer over an outfit. Both go over a full outfit rather than under it, which separates either from a cardigan or blazer, worn as part of an outfit rather than as protection from the weather. A trench coat sits in between the two in weight but is grouped with coats here for its length: floor- or knee-length, double-breasted, belted at the waist, cut to be worn over anything from a dress to a full abaya. Wool, cashmere blends and heavier cottons dominate the coat end of this range; lighter cottons, denim and quilted synthetics are more common on jacket-length pieces.",
    related: ['blazers-vests', 'modest-abayas'],
  },
};

/**
 * The same block for /directory, which is not a lane and so has no LANE_ANSWERS
 * entry. Measured 2026-08-19: /directory was 359 words of which exactly ONE
 * sentence was its own ("Browse modest pieces from every verified house."), and
 * it was the only page besides /designers with no <h2> at all — on the site's
 * highest-intent URL.
 *
 * Every fact below is already stated elsewhere on the site and is consolidated
 * here, not invented: the per-brand sizing/shipping/returns split and the
 * approximate-conversion behaviour are both FAQ answers (app/faq/page.tsx), the
 * "craft and design" standard is /about's own definition of the seal, and the
 * hijab/swim/activewear segregation is the editorial rule in CLAUDE.md §7 that
 * browseProducts() enforces. Deliberately informational rather than persuasive
 * — §10.18 means an agent describes the mechanism, it does not write the pitch.
 * Tina should overwrite this in her own voice whenever she wants to.
 */
export const DIRECTORY_ANSWER: LaneAnswer = {
  h2: 'How shopping across many houses works',
  body:
    'A directory works differently from a single shop. Every piece here links out to the house that made it, so the checkout, the size chart and the returns policy are always theirs rather than ours — worth reading on the brand\u2019s own page before you buy, because a size 12 is not the same measurement in every country and these houses ship from a number of different regions. Prices default to an approximate conversion, marked with \u2248, so a Turkish label and a British one can be compared without doing the arithmetic; what you actually pay is whatever the house charges, in its own currency, at its own checkout. A house appears here only after a review for craft and design, which is what the seal stands for. Hijabs, swimwear and activewear are kept on their own pages instead of being mixed into the everyday grids, so this one stays clothing.',
  related: ['modest-dresses', 'modest-abayas'],
};
