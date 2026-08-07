import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { convert, displayPrice, hasRate, FX_RATES, DISPLAY_CURRENCIES } from './fx';

describe('convert', () => {
  it('is identity for the same currency', () => {
    expect(convert(44.95, 'USD', 'USD')).toBe(44.95);
  });

  it('round-trips within floating-point tolerance', () => {
    const there = convert(100, 'USD', 'GBP')!;
    expect(convert(there, 'GBP', 'USD')).toBeCloseTo(100, 6);
  });

  it('converts via the base for two non-base currencies', () => {
    // AED -> EUR must go through USD, not be treated as 1:1.
    const v = convert(367.25, 'AED', 'EUR')!;   // 367.25 AED ~= 100 USD
    expect(v).toBeGreaterThan(50);
    expect(v).toBeLessThan(150);
  });

  it('returns null rather than inventing a number for an unknown currency', () => {
    expect(convert(10, 'USD', 'XYZ')).toBeNull();
    expect(convert(10, 'XYZ', 'USD')).toBeNull();
    expect(convert(NaN, 'USD', 'GBP')).toBeNull();
  });
});

describe('displayPrice', () => {
  it('shows the exact native price when no preference is set', () => {
    const r = displayPrice(44.95, 'USD', null);
    expect(r).toEqual({ text: '$44.95', approximate: false });
  });

  it('shows the exact price when the preference matches the native currency', () => {
    expect(displayPrice(120, 'GBP', 'GBP')).toEqual({ text: '£120', approximate: false });
  });

  it('marks a converted price as approximate and rounds it', () => {
    // Decimals on an approximation imply precision that is not there.
    const r = displayPrice(100, 'GBP', 'USD');
    expect(r.approximate).toBe(true);
    expect(r.text.startsWith('≈ $')).toBe(true);
    expect(r.text).not.toMatch(/\./);
  });

  it('falls back to the exact native price when no rate exists', () => {
    const r = displayPrice(44.95, 'XYZ', 'USD');
    expect(r.approximate).toBe(false);
    expect(r.text).toContain('44.95');
  });
});

describe('rate coverage', () => {
  it('holds a rate for every currency in the published catalogue', () => {
    // If a brand is added in a new currency, this fails until rates are refreshed.
    const products = JSON.parse(
      readFileSync(path.join(process.cwd(), 'data', 'products.json'), 'utf8'),
    ) as { currency: string }[];
    const missing = [...new Set(products.map((p) => p.currency))].filter((c) => !hasRate(c));
    expect(missing, 'run: node scripts/fetch-rates.mjs').toEqual([]);
  });

  it('holds a rate for every currency a visitor can switch to', () => {
    expect(DISPLAY_CURRENCIES.filter((c) => !hasRate(c))).toEqual([]);
  });

  it('has a sane base rate', () => {
    expect(FX_RATES.USD).toBe(1);
  });
});
