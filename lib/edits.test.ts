import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { EDITS } from './edits';
import { productsForEdit, missingEditPicks } from './products';

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

  it.skipIf(!hasData || inCI)('hand-picked edits never put two hijabs back to back', () => {
    for (const e of EDITS) {
      if (!e.productIds?.length) continue;
      const items = productsForEdit(e);
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
});
