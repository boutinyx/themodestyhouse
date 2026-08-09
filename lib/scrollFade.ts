export type ScrollFade = 'none' | 'start' | 'end' | 'both';

/**
 * Which edges of a scroller should carry a "there is more this way" fade.
 *
 * Pure arithmetic on three numbers, deliberately: `vitest.config.ts` declares no
 * `environment`, so tests run in node with no jsdom. A hook that measures a live
 * element cannot be tested here at all — a function that takes the measurements
 * can be, and that is where every interesting edge case lives.
 *
 * It is also one rule instead of two. `IndexPanel` hand-rolled this with a 1px
 * tolerance and `EditorsRail` with 8px, for the same question.
 *
 * The axis lives in WHICH three numbers the caller passes
 * (scrollTop/clientHeight/scrollHeight, or scrollLeft/clientWidth/scrollWidth),
 * never in a branch here.
 */
export function scrollFade(
  m: { start: number; viewport: number; content: number },
  tolerance = 1,
): ScrollFade {
  // Math.abs because in an RTL writing mode scrollLeft counts DOWN from 0 to
  // -N. This makes the magnitude right; it does NOT make RTL correct, because
  // the CSS still paints the leading fade on the physical left edge. Flagged
  // rather than half-fixed — the site is LTR-only today.
  const start = Math.abs(m.start);

  // "Does this overflow at all?" is answered FIRST, from a measurement. This is
  // the single line standing between a list that cannot scroll and a permanent
  // wash over its last row, and it is what replaces the `options.length > 7`
  // guess in IndexPanel — which was off by a whole list (a 30px nowrap row in a
  // 272px content box overflows at 10 rows, i.e. 9 options, not 8).
  if (m.content <= m.viewport + tolerance) return 'none';

  // 1px tolerance for the reason the original had one: these are fractional on
  // HiDPI and inside fractionally-sized flex boxes, so `start + viewport ===
  // content` is never exactly true at the far end.
  const atStart = start <= tolerance;
  const atEnd = start + m.viewport >= m.content - tolerance;

  // Overflow smaller than the tolerance: both ends at once, so neither.
  if (atStart && atEnd) return 'none';

  // Names describe the CONTENT, not the scrollbar: 'end' means there is more
  // content past the visible region, so the trailing edge gets the fade.
  if (atStart) return 'end';
  if (atEnd) return 'start';
  return 'both';
}
