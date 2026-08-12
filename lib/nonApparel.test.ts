import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { isNonApparel } from './nonApparel';

// Regression table for the non-apparel veto. Every string below is a LITERAL
// product title taken from data/raw-products.json — none are invented, so a
// failure here means real catalogue behaviour changed.
//
// Context: prayer mats were being published as co-ord `set`s and ~60 metal hijab
// magnets as `hijab`. The veto fixes that; MUST_SURVIVE is what stops the fix
// from deleting real clothing. See lib/nonApparel.ts.

const MUST_DROP = [
  "Hijab Magnet",
  "Straight Hijab Pins - White (Entire Wheel)",
  "Magnet Pins - NISWA GOLD",
  "Pocket Magnets - All Sets (24 Colors)",
  "No-Snag Pins - Black, Brown and Neutral Set",
  "Hijab Clip Gun Black",
  "Hijab Ring Organic Shape (2 Pack)",
  "Hijab Tape",
  "Invisible No-Slip Scarf Tape(MAC367)",
  "Versatile Allure Floral Magnetic Hijab Clasp (MAC338)",
  "MAC015 Hijab Accessories, 6 Pcs Pearl Hairpin Set",
  "MAC002 Safe Macaron color Hijab Brooch, Strong Metal Brooches, 8 pcs brooches",
  "MAC006 Muslim hijab Mask Chain,Fashion Glasses Chain, pearl mask chain",
  "Pack of 3 Mask Extender (Hijab Friendly)",
  "MAC126 Pearl Magnetic Buckle Hijab 12 pcs Brooches",
  "MAC019 Hijab Pin, U Shaped Brooch, 12 Pcs",
  "Vintage Enamel Brooch Pin Set(MAC366)",
  "Pearl Necklace & Earring Set Elegant Jewelry Collection (MAC418)",
  "MAC087 Fashionable Leaf Alloy Diamond Electroplated 4-piece Bracelet Set",
  "Modernist Geometric Square Earrings Bracelet Necklace Set (MAC318)",
  "MAC187 Copper Sset Zircon Personalized Multi-Layered Open Ring",
  "Crystal Tiara Headband with Cascading Forehead Chain (MAC330)",
  "MAC047 Rhinestone Crystal angle Earring Fringe Chain Necklaces Sets",
  "The Prayer Room — Set of 4 · Dusk",
  "Luxury Prayer Mat and Tasbeeh Set (MR048)",
  "Luxury Islamic Gift Set ·Prayer Rug, Wooden Rehal & Tasbeeh-Green",
  "MAC012 Luxury Handbag,Diamond Cheongsam Bag",
  "MAC038 Fashion Evening Dress Banquet Bag",
  "Hijab Wash Bag",
  "Rosette Cloud Clutch(MAC373)",
  "Acrylic Shell Clutch with Woven Inset(MAC372)",
  "Keychain Pouch & Foldable Tote Bag Set | Eco-Friendly Shopping Bag Accessory(MAC352)",
  "Islamic Style Mosque Acrylic Tabletop Decor (MAC386)",
  "Islamic Acrylic Folding Screen Hollow Pattern Desktop Decor (MAC402)",
  "Islamic Castle Lantern Decorative Hanging & Table Lamp (MAC397)",
  "Star & Crescent Embroidered Leather Placemat Set | 3-Piece Dining Table Decor (MAC390)",
  "Festive Ramadan Iron Tray Candy Box 3-Piece Set (MAC382)",
  "Islamic Design Souvenir Refrigerator Magnet Set (MAC328)",
  "Eid Muabarak dinner set",
  "Festive Home Craft Decor Ramadan Hollow Moroccan Iron Lantern (MAC402)",
  "Hollow Moon Candle Holder – Iron Ramadan Decorative Accent (MAC379)",
  "Resin Decorative Heart-Shaped Cube Incense Burner (MAC401)",
  "Ramadan Incense Burner Creative Tabletop Home Decor (MAC394)",
  "Crescent Ceramic Desktop Incense Burner (MAC400)",
  "Lattafa Khamrah 2-Piece Set For Men – Eau de Parfum & Body Spray",
  "Armaf Yum Yum Women Perfume Women Gift Set 4PCS – Eau de Parfum, Body Lotion, Body Mist & Mini Spray - Sweet Gourmand Fragrance Gift Box",
  "MMU030 24pcs Premium Cosmetic Makeup Brush Set",
  "Makeup Sponge Set with Storage Case – 4/8-Piece Blender Kit for Foundation & Concealer (MMU039)",
  "MMU035 Yizhilian 4pcs Heart Puff Blender Set",
  "Jaida E-Gift Card",
  "Mariam's Collection VIP Gift Card",
  "Gift Wrap My Order",
  "5 Abayas for $99",
  "Mariam's Colection Custom Clothing",
  "Creative Triangle Cake Gift Blind Box Set (MAC387)",
  "Large Satin Scrunchie",
  "Velvet Scrunchie - Black",
  "MAC009 hijab scrunchies, velvet flower hair accessories",
  "Pearl Flower Button Covers | Decorative Shirt Button Clips(MAC358)",
  "MAC014 Pearl Hairpin for Hijab",
  "The Jannah Blouse to Martha’s Closet Enamel Pin",
  "Donation Package  10 Women Abayas for Ramadhan",
  "The Signature Dress Bag",
  // Found 2026-08-12: bare "card" was entirely missing from the vocabulary
  // (only "gift card"/"e-gift card" were covered). "Card Set" is a literal
  // stationery product; "Preload Card" is a top-up/gift card whose title
  // alone has no "gift" in it (its product_type does — see the dedicated
  // product_type test below).
  "Chana Blank Card Set",
  "New Year Preload Card — Prepare for a Mindful Ramadan"
];

const MUST_SURVIVE = [
  // "bikini" was missing from GARMENT_NOUN — real, live title (Turkish;
  // translates to "Buckle Detailed Bikini") was wrongly vetoed as hardware
  // ("Buckle") because nothing recognized "Bikini" as the garment head.
  // Found 2026-08-12 while auditing non-apparel items in the directory.
  "Toka Detaylı Bikini",
  "Abaya With Lantern Sleeves Made Of Crepe Material (MA124)",
  "Women's Prayer Set - Black",
  "2-Piece Prayer Set of Abaya and Hijab-Pink trim",
  "Prayer Abaya Set Chestnut",
  "Portable Prayer Isdal",
  "Lilac Wrap One Piece Salah Prayer Outfit",
  "Cotton Undercap - Eggplant",
  "Syrian Full-Neck Underscarf",
  "Wide Band Cotton Under Scarf",
  "The Original Undercap",
  "Quilted Elastic Hijab Grip Band(MAC433)",
  "Tie Back Hijab Cap - Black",
  "Full Cover up Under cap",
  "basket weave velaclava",
  "Fastened Velaclava",
  "Chain Trim Hijab Cap | Sparkle Knit Balaclava with Chains(MAC375)",
  "Flocked TPU Hijab Grip Headband (Breathable & Lightweight) (MAC303)",
  "Warm Knit Beanie with Looped Scarf Set (MAC299)",
  "No-Slip Scarf Headband",
  "Crystal Diamond Diadema Bridal Headband - Handmade",
  "Silver Diamond Diadema Bridal Headband - Handmade",
  "MAC185 Stylish Rhinestone Tassel Headband",
  "Archive Piece Shimmer Crepe Open Abaya & Belt Set - MP013 (Size M Only)",
  "Elysa Lace Co-ord",
  "Bonnie Lace Set",
  "Matching Hijab & Undercap Bundle - Cocoa",
  "The Culture Starter Set",
  "New Hijabi Starter Kit",
  "Classic Foundations Set - Ivory",
  "Bridal Essentials Set",
  "Zoya Brooch Maxi Dress Ecru",
  "Draped Dress with Jeweled Brooches(MS347)",
  "Belted Wool Coat with Shell Brooch(MS255)",
  "Black Vertical Eyelash Pattern Lace Modest Dress",
  "Floral Lace Hijab with Eyelash Fringe Edge(MH237)",
  "Caramel Pinwheel Bati Dress",
  "Pouch Pocket Corduroy Hoodie",
  "Sepia Durrah Two Piece Buttoned Decor Top & Skirt Set In Cotton",
  "Sky Blue Haniya Abaya Gown - Elegently Wide With Unique Decor - 3 Piece",
  "Bamboo Ring Maxi Dress - Balsam Green",
  "Necklace Abaya",
  "Lila Neck Cover Hijab-Cloud",
  "LM180 Elegant Lantern Sleeve Abaya Dress | Modest Maxi Kaftan for Eid & Evening Wear",
  "MJ004 Women's Nida Scrunchie Cuffs 2-Piece Jilbab",
  "LM079 Plus Size Kaftan Abaya – Shiny Eid & Iftar Batwing Dress with Belt",
  "LM046 Keffiyeh Inspired Modest Kimono Abaya | Belt & Tassels Design",
  "Rayon crinkle - Magnet",
  "Chiffon Instant Hijab with Magnetic Closure(MH202)",
  "Tasbeeh Print",
  "Crocodile Print",
  "Modal Matching Hijab Set- Incense",
  "Essential Modal Hijab - Incense",
  "Kohl Chiffon Silk Hijab",
  "Kohl Kaftan - Final Sale",
  "Everyday Chiffon Hijab - Ballet Slipper",
  "Printed Modal - Sunset Marble",
  "Blue Topaz",
  "Sculpted Button Up Beige",
  "Tonal Chain Stitch Embroidered Set(MS501)",
  "Tote Stitch Scarf Coffee",
  "Sleeveless Vests  with Pockets!",
  "VELA Winter Scarf",
  "Palestine flag keffiyeh scarf (MAC079)",
  "Vibrant Plaid Scarf Faux Wool Warm Shawl with Fringe (MAC334)",
  "Modest Shoulder-Cover Base Layer Versatile Sleeveless Inner Top with Attached Sleeves | One Size (MAC409)",
  "The Jane Kurung In Bask",
  "Denim Blue Aghabani Bisht- Final Sale",
  "Pearl Cream SE Belted Jacket - Final Sale",
  "DALIA Silk-Linen Tied Outerwear",
  "The Heartline Jumper in Sugar Pink",
  "Magnetic Chiffon Instant Hijab | Easy-Wear Anti-Slip Square Scarf with Magnetic Closure (MH152)",
  "Archive Piece Satin Lantern Sleeve Maxi Dress - MP017 (Size S Only)",
  "Purple Lantern Bati Dress",
  "Bamboo Ring Top - Black",
  "Noor Hijab Undercap- Cloud",
  "Matching Hijab & Undercap Bundle - Cloud",
  "Sweater Set with Sleeveless Vest 3-Piece Set(MS032)",
  "Archive Piece Loose Lantern Sleeve Abaya 3-Piece Set - MP055 (Size S Only)",
  "Rayon Shrug with Embroidered Inner & Lantern Sleeves",
  "Instant Hijab | Snap-Close, Earphone-Friendly, Cotton Modal (MH225)"
];

describe('non-apparel veto', () => {
  it.each(MUST_DROP)('drops non-apparel: %s', (title) => {
    expect(isNonApparel({ title }).rejected).toBe(true);
  });

  it.each(MUST_SURVIVE)('keeps real clothing: %s', (title) => {
    const v = isNonApparel({ title });
    expect(v.rejected, v.evidence ? `vetoed by ${v.tier}:${v.reason} on "${v.evidence}"` : '').toBe(false);
  });

  // An AUTHORING check, not a behaviour check: it proves the fixtures above are
  // real catalogue titles rather than invented ones. It is therefore useful at
  // the moment someone adds a fixture, and only a liability afterwards.
  //
  // IT MUST NOT RUN IN CI. The original comment here said raw-products.json was
  // gitignored so this "can only run on a machine that has scraped" — true when
  // written, false since 2026-08-05, when raw was committed to close P0-B and to
  // let the nightly refresh workflow run. That silently turned a local-only
  // check into a CI gate over a dataset a bot rewrites every night, and on
  // 2026-08-07 it did exactly what you would expect: the 05:48 refresh picked up
  // three re-cased titles ("STRAIGHT HIJAB PINS…" -> "Straight Hijab Pins…") and
  // CI went red at 08:24 over a data change, with no code defect at all.
  // Same root cause as §10.15: logic keyed to raw being gitignored.
  //
  // Delisting has the same effect, and delisting is a designed, routine event —
  // so left in CI this fails on a schedule. Skipped there; still runs locally,
  // where a stale fixture is worth knowing about.
  const rawPath = path.join(process.cwd(), 'data', 'raw-products.json');
  const hasRaw = existsSync(rawPath);
  const inCI = !!process.env.CI;

  it.skipIf(!hasRaw || inCI)('every test string still exists in the raw catalogue', () => {
    const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as { title: string }[];
    // Compare case- and whitespace-insensitively. Brands re-case titles
    // constantly; that is not evidence a fixture was invented, which is the only
    // thing this check exists to catch.
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const titles = new Set(raw.map((r) => norm(r.title)));
    const missing = [...MUST_DROP, ...MUST_SURVIVE].filter((t) => !titles.has(norm(t)));
    expect(
      missing,
      'These fixture titles are no longer in the catalogue. If the product was ' +
      'delisted, replace it with a current title that exercises the same rule — ' +
      'do not simply delete the case.',
    ).toEqual([]);
  });

  it('a digital line-item is vetoed on requires_shipping alone', () => {
    expect(isNonApparel({ title: 'Anything At All', requiresShipping: false }).rejected).toBe(true);
  });

  // Found 2026-08-12: VetoInput has always accepted productType/tags, but
  // NOTHING in this file ever read them — every check above only looks at
  // `title`. "New Year Preload Card — Prepare for a Mindful Ramadan"
  // (product_type literally "gift card") happens to also say "Card" in its
  // title, so it's covered by the MUST_DROP fixture above regardless — this
  // test proves the product_type path itself works, for a title that gives
  // NO textual signal at all.
  it('rejects on product_type alone (TIER_0) when the title gives no signal', () => {
    expect(isNonApparel({ title: 'Golden Edition', productType: 'gift card' }).rejected).toBe(true);
  });
  it('does not check tags — measured too noisy (marketing/promo tags like "free-gift-eligible")', () => {
    expect(isNonApparel({
      title: 'Premium Chiffon Hijab', tags: ['free-gift-eligible', 'gift for women'],
    }).rejected).toBe(false);
  });
});
