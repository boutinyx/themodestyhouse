import { describe, it, expect } from 'vitest';
import { isSwim, isActivewear, isLayering, isSpecialty } from './specialty';
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

  it('trusts a brand explicitly naming its own piece a base-layer top', () => {
    expect(isLayering(p('Fleece-Lined Mock Neck Sweater | Thick Winter Base Layer Top(MS159)'))).toBe(true); // mariams
  });

  it('keeps a full-length base-layer DRESS in its dress lane — it is still a complete garment', () => {
    expect(isLayering(p('Lazy Style Polo Collar Knit Maxi Dress | Thick Sweater Base Layer Dress(MS157)', 'dress'))).toBe(false);
    expect(isLayering(p('Sleeveless Slip Maxi Dress | Relaxed Fit Base Layer Abaya Dress(MS190)', 'abaya'))).toBe(false);
  });
});

describe('isSpecialty', () => {
  it('includes layering pieces alongside swim and activewear', () => {
    expect(isSpecialty(p('Black Neck Cover', 'dress'))).toBe(true);
  });
});
