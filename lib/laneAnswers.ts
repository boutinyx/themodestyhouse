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
    body: 'A modest dress covers more than a standard one: long sleeves rather than short, a higher neckline, and a hemline that falls below the knee or to the ankle. Fabric matters as much as cut — a dress can be full-length and still cling, so modest dresses tend to use structured or slightly heavier fabrics like crepe, cotton and ponte rather than thin jersey. Maxi silhouettes are the most common shape, since a single long line covers the leg without needing an underlayer. Many modest dresses are designed to be worn as-is for everyday, with a separate abaya or coat layered over the top for more formal or conservative settings. Belted waists are a common way to add shape to an otherwise loose cut, and long sleeves are usually left unlined so the dress still suits warmer weather.',
    related: ['modest-abayas', 'modest-wedding-guest'],
  },
  'modest-abayas': {
    h2: 'What is an abaya?',
    body: "An abaya is a loose, full-length outer garment, traditionally worn as a robe over regular clothing rather than as the outfit itself. Open-front abayas fasten like a coat and layer over a dress or trousers; closed abayas pull on as one piece. Kimono and butterfly cuts use wide, dropped sleeves for a more relaxed drape, while a fitted or 'sharp' abaya follows the body more closely through the shoulders. Black is the traditional colour, but modern abayas range across the full spectrum, from plain and minimal to heavily embellished for occasion wear. Because it's an outer layer, an abaya is usually sized to fit over whatever's worn underneath, not to size. Regional cuts vary too — an Emirati abaya tends to be closer-fitted through the shoulder than a Moroccan or South Asian one, and most are best cared for with a delicate wash or dry clean rather than a regular machine cycle.",
    related: ['modest-dresses', 'modest-hijabs'],
  },
  'modest-hijabs': {
    h2: 'What fabric should I choose for a hijab?',
    body: "Fabric changes how a hijab wears more than colour or print does. Chiffon is lightweight and slightly sheer, drapes well for occasion wear, but usually needs an underscarf to stop it slipping. Jersey is stretchy and grips on its own, which makes it the easiest fabric for everyday wear and sport. Satin and silk have a formal sheen and a smooth hand, but the same smoothness makes them prone to sliding, so they're pinned rather than tucked. Crinkle or crepe fabrics hold texture and shape without ironing, which is why they've become a popular middle ground between jersey's grip and chiffon's drape. Shape matters too: a square hijab folds into a triangle for a classic wrap, while a long rectangular shayla wraps and pins with less folding, which is why most everyday hijabs are cut rectangular rather than square.",
    related: ['modest-abayas', 'hijabi-outfits'],
  },
  'modest-skirts': {
    h2: 'What counts as a modest skirt?',
    body: "A modest skirt sits at or below the ankle, or at minimum well past the knee, and is cut loose enough not to define the leg through movement. Maxi skirts in a straight or A-line cut are the most common shape, since a single uninterrupted line covers fully without extra layering. Pleated skirts add movement while still falling long, and are popular for occasions where a stiffer maxi would look too plain. Fabric weight matters here too — a thin, clingy fabric undermines a full-length cut, so modest skirts tend toward cotton, crepe or lined fabrics that hold their own shape. Most are styled with a tucked-in top or a longer tunic layered over the waistband, and an elasticated or wrap waistband is common since a fitted waistband can dig in under a longer top.",
    related: ['modest-tops', 'modest-hijabs'],
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
    related: ['modest-swimwear', 'modest-hijabs'],
  },
  'layering-basics': {
    h2: 'What is a modesty layering piece?',
    body: "A layering piece is designed to be worn under another garment rather than as an outfit on its own — its job is to add coverage a main piece leaves out, not to be seen in full. A neck cover, sometimes called a dickey, is cut to sit at the collar and shoulders only, closing the gap left by a scoop or V-neck top without the bulk of a full undershirt. A base-layer or 'body' top goes further, covering the arms and torso under a sheer blouse or a three-quarter-sleeve dress so nothing shows through. Sleeveless versions, often labelled a singlet or inner top, sit under short-sleeve pieces without adding warmth under the arms, while a long-sleeve base layer solves the opposite problem: extending coverage past a garment's own hemline or cuff. Because they're worn hidden, most are cut in a slim, second-skin fit from stretch jersey or modal that won't add bulk under whatever goes over it.",
    related: ['modest-tops', 'modest-hijabs'],
  },
  'hijabi-outfits': {
    h2: "What does a 'hijabi outfit' mean?",
    body: 'A hijabi outfit is simply an outfit built around wearing a hijab as part of it — the hijab treated as a styling element to coordinate, not an afterthought added to a finished look. That usually means matching or deliberately contrasting the hijab\'s colour and fabric with the rest of the outfit, and choosing pieces — a longer top, a modest dress — that work with the hijab rather than needing extra layers to cover what it doesn\'t. Brands run by hijab-wearing women often design with this coordination in mind from the start, which is the distinction this page draws on: pieces from hijabi-owned houses, not just any modest item that happens to fit. Volumising underscarves or caps are a common finishing touch, giving the wrap more shape at the crown before the outer hijab goes on.',
    related: ['modest-hijabs', 'modest-dresses'],
  },
  'modest-wedding-guest': {
    h2: 'What should I wear as a modest wedding guest?',
    body: "The modest-fashion rules for a wedding guest are the same as any wedding guest's: avoid white or ivory, which reads as competing with the bride, and dress to the formality of the venue and time of day. Beyond that, a modest wedding guest look usually means a floor-length or midi dress or abaya in a richer fabric — satin, embellished chiffon, structured crepe — rather than the cotton or jersey suited to everyday wear. An open abaya layered over a coordinating inner dress is a common combination, since it reads as one deliberate outfit rather than two separate pieces. Jewel tones and metallics are frequent choices for evening weddings; softer pastels for daytime ones. A coordinating or contrasting hijab in a formal fabric like satin or chiffon finishes the look, rather than an everyday jersey one.",
    related: ['modest-abayas', 'modest-dresses'],
  },
  'modest-summer-outfits': {
    h2: 'How do you dress modestly in the heat?',
    body: "Staying cool in full coverage comes down to fabric and cut more than how much skin is covered. Natural, breathable fibres — linen, cotton, viscose — let air move in a way synthetic blends don't, so a linen maxi dress in full sleeves can be cooler than a short synthetic one. Looser, flowier cuts help air circulate against the body rather than trapping heat the way a fitted silhouette does. Lighter colours reflect rather than absorb heat, which is why summer modest pieces skew pale. For hijabs specifically, a lightweight cotton voile or chiffon breathes far better through summer than a heavier jersey, even though jersey is easier to style. The trade-off is upkeep — linen and voile crease more readily than jersey, so summer pieces often need more ironing or steaming to stay crisp.",
    related: ['modest-dresses', 'modest-hijabs'],
  },
};
