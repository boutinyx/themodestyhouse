import { describe, it, expect } from 'vitest';
import { fourPointStar, STAR_WAIST } from './starPath';

/** Pull every coordinate pair out of a path string, in order. */
const coords = (d: string): [number, number][] => {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
};

describe('fourPointStar', () => {
  it('starts at the top point and closes', () => {
    const d = fourPointStar(100, 50, 10);
    expect(d.startsWith('M 100 40')).toBe(true);
    expect(d.trimEnd().endsWith('Z')).toBe(true);
  });

  it('puts a point at each of the four compass directions', () => {
    const d = fourPointStar(0, 0, 10);
    const pts = coords(d);
    // The four tips must all be present, at exactly radius r from the centre.
    for (const tip of [[0, -10], [10, 0], [0, 10], [-10, 0]]) {
      expect(pts.some(([x, y]) => x === tip[0] && y === tip[1]), `missing tip ${tip}`).toBe(true);
    }
  });

  it('is built from four quadratic curves, so the sides are concave', () => {
    // A straight-sided diamond would be four L commands and would read as a
    // rhombus, not as the star on the crest. The curve is the whole shape.
    const d = fourPointStar(0, 0, 10);
    expect((d.match(/Q/g) ?? []).length).toBe(4);
    expect(d).not.toMatch(/[LlHhVv]/);
  });

  it('pulls the waist toward the centre — a smaller waist is a sharper star', () => {
    const sharp = coords(fourPointStar(0, 0, 100, 0.05));
    const blunt = coords(fourPointStar(0, 0, 100, 0.5));
    // The control point after the top tip is what sets the waist.
    const ctrl = (pts: [number, number][]) => Math.abs(pts[1][0]);
    expect(ctrl(sharp)).toBeLessThan(ctrl(blunt));
    expect(ctrl(sharp)).toBeCloseTo(5, 6);
    expect(ctrl(blunt)).toBeCloseTo(50, 6);
  });

  it('scales linearly with the radius', () => {
    const small = coords(fourPointStar(0, 0, 10));
    const big = coords(fourPointStar(0, 0, 20));
    small.forEach(([x, y], i) => {
      expect(big[i][0]).toBeCloseTo(x * 2, 6);
      expect(big[i][1]).toBeCloseTo(y * 2, 6);
    });
  });

  it('translates without changing shape', () => {
    const atOrigin = coords(fourPointStar(0, 0, 10));
    const moved = coords(fourPointStar(37, -14, 10));
    atOrigin.forEach(([x, y], i) => {
      expect(moved[i][0]).toBeCloseTo(x + 37, 6);
      expect(moved[i][1]).toBeCloseTo(y - 14, 6);
    });
  });

  it('ships a waist that is genuinely a star, not a blob or a cross', () => {
    // Guards the default against being nudged to a value that stops reading as
    // the crest ornament. 0.5 is a rounded square; 0 is four hairlines.
    expect(STAR_WAIST).toBeGreaterThan(0.05);
    expect(STAR_WAIST).toBeLessThan(0.25);
  });

  it('emits no exponential notation, which SVG path data cannot parse', () => {
    // A very small radius is the realistic way this happens: 1e-7 in a `d`
    // attribute is silently an invalid path and the mark just disappears.
    const d = fourPointStar(0, 0, 0.0000001);
    expect(d).not.toMatch(/e[+-]/i);
  });
});
