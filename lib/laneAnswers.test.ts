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

  /**
   * The LOWER bound is the one that matters and is unchanged at 100 — it is what
   * stops a lane shipping a thin, throwaway block, which is the actual failure
   * mode this test exists to catch.
   *
   * The UPPER bound moved 180 -> 600 on 2026-08-19. The old cap encoded a
   * "citability window" belief that a shorter passage is easier for an answer
   * engine to quote. That may be true, but it was being applied as a hard stop
   * on writing MORE, and the 2026-08-19 audit measured the opposite problem:
   * 138 prose words on /modest-dresses against a competitor's 758 on the same
   * query. Depth is the real gap; the ratio argument that motivated the narrow
   * band was checked against five competitors and did not survive (this site
   * already leads on prose share, and two sites with ~0% prose outrank it).
   *
   * 600 is still a ceiling on purpose — it catches a block that has become an
   * essay nobody will read, and keeps these as answers rather than articles.
   * Raise it again deliberately if a lane genuinely earns it.
   */
  it('keeps every answer between a floor that prevents thin content and a ceiling that prevents an essay', () => {
    for (const [slug, a] of Object.entries(LANE_ANSWERS)) {
      const n = wordCount(a.body);
      expect(n, `${slug} body is ${n} words, expected 100-600`).toBeGreaterThanOrEqual(100);
      expect(n, `${slug} body is ${n} words, expected 100-600`).toBeLessThanOrEqual(600);
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
