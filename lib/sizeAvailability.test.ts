import { describe, it, expect } from 'vitest';
import { sizeRank, onlyLargeSizesLeft, SIZE_FLOOR } from './sizeAvailability';

/**
 * Tina's rule, 2026-08-28: when the only sizes a product still has in stock are
 * XL or bigger, it should stop being published. Sizes sell out daily, so this is
 * a publish-time filter that re-runs every night, NOT a permanent cut — a
 * restocked S/M/L brings the product straight back.
 *
 * Every size label below is a REAL value read off a live Shopify feed by the
 * probe in docs/log/2026-08-28-size-floor-rule.md (2,603 products, 14 brands,
 * 205 distinct size values). §10.11: a heuristic over third-party data gets
 * tested against the real corpus, including the values where its assumption
 * does not hold.
 */
describe('sizeRank', () => {
  it('ranks the alpha sizes in order', () => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
    const ranks = order.map(sizeRank);
    expect(ranks.every((r) => r !== null)).toBe(true);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]! > ranks[i - 1]!).toBe(true);
    }
  });

  it('treats 2XL and XXL as the same size', () => {
    expect(sizeRank('2XL')).toBe(sizeRank('XXL'));
    expect(sizeRank('XX-Large')).toBe(sizeRank('XXL'));
  });

  it('reads the long spellings brands actually use', () => {
    expect(sizeRank('Small')).toBe(sizeRank('S'));
    expect(sizeRank('Medium')).toBe(sizeRank('M'));
    expect(sizeRank('Large')).toBe(sizeRank('L'));
    expect(sizeRank('X-Large')).toBe(sizeRank('XL'));
  });

  it('is case- and whitespace-insensitive', () => {
    expect(sizeRank('  xl ')).toBe(sizeRank('XL'));
  });

  it('takes the SMALLEST size named in a combined label', () => {
    // Real: veiled "XL/XXL", urban-modesty "XL -XXL".
    expect(sizeRank('XL/XXL')).toBe(sizeRank('XL'));
    expect(sizeRank('M/L')).toBe(sizeRank('M'));
  });

  it('returns null for sizing systems this rule cannot read', () => {
    // Every one of these is a real value from the probe. A null rank means
    // "unknown", and unknown must never be treated as large — see below.
    for (const v of [
      '52', '54', '58', '60',              // abaya numeric sizing
      '10', '12', '16', '22',              // US numeric sizing
      'One Size', 'Standard', 'Regular',   // unsized
      'Square 40" x 40"', 'Rectangle 68" x 27"',
      'Regular 200cm * 70cm', 'Short (165x70 cm)', 'Long (195x70 cm)',
      'Mini', 'Double',
    ]) {
      expect(sizeRank(v), `${v} should be unreadable`).toBeNull();
    }
  });

  it('does not find a size inside a longer word', () => {
    // The §10.5 / §10.10 / §10.31 failure: unanchored letter matching. "Small"
    // must not be read as S-inside-a-word, and a descriptive label must not
    // collapse to whatever letter it happens to contain.
    expect(sizeRank('Slim')).toBeNull();
    expect(sizeRank('Maxi')).toBeNull();
    expect(sizeRank('Long')).toBeNull();
    expect(sizeRank('Mini')).toBeNull();
  });
});

describe('onlyLargeSizesLeft', () => {
  const S = (label: string, available: boolean) => ({ label, available });

  it('is true when the smallest size still in stock is XL', () => {
    // Real: vela "Braided Cascade Skirt" — XXS..3XL, only XL left.
    expect(onlyLargeSizesLeft([
      S('XXS', false), S('XS', false), S('S', false), S('M', false),
      S('L', false), S('XL', true), S('2XL', false), S('3XL', false),
    ])).toBe(true);
  });

  it('is true when only XXL is left', () => {
    expect(onlyLargeSizesLeft([
      S('XS', false), S('S', false), S('M', false), S('L', false),
      S('XL', false), S('XXL', true),
    ])).toBe(true);
  });

  it('is false while any size below XL is still in stock', () => {
    expect(onlyLargeSizesLeft([
      S('S', false), S('M', true), S('L', false), S('XL', true),
    ])).toBe(false);
  });

  it('is false when the product has no size data at all', () => {
    // THE SAFETY PROPERTY. WooCommerce brands expose no variants, and every raw
    // row scraped before this rule existed has no sizes either. Missing data
    // must never be read as "only large sizes left" — that would delete
    // thousands of products on the first publish (§10.31 rule 2).
    expect(onlyLargeSizesLeft(undefined)).toBe(false);
    expect(onlyLargeSizesLeft([])).toBe(false);
  });

  it('is false when no size label can be read', () => {
    // A 52-60 abaya or a one-size hijab. The rule simply does not apply.
    expect(onlyLargeSizesLeft([S('52', false), S('54', false), S('56', true)])).toBe(false);
    expect(onlyLargeSizesLeft([S('One Size', true)])).toBe(false);
  });

  it('is false when an unreadable size is still in stock alongside a large one', () => {
    // Conservative by construction: we only cut when EVERY available variant is
    // provably XL or bigger. "One Size" in stock could fit anyone.
    expect(onlyLargeSizesLeft([S('One Size', true), S('XL', true)])).toBe(false);
  });

  it('is false when nothing is in stock at all', () => {
    // That is inStock's job. Reporting it here too would double-count the
    // product in the rejected table and hide the real reason.
    expect(onlyLargeSizesLeft([S('S', false), S('XL', false)])).toBe(false);
  });

  it('honours a caller-supplied floor', () => {
    const sizes = [S('S', false), S('M', false), S('L', true), S('XL', true)];
    expect(onlyLargeSizesLeft(sizes)).toBe(false);
    expect(onlyLargeSizesLeft(sizes, sizeRank('L')!)).toBe(true);
  });

  it('defaults its floor to XL', () => {
    expect(SIZE_FLOOR).toBe(sizeRank('XL'));
  });
});
