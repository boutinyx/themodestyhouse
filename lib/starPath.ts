/**
 * The four-pointed star from the crest, as SVG path data.
 *
 * WHY THIS EXISTS AS GEOMETRY RATHER THAN AN ICON. CLAUDE.md §6 says every icon
 * comes from Phosphor, and that rule stands — this is not an exception to it,
 * because this is not an icon. It is the brand mark: the ornament set into the
 * oval at north, south, east and west of the crest in `public/logo.png`.
 *
 * The crest exists ONLY as pixels — there is no SVG logo anywhere in the repo —
 * so the star had to be traced rather than imported. Phosphor's two candidates
 * were both built and rejected against the real map, on 2026-08-25:
 *   - `Sparkle` is what the Verified badge carries, and is the most literal
 *     reading of "the seal star". Its fill path is TWO shapes — a star plus two
 *     companion ticks — which vanish at the badge's 10px and clutter the map
 *     badly at pin size, especially in the European cluster.
 *   - `StarFour` is a single clean four-pointed star, and is the sensible
 *     ready-made choice, but its tips are rounded and its waist is thick. Beside
 *     the crest it reads as a different mark.
 * Tina picked this one after comparing all three on the live map.
 *
 * Used by components/DesignerDiscovery.tsx for the map pins. Kept in `lib/` and
 * not inline in that component so it is testable and so a second surface can
 * carry the same mark without the geometry being copied.
 *
 * Client-safe: pure arithmetic, no imports, no `node:fs`. DesignerDiscovery is
 * a `'use client'` component, so that matters (Invariant 10).
 */

/**
 * How far the curve's control point sits from the centre, as a fraction of the
 * point radius. This single number IS the star's character.
 *
 * Toward 0 the sides collapse onto the axes and the mark becomes four
 * hairlines; toward 0.5 the curve bulges out to a rounded square. 0.13 is what
 * matches the crest — long points with a hard pinch at the waist.
 */
export const STAR_WAIST = 0.13;

/** Trim float noise without ever emitting exponential notation, which is not
 *  valid inside a path `d` attribute and fails silently — the mark simply does
 *  not draw. `toFixed` is what guarantees that; `String(1e-7)` does not. */
const n = (v: number): string => {
  const s = v.toFixed(3);
  // -0.000 and 4.000 both read badly in a path; normalise them.
  return s.replace(/\.?0+$/, '') || '0';
};

/**
 * A four-pointed star centred on `(cx, cy)` whose tips sit exactly `r` from the
 * centre, as an SVG `d` string.
 *
 * Four quadratic curves rather than four lines: straight sides would give a
 * rhombus, and the concave pull is the entire difference between a diamond and
 * a star.
 */
export function fourPointStar(cx: number, cy: number, r: number, waist: number = STAR_WAIST): string {
  const c = r * waist;
  return (
    `M ${n(cx)} ${n(cy - r)} ` +
    `Q ${n(cx + c)} ${n(cy - c)} ${n(cx + r)} ${n(cy)} ` +
    `Q ${n(cx + c)} ${n(cy + c)} ${n(cx)} ${n(cy + r)} ` +
    `Q ${n(cx - c)} ${n(cy + c)} ${n(cx - r)} ${n(cy)} ` +
    `Q ${n(cx - c)} ${n(cy - c)} ${n(cx)} ${n(cy - r)} Z`
  );
}
