import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isSwim, isActivewear, isLayering, isJilbab, isSpecialty, layeringSubtype, isOuterwear, outerwearSubtype } from './specialty';
import type { Product } from '@/lib/types';

const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};

const p = (title: string, garment: Product['garment'] = 'top', extra: Partial<Product> = {}): Product =>
  ({ ...base, title, garment, ...extra });

describe('isSwim', () => {
  it('matches burkini/swim titles', () => {
    expect(isSwim(p('Full Coverage Burkini - Black'))).toBe(true);
    expect(isSwim(base)).toBe(false);
  });
});

describe('isActivewear', () => {
  it('matches sport/gym vocabulary in the title regardless of garment', () => {
    expect(isActivewear(p('Sports Hijab - Black', 'hijab'))).toBe(true);
    expect(isActivewear(p('Yoga Leggings', 'trousers'))).toBe(true);
  });
  it('falls back to the noisy activity flag only on activewear-typical garments', () => {
    expect(isActivewear({ ...p('Plain Hijab', 'hijab'), activity: ['gym'] })).toBe(false);
    expect(isActivewear({ ...p('Plain Leggings', 'trousers'), activity: ['gym'] })).toBe(true);
  });
  it('never overlaps swim', () => {
    expect(isActivewear(p('Swim Leggings', 'trousers'))).toBe(false);
  });
  it('never overlaps a confirmed layering piece, even when the feed tags it "gym"', () => {
    // ria-miranda's ri-flex base-layer line carries this noisy tag on the real feed.
    expect(isActivewear(p('Comfy Sleeveless Top', 'top', { brandSlug: 'ria-miranda', activity: ['gym'] }))).toBe(false);
  });
  it('still trusts the gym tag for a real activewear top from the same brand', () => {
    expect(isActivewear(p('Shera Inner Tee', 'top', { brandSlug: 'ria-miranda', activity: ['gym'] }))).toBe(true);
  });
});

// Real catalogue titles, checked against raw-products.json 2026-08-11 — the
// same evidence behind the vocabulary in specialty.ts. Positives cover every
// brand the regex was built from; negatives are the near-miss cases that
// motivated the exclusions (hijab/underscarf/bonnet, and a full-length
// "base layer dress" that is still a complete standalone garment).
describe('isLayering', () => {
  it('matches real layering-piece titles', () => {
    expect(isLayering(p('Black Neck Cover', 'dress'))).toBe(true); // ilovemodesty, misfiled as dress
    expect(isLayering(p('Long Neck Cover - White', 'set'))).toBe(true); // nasiba, misfiled as set
    expect(isLayering(p('Jersey High Neck Singlet Top - 3 Black'))).toBe(true); // nour-al-houda
    expect(isLayering(p('Core Cotton Body Top - Light Grey'))).toBe(true); // nour-al-houda
    expect(isLayering(p('Sema Basic Body Top - Rose'))).toBe(true); // modern-hijabi
    expect(isLayering(p('Riflex Sleeveless Inner Top'))).toBe(true); // ria-miranda
    expect(isLayering(p('All Purpose Base layer'))).toBe(true); // zaskia-sungkar
    expect(isLayering(p('Modest Shoulder-Cover Base Layer Versatile Sleeveless Inner Top with Attached Sleeves'))).toBe(true); // mariams
    expect(isLayering(p('Body - Arm Sleeves', 'hijab'))).toBe(true); // losyana, misfiled as hijab
    expect(isLayering(p('Khaki One Piece Sleeves'))).toBe(true); // ilovemodesty, shrug-shaped sleeve extender
    expect(isLayering(p('Fleurel Shirt Extender'))).toBe(true); // ria-miranda
    expect(isLayering(p('Second Skin Top Ebony'))).toBe(true); // aab
    expect(isLayering(p('Peter Can Collar Poplin Under Shirt'))).toBe(true); // touche-prive
    expect(isLayering(p('Core Top - Taupe'))).toBe(true); // nour-al-houda, $23, same family as Core Cotton Body Top
    expect(isLayering(p('Luxe Basic Top - Fawn'))).toBe(true); // nour-al-houda, $8, shot peeking under a hijab
    expect(isLayering(p('Comfy Sleeveless Top', 'top', { brandSlug: 'ria-miranda' }))).toBe(true); // ri-flex line
    expect(isLayering(p('Comfy Long Sleeve Top', 'top', { brandSlug: 'ria-miranda' }))).toBe(true);
    expect(isLayering(p('Comfy Short Sleeve Top', 'top', { brandSlug: 'ria-miranda' }))).toBe(true);
    expect(isLayering(p('Royal Blue Cropped Long Sleeve Body Shirt'))).toBe(true); // ilovemodesty, midriff-baring crop top meant to be worn under something
    expect(isLayering(p('Black Cropped Long Sleeve Body Shirt'))).toBe(true); // ilovemodesty
  });

  it('does not pull ilovemodesty\'s UNCROPPED "Full Body Shirt" line — a real, complete standalone top', () => {
    expect(isLayering(p('Black High Neck Long Sleeve Full Body Shirt'))).toBe(false);
    expect(isLayering(p('Dark Brown Long Sleeve Full Body Shirt'))).toBe(false);
  });

  it('scopes the ria-miranda "Comfy ... Top" match to that brand only — the phrase is generic', () => {
    expect(isLayering(p('Comfy Sleeveless Top', 'top', { brandSlug: 'some-other-brand' }))).toBe(false);
  });

  it('does not treat a real branded activewear top as layering just because its name says "Inner"', () => {
    expect(isLayering(p('Shera Inner Tee', 'top', { brandSlug: 'ria-miranda' }))).toBe(false); // zip-collar, logo-printed, styled as a full athletic outfit
  });

  it('does not pull BNAH\'s visually near-identical but standalone "basics" siblings', () => {
    expect(isLayering(p('Core Ribbed Tank - Espresso'))).toBe(false); // branded, $40, styled as a going-out tank
    expect(isLayering(p('Comfort Top - Dove'))).toBe(false); // $28, styled as a complete outfit
    expect(isLayering(p('Modal Ruched Top - Black'))).toBe(false); // $61, fashion-forward draping
    expect(isLayering(p('Everyday Crew Neck Top - Navy'))).toBe(false); // styled as a complete outfit
    expect(isLayering(p('Everyday Relaxed Top - Walnut'))).toBe(false); // oversized tunic, styled as a complete outfit
    expect(isLayering(p('Tencel Tank Top - White'))).toBe(false); // tunic-length, worn over other clothing
    expect(isLayering(p('Cotton Contour Top - Sage'))).toBe(false); // tailored, styled as a complete outfit
  });

  it('does not match a real one-piece garment that happens to have sleeves', () => {
    expect(isLayering(p('Black One Piece Swimsuit', 'swim'))).toBe(false);
  });

  it('keeps the full-length "Second Skin" leggings and slip dress in their own lanes', () => {
    expect(isLayering(p('Second Skin Leggings Ebony', 'trousers'))).toBe(false); // aab
    expect(isLayering(p('Second Skin Full Slip Ebony', 'dress'))).toBe(false); // aab
  });

  it('does not treat "cover-up" as a layering signal — it names real cardigans, abayas and swim cover-ups', () => {
    expect(isLayering(p('Cardigan Cover Up - Ocean Ripple'))).toBe(false); // veiled, a real standalone cardigan
    expect(isLayering(p('V-Neck Abaya Cardigan Robe | Bat Sleeve Kimono Cover-Up With Pearl Buttons', 'abaya'))).toBe(false); // mariams
  });

  it('does not match hijab/underscarf/bonnet titles, even when they cover the neck', () => {
    expect(isLayering(p('Lila Neck Cover Hijab-Black', 'hijab'))).toBe(false); // zahraa
    expect(isLayering(p('Black Neck Cover Underscarf In Cotton - Soft Undercap Bonnet', 'hijab'))).toBe(false); // bazar-al-haya
  });

  it('does not pull a real, standalone top out of its own lane just for mentioning a neckline', () => {
    expect(isLayering(p('Modal Turtleneck Top'))).toBe(false);
    expect(isLayering(p('Comfort High Neck Top'))).toBe(false);
  });

  // Tina flagged this 2026-08-12: styled and photographed as a complete
  // turtleneck outfit with a skirt, not a hidden base layer. "Body Top" is a
  // reliable signal on its own (see the 20 other published hits, all
  // plain/unbranded basics), but "ruched" signals deliberate, visible
  // styling — the opposite of something meant to disappear under another
  // garment.
  it('does not pull "Ruched Body Top" — styling wins over the "body top" phrase', () => {
    expect(isLayering(p('Ruched Body Top', 'top', { brandSlug: 'modesty-in-style' }))).toBe(false);
  });

  it('still trusts the other "body top" titles that have no styling descriptor', () => {
    expect(isLayering(p('Jersey Body Top - Espresso', 'top', { brandSlug: 'nour-al-houda' }))).toBe(true);
    expect(isLayering(p('Sema Basic Body Top - Rose', 'top', { brandSlug: 'modern-hijabi' }))).toBe(true);
  });

  it('trusts a brand explicitly naming its own piece a base-layer top', () => {
    expect(isLayering(p('Fleece-Lined Mock Neck Sweater | Thick Winter Base Layer Top(MS159)'))).toBe(true); // mariams
  });

  it('keeps a full-length base-layer DRESS in its dress lane — it is still a complete garment', () => {
    expect(isLayering(p('Lazy Style Polo Collar Knit Maxi Dress | Thick Sweater Base Layer Dress(MS157)', 'dress'))).toBe(false);
    expect(isLayering(p('Sleeveless Slip Maxi Dress | Relaxed Fit Base Layer Abaya Dress(MS190)', 'abaya'))).toBe(false);
  });

  // Tina's call 2026-08-12: move every "Under Dress"/"Inner Dress"/
  // "Underdress" item to Layering Basics, regardless of styling or price —
  // made after seeing kamin's sheer black mesh "Ruqa Underdress" (clearly
  // needs a layer over it) and chi-ka's $245 "Under Dress" (photographed as
  // a complete standalone look) side by side.
  it('matches standalone "under dress"/"inner dress" pieces regardless of price or styling', () => {
    expect(isLayering(p('The Ruqa Underdress | Black', 'dress'))).toBe(true); // kamin, sheer mesh
    expect(isLayering(p('Under Dress in Satin Navy', 'dress', { brandSlug: 'chi-ka' }))).toBe(true); // chi-ka, 900 AED, styled as a complete look
    expect(isLayering(p('Long Sleeve Satin Inner Dress (MA061)', 'dress'))).toBe(true); // mariams
    expect(isLayering(p('Knit Underdress', 'dress', { brandSlug: 'vela' }))).toBe(true);
    expect(isLayering(p('Modest Wear Long Under Dress Slip On Skirt', 'skirt'))).toBe(true); // eastessence
  });

  it('does not pull a bundled abaya/kimono SET LISTING just because it describes an included inner dress', () => {
    // Every garment:'abaya' hit for this phrase, checked 2026-08-12, is a
    // multi-piece set sold as ONE product — moving the whole listing into
    // an accessories page would remove a real, often expensive abaya.
    expect(isLayering(p('The Shamsa Abaya & Underdress | Black', 'abaya', { brandSlug: 'kamin' }))).toBe(false); // 520 AED complete set
    expect(isLayering(p('Luxury Crystal Embellished Cape Abaya Set with Inner Dress (MA390)', 'abaya'))).toBe(false); // mariams
    expect(isLayering(p('2pcs Set Kimono + Underdress Linneneffect', 'abaya', { brandSlug: 'mukistore' }))).toBe(false);
  });

  // Tina flagged this 2026-08-12: one complete floral maxi dress, not two
  // pieces. Raw feed title is Dutch ("Vaste Binnenjurk"), translated to
  // "Fixed Inner Dress" at publish time — "vast" = fixed/attached, i.e. the
  // lining is sewn INTO this one garment as a construction detail, the same
  // "bundled, not a separate accessory" situation as the abaya set listings
  // above, just on a garment:'dress' the `!== 'abaya'` guard can't catch.
  it('does not pull a dress whose "inner dress" is a sewn-in lining, not a separate accessory', () => {
    expect(isLayering(p('Maxi Dress with Floral Print and Fixed Inner Dress', 'dress', { brandSlug: 'mukistore' }))).toBe(false);
  });
});

// The "Type" filter on /layering-basics (Tina's call 2026-08-12, after
// reviewing the natural split of the 146 items published at the time).
describe('layeringSubtype', () => {
  it('returns null for anything that is not a layering piece at all', () => {
    expect(layeringSubtype(p('Everyday Relaxed Top - Walnut'))).toBe(null);
    expect(layeringSubtype(base)).toBe(null);
  });

  it('sorts each confirmed layering piece into exactly the right group', () => {
    expect(layeringSubtype(p('Black Neck Cover', 'dress'))).toBe('neck-cover');
    expect(layeringSubtype(p('Khaki One Piece Sleeves'))).toBe('sleeve-extender');
    expect(layeringSubtype(p('Royal Blue Cropped Long Sleeve Body Shirt'))).toBe('cropped-body-shirt');
    expect(layeringSubtype(p('The Ruqa Underdress | Black', 'dress'))).toBe('under-dress');
    expect(layeringSubtype(p('Core Top - Taupe'))).toBe('base-layer-top');
    expect(layeringSubtype(p('Second Skin Top Ebony'))).toBe('base-layer-top');
    expect(layeringSubtype(p('Comfy Sleeveless Top', 'top', { brandSlug: 'ria-miranda' }))).toBe('base-layer-top');
  });

  // Split out 2026-08-12 after Tina flagged these as visually nothing like a
  // sleeve extender: checked the photos, and every one is a waist-tied wrap
  // panel that hangs down to extend a top's HEM, not its sleeves. "Extender"
  // alone was a false-friend signal — different body part, different group.
  it('puts "Shirt Extender" pieces in their own group, not sleeve-extender', () => {
    expect(layeringSubtype(p('Fleurel Shirt Extender', 'top', { brandSlug: 'ria-miranda' }))).toBe('shirt-extender');
    expect(layeringSubtype(p('Elva Shirt Extender', 'top', { brandSlug: 'ria-miranda' }))).toBe('shirt-extender');
    expect(layeringSubtype(p('Lisa Shirt Extender', 'top', { brandSlug: 'ria-miranda' }))).toBe('shirt-extender');
    expect(layeringSubtype(p('Linaya Shirt Extender', 'top', { brandSlug: 'ria-miranda' }))).toBe('shirt-extender');
    expect(layeringSubtype(p('Jaida Modest Shirt Extender Slip — Cotton Layering Skirt', 'skirt', { brandSlug: 'jaida' }))).toBe('shirt-extender');
  });

  it('every currently-published layering item gets a real subtype, never a silent null', () => {
    // A null here would mean an item is on /layering-basics but invisible to
    // every option in its own "Type" filter — worse than not having the
    // filter at all, since it would look like the item simply isn't there.
    const raw = readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8');
    const products = JSON.parse(raw) as Product[];
    const layeringItems = products.filter((prod) => isLayering(prod));
    const missing = layeringItems.filter((prod) => layeringSubtype(prod) === null);
    expect(missing.map((m) => m.title)).toEqual([]);
  });
});

describe('isJilbab', () => {
  it('matches jilbab-titled products regardless of garment or whether it is prayer-specific', () => {
    expect(isJilbab(p('2-Piece Prayer Set (Jilbab)', 'abaya'))).toBe(true); // explicitly a prayer garment
    expect(isJilbab(p('One-Piece Jilbab / Prayer Dress With Elasticated Sleeves - Navy', 'abaya'))).toBe(true);
    expect(isJilbab(p('Black Grey Corduroy Jilbab', 'abaya'))).toBe(true); // eastessence, a fashion abaya using the regional name
    expect(isJilbab(p('Denim Jacket Style Jilbabs', 'top'))).toBe(true); // eastessence
  });
  it('does not match unrelated titles', () => {
    expect(isJilbab(p('Black Open Abaya', 'abaya'))).toBe(false);
  });
});

describe('isOuterwear', () => {
  it('is true for real catalogue titles, garment top', () => {
    expect(isOuterwear(p('Maren Vest'))).toBe(true); // ria-miranda
    expect(isOuterwear(p('Jacquard Blazer Jacket - Black'))).toBe(true); // nihan
    expect(isOuterwear(p('Fitted Cardigan-Beige'))).toBe(true); // bemu
    expect(isOuterwear(p('Lameesa Lyocell Trench Coat - Black'))).toBe(true); // nour-al-houda
    expect(isOuterwear(p('Belted Double Breasted Angora Coat - Mink'))).toBe(true); // nihan
  });

  it('is false when the same words appear on a non-top garment (styling descriptor, not the actual piece)', () => {
    expect(isOuterwear(p('Capo Blazer Dress', 'dress'))).toBe(false); // zayda — a dress, not a blazer
    expect(isOuterwear(p('The Oversized Blazer Abaya In Sage Green', 'abaya'))).toBe(false); // madiha
    expect(isOuterwear(p('Denim Vest Dress 9420', 'dress'))).toBe(false); // beyza
    expect(isOuterwear(p('Vest And Skirt Set', 'skirt'))).toBe(false); // touche-prive
    expect(isOuterwear(p('Sage Green Bell Sleeve Cardigan Set', 'set'))).toBe(false); // ilovemodesty
    expect(isOuterwear(p('Ahd Abaya (Trench Coat)', 'abaya'))).toBe(false); // bait-hanayen
  });

  it('is false for a top with none of the four words', () => {
    expect(isOuterwear(p('Basic Long Sleeve Top'))).toBe(false);
  });

  it('does not overlap with isLayering — layering wins when a title could match both', () => {
    expect(isOuterwear(p('Under Shirt With Cardigan Detail'))).toBe(false);
    expect(isLayering(p('Under Shirt With Cardigan Detail'))).toBe(true);
  });
});

describe('outerwearSubtype', () => {
  it('returns null for a non-outerwear product', () => {
    expect(outerwearSubtype(p('Basic Long Sleeve Top'))).toBeNull();
    expect(outerwearSubtype(p('Capo Blazer Dress', 'dress'))).toBeNull();
  });

  it('picks the single matching subtype for an unambiguous title', () => {
    expect(outerwearSubtype(p('Maren Vest'))).toBe('vest');
    expect(outerwearSubtype(p('Jacquard Blazer Jacket - Black'))).toBe('blazer');
    expect(outerwearSubtype(p('Fitted Cardigan-Beige'))).toBe('cardigan');
    expect(outerwearSubtype(p('Lameesa Lyocell Trench Coat - Black'))).toBe('coat');
  });

  it("picks the RIGHTMOST matching word when a title names more than one (the head noun, in this catalogue's naming convention)", () => {
    expect(outerwearSubtype(p('Tailored Blazer Coat'))).toBe('coat'); // real title
    expect(outerwearSubtype(p('2-in-1 Detachable Vest Trench Coat'))).toBe('coat'); // real title
    expect(outerwearSubtype(p('Belted Blazer Vest - Black'))).toBe('vest'); // real title, nihan
    expect(outerwearSubtype(p('Tree Bark Knitwear Blazer Cardigan - Camel'))).toBe('cardigan'); // real title
  });

  it('checks only the part of the title BEFORE a "|" first, so a marketing subtitle cannot override the actual product name', () => {
    // Real title, mariams: primary name "Sleeveless Cape Vest" is a vest;
    // "Gilet Coat" after the pipe is a descriptive subtitle, not the name.
    expect(outerwearSubtype(p('Sleeveless Cape Vest | Minimalist Long Wool-Blend Gilet Coat (MS204)'))).toBe('vest');
    // Real title, mariams: primary name is a cardigan.
    expect(outerwearSubtype(p('Waffle Knit Robe Cardigan | Belted Oversized Sweater Coat(MS198)'))).toBe('cardigan');
  });

  it('falls back to the whole title (rightmost match) when nothing before the pipe matches', () => {
    expect(outerwearSubtype(p('Autumn Collection | Classic Wool Coat'))).toBe('coat');
  });
});

describe('isSpecialty', () => {
  it('includes layering pieces alongside swim and activewear', () => {
    expect(isSpecialty(p('Black Neck Cover', 'dress'))).toBe(true);
  });
  it('includes jilbab-titled products', () => {
    expect(isSpecialty(p('2-Piece Prayer Set (Jilbab)', 'abaya'))).toBe(true);
  });
  it('includes outerwear pieces', () => {
    expect(isSpecialty(p('Maren Vest'))).toBe(true);
  });
});

// A staff forcedLane override (lib/types.ts) is authoritative and
// exclusive — it short-circuits classification rather than adding to it,
// so a corrected item can't simultaneously match two lanes.
describe('forcedLane override', () => {
  it('forces isActivewear true regardless of title/garment', () => {
    expect(isActivewear(p('Plain Cotton Dress', 'dress', { forcedLane: 'modest-activewear' }))).toBe(true);
  });
  it('forces isLayering true regardless of title/garment', () => {
    expect(isLayering(p('Plain Cotton Dress', 'dress', { forcedLane: 'layering-basics' }))).toBe(true);
  });
  it('a forced-activewear item stops matching isLayering, even if its title would', () => {
    expect(isLayering(p('Black Neck Cover', 'dress', { forcedLane: 'modest-activewear' }))).toBe(false);
  });
  it('a forced-layering item stops matching isActivewear, even if its title would', () => {
    expect(isActivewear(p('Yoga Leggings', 'trousers', { forcedLane: 'layering-basics' }))).toBe(false);
  });
  it('forces isSwim false even on garment: swim, once forced elsewhere', () => {
    expect(isSwim(p('Full Coverage Burkini', 'swim', { forcedLane: 'modest-activewear' }))).toBe(false);
  });
  it('layeringSubtype honours an explicit forcedLayeringSubtype', () => {
    expect(
      layeringSubtype(
        p('Plain Cotton Dress', 'dress', { forcedLane: 'layering-basics', forcedLayeringSubtype: 'under-dress' }),
      ),
    ).toBe('under-dress');
  });
  it('layeringSubtype falls back to title-guessing when forced into the lane with no explicit subtype', () => {
    expect(layeringSubtype(p('Black Neck Cover', 'dress', { forcedLane: 'layering-basics' }))).toBe('neck-cover');
  });
  it('a forced-activewear item is specialty; a forced-layering item is specialty', () => {
    expect(isSpecialty(p('Plain Cotton Dress', 'dress', { forcedLane: 'modest-activewear' }))).toBe(true);
    expect(isSpecialty(p('Plain Cotton Dress', 'dress', { forcedLane: 'layering-basics' }))).toBe(true);
  });
  it('forces isOuterwear true regardless of title/garment', () => {
    expect(isOuterwear(p('Plain Cotton Dress', 'dress', { forcedLane: 'outerwear' }))).toBe(true);
  });
  it('a forced-outerwear item stops matching isLayering, even if its title would', () => {
    expect(isLayering(p('Under Shirt With Cardigan Detail', 'top', { forcedLane: 'outerwear' }))).toBe(false);
  });
  it('a forced-layering item stops matching isOuterwear, even if its title would', () => {
    expect(isOuterwear(p('Belted Double Breasted Angora Coat', 'top', { forcedLane: 'layering-basics' }))).toBe(false);
  });
});
