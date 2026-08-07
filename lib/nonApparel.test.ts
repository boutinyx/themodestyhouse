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
  "The Signature Dress Bag"
];

const MUST_SURVIVE = [
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

  // raw-products.json is gitignored (it is the local scrape cache), so this
  // check can only run on a machine that has scraped. It must SKIP rather than
  // fail on a clean clone or in CI — verified against a fresh `git clone`.
  const rawPath = path.join(process.cwd(), 'data', 'raw-products.json');
  const hasRaw = existsSync(rawPath);

  it.skipIf(!hasRaw)('every test string still exists in the raw catalogue', () => {
    const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as { title: string }[];
    const titles = new Set(raw.map((r) => r.title));
    const missing = [...MUST_DROP, ...MUST_SURVIVE].filter((t) => !titles.has(t));
    expect(missing).toEqual([]);
  });

  it('a digital line-item is vetoed on requires_shipping alone', () => {
    expect(isNonApparel({ title: 'Anything At All', requiresShipping: false }).rejected).toBe(true);
  });
});
