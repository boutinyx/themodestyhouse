import { describe, it, expect } from 'vitest';
import { BRANDS } from '../data/brands';
import { aboutStats, roundedPieces } from './aboutStats';

/**
 * These assert RELATIONSHIPS, never literals. The nightly refresh moves the
 * product count — it went 11,125 -> 11,127 during the afternoon this was
 * designed — and a test pinned to a number would go red because a brand added
 * a dress. That is the §10.19 mistake, and once was enough.
 */
describe('aboutStats', () => {
  const s = aboutStats();

  it('counts every brand in the catalogue', () => {
    expect(s.houses).toBe(BRANDS.length);
  });

  it('counts only the verified brands as sealed', () => {
    expect(s.sealed).toBe(BRANDS.filter((b) => b.badge === 'verified').length);
  });

  it('never claims more seals than houses', () => {
    expect(s.sealed).toBeLessThanOrEqual(s.houses);
  });

  it('returns whole positive numbers the page can print', () => {
    for (const n of [s.houses, s.pieces, s.sealed]) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });
});

describe('roundedPieces', () => {
  it('rounds DOWN to the thousand so the figure never overstates', () => {
    expect(roundedPieces(11127)).toBe('11,000+');
    expect(roundedPieces(11999)).toBe('11,000+');
    expect(roundedPieces(12000)).toBe('12,000+');
  });

  it('prints small counts exactly rather than as "0+"', () => {
    expect(roundedPieces(999)).toBe('999');
    expect(roundedPieces(0)).toBe('0');
  });
});
