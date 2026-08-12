import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getLiveGarmentOverrides, setLiveGarmentOverride } from './liveGarmentOverrides';

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'live-garment-overrides-test-'));
  storePath = path.join(dir, '.live-garment-overrides.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('liveGarmentOverrides', () => {
  it('returns empty when the store file does not exist yet', () => {
    expect(getLiveGarmentOverrides(storePath)).toEqual({});
  });

  it('records a move and reads it back', () => {
    setLiveGarmentOverride('brand:1', 'skirt', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('skirt');
  });

  it('a later move overwrites an earlier one for the same id', () => {
    setLiveGarmentOverride('brand:1', 'skirt', storePath);
    setLiveGarmentOverride('brand:1', 'top', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('top');
  });

  it('persists across separate reads (creates the directory if missing)', () => {
    const nested = path.join(dir, 'nested', '.live-garment-overrides.json');
    setLiveGarmentOverride('brand:1', 'dress', nested);
    expect(getLiveGarmentOverrides(nested)['brand:1'].garment).toBe('dress');
  });

  it('stamps a real, parseable decidedAt', () => {
    setLiveGarmentOverride('brand:1', 'dress', storePath);
    const entry = getLiveGarmentOverrides(storePath)['brand:1'];
    expect(Number.isNaN(Date.parse(entry.decidedAt))).toBe(false);
  });

  it('tolerates a corrupted store file instead of throwing', () => {
    writeFileSync(storePath, '{not valid json');
    expect(getLiveGarmentOverrides(storePath)).toEqual({});
  });

  it('keeps multiple ids independently', () => {
    setLiveGarmentOverride('brand:1', 'dress', storePath);
    setLiveGarmentOverride('brand:2', 'top', storePath);
    expect(getLiveGarmentOverrides(storePath)['brand:1'].garment).toBe('dress');
    expect(getLiveGarmentOverrides(storePath)['brand:2'].garment).toBe('top');
  });
});
