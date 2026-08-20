import { describe, it, expect } from 'vitest';
import { formatSummary } from './refreshSummary';

const report = {
  date: '2026-08-05',
  totals: { added: 17, updated: 7798, delisted: 26, filtered: 0, returned: 0, incomplete: 0 },
  brands: [
    { brandSlug: 'niswa', complete: true, fetched: 487, added: [], updated: 487, delisted: 2, filtered: [], returned: 0 },
    { brandSlug: 'klay', complete: true, fetched: 10, added: ['New Dress'], updated: 9, delisted: 0, filtered: [], returned: 0 },
  ],
};

describe('formatSummary', () => {
  it('leads with the totals', () => {
    const out = formatSummary(report);
    expect(out).toContain('17');
    expect(out).toContain('7,798'); // thousands-separated — this is read by a human
    expect(out).toContain('2026-08-05');
  });

  it('calls out filtered rows as a classifier warning, not churn', () => {
    const out = formatSummary({ ...report, totals: { ...report.totals, filtered: 312 } });
    expect(out).toMatch(/classifier|our own filters/i);
    expect(out).toContain('312');
  });

  it('says so explicitly when nothing was dropped by our filters', () => {
    expect(formatSummary(report)).toMatch(/no products were dropped by our own filters/i);
  });

  it('flags incomplete fetches, because those brands could not be delisted', () => {
    const out = formatSummary({
      ...report,
      totals: { ...report.totals, incomplete: 2 },
      brands: [{ ...report.brands[0], complete: false }, report.brands[1]],
    });
    expect(out).toMatch(/incomplete/i);
    expect(out).toContain('niswa');
  });

  it('lists new arrivals so they can be vetoed', () => {
    expect(formatSummary(report)).toContain('New Dress');
  });

  it('reports a brand that failed outright', () => {
    const out = formatSummary({
      ...report,
      brands: [{ brandSlug: 'aab', error: 'getaddrinfo ENOTFOUND', complete: false }],
    });
    expect(out).toContain('aab');
    expect(out).toMatch(/ENOTFOUND|failed/i);
  });

  it('does not crash on an empty run', () => {
    expect(() => formatSummary({ date: '2026-08-05', totals: {}, brands: [] })).not.toThrow();
  });

  it('says nothing about frozen brands when none were frozen', () => {
    expect(formatSummary(report)).not.toMatch(/frozen/i);
  });

  it('prominently flags a frozen brand, since the run succeeds despite it', () => {
    const out = formatSummary({
      ...report,
      frozenBrands: [{ brandSlug: 'abadia', prev: 15, next: 1, pct: 0.93 }],
    });
    expect(out).toMatch(/frozen/i);
    expect(out).toContain('abadia');
    expect(out).toContain('93%');
    expect(out).toMatch(/ALLOW_LARGE_DIFF/);
  });

  it('lists multiple frozen brands', () => {
    const out = formatSummary({
      ...report,
      frozenBrands: [
        { brandSlug: 'abadia', prev: 15, next: 1, pct: 0.93 },
        { brandSlug: 'somebrand', prev: 40, next: 0, pct: 1 },
      ],
    });
    expect(out).toContain('abadia');
    expect(out).toContain('somebrand');
  });
});
