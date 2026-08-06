import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { formatPrice } from './price';

// These assert EXACT output strings on purpose. formatPrice runs both during
// prerender (Node) and during hydration (browser); if an environment's ICU data
// differs, the two disagree and React throws a hydration mismatch. Exact
// assertions turn that into a loud test failure instead of a silent UI bug.
// See ADR-0002.
//
// NBSP: Intl separates a bare currency CODE from the number with U+00A0, not a
// normal space — deliberate typography, so "MYR" can't wrap away from its
// number. Currencies with a symbol ($, £, €, A$, CA$) have no separator at all.
const NB = ' ';

/** Every currency the catalogue is allowed to contain. Adding a brand with a new
 *  currency must fail here until someone adds an explicit expectation below —
 *  that is the point. */
const KNOWN = ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'MYR', 'EGP', 'AED', 'INR'];

describe('formatPrice', () => {
  it('formats each catalogue currency in its native form', () => {
    expect(formatPrice(44.95, 'USD')).toBe('$44.95');
    expect(formatPrice(44.95, 'GBP')).toBe('£44.95');
    expect(formatPrice(44.95, 'EUR')).toBe('€44.95');
    expect(formatPrice(44.95, 'AUD')).toBe('A$44.95');
    expect(formatPrice(44.95, 'CAD')).toBe('CA$44.95');
    expect(formatPrice(44.95, 'MYR')).toBe(`MYR${NB}44.95`);
    expect(formatPrice(44.95, 'EGP')).toBe(`EGP${NB}44.95`);
    expect(formatPrice(44.95, 'AED')).toBe(`AED${NB}44.95`);
    expect(formatPrice(44.95, 'INR')).toBe('₹44.95');
  });

  it('drops the decimals on whole numbers', () => {
    expect(formatPrice(120, 'GBP')).toBe('£120');
    expect(formatPrice(120, 'USD')).toBe('$120');
    expect(formatPrice(189, 'AUD')).toBe('A$189');
  });

  it('keeps cents when the price has them', () => {
    expect(formatPrice(89.9, 'EUR')).toBe('€89.90');
    expect(formatPrice(0.5, 'USD')).toBe('$0.50');
  });

  it('groups thousands', () => {
    expect(formatPrice(1450, 'EGP')).toBe(`EGP${NB}1,450`);
    expect(formatPrice(1450.25, 'USD')).toBe('$1,450.25');
  });

  it('degrades instead of throwing on a malformed currency code', () => {
    // NOTE: Intl accepts any well-formed 3-letter code (even "XYZ"), so the
    // fallback is only reached by genuinely invalid input.
    expect(() => formatPrice(10, 'not-a-code')).not.toThrow();
    expect(formatPrice(44.95, 'not-a-code')).toBe('not-a-code 44.95');
  });

  it('survives a non-finite amount', () => {
    expect(formatPrice(NaN, 'USD')).toBe('$0');
  });

  it('the published catalogue contains no currency without an expectation here', () => {
    const products = JSON.parse(
      readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'),
    ) as { price: number; currency: string }[];
    const codes = [...new Set(products.map((p) => p.currency))].sort();
    expect(codes.length).toBeGreaterThan(0);
    const untested = codes.filter((c) => !KNOWN.includes(c));
    expect(untested, 'add an explicit formatPrice expectation for these').toEqual([]);
  });
});
