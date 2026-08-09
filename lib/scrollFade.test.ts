import { describe, it, expect } from 'vitest';
import { scrollFade } from './scrollFade';

describe('scrollFade', () => {
  it('says none when the content fits', () => {
    expect(scrollFade({ start: 0, viewport: 300, content: 300 })).toBe('none');
    expect(scrollFade({ start: 0, viewport: 300, content: 120 })).toBe('none');
  });

  it('says none when the overflow is inside the tolerance', () => {
    // HiDPI fractional layout: half a pixel of overflow is not a scroll.
    expect(scrollFade({ start: 0, viewport: 300, content: 300.5 })).toBe('none');
  });

  it('fades the trailing edge at the start of a long list', () => {
    expect(scrollFade({ start: 0, viewport: 300, content: 900 })).toBe('end');
  });

  it('fades both edges in the middle', () => {
    expect(scrollFade({ start: 300, viewport: 300, content: 900 })).toBe('both');
  });

  it('fades the leading edge at the far end', () => {
    expect(scrollFade({ start: 600, viewport: 300, content: 900 })).toBe('start');
  });

  it('treats within-1px-of-the-end as the end', () => {
    // The whole point of the tolerance: scrollTop + clientHeight never lands
    // exactly on scrollHeight, so an === comparison never becomes true and the
    // fade stays lit at the bottom of every list.
    expect(scrollFade({ start: 599.4, viewport: 300, content: 900 })).toBe('start');
  });

  it('handles RTL negative scrollLeft by magnitude', () => {
    expect(scrollFade({ start: -300, viewport: 300, content: 900 })).toBe('both');
  });

  /* The regression test for the guess this replaces. `.menu-row` is 12px type
     at line-height 1 with 9px vertical padding and white-space: nowrap, so a
     row is exactly 30px; the list caps at 18rem (288px) with p-2, i.e. a 272px
     content box. IndexPanel prepends an "All …" row, so rendered rows =
     options.length + 1.

     Overflow therefore begins at 30N > 272 -> N >= 10 rows -> 9 OPTIONS.
     The old `options.length > 7` fired at 8. Off by one whole list. */
  it('matches the real filter-dropdown geometry (272px box, 30px rows)', () => {
    const box = 272;
    const rows = (n: number) => ({ start: 0, viewport: box, content: n * 30 });
    expect(scrollFade(rows(9))).toBe('none'); // 8 options + "All" = 270px, fits
    expect(scrollFade(rows(10))).toBe('end'); // 9 options + "All" = 300px, scrolls
  });

  /* Measured on production 2026-08-09, both engines, iPhone 13 (390x844):
     the MobileNav panel holds 1024px of rows in a 756px scrollport, so 268px
     — roughly five tappable rows — are hidden with no scrollbar at rest. */
  it('flags the measured MobileNav overflow', () => {
    expect(scrollFade({ start: 0, viewport: 756, content: 1024 })).toBe('end');
    expect(scrollFade({ start: 268, viewport: 756, content: 1024 })).toBe('start');
  });
});
