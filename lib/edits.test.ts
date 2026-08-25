import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { EDITS } from './edits';
import { productsForEdit, missingEditPicks } from './products';
import type { Product } from '@/lib/types';

// Same factory shape lib/specialty.test.ts already uses, so a reader moving
// between the two files does not have to learn a second convention.
const base: Product = {
  id: 'x:1', brandSlug: 'x', brandName: 'X', title: 't', price: 1, currency: 'USD',
  image: 'i', url: 'u', inStock: true, garment: 'dress', community: 'general',
  occasion: [], season: [], activity: [],
};
const p = (title: string, garment: Product['garment'] = 'top'): Product =>
  ({ ...base, title, garment });

const fall = () => {
  const e = EDITS.find((x) => x.slug === 'fall-essentials');
  if (!e) throw new Error('fall-essentials edit is missing from EDITS');
  return e;
};

describe('edits', () => {
  it('every edit has a unique slug', () => {
    const slugs = EDITS.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every edit declares real image ratios', () => {
    for (const e of EDITS) {
      // The box takes the photograph's shape so nothing is cropped; a wrong or
      // missing ratio silently starts cropping instead of failing.
      expect(e.imageRatio, `${e.slug} imageRatio`).toBeGreaterThan(0);
      expect(e.imageMobileRatio, `${e.slug} imageMobileRatio`).toBeGreaterThan(0);
      expect(e.imageWidths.length, `${e.slug} imageWidths`).toBeGreaterThan(0);
      expect(e.imageMobileWidths.length, `${e.slug} imageMobileWidths`).toBeGreaterThan(0);
    }
  });

  it('never renders a credit that is not a real handle', () => {
    for (const e of EDITS) {
      for (const img of e.storyImages ?? []) {
        if (img.credit === null) continue;
        // No @, no spaces, no URL — the component builds instagram.com/<credit>
        // from this directly, so a malformed one is a broken link, not a typo.
        expect(img.credit, `${e.slug} ${img.src}`).toMatch(/^[A-Za-z0-9._]+$/);
      }
    }
  });

  // Data-dependent, so local-only. The nightly refresh delists products most
  // nights (§10.19): as a CI gate this would fail on a schedule over a data
  // change with no code defect. Locally it is exactly the alarm that is wanted
  // — a hand-picked edit losing pieces is otherwise completely silent.
  const hasData = existsSync(path.join(process.cwd(), 'data', 'products.json'));
  const inCI = !!process.env.CI;

  it.skipIf(!hasData || inCI)('every hand-picked product id still resolves', () => {
    for (const e of EDITS) {
      expect(
        missingEditPicks(e),
        `${e.slug}: these picked ids are no longer live. A brand delisted them or ` +
          'they went out of stock — re-pick in /staff/curate rather than deleting the edit.',
      ).toEqual([]);
    }
  });

  // The two rules Tina gave with her picks ("mix the hijabs up dont put them
  // all next ot eachother", and no two pieces from one house side by side).
  // Asserted rather than trusted to the comment beside the list: a re-order is
  // a plausible future edit, and both properties are invisible until someone
  // looks at the rendered row.
  it.skipIf(!hasData || inCI)('hand-picked edits never repeat a house back to back', () => {
    for (const e of EDITS) {
      if (!e.productIds?.length) continue;
      const items = productsForEdit(e);
      const clashes = items
        .map((p, i) => (i > 0 && p.brandSlug === items[i - 1].brandSlug ? `${i}: ${p.brandName}` : null))
        .filter(Boolean);
      expect(clashes, `${e.slug}: same house twice in a row`).toEqual([]);
    }
  });

  it.skipIf(!hasData || inCI)('mixed hand-picked edits never put two hijabs back to back', () => {
    for (const e of EDITS) {
      if (!e.productIds?.length) continue;
      const items = productsForEdit(e);
      // Only meaningful for a MIXED edit. /edits/jersey-hijabs is entirely
      // hijabs by definition, so the rule is unsatisfiable there rather than
      // broken — asserting it would have failed the moment that edit was
      // curated, which is not the same thing as finding a defect.
      if (items.every((p) => p.garment === 'hijab')) continue;
      const clashes = items
        .map((p, i) => (i > 0 && p.garment === 'hijab' && items[i - 1].garment === 'hijab' ? `${i}: ${p.title}` : null))
        .filter(Boolean);
      expect(clashes, `${e.slug}: hijabs bunched together`).toEqual([]);
    }
  });

  it.skipIf(!hasData || inCI)('every edit resolves to at least one product', () => {
    for (const e of EDITS) {
      expect(productsForEdit(e).length, `${e.slug} has no products`).toBeGreaterThan(0);
    }
  });
  // Titles marked REAL are literal catalogue titles, verified against
  // data/products.json on 2026-08-25 — these are the cases that would have
  // shipped broken (see the spec's "false positives found" section).
  //
  // A few are CONSTRUCTED boundary probes, marked as such, for cases the
  // catalogue does not currently contain. That distinction is worth keeping
  // honest: §10.19 is about a test whose fixtures were asserted to be real
  // catalogue titles, and a constructed probe passed off as a real one makes
  // the whole file's provenance untrustworthy.
  describe('fall-essentials guards', () => {
    it('excludes cape-SLEEVE garments, which are not capes', () => {
      // 227 in-stock titles match /\bcape\b/ and almost all are these.
      expect(fall().match(p('Crystal Beaded Waist Cape Sleeve Maxi Dress(MS499)', 'dress'))).toBe(false);
      expect(fall().match(p('Lace Butterfly Cape Top in Sky Blue'))).toBe(false);
      expect(fall().match(p('Cape Swim Dress - Earth', 'swim'))).toBe(false);
    });

    it('excludes caps, undercaps and grips, which are not hijabs', () => {
      expect(fall().match(p('Velvet Cap Grip - Rust', 'hijab'))).toBe(false);
      expect(fall().match(p('Full Coverage Hijab Cap - Mulberry', 'hijab'))).toBe(false);
      expect(fall().match(p('Clay - Adjustable Tie Underscarf', 'hijab'))).toBe(false);
    });

    it('does NOT exclude a cap-SLEEVE garment by way of the cap rule', () => {
      // The negative control for the rule above: /\bcap\b/ would have killed
      // every cap-sleeve piece in the catalogue.
      expect(fall().match(p('Cap Sleeve Striped Blouse'))).toBe(true); // CONSTRUCTED
    });

    it('excludes outerwear that is too thick — Tina: "outerwear, but not too thick"', () => {
      expect(fall().match(p('Teddy Borg Oversized Coat'))).toBe(false);   // CONSTRUCTED
      expect(fall().match(p('Padded Puffer Gilet'))).toBe(false);         // CONSTRUCTED
    });

    it('keeps quilted gilets, which are the moodboard piece', () => {
      // Negative control for the rule above: `quilted` was in TOO_THICK on the
      // first pass and removed — moodboard panel 3 is a quilted wool gilet.
      expect(fall().match(p('Quilted Sleeveless Vest 9518'))).toBe(true);
    });

    it('excludes t-shirts even when the title says long-sleeved', () => {
      expect(fall().match(p('Long-sleeved T-shirt in Aube polo material'))).toBe(false);
      expect(fall().match(p('Striped t-shirt'))).toBe(false);
    });
  });
  describe('fall-essentials palette', () => {
    // One literal in-stock catalogue title per family, checked 2026-08-25.
    it('accepts a hijab from each of the six families', () => {
      expect(fall().match(p('Deep Mulberry Modal Lace Hijab', 'hijab'))).toBe(true);   // burgundy
      expect(fall().match(p('Espresso Bamboo Jersey Hijab', 'hijab'))).toBe(true);     // chocolate
      expect(fall().match(p('The Khaki Jersey Hijab', 'hijab'))).toBe(true);           // olive
      expect(fall().match(p('Taupe Latte Jersey Hijab', 'hijab'))).toBe(true);         // camel
      expect(fall().match(p('Bone White Jersey Hijab', 'hijab'))).toBe(true);          // cream
      expect(fall().match(p('Solid Modal - Burnt Clay', 'hijab'))).toBe(true);         // rust
    });

    it('rejects a hijab outside the palette', () => {
      expect(fall().match(p('Powder Blue Lace', 'hijab'))).toBe(false);
      expect(fall().match(p('Jasmine White Lace', 'hijab'))).toBe(false);
      expect(fall().match(p('Premium Soft Jersey Hijab [Gree]', 'hijab'))).toBe(false);
    });

    it('does not read "almond green" as camel', () => {
      // Literal title. `almond` was in the camel family on the first pass and
      // was removed for exactly this: the piece is green.
      expect(fall().match(p('Almond green premium jersey hijab', 'hijab'))).toBe(false);
    });

    it('does not read "butter yellow" as cream', () => {
      // Butter yellow is the spring colour, not one of Tina's six.
      expect(fall().match(p('Satin Scarf Dress SS26 Butter Yellow', 'hijab'))).toBe(false);
    });

    it('does not find a colour inside a longer word', () => {
      // \b regression guards. Each of these contains a palette term as a
      // substring and must not match on it.
      expect(fall().match(p('Herringbone Wrap Hijab', 'hijab'))).toBe(false);   // CONSTRUCTED, ...bone
      expect(fall().match(p('Tartan Check Hijab', 'hijab'))).toBe(false);       // CONSTRUCTED, ...tan
      expect(fall().match(p('Honeycomb Weave Hijab', 'hijab'))).toBe(false);    // CONSTRUCTED, honey...
    });
  });
  describe('fall-essentials buckets', () => {
    it('takes the layer: gilets, vests, knits, trench, corduroy, real capes', () => {
      expect(fall().match(p('Oversized Gilet'))).toBe(true);
      expect(fall().match(p('Tailored Gilet Set', 'set'))).toBe(true);
      expect(fall().match(p('Laurel Vest'))).toBe(true);
      expect(fall().match(p('The Icon knitted dress in white', 'dress'))).toBe(true);
      expect(fall().match(p('Corduroy Two Piece Set \u2013 Dark Grey', 'set'))).toBe(true);
      expect(fall().match(p('Corduroy Abaya-CLEARANCE', 'abaya'))).toBe(true);
    });

    it('takes the top: blouses, stripes, long sleeves, shirts', () => {
      expect(fall().match(p('Basic Striped Shirt'))).toBe(true);
      expect(fall().match(p('Ruffle Blouse - Taupe'))).toBe(true);
      expect(fall().match(p('Blouse With Bow'))).toBe(true);
    });

    it('takes the bottom: fall trousers and A-line/balloon/satin/denim skirts', () => {
      expect(fall().match(p('Essential Wool Trousers', 'trousers'))).toBe(true);
      expect(fall().match(p('Fold Up Jeans', 'trousers'))).toBe(true);
      expect(fall().match(p('Pleated Satin Skirt', 'skirt'))).toBe(true);
      expect(fall().match(p('Espresso Satin Skirt', 'skirt'))).toBe(true);
    });

    it('does not take every trouser in the catalogue', () => {
      // The naive rule was 1,392 pieces — effectively all of them, summer
      // linen included. A fall signal is required.
      expect(fall().match(p('Basic Everyday Trousers', 'trousers'))).toBe(false);  // CONSTRUCTED
      expect(fall().match(p('Linen Palazzo Trousers', 'trousers'))).toBe(false);   // CONSTRUCTED
    });

    it('does not take a summer skirt', () => {
      expect(fall().match(p('Pleated Chiffon Maxi Skirt', 'skirt'))).toBe(false); // CONSTRUCTED
    });

    it('never takes swimwear', () => {
      expect(fall().match(p('Ribbed Knit Burkini - Olive', 'swim'))).toBe(false); // CONSTRUCTED
    });
  });
});
