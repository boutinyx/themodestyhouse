import { describe, it, expect } from 'vitest';
import { SEO_COPY } from './seoCopy';
import { LANES } from './lanes';

const STATIC_PATHS = ['/', '/new-in', '/designers', '/editorial', '/faq'];

describe('SEO_COPY', () => {
  it('has an entry for every lane', () => {
    for (const lane of LANES) {
      expect(SEO_COPY[`/${lane.slug}`], `missing SEO_COPY for /${lane.slug}`).toBeDefined();
    }
  });

  it('has an entry for every static path it is used on', () => {
    for (const path of STATIC_PATHS) {
      expect(SEO_COPY[path], `missing SEO_COPY for ${path}`).toBeDefined();
    }
  });

  it('keeps every title within normal SERP-snippet length', () => {
    for (const [path, copy] of Object.entries(SEO_COPY)) {
      expect(copy.title.length, `${path} title too long: "${copy.title}" (${copy.title.length})`).toBeLessThanOrEqual(60);
    }
  });

  it('keeps every description within normal SERP-snippet length', () => {
    for (const [path, copy] of Object.entries(SEO_COPY)) {
      expect(copy.description.length, `${path} description too short: "${copy.description}"`).toBeGreaterThanOrEqual(50);
      expect(copy.description.length, `${path} description too long: "${copy.description}" (${copy.description.length})`).toBeLessThanOrEqual(160);
    }
  });

  it('never duplicates a title or description across paths', () => {
    const titles = Object.values(SEO_COPY).map((c) => c.title);
    const descriptions = Object.values(SEO_COPY).map((c) => c.description);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});
