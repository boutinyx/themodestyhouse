import { describe, it, expect } from 'vitest';
import { classifyColour, colourFamily, COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from './colour';

describe('colourFamily', () => {
  it('reads a colour from the title suffix', () => {
    expect(colourFamily('Amara Maxi Dress - Sage Green')).toBe('green');
    expect(colourFamily('Tala premium Ribbed Knit Abaya- Espresso')).toBe('brown');
    expect(colourFamily('Aminah Zipper Jersey Dress - Cocoa Bean')).toBe('brown');
  });

  // The discriminating test for the suffix-first branch. Every other title in
  // this file resolves the same way through the full-title fallback, so
  // deleting the `if (split)` block leaves them all green. This one does not:
  // a real catalogue title whose body names one family and whose colourway
  // suffix names another. Without the branch it returns `yellow`, on `gold`.
  it('lets the suffix beat a colour word in the body of the title', () => {
    expect(colourFamily('Gold Accent Half Zip Abaya - Pistachio')).toBe('green');
  });

  it('reads a colour from elsewhere in the title', () => {
    expect(colourFamily('Chocolate Linen Cotton Wrap Top')).toBe('brown');
    expect(colourFamily('Black Abaya')).toBe('black');
  });

  // The two-word families must beat their own second word. Without an explicit
  // priority order "navy blue" (209 rows) resolves to blue and the Navy chip
  // is empty.
  it('prefers the more specific family', () => {
    expect(colourFamily('Hijab - Navy Blue')).toBe('navy');
    expect(colourFamily('Abaya - Light Brown')).toBe('brown');
    expect(colourFamily('Dress - Butter Yellow')).toBe('yellow');
    expect(colourFamily('Hijab - Dusty Rose')).toBe('pink');
    expect(colourFamily('Abaya - Claret Red')).toBe('red');
  });

  // A named colour beats a pattern word, so a black floral is filed black.
  // Only a garment with NO named colour falls through to multi.
  it('puts patterns in multi only when no colour is named', () => {
    expect(colourFamily('Leopard Print Hijab')).toBe('multi');
    expect(colourFamily('Black Floral Maxi Dress')).toBe('black');
  });

  // §10.31: `word()` is Unicode-aware, so an accented title still matches.
  it('matches across non-ASCII titles', () => {
    expect(colourFamily('Ombré Jersey Hijab')).toBe('multi');
    expect(colourFamily('Robe noire')).toBe('black');
  });

  // The negatives. Each of these is a real suffix string in the catalogue that
  // is NOT a colour, and each one would be a visible mistake in the grid.
  it('returns null for non-colour suffixes', () => {
    expect(colourFamily('Luxury Chiffon Hijab - Final Sale')).toBeNull();
    expect(colourFamily('Abaya - Limited Edition')).toBeNull();
    expect(colourFamily('Hijab - Smoked')).toBeNull();   // a finish, not a colour
    expect(colourFamily('Hijab - Natural')).toBeNull();
    expect(colourFamily('The Culture Starter Set')).toBeNull();
    expect(colourFamily('The Riella label')).toBeNull();
  });

  // Words that LOOK like beige and are deliberately absent from the vocabulary.
  // `linen` and `satin` are fabrics, not colours — "Linen Maxi Dress" is 1,100+
  // rows in the catalogue and none of them is beige by virtue of that.
  it('does not treat a fabric as a colour', () => {
    expect(colourFamily('Reyana Linen Maxi Dress')).toBeNull();
    expect(colourFamily('Satin top with lace detail')).toBeNull();
  });

  // `champagne` is a real shade name — 30 rows — and is deliberately still out
  // of `beige`, so it is asserted rather than only claimed in prose.
  it('leaves champagne unclassified', () => {
    expect(colourFamily('Bamboo Jersey Hijab - Champagne')).toBeNull();
  });

  // Substring safety, the §10.5/§10.10 family. Every one of these contains a
  // colour word as a substring and must not match.
  it('does not match a colour inside a longer word', () => {
    expect(colourFamily('Shredded Hem Jeans')).toBe('blue');   // via `jeans`->denim, NOT `red`
    expect(colourFamily('Standard Length Abaya')).toBeNull();  // not `tan`
    expect(colourFamily('Greenwich Trench')).toBeNull();       // not `green`
  });

  // The same guard for the words the second pass added: SIX of them — `umber`
  // (twice), `cedar`, `jade`, `nero`, `ocean`, `oak` — each a substring of a
  // longer word, so `word()` is the only thing keeping these rows off a chip.
  // Five of the six are live in the published catalogue; `oak` is the exception
  // and says so at its own line below.
  //
  // What this block protects, stated precisely because the count above was
  // wrong for a while and a wrong number in a comment is worse than none
  // (§10.43): it guards the boundary being REMOVED. Measured 2026-08-29 — all
  // seven assertions below still pass under a plain ASCII `\b`, because every
  // collision here has an ASCII letter on the side that matters, and all seven
  // fail with no boundary at all. That is NOT §10.31's hazard, which is the
  // boundary being WRONG outside ASCII; the only two tests in this file that
  // fail under `\b` are the Çağla one and `matches across non-ASCII titles`.
  it('does not match a second-pass colour inside a longer word', () => {
    expect(colourFamily('Lumière Slumber Gown')).toBeNull();            // not `umber` in "Slumber"
    // Guards `umber`, and `plum` too — measured with no boundary this title
    // returns purple, because `plum` sits above `umber` in RULES and fires first.
    expect(colourFamily('Cotton Pants F25 – PlumBerry')).toBeNull();
    expect(colourFamily('Everyday Chiffon Hijab - Cedarwood')).toBeNull(); // not `cedar` in "Cedarwood"
    expect(colourFamily('Jaden Top')).toBeNull();                       // not `jade` in "Jaden"
    expect(colourFamily('Neroli Abaya')).toBeNull();                    // not `nero` in "Neroli"
    expect(colourFamily('Oceanside')).toBeNull();                       // not `ocean` in "Oceanside"
    // `oak` has no embedded-substring row in data/products.json; this title is a
    // real catalogue title from data/raw-products.json (present but unpublished).
    expect(colourFamily('Cloak Kaftan')).toBeNull();                    // not `oak` in "Cloak"
  });

  // The two second-pass collisions where the answer is not `null`: the right
  // word has to win, not merely some word. Adds `dove` and `coal` to the six
  // words guarded above, for eight in total.
  //
  // The two are NOT the same shape, so they are described separately rather
  // than under one sentence. `taupe`/`dove` DOES discriminate, but only via the
  // Black sibling below, not via the Taupe row. `charcoal`/`coal` cannot
  // discriminate at all: both words live in `grey`, so ordering is irrelevant
  // and the assertion pins the pairing, not the outcome.
  it('lets the right word win a second-pass collision', () => {
    // beige via `taupe` — NOT grey via `dove` hiding inside "Foldover".
    expect(colourFamily('Taupe Foldover Pants')).toBe('beige');
    // The discriminating sibling: `grey` is ordered ABOVE `black`, so if `dove`
    // matched inside "Foldover" this row would return grey instead of black.
    expect(colourFamily('Black Foldover Pants')).toBe('black');
    // grey via `charcoal` — NOT via `coal` inside it. Both live in `grey`, so
    // this asserts the pairing rather than the outcome.
    expect(colourFamily('Solace Versatile Shirt - Charcoal')).toBe('grey');
  });

  // The accented branch of `cr[èe]me`, which nothing else exercises: the one
  // accented row in data/products.json ("VANILLA CRÈME Georgette Chiffon Scarf")
  // reaches cream via `vanilla` anyway. This title is real but unpublished — it
  // is a literal title in data/raw-products.json (hijab-boutique), and `crème`
  // is the only colour word in it.
  it('reads the accented spelling of creme', () => {
    expect(colourFamily('Cotton skirt - Crème')).toBe('cream');
  });

  // ---------------------------------------------------------------------
  // The second pass, 2026-08-28. One assertion per word added from
  // `npx tsx scripts/colour-coverage.mjs`, each on a LITERAL title from
  // data/products.json — every string below returns >=1 from
  // `grep -c "<title>" data/products.json`, checked before it was written.
  // ---------------------------------------------------------------------

  it('reads the red words added from the suffix frequencies', () => {
    expect(colourFamily('Blouse - Bordeaux')).toBe('red');
    expect(colourFamily('Jersey Hijab - Pomegranate')).toBe('red');
    expect(colourFamily('Jilbab - Sangria')).toBe('red');
  });

  it('reads the yellow words added from the suffix frequencies', () => {
    expect(colourFamily('A-Line Maxi Skirt - Banana')).toBe('yellow');
    expect(colourFamily('Unisex Hoodie - Citron')).toBe('yellow');
  });

  it('reads the pink words added from the suffix frequencies', () => {
    expect(colourFamily('Tube Hijab Under-Cap - Flamingo')).toBe('pink');
    expect(colourFamily('Solid Modal - Rosewater')).toBe('pink');
  });

  it('reads the purple words added from the suffix frequencies', () => {
    expect(colourFamily('Premium Jersey Hijab - Mulberry')).toBe('purple');
    expect(colourFamily('Cotton Undercap - Eggplant')).toBe('purple');
    expect(colourFamily('Amethyst Chiffon Hijab')).toBe('purple');
    expect(colourFamily('Cotton Undercap - Wisteria')).toBe('purple');
    expect(colourFamily('silk muse skirt - purpur')).toBe('purple');
  });

  it('reads the brown words added from the suffix frequencies', () => {
    expect(colourFamily('Della Pleat Wrap Dress- Mahogany')).toBe('brown');
    expect(colourFamily('Full Coverage Hijab Cap - Truffle')).toBe('brown');
    expect(colourFamily('Umber Skirt')).toBe('brown');
    expect(colourFamily('Cinnamon Modal Hijab')).toBe('brown');
    expect(colourFamily('Maya Maxi Dress - Pecan')).toBe('brown');
    expect(colourFamily('Lycra Open Cap - Mocca')).toBe('brown');
    expect(colourFamily('Chiffon Maxi Skirt - Fudge')).toBe('brown');
    expect(colourFamily('VZ Quincy Top – Choco')).toBe('brown');
    expect(colourFamily('Jersey Hijab - Nutmeg')).toBe('brown');
    expect(colourFamily('Instant Hijab - cappuccino')).toBe('brown');
    expect(colourFamily('Hazel Textured Satin Hijab')).toBe('brown');
    expect(colourFamily('Cotton Undercap - Macchiato')).toBe('brown');
    expect(colourFamily('Praline Jersey Hijab')).toBe('brown');
    expect(colourFamily('Bamboo Modal - Sepia')).toBe('brown');
    expect(colourFamily('Farah Skirt - Cedar')).toBe('brown');
    expect(colourFamily('Oak Kuffiyeh')).toBe('brown');
  });

  it('reads the beige, cream and white words added from the suffix frequencies', () => {
    expect(colourFamily('Georgette Crepe Hijab - Mushroom')).toBe('beige');
    expect(colourFamily('Fawn Chiffon Hijab')).toBe('beige');
    expect(colourFamily('Premium Jersey Line - bisque')).toBe('beige');
    expect(colourFamily('Linen Skirt – Creme')).toBe('cream');
    expect(colourFamily('Buttercream Jersey Scarf')).toBe('cream');
    expect(colourFamily('Abaya Essential - Roomwit')).toBe('cream');   // nl, cream-white
    expect(colourFamily('Cotton Undercap - Blanco')).toBe('white');    // es, white
  });

  it('reads the grey words added from the suffix frequencies', () => {
    expect(colourFamily('Dove Chiffon Silk Hijab')).toBe('grey');
    expect(colourFamily('Granite Chiffon')).toBe('grey');
    expect(colourFamily('Coal Jersey Wide Legged Pants')).toBe('grey');
    expect(colourFamily('Pewter Crepe Hijab')).toBe('grey');
    expect(colourFamily('Tech Sport Cap - Carbon')).toBe('grey');
    expect(colourFamily('Gunmetal Chiffon Silk Hijab')).toBe('grey');
    expect(colourFamily('Premium Jersey - Platinum')).toBe('grey');
    expect(colourFamily('Basic abaya - Donkergrijs')).toBe('grey');    // nl, dark grey
  });

  it('reads the green words added from the suffix frequencies', () => {
    expect(colourFamily('Modal Crinkle Hijab - Thyme')).toBe('green');
    expect(colourFamily('Plisse Sleeve Maxi Dress - Basil')).toBe('green');
    expect(colourFamily('Matcha Pants')).toBe('green');
    expect(colourFamily('Evergreen Chiffon Silk Hijab')).toBe('green');
    expect(colourFamily('Jade Slit Top')).toBe('green');
    expect(colourFamily('Jersey Hijab - Kiwi')).toBe('green');
    expect(colourFamily('Perfect Satin Hijab - Eucalyptus')).toBe('green');
    expect(colourFamily('Seafoam Jilbab')).toBe('green');
    expect(colourFamily('Winnie – Zaytoon')).toBe('green');            // ar, olive
  });

  // §10.31 again, and the reason `word()` is not `\b`: `ğ` and `ç` are not
  // `\w`, so an ASCII boundary would find one INSIDE this word.
  it('reads a Turkish colour name that ASCII boundaries cannot see', () => {
    expect(colourFamily('Lyocell Basic Skirt with Elastic Waist - Çağla')).toBe('green');
  });

  it('reads the blue, black and multi words added from the suffix frequencies', () => {
    expect(colourFamily('Rayon crinkle - Ocean')).toBe('blue');
    expect(colourFamily('Cotton Undercap - Sapphire')).toBe('blue');
    expect(colourFamily('Premium Plain Jersey (Peacock)')).toBe('blue');
    expect(colourFamily('Asymmetric Textured Ruffle Top - Cerulean')).toBe('blue');
    expect(colourFamily('Swim Turban - Nero')).toBe('black');          // it, black
    expect(colourFamily('Polka Dot Skirt')).toBe('multi');
  });

  // `multi` is last, so a dotted item that also names a colour keeps the colour.
  it('keeps polka dot behind a named colour', () => {
    expect(colourFamily('Brown Polka Dot Wrap Maxi Dress')).toBe('brown');
  });

  // A metal before a fastening describes the HARDWARE. 15 published rows were
  // misfiled this way; the 40-row hand-check found the first of them.
  it('does not read a metal fastening as the garment colour', () => {
    expect(colourFamily('Luxury Viscose Two-Piece Set with Gold Brooch')).toBeNull();
    expect(colourFamily('Gold Buttoned Cupra Skirt')).toBeNull();
    expect(colourFamily('Black Signature Knit Dress with Gold Button')).toBe('black');
    expect(colourFamily('denim gold button shirt')).toBe('blue');
  });

  // The negative control for that guard: it must not eat gold as a real colour,
  // and it must not fire for a dye word, because "Black Button abaya" is black.
  it('still reads a metal that is not describing a fastening', () => {
    expect(colourFamily('Sahara Gold Hijab')).toBe('yellow');
    expect(colourFamily('Black Button abaya')).toBe('black');
    expect(colourFamily('White Button Down Long Sleeve Tunic')).toBe('white');
  });

  // The words that were LOOKED AT in the same pass and left out. Each is a real
  // catalogue string, and each of these assertions fails the moment someone adds
  // the word on the strength of its frequency alone.
  it('leaves the near-colours that the corpus disproved', () => {
    expect(colourFamily('Snow Leopard')).toBe('multi');                     // not white
    expect(colourFamily('Sahara Linen Set')).toBeNull();                    // a collection
    expect(colourFamily('Elastic Waist Iron Trace Trousers - Ecru')).toBe('cream'); // not grey
    expect(colourFamily('Heather in Black')).toBe('black');                 // not grey
    expect(colourFamily('Clay Chiffon Hijab')).toBeNull();                  // brown or orange?
  });

  it('has a label and a swatch for every family', () => {
    for (const k of Object.keys(COLOUR_FAMILY_LABELS)) {
      expect(COLOUR_FAMILY_SWATCH[k as keyof typeof COLOUR_FAMILY_SWATCH]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// -----------------------------------------------------------------------
// `classifyColour` — the same matching, reported with HOW it was arrived at,
// so scripts/colour-review.mjs can rank the cases worth Tina's attention.
// Every title below is a literal catalogue string: each returns >=1 from
// `grep -c "<title>" data/products.json`, checked before it was written.
// -----------------------------------------------------------------------
describe('classifyColour', () => {
  it('reports a confident suffix match', () => {
    const v = classifyColour('Amara Maxi Dress - Sage Green');
    expect(v.family).toBe('green');
    expect(v.confidence).toBe('suffix');
    expect(v.term).toBe('sage green');
    expect(v.candidates).toEqual(['green']);
  });

  // The whole point of the ambiguous bucket: the answer is still 'navy', but
  // the verdict says two families matched, so the review page can show it.
  it('reports every family that matched the suffix', () => {
    const v = classifyColour('Hijab - Navy Blue');
    expect(v.family).toBe('navy');
    expect(v.candidates).toEqual(['navy', 'blue']);
  });

  it('reports a body match as weak, and names the word', () => {
    const v = classifyColour('Chocolate Linen Cotton Wrap Top');
    expect(v.family).toBe('brown');
    expect(v.confidence).toBe('weak');
    expect(v.matchedWord).toBe('Chocolate');
    expect(v.term).toBeNull();
  });

  // The brief asked for 'Hijab - Thyme' here. `thyme` became a green word in
  // the second vocabulary pass (2026-08-28), so that title is now a confident
  // suffix match and cannot carry this assertion. `champagne` is the same
  // shape and is still deliberately unmapped — the file already asserts that
  // above, which is what makes it a safe substitute.
  it('reports an unrecognised suffix with the term, so it can be reviewed', () => {
    const v = classifyColour('Bamboo Jersey Hijab - Champagne');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('none');
    expect(v.term).toBe('champagne');
  });

  // The override layer. All three of these come from data/colour-overrides.json.
  // Title substituted: the brief's 'Abaya - Bordeaux' returns 0 from
  // `grep -c` over data/products.json; this one returns 1.
  it('lets an override beat the vocabulary', () => {
    const v = classifyColour('Basic abaya - Bordeaux');
    expect(v.family).toBe('red');
    expect(v.confidence).toBe('override');
  });

  // A RECORDED null is not an absent key, and the confidence is the only thing
  // that says so: both return `family: null`, but an unrecognised term reports
  // 'none' (the champagne case above) and a recorded one reports 'override'.
  // That is what stops the review page asking about `mink` a second time.
  it('lets an override say a term is not a colour', () => {
    const v = classifyColour('Hijab - Mink');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('override');
  });

  // With "rose": null in weakWords, a body match is refused but a suffix match
  // still works. Titles substituted for the brief's invented pair, which
  // `grep -c` returns 0 for: 'Rose Wrap Dress' -> 'Mystic Rose Hijab' (1),
  // 'Wrap Dress - Dusty Rose' -> 'Premium Chiffon Hijab - Dusty Rose' (1).
  it('lets weakWords switch a word off in the title body only', () => {
    expect(classifyColour('Mystic Rose Hijab').family).toBeNull();
    expect(classifyColour('Premium Chiffon Hijab - Dusty Rose').family).toBe('pink');
  });
});
