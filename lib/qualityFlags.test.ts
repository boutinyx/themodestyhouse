import { describe, it, expect } from 'vitest';
import { qualityFlagTag } from './qualityFlags';

describe('qualityFlagTag', () => {
  // Real tags from the live corpus, measured 2026-08-12.
  it('catches the exact tags found on the catalogue', () => {
    expect(qualityFlagTag(['retakephotos'])).toBe('retakephotos');
    expect(qualityFlagTag(['reshoot_spring_26'])).toBe('reshoot_spring_26');
    expect(qualityFlagTag(['Draft-26'])).toBe('Draft-26');
  });

  it('ignores tags with no quality signal', () => {
    expect(qualityFlagTag(['hijab', 'summer', 'new-arrival', 'Pink'])).toBeNull();
  });

  it('returns null for undefined/empty tags', () => {
    expect(qualityFlagTag(undefined)).toBeNull();
    expect(qualityFlagTag([])).toBeNull();
  });

  it('is case-insensitive and matches mid-tag', () => {
    expect(qualityFlagTag(['NeedsPhoto'])).toBe('NeedsPhoto');
    expect(qualityFlagTag(['re-shoot-fall-25'])).toBe('re-shoot-fall-25');
  });
});
