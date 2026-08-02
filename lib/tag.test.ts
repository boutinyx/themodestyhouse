import { describe, it, expect } from 'vitest';
import { tagDiscovery } from './tag';

describe('tagDiscovery', () => {
  it('detects a swim garment', () => {
    const r = tagDiscovery({ title: 'Long Sleeve Modest Swimsuit', productType: 'Swimwear', tags: [] });
    expect(r.garment).toBe('swim');
    expect(r.activity).toContain('swim');
  });
  it('detects a dress and wedding occasion', () => {
    const r = tagDiscovery({ title: 'Aurelia Wedding Guest Maxi Dress', productType: 'Dresses', tags: ['formal'] });
    expect(r.garment).toBe('dress');
    expect(r.occasion).toContain('wedding');
    expect(r.occasion).toContain('formal');
  });
  it('detects a hijab', () => {
    const r = tagDiscovery({ title: 'Chiffon Silk Hijab', productType: 'Hijabs', tags: [] });
    expect(r.garment).toBe('hijab');
  });
  it('falls back to other', () => {
    const r = tagDiscovery({ title: 'Gift Card', productType: '', tags: [] });
    expect(r.garment).toBe('other');
  });
});
