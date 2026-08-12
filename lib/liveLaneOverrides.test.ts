import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getLiveLaneOverrides, setLiveLaneOverride } from './liveLaneOverrides';

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'live-lane-overrides-test-'));
  storePath = path.join(dir, '.live-lane-overrides.json');
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('liveLaneOverrides', () => {
  it('returns empty when the store file does not exist yet', () => {
    expect(getLiveLaneOverrides(storePath)).toEqual({});
  });

  it('records a lane move with no subtype', () => {
    setLiveLaneOverride('brand:1', 'modest-activewear', undefined, storePath);
    expect(getLiveLaneOverrides(storePath)['brand:1'].lane).toBe('modest-activewear');
    expect(getLiveLaneOverrides(storePath)['brand:1'].subtype).toBeUndefined();
  });

  it('records a lane move with a subtype', () => {
    setLiveLaneOverride('brand:1', 'layering-basics', 'under-dress', storePath);
    const entry = getLiveLaneOverrides(storePath)['brand:1'];
    expect(entry.lane).toBe('layering-basics');
    expect(entry.subtype).toBe('under-dress');
  });

  it('a later move overwrites an earlier one for the same id', () => {
    setLiveLaneOverride('brand:1', 'modest-activewear', undefined, storePath);
    setLiveLaneOverride('brand:1', 'layering-basics', 'neck-cover', storePath);
    const entry = getLiveLaneOverrides(storePath)['brand:1'];
    expect(entry.lane).toBe('layering-basics');
    expect(entry.subtype).toBe('neck-cover');
  });

  it('persists across separate reads (creates the directory if missing)', () => {
    const nested = path.join(dir, 'nested', '.live-lane-overrides.json');
    setLiveLaneOverride('brand:1', 'modest-activewear', undefined, nested);
    expect(getLiveLaneOverrides(nested)['brand:1'].lane).toBe('modest-activewear');
  });

  it('stamps a real, parseable decidedAt', () => {
    setLiveLaneOverride('brand:1', 'modest-activewear', undefined, storePath);
    const entry = getLiveLaneOverrides(storePath)['brand:1'];
    expect(Number.isNaN(Date.parse(entry.decidedAt))).toBe(false);
  });

  it('tolerates a corrupted store file instead of throwing', () => {
    writeFileSync(storePath, '{not valid json');
    expect(getLiveLaneOverrides(storePath)).toEqual({});
  });

  it('keeps multiple ids independently', () => {
    setLiveLaneOverride('brand:1', 'modest-activewear', undefined, storePath);
    setLiveLaneOverride('brand:2', 'layering-basics', 'sleeve-extender', storePath);
    expect(getLiveLaneOverrides(storePath)['brand:1'].lane).toBe('modest-activewear');
    expect(getLiveLaneOverrides(storePath)['brand:2'].lane).toBe('layering-basics');
  });
});
