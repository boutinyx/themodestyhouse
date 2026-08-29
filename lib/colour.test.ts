import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from './colour';
import type { ColourFamily } from './colour';

// -----------------------------------------------------------------------
// WHY EVERY BEHAVIOURAL TEST IN THIS FILE LOADS lib/colour.ts THROUGH A MOCK.
//
// data/colour-overrides.json is Tina's file. It exists to be hand-edited, the
// review page writes it, and she works through it a session at a time — 117
// terms answered as of 2026-08-29, with roughly 750 more terms still on the
// list. It is therefore MUTABLE THIRD-PARTY DATA in exactly §10.19's sense:
// *"a test that asserts things about MUTABLE third-party data is an authoring
// aid, not a build gate"*.
//
// It had been read live by every test here, and on 2026-08-29 that cost six
// red tests in one sitting, none of them a defect. Each was an answer of hers
// arriving underneath an assertion about the VOCABULARY:
//   `smoked` -> grey            broke "returns null for non-colour suffixes"
//   `champagne` -> [beige,cream] broke "leaves champagne unclassified" and
//                               "reports an unrecognised suffix …"
//   `navy blue` -> navy         broke both `candidates` assertions, because an
//                               override returns `candidates: []` while a
//                               vocabulary hit on the same string returns
//                               ['navy','blue']
// Re-baselining those to today's values would have gone red again on her next
// session, which is the actual defect — so the vocabulary is isolated from the
// file instead.
//
// The split this file now keeps:
//   - VOCABULARY tests run against an EMPTY override map. What RULES does,
//     `word()` boundaries, substring safety, the hardware guard, suffix-beats-
//     body. No answer of hers can reach them.
//   - OVERRIDE tests run against SMALL INVENTED FIXTURES declared beside the
//     assertion, so the branch under test is pinned by the test rather than by
//     whatever happens to be in the file this week.
//   - THE VALIDATOR, and only the validator, reads the real file. That is its
//     entire job: it fails CI on a bad hand-edit, and it is what protects the
//     build-time throw in lib/compactCatalogue.ts.
//
// TITLES ARE REAL; OVERRIDE VALUES ARE INVENTED. That is the whole of the
// division, and it is what lets a fixture be honest — a made-up override value
// is a statement about the CODE, whereas a made-up title would be a statement
// about a catalogue that does not exist.
//
// Counted 2026-08-29 by parsing the 19,019 rows of data/products.json in node
// and checking membership — not with a shell `grep -c`, which §10.49 records
// getting three separate answers wrong on this very question. Of the 122
// distinct titles asserted here: 104 are literal PUBLISHED titles, 2 are
// literal titles in data/raw-products.json that are not currently published
// ("Cloak Kaftan", "Cotton skirt - Crème" — each says so at its own line), and
// 16 are hand-written. Fifteen of the sixteen are NEGATIVE controls in the
// vocabulary blocks, of the "Greenwich Trench" / "Robe noire" shape — strings
// chosen because the catalogue does NOT contain the collision being guarded
// against, which is exactly why they cannot be sourced from it. The sixteenth
// is the termination case, which labels itself SYNTHETIC and explains why the
// corpus cannot express it. EVERY OTHER TITLE IN THE OVERRIDE BLOCKS IS
// PUBLISHED, checked the same way.
// -----------------------------------------------------------------------

type OverrideValue = ColourFamily | ColourFamily[] | null;

interface OverrideFixture {
  terms?: Record<string, OverrideValue>;
  weakWords?: Record<string, OverrideValue>;
}

/**
 * lib/colour.ts loaded against a fixture override map — `{}` for the empty map
 * the vocabulary tests want.
 *
 * `vi.resetModules()` first, because lib/colour.ts reads the JSON once at
 * module scope (`OVERRIDES.terms`), so a cached instance would carry the
 * previous call's map. The unmock is symmetric hygiene only: the namespace
 * returned here is already resolved, and the next call resets the registry
 * anyway.
 */
async function loadColour(overrides: OverrideFixture = {}): Promise<typeof import('./colour')> {
  vi.resetModules();
  vi.doMock('@/data/colour-overrides.json', () => ({
    default: { terms: overrides.terms ?? {}, weakWords: overrides.weakWords ?? {} },
  }));
  try {
    return await import('./colour');
  } finally {
    vi.doUnmock('@/data/colour-overrides.json');
  }
}

// The vocabulary-only build of the module, shared by every describe below that
// is asserting what RULES does. Bound in a `beforeAll` rather than at import
// time because `loadColour` is async; bound to the same NAMES the assertions
// already used, so what each test asserts is unchanged and only the module it
// asserts against has moved.
let colourFamily: typeof import('./colour').colourFamily;
let classifyColour: typeof import('./colour').classifyColour;

beforeAll(async () => {
  ({ colourFamily, classifyColour } = await loadColour());
});

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
  // is empty. NOTE this is a VOCABULARY property and is asserted here against
  // an empty override map on purpose: `navy blue` is also a term in
  // data/colour-overrides.json today, and reading the real file would let that
  // entry answer the question instead of RULES — the ordering could break and
  // this test would still pass.
  it('prefers the more specific family', () => {
    expect(colourFamily('Premium Chiffon Hijab - Navy Blue')).toBe('navy');
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
  //
  // "NOT A COLOUR" HERE MEANS "NO RULE IN THIS FILE MATCHES IT" — it is a claim
  // about the vocabulary, not about the garment, and Tina is free to disagree
  // with any of them in data/colour-overrides.json without this going red. She
  // has already done so for two: `smoked` is grey and `natural` is
  // ["beige","cream"] in her file as of 2026-08-29. Both remain correct
  // assertions about RULES, which is all this test is for.
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
  // of `beige`, so it is asserted rather than only claimed in prose. Tina has
  // since answered it ["beige","cream"] in her file; that is an override and
  // does not make the vocabulary claim false.
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
  // the word to RULES on the strength of its frequency alone. `sahara` and
  // `clay` are both answered in Tina's file today — `sahara` null, `clay`
  // ["red","pink","orange"] — which is the override layer doing its job and is
  // why these run against an empty map.
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

  // The other direction, which the loop above cannot see: a swatch for a family
  // that has no label is a dead entry, and the two maps are the only definition
  // of "the set of families" that anything outside this file can read — the
  // override validator below derives its allowed values from the LABEL keys, so
  // a drift between the two would quietly change what that validator accepts.
  it('has exactly the same families in the label and swatch maps', () => {
    expect(Object.keys(COLOUR_FAMILY_SWATCH).sort()).toEqual(Object.keys(COLOUR_FAMILY_LABELS).sort());
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
  //
  // This is THE assertion the empty override map exists for. `navy blue` is a
  // term in data/colour-overrides.json today, and an override hit returns
  // `candidates: []` — deliberately, since nothing was matched against RULES —
  // so read against the real file this reports no candidates at all and the
  // ambiguous-suffix reporting the review page depends on goes untested.
  it('reports every family that matched the suffix', () => {
    const v = classifyColour('Premium Chiffon Hijab - Navy Blue');
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
  // shape and is unmapped in the VOCABULARY — which, with the override map
  // empty, is the whole of what 'none' means.
  it('reports an unrecognised suffix with the term, so it can be reviewed', () => {
    const v = classifyColour('Bamboo Jersey Hijab - Champagne');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('none');
    expect(v.term).toBe('champagne');
  });

  // ---------------------------------------------------------------------
  // The override layer. FIXTURE values from here down — the map is declared in
  // the test, never read from data/colour-overrides.json, so these assert what
  // the CODE does with an override rather than what Tina happens to have
  // answered. `bordeaux: 'red'` and `mink: null` are both real entries of hers
  // as it happens; they are restated here so the tests do not depend on that.
  // ---------------------------------------------------------------------
  it('lets an override beat the vocabulary', async () => {
    // The vocabulary would say red anyway, via `bordeaux` in RULES — so the
    // discriminator is the CONFIDENCE, not the family. 'override' is only
    // reachable through the map.
    const { classifyColour: classify } = await loadColour({ terms: { bordeaux: 'red' } });
    const v = classify('Basic abaya - Bordeaux');
    expect(v.family).toBe('red');
    expect(v.confidence).toBe('override');
    expect(v.candidates).toEqual([]);   // an override matches no rule
  });

  // A stronger form of the same claim, and the one that shows an override
  // really does OUTRANK the vocabulary rather than merely agreeing with it:
  // `bordeaux` is a red word in RULES, and the fixture says purple.
  it('lets an override contradict the vocabulary outright', async () => {
    const { classifyColour: classify } = await loadColour({ terms: { bordeaux: 'purple' } });
    const v = classify('Basic abaya - Bordeaux');
    expect(v.family).toBe('purple');
    expect(v.confidence).toBe('override');
  });

  // A RECORDED null is not an absent key, and the confidence is the only thing
  // that says so: both return `family: null`, but an unrecognised term reports
  // 'none' (the champagne case above) and a recorded one reports 'override'.
  // That is what stops the review page asking about `mink` a second time.
  it('lets an override say a term is not a colour', async () => {
    const { classifyColour: classify } = await loadColour({ terms: { mink: null } });
    const v = classify('Premium Chiffon Hijab - Mink');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('override');
  });

  // With "rose": null in weakWords, a body match is refused but a suffix match
  // still works. Titles substituted for the brief's invented pair, which
  // `grep -c` returns 0 for: 'Rose Wrap Dress' -> 'Mystic Rose Hijab' (1),
  // 'Wrap Dress - Dusty Rose' -> 'Premium Chiffon Hijab - Dusty Rose' (1).
  it('lets weakWords switch a word off in the title body only', async () => {
    const { classifyColour: classify } = await loadColour({ weakWords: { rose: null } });
    expect(classify('Mystic Rose Hijab').family).toBeNull();
    expect(classify('Premium Chiffon Hijab - Dusty Rose').family).toBe('pink');
  });
});

// -----------------------------------------------------------------------
// A SUPPRESSED WEAK WORD COSTS ONLY ITSELF.
//
// `weakWords: {"rose": null}` means "the word *rose* must not trigger pink
// from a title body". It does not mean "give up on pink". The first
// implementation read the null as a `continue` over the FAMILY, so the first
// match ended the family's chance — and 16 of the 18,917 published rows whose
// titles read "Rose Pink …" returned no colour at all (measured 2026-08-29,
// data/products.json). The loop now advances past the suppressed match and
// re-runs the same family's rule over the remainder.
//
// The `{rose: null}` map is a FIXTURE here, declared per test. It matches the
// only entry in the real file's `weakWords` today, and is restated so that the
// day Tina answers `rose` differently these keep testing the branch rather
// than going red.
//
// Every title below except the termination one is a literal catalogue string:
// each returns >=1 from `grep -c -F "<title>" data/products.json`.
// -----------------------------------------------------------------------
describe('classifyColour, a suppressed weak word costs only itself', () => {
  const SUPPRESS_ROSE: OverrideFixture = { weakWords: { rose: null } };

  it('keeps looking inside the same family after a suppressed word', async () => {
    const { classifyColour: classify } = await loadColour(SUPPRESS_ROSE);
    const v = classify('Rose Pink Etched Crepe Lace Abaya');
    expect(v.family).toBe('pink');
    expect(v.confidence).toBe('weak');
    expect(v.matchedWord).toBe('Pink');
  });

  // The behaviour that must NOT regress — it is the whole reason weakWords
  // exists. `rose` is the only pink word here, so the row stays unclassified.
  it('still returns null when the suppressed word is the only one of its family', async () => {
    const { classifyColour: classify } = await loadColour(SUPPRESS_ROSE);
    const v = classify('Mystic Rose Hijab');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('none');
  });

  // SYNTHETIC, and labelled as such rather than passed off as a catalogue
  // string: `grep`-equivalent scans on 2026-08-29 found ZERO titles containing
  // `rose` twice — 0 of 18,917 in data/products.json and 0 of 44,321 in
  // data/raw-products.json. The corpus cannot express this case, and the case
  // is a TERMINATION property, not a classification one: a naive "retry the
  // same family" loop that does not advance past the suppressed match spins
  // forever here.
  //
  // HOW THIS ONE FAILS, stated because the shape is unusual and a wrong
  // account of it is the §10.28 family — a hang read as CI flake rather than as
  // this assertion firing. It does NOT fail by timing out. The loop is
  // synchronous, so it never yields to the event loop and Vitest cannot
  // interrupt it: `testTimeout` elapses with the worker still spinning (the
  // Task 2A re-review measured a worker alive 35 s past a 3 s testTimeout). The
  // symptom is a suite that never finishes, not a red assertion.
  it('terminates when the suppressed word appears twice and nothing else matches', async () => {
    const { classifyColour: classify } = await loadColour(SUPPRESS_ROSE);
    const v = classify('Rose Garden Rose Hijab');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('none');
  });

  // The other half of weakWords, and until now the ONLY untested return path in
  // classifyColour: a NON-null entry, which does not switch the word off but
  // FORCES a different family for it. Every entry in the real file is currently
  // null, so this case could never have been built from tracked data even
  // before the isolation — which is exactly why the whole file now works this
  // way.
  //
  // It matters more than its size: this is a branch Tina reaches by hand-editing
  // a file, which is the same seam as the compactCatalogue guard in
  // lib/compactCatalogue.test.ts, and an untested path through a hand-edited
  // input is where a wrong value gets to look like a working one.
  //
  // 'Mystic Rose Hijab' is a literal catalogue title and discriminates: `rose`
  // is its only colour word, red's rule does not match it, and pink's does. So
  // pink/'weak' means the override was ignored, null/'none' means it was read as
  // a suppression, and red/'override' is the branch under test.
  it('lets a non-null weakWords entry force a different family', async () => {
    const { classifyColour: classify } = await loadColour({ weakWords: { rose: 'red' } });
    const v = classify('Mystic Rose Hijab');
    expect(v.family).toBe('red');
    expect(v.confidence).toBe('override');
    expect(v.matchedWord).toBe('Rose');
    expect(v.term).toBeNull();
  });
});

// -----------------------------------------------------------------------
// A NULL term override says "this SUFFIX is not a colour". It does not say
// "this product has no colour", and the first implementation conflated the
// two: it returned immediately on any override, so 64 of the 18,917 published
// rows lost a colour their own title plainly states (measured 2026-08-29 —
// "Luxury Black Cascade Four Piece Abaya Set - LIMITED EDITION" was black and
// became null). The corrected rule is in classifyColour's docstring; these are
// the assertions that hold it.
//
// FIXTURE maps throughout: `{'limited edition': null}` and `{mink: null}` are
// both real entries of Tina's as of 2026-08-29, restated here so that these
// assert the null-suppression BRANCH rather than the current contents of her
// file.
//
// Every title below is a literal catalogue string — each returns >=1 from
// `grep -c -F "<title>" data/products.json`, checked before it was written.
// -----------------------------------------------------------------------
describe('classifyColour, null term overrides', () => {
  const NULL_LIMITED_EDITION: OverrideFixture = { terms: { 'limited edition': null } };

  // The 64-row case. With `limited edition` nulled the suffix contributes
  // nothing — and the rest of the title still says black. Reported 'weak'
  // because a body match is exactly what it is.
  it('still reads the rest of the title when the suffix is a null override', async () => {
    const { classifyColour: classify } = await loadColour(NULL_LIMITED_EDITION);
    const v = classify('Luxury Black Cascade Four Piece Abaya Set - LIMITED EDITION');
    expect(v.family).toBe('black');
    expect(v.confidence).toBe('weak');
    expect(v.matchedWord).toBe('Black');
    expect(v.term).toBe('limited edition');
  });

  // Three more of the 64, one per shape: a body word ('Cocoa'), a SECOND
  // colourway suffix left inside the base once the null-overridden one is
  // stripped ('- Dusty Mauve'), and the `mink` term rather than
  // `limited edition`, so this is not an assertion about one key.
  it('reads the rest of the title for every shape of the 64', async () => {
    const { colourFamily: family } = await loadColour({
      terms: { 'limited edition': null, mink: null },
    });
    expect(family('Premium Cocoa Muse Open Abaya - LIMITED EDITION')).toBe('brown');
    expect(family('Luxury Moonlight Veil Three Piece Abaya Set – Dusty Mauve - LIMITED EDITION')).toBe('purple');
    expect(family('Stripe Detailed Modal Jacket - Mink')).toBe('multi');
  });

  // The other half, and the load-bearing one: when the rest of the title names
  // nothing either, the verdict is still 'override', NOT 'none'. Task 2B's
  // review page skips every 'override' row, so reporting 'none' here would put
  // `limited edition` back in front of Tina on the next run — the exact thing
  // the recorded null exists to prevent.
  it('reports override, not none, when the rest of the title names nothing', async () => {
    const { classifyColour: classify } = await loadColour(NULL_LIMITED_EDITION);
    const v = classify('Luxury Pearl Bloom Embellished Cape - Limited Edition');
    expect(v.family).toBeNull();
    expect(v.confidence).toBe('override');
    expect(v.term).toBe('limited edition');
  });

  // The suffix half of the rule, which the fall-through alone does not prove:
  // a null override must also stop the SUFFIX ITSELF being matched against
  // RULES.
  //
  // 'Gold Accent Half Zip Abaya - Pistachio' is a real catalogue title and
  // discriminates three ways, which is why it was chosen: with `pistachio`
  // nulled it must return YELLOW/'weak' (from `Gold` in the base). It returns
  // null/'override' if the null override short-circuits, and green/'suffix' if
  // the null override fails to suppress the suffix path.
  it('stops a null-overridden suffix matching the vocabulary', async () => {
    const { classifyColour: classify } = await loadColour({ terms: { pistachio: null } });
    const v = classify('Gold Accent Half Zip Abaya - Pistachio');
    expect(v.family).toBe('yellow');
    expect(v.confidence).toBe('weak');
    expect(v.matchedWord).toBe('Gold');
    expect(v.term).toBe('pistachio');
  });
});

// -----------------------------------------------------------------------
// data/colour-overrides.json is the ONE file in this feature designed to be
// hand-edited, and nothing enforced its shape. `lib/colour.ts` casts the
// parsed JSON to `Record<string, ColourFamily | ColourFamily[] | null>`;
// TypeScript infers a JSON string value as `string`, and `string` goes through
// that assertion unchallenged, so `npx tsc --noEmit` is exit 0 on a file full
// of nonsense.
//
// Two realistic hand-edits escaped silently, both producing an INVALID
// `ColourFamily` that no chip, label or swatch knows:
//   "burgandy" / "navy blue"  a misspelt or invented family;
//   "null" (quoted)           truthy, so classifyColour treats the term as a
//                             NON-null override and returns family "null" —
//                             the exact opposite of the decision being recorded.
//
// §10.15: a constraint stated only in a comment is not enforced. This is the
// test that fails when it stops being true. It is deliberately a test and not
// a runtime throw — a bad hand-edit must stop CI, not the site.
//
// THIS IS THE ONE BLOCK THAT READS THE REAL FILE, and it is the only one that
// should. Everything above asserts behaviour and is mocked, precisely so that
// an answer of Tina's can never turn a vocabulary claim red; this asserts the
// SHAPE of her answers, which is the thing that genuinely must hold for the
// build-time throw in lib/compactCatalogue.ts to be reachable at all. A red
// here means a bad hand-edit, never a difference of opinion.
// -----------------------------------------------------------------------
describe('data/colour-overrides.json', () => {
  const FAMILIES = new Set<string>(Object.keys(COLOUR_FAMILY_LABELS));
  const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'colour-overrides.json');

  /** One value that must be a colour family, checked. `where` is the path it
   *  was found at, so an element of a list names its own index rather than
   *  leaving Tina to count commas. */
  function familyProblems(where: string, value: unknown): string[] {
    if (typeof value !== 'string') {
      return [`${where}: ${JSON.stringify(value)} is neither a colour family nor null`];
    }
    if (FAMILIES.has(value)) return [];
    // The families are comma-joined, not space-joined. A space-joined list
    // reads as phrases — it offered "navy blue", which is exactly the invented
    // family the negative control below rejects, so the only guidance a
    // non-programmer gets named an invalid value.
    return [
      `${where}: "${value}" is not a colour family. Use one of ` +
      `${[...FAMILIES].join(', ')} — or a bare null, not the string "null".`,
    ];
  }

  /** Every problem found, as a readable line. An empty array means valid. */
  function problems(parsed: unknown): string[] {
    const found: string[] = [];
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return ['the file is not a JSON object'];
    }
    const root = parsed as Record<string, unknown>;

    // `autoTerms` is machine-written rather than hand-written, which makes it
    // MORE important to validate here, not less: a bad value in it reaches the
    // same build-time throw in lib/compactCatalogue.ts, and nobody would be
    // looking for a typo in a file they did not type.
    for (const section of ['terms', 'autoTerms', 'weakWords'] as const) {
      const map = root[section];
      // `autoTerms` is OPTIONAL — the file is valid without it, and every
      // fixture in this describe block omits it. Only the two hand-written
      // sections are required.
      if (map === undefined && section === 'autoTerms') continue;
      if (typeof map !== 'object' || map === null || Array.isArray(map)) {
        found.push(`${section}: missing, or not a JSON object`);
        continue;
      }
      for (const [key, value] of Object.entries(map as Record<string, unknown>)) {
        // Load-bearing, not tidiness: classifyColour looks a term up as
        // `split.colour.toLowerCase()` and a weak word as
        // `matchedWord.toLowerCase()`, so a capitalised key can never match
        // anything and is a silent no-op.
        if (key !== key.toLowerCase()) {
          found.push(`${section}["${key}"]: the key is not lowercased, so it can never match`);
        }
        if (value === null) continue;   // a recorded "not a colour" — the point of the file
        // A LIST is the multi-colour case ("black x red" is both). EVERY
        // element is checked, which is the whole reason this branch exists: a
        // half-right `["black", "burgandy"]` type-checks, classifies the row as
        // black, and loses only the bit it got wrong — so the row still looks
        // answered while one of Tina's two colours is silently absent.
        if (Array.isArray(value)) {
          if (value.length === 0) {
            found.push(`${section}["${key}"]: an empty list decides nothing. Name at least one colour family, or use a bare null.`);
            continue;
          }
          value.forEach((element, i) => found.push(...familyProblems(`${section}["${key}"][${i}]`, element)));
          continue;
        }
        found.push(...familyProblems(`${section}["${key}"]`, value));
      }
    }
    return found;
  }

  it('gives every override a real colour family, or a bare null', () => {
    const parsed: unknown = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'));
    expect(problems(parsed)).toEqual([]);
  });

  // The negative controls, kept rather than run once and deleted: a validator
  // that has never been seen to fail is not a validator (§10.28 rule 1). These
  // are the two hand-edits the block above names, plus the capitalised key.
  it('rejects a misspelt family', () => {
    expect(problems({ terms: { bordeaux: 'burgandy' }, weakWords: {} }))
      .toEqual([expect.stringContaining('"burgandy" is not a colour family')]);
    expect(problems({ terms: { 'navy blue suffix': 'navy blue' }, weakWords: {} }))
      .toEqual([expect.stringContaining('"navy blue" is not a colour family')]);
  });

  it('rejects the string "null", which is truthy and reads as a family', () => {
    expect(problems({ terms: {}, weakWords: { rose: 'null' } }))
      .toEqual([expect.stringContaining('"null" is not a colour family')]);
  });

  it('rejects a key that is not lowercased, which can never match', () => {
    expect(problems({ terms: { Bordeaux: 'red' }, weakWords: {} }))
      .toEqual([expect.stringContaining('the key is not lowercased')]);
  });

  it('rejects a section that is not an object', () => {
    expect(problems({ terms: {} })).toEqual(['weakWords: missing, or not a JSON object']);
  });

  // A null is not a defect — it is the recorded decision the whole file exists
  // to carry, and the validator must not creep into rejecting it.
  it('accepts the real shape: a family, and a bare null', () => {
    expect(problems({ terms: { bordeaux: 'red', mink: null }, weakWords: { rose: null } })).toEqual([]);
  });

  // The multi-colour shape, added 2026-08-29. A list is how a suffix that names
  // two colours reaches two chips.
  it('accepts a list of families', () => {
    expect(problems({ terms: { 'black x red': ['black', 'red'] }, weakWords: { rose: ['pink', 'red'] } })).toEqual([]);
  });

  // The negative control for the list branch, and the reason it is not enough
  // to check `Array.isArray`: HALF a valid answer is the realistic hand-edit.
  // The row still classifies as black, so nothing downstream looks broken —
  // only this fails, and only because it checks every element.
  it('rejects a list containing a family that is not one', () => {
    expect(problems({ terms: { 'black x red': ['black', 'burgandy'] }, weakWords: {} }))
      .toEqual([expect.stringContaining('terms["black x red"][1]: "burgandy" is not a colour family')]);
  });

  it('names the index of every bad element, not just the first', () => {
    expect(problems({ terms: { 'black x red': ['noir', 'burgandy'] }, weakWords: {} })).toEqual([
      expect.stringContaining('terms["black x red"][0]: "noir"'),
      expect.stringContaining('terms["black x red"][1]: "burgandy"'),
    ]);
  });

  it('rejects a non-string inside a list', () => {
    expect(problems({ terms: { 'black x red': ['black', null] }, weakWords: {} }))
      .toEqual([expect.stringContaining('terms["black x red"][1]: null is neither a colour family nor null')]);
  });

  // An empty list is not a recorded decision — it is a value that says nothing,
  // and `families[0] ?? null` would read it as "no colour" while looking to a
  // hand-editor like an answer. `null` is how "not a colour" is written.
  it('rejects an empty list, which decides nothing', () => {
    expect(problems({ terms: { 'black x red': [] }, weakWords: {} }))
      .toEqual([expect.stringContaining('an empty list decides nothing')]);
  });

  // The sections the validator must IGNORE. The file carries three `//` prose
  // keys and a `notes` object — Tina's own reminders, keyed `t:<term>` — and
  // none of them is an override. A validator that walked the whole document
  // would reject her file for containing the notes it was designed to hold.
  it('ignores the prose keys and the notes section', () => {
    expect(problems({
      '//': 'how this file works',
      '//terms': 'what a term is',
      terms: { bordeaux: 'red' },
      weakWords: {},
      notes: { 't:powder': 'Premium Chiffon Hijab - Powder is grey tho' },
    })).toEqual([]);
  });
});

// -----------------------------------------------------------------------
// MORE THAN ONE COLOUR PER PRODUCT.
//
// Tina, 2026-08-29: *"and i want to able to choose 2 colors or more"* — a
// colourway called "black x red" names two families and until now could only
// be filed under one of them.
//
// The vocabulary is NOT what produces two. RULES is ordered and the first match
// wins, so "Navy Blue" is navy and nothing else — the assertion below is there
// to hold that, because reporting every `candidate` in `families` is the
// obvious wrong implementation and would silently put 209 navy rows on the Blue
// chip. Two families come only from a list in data/colour-overrides.json, which
// is why the multi tests carry fixture maps and the single-family ones run
// against the empty one.
// -----------------------------------------------------------------------
describe('classifyColour, families', () => {
  it('reports one family for an ordinary suffix match', () => {
    const v = classifyColour('Amara Maxi Dress - Sage Green');
    expect(v.families).toEqual(['green']);
    expect(v.family).toBe('green');
  });

  // `candidates` still reports both — it is what the review page asks about —
  // but `families` is the answer, and the answer is one. Empty override map,
  // for the same reason as the `candidates` test above: `navy blue` is one of
  // Tina's terms, and an override would answer this question instead of RULES.
  it('does not turn an ambiguous suffix into two families', () => {
    const v = classifyColour('Premium Chiffon Hijab - Navy Blue');
    expect(v.candidates).toEqual(['navy', 'blue']);
    expect(v.families).toEqual(['navy']);
  });

  it('reports one family for a body match, and none for an unclassified title', () => {
    expect(classifyColour('Chocolate Linen Cotton Wrap Top').families).toEqual(['brown']);
    expect(classifyColour('Bamboo Jersey Hijab - Champagne').families).toEqual([]);
  });

  // The recorded-null half of the line above, which needs the override map and
  // so cannot live beside the two vocabulary assertions: `mink` is answered
  // null, the verdict is 'override', and `families` is still empty.
  it('reports no families for a term recorded as not a colour', async () => {
    const { classifyColour: classify } = await loadColour({ terms: { mink: null } });
    const v = classify('Premium Chiffon Hijab - Mink');
    expect(v.families).toEqual([]);
    expect(v.confidence).toBe('override');
  });

  it('keeps family as the first of families for a single-family override', async () => {
    const { classifyColour: classify } = await loadColour({ terms: { bordeaux: 'red' } });
    const v = classify('Basic abaya - Bordeaux');
    expect(v.families).toEqual(['red']);
    expect(v.family).toBe('red');
  });

  // The real thing. 'Classy Liquid F25 – Black x Red' is a literal catalogue
  // title (`grep -c -F` over data/products.json returns 1) and is the case that
  // motivated this: it files under `red` on the vocabulary alone, because red's
  // rule sits above black's in RULES.
  it('lets a term override name several families', async () => {
    const { classifyColour: classify, colourFamilies } = await loadColour({
      terms: { 'black x red': ['black', 'red'] },
    });
    const v = classify('Classy Liquid F25 – Black x Red');
    expect(v.families).toEqual(['black', 'red']);
    expect(v.family).toBe('black');            // the first of them
    expect(v.confidence).toBe('override');
    expect(v.term).toBe('black x red');
    expect(colourFamilies('Classy Liquid F25 – Black x Red')).toEqual(['black', 'red']);
  });

  // The same for the other half of the file. 'Mystic Rose Hijab' discriminates
  // exactly as it does in the single-family test above: `rose` is its only
  // colour word.
  it('lets a weakWords override name several families', async () => {
    const { classifyColour: classify } = await loadColour({ weakWords: { rose: ['pink', 'red'] } });
    const v = classify('Mystic Rose Hijab');
    expect(v.families).toEqual(['pink', 'red']);
    expect(v.family).toBe('pink');
    expect(v.confidence).toBe('override');
    expect(v.matchedWord).toBe('Rose');
  });
});
