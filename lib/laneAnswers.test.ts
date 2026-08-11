import { describe, it, expect } from 'vitest';
import { LANE_ANSWERS } from './laneAnswers';
import { LANES } from './lanes';

const wordCount = (s: string) => s.trim().split(/\s+/).length;

describe('LANE_ANSWERS', () => {
  it('has an entry for every lane', () => {
    for (const lane of LANES) {
      expect(LANE_ANSWERS[lane.slug], `missing LANE_ANSWERS for ${lane.slug}`).toBeDefined();
    }
  });

  it('keeps every answer near the 134-167 word citability window', () => {
    for (const [slug, a] of Object.entries(LANE_ANSWERS)) {
      const n = wordCount(a.body);
      expect(n, `${slug} body is ${n} words, expected 100-180`).toBeGreaterThanOrEqual(100);
      expect(n, `${slug} body is ${n} words, expected 100-180`).toBeLessThanOrEqual(180);
    }
  });

  it('never repeats a body or heading across lanes — the thin/scaled-content risk this exists to avoid', () => {
    const bodies = Object.values(LANE_ANSWERS).map((a) => a.body);
    const h2s = Object.values(LANE_ANSWERS).map((a) => a.h2);
    expect(new Set(bodies).size).toBe(bodies.length);
    expect(new Set(h2s).size).toBe(h2s.length);
  });

  it('every related slug points at a real, different lane', () => {
    const slugs = new Set(LANES.map((l) => l.slug));
    for (const [slug, a] of Object.entries(LANE_ANSWERS)) {
      for (const r of a.related) {
        expect(slugs.has(r), `${slug} links to unknown lane "${r}"`).toBe(true);
        expect(r, `${slug} links to itself`).not.toBe(slug);
      }
    }
  });
});
