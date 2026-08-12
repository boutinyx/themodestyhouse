import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getLiveCuts, setLiveCut, getCutIds } from './liveCuts';

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'live-cuts-test-'));
  storePath = path.join(dir, '.live-cuts.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('liveCuts', () => {
  it('returns empty when the store file does not exist yet', () => {
    expect(getLiveCuts(storePath)).toEqual({});
    expect(getCutIds(storePath)).toEqual(new Set());
  });

  it('records a cut and it shows up in getCutIds', () => {
    setLiveCut('brand:1', 'cut', storePath);
    expect(getCutIds(storePath)).toEqual(new Set(['brand:1']));
  });

  it('a "keep" decision does not appear in getCutIds', () => {
    setLiveCut('brand:1', 'keep', storePath);
    expect(getCutIds(storePath)).toEqual(new Set());
    expect(getLiveCuts(storePath)['brand:1'].decision).toBe('keep');
  });

  it('a later decision overwrites an earlier one for the same id', () => {
    setLiveCut('brand:1', 'cut', storePath);
    setLiveCut('brand:1', 'keep', storePath);
    expect(getCutIds(storePath)).toEqual(new Set());
  });

  it('persists across separate reads (creates the directory if missing)', () => {
    const nested = path.join(dir, 'nested', '.live-cuts.json');
    setLiveCut('brand:1', 'cut', nested);
    expect(getCutIds(nested)).toEqual(new Set(['brand:1']));
  });

  it('stamps a real, parseable decidedAt', () => {
    setLiveCut('brand:1', 'cut', storePath);
    const entry = getLiveCuts(storePath)['brand:1'];
    expect(Number.isNaN(Date.parse(entry.decidedAt))).toBe(false);
  });

  it('tolerates a corrupted store file instead of throwing', () => {
    writeFileSync(storePath, '{not valid json');
    expect(getLiveCuts(storePath)).toEqual({});
  });

  it('keeps multiple ids independently', () => {
    setLiveCut('brand:1', 'cut', storePath);
    setLiveCut('brand:2', 'cut', storePath);
    setLiveCut('brand:3', 'keep', storePath);
    expect(getCutIds(storePath)).toEqual(new Set(['brand:1', 'brand:2']));
  });
});
