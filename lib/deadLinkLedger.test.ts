import { describe, it, expect } from 'vitest';
import { mergeSweep, withheldIds, EMPTY_LEDGER, BRAND_WIDE_SHARE, type SweepRow } from './deadLinkLedger';

const row = (id: string, verdict: SweepRow['verdict'], brandSlug = 'aab'): SweepRow => ({
  id,
  brandSlug,
  url: `https://${brandSlug}.example/products/${id.split(':')[1]}`,
  verdict,
});

const T1 = '2026-09-15T03:20:00.000Z';
const T2 = '2026-09-22T03:20:00.000Z';

describe('mergeSweep', () => {
  it('records a failure with one strike', () => {
    const l = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'dead')], T1);
    expect(l.entries['aab:1']).toMatchObject({ verdict: 'dead', strikes: 1, firstSeen: T1, lastSeen: T1 });
  });

  it('adds a strike on the next sweep and keeps firstSeen', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'moved')], T1);
    const l2 = mergeSweep(l1, [row('aab:1', 'moved')], T2);
    expect(l2.entries['aab:1']).toMatchObject({ strikes: 2, firstSeen: T1, lastSeen: T2 });
  });

  it('forgets a product whose link works again', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'dead')], T1);
    const l2 = mergeSweep(l1, [row('aab:1', 'ok')], T2);
    expect(l2.entries['aab:1']).toBeUndefined();
  });

  it('leaves an entry untouched on unknown — neither a strike nor a clear', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'moved')], T1);
    const l2 = mergeSweep(l1, [row('aab:1', 'unknown')], T2);
    expect(l2.entries['aab:1']).toMatchObject({ strikes: 1, lastSeen: T1 });
  });

  it('never invents an entry from unknown alone', () => {
    const l = mergeSweep(EMPTY_LEDGER, [row('aab:9', 'unknown')], T1);
    expect(Object.keys(l.entries)).toEqual([]);
  });

  it('leaves rows the sweep did not check alone (the rotating slice)', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'dead')], T1);
    const l2 = mergeSweep(l1, [row('aab:2', 'dead')], T2);
    expect(l2.entries['aab:1']).toMatchObject({ strikes: 1 });
    expect(l2.entries['aab:2']).toMatchObject({ strikes: 1 });
  });
});

describe('brand-wide failures', () => {
  it('flags every row of a brand whose checked rows mostly failed', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => row(`veiled:${i}`, 'moved', 'veiled')),
      row('veiled:8', 'ok', 'veiled'),
    ];
    const l = mergeSweep(EMPTY_LEDGER, rows, T1);
    expect(8 / 9).toBeGreaterThan(BRAND_WIDE_SHARE);
    expect(l.entries['veiled:0'].brandWide).toBe(true);
    expect(withheldIds(l).size).toBe(0); // a storefront-level event withholds nothing
  });

  it('does not flag a brand with only a couple of dead pieces', () => {
    const rows = [
      row('aab:1', 'dead'),
      ...Array.from({ length: 19 }, (_, i) => row(`aab:${i + 2}`, 'ok')),
    ];
    const l = mergeSweep(EMPTY_LEDGER, rows, T1);
    expect(l.entries['aab:1'].brandWide).toBeUndefined();
    expect(withheldIds(l).has('aab:1')).toBe(true);
  });

  it('ignores the share on a brand with too few checked rows to judge', () => {
    const rows = [row('nihan:1', 'dead', 'nihan'), row('nihan:2', 'dead', 'nihan')];
    const l = mergeSweep(EMPTY_LEDGER, rows, T1);
    expect(l.entries['nihan:1'].brandWide).toBeUndefined();
  });
});

describe('withheldIds', () => {
  it('withholds a hard 404 on the first sighting', () => {
    const l = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'dead')], T1);
    expect(withheldIds(l).has('aab:1')).toBe(true);
  });

  it('waits for a second sighting of a redirect', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'moved')], T1);
    expect(withheldIds(l1).has('aab:1')).toBe(false);
    const l2 = mergeSweep(l1, [row('aab:1', 'moved')], T2);
    expect(withheldIds(l2).has('aab:1')).toBe(true);
  });

  it('releases a product as soon as its link works again', () => {
    const l1 = mergeSweep(EMPTY_LEDGER, [row('aab:1', 'dead')], T1);
    const l2 = mergeSweep(l1, [row('aab:1', 'ok')], T2);
    expect(withheldIds(l2).has('aab:1')).toBe(false);
  });

  it('survives a ledger with no entries key at all', () => {
    expect(withheldIds({ generatedAt: '', entries: undefined as never }).size).toBe(0);
  });
});
