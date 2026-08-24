'use client';
import { useCallback, useEffect, useRef } from 'react';
import { CaretRight, CaretLeft } from '@phosphor-icons/react';
import { useScrollFade } from './useScrollFade';

/**
 * The horizontally-scrolling strip of street photographs in an edit's story
 * block, with a right-edge fade and a next button — Tina, 2026-08-24: "have a
 * fade on the right side to show there is more to see and a button".
 *
 * Client component ONLY because scrolling is imperative. The photographs and
 * their credits are handed in already rendered from the server component, so
 * nothing about the content crosses the boundary as data.
 *
 * The fade is a real MEASUREMENT (`useScrollFade`), not a decoration that is
 * always on. That matters for exactly the reason Tina asked for it: a fade
 * that never goes away stops meaning "there is more" and starts meaning
 * nothing. Same measurement drives the button's disabled state, so the two
 * cannot disagree about whether anything is left to scroll — the pattern
 * PopularShowcase already uses.
 */
export function EditStoryRail({ children }: { children: React.ReactNode }) {
  // useScrollFade's ref is a callback ref (it must fire on attach/detach), so
  // it cannot also expose `.current` for the imperative scroll. Capture the
  // same node through that callback rather than measuring the overflow twice.
  const { ref: fadeRef, fade } = useScrollFade<HTMLUListElement>('x');
  const node = useRef<HTMLUListElement | null>(null);
  const setRef = useCallback((el: HTMLUListElement | null) => {
    node.current = el;
    fadeRef(el);
  }, [fadeRef]);

  // 'end' = more to the right only, 'both' = more either way. The names
  // describe the CONTENT, not the scrollbar — see lib/scrollFade.ts.
  const canLeft = fade === 'start' || fade === 'both';
  const canRight = fade === 'end' || fade === 'both';

  // THE ROW MUST NEVER SWALLOW A VERTICAL GESTURE. Tina: "when i stand on it i
  // cant scroll on the page anymore im stuck" — the identical bug
  // components/PopularShowcase.tsx already documents in her own words, and I
  // shipped this rail without carrying its fix across.
  //
  // Doing nothing is WORSE than this handler, not neutral: `overflow-x: auto`
  // alone (even with overflow-y hidden) makes the element the wheel event's
  // target with no valid axis to apply it to, and Chromium does not chain that
  // unhandled event up to the page — the page freezes for as long as the
  // pointer is over the row. So a vertical gesture is handed to the window
  // unconditionally and `scrollLeft` is never touched here. A genuine
  // HORIZONTAL gesture (shift+wheel, or a trackpad's sideways swipe) produces
  // deltaX, which this never intercepts and native overflow-x handles alone.
  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      window.scrollBy(0, e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = node.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="mt-10">
      {/* CONTROLS ABOVE THE RAIL, right-aligned — not floating on the
          photographs. The first cut used `.rail-arrow`, which is absolutely
          positioned over the images the way PopularShowcase's are; on this rail
          that put a white disc squarely on top of a model (Tina sent the
          screenshot). PopularShowcase gets away with it because its cards are
          product shots on plain backgrounds; these are street photographs where
          the subject is the middle of the frame.

          Kept small and quiet: this is a hint that the row moves, not a primary
          control. The rail is draggable and keyboard-scrollable regardless, and
          the right-edge fade is doing the real "there is more" work. */}
      <div className="flex justify-end gap-2 mb-3">
        <button
          type="button"
          aria-label="Previous photographs"
          onClick={() => scrollBy(-1)}
          className="edit-rail-btn"
          disabled={!canLeft}
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <button
          type="button"
          aria-label="More photographs"
          onClick={() => scrollBy(1)}
          className="edit-rail-btn"
          disabled={!canRight}
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      <div
        className="scroll-fade scroll-fade-x"
        // RIGHT EDGE ONLY, and never both — Tina: "not that much and only for
        // the right side". `useScrollFade` reports 'start' and 'both' as well,
        // which would paint a left-hand fade once you have scrolled; that is
        // collapsed away here rather than by changing the hook, because the
        // hook's measurement is correct and shared with the buttons. Only the
        // PAINTING is opinionated.
        data-fade={canRight ? 'end' : 'none'}
        // 90px -> 44px. The wide default was tuned for PopularShowcase's much
        // bigger cards; at this size it was washing out most of the last
        // photograph rather than hinting at it.
        style={{ ['--fade-to' as string]: 'var(--parchment)', ['--fade-size-x' as string]: '44px' }}
      >
        {/* overflow-y-hidden is load-bearing: per the CSS Overflow spec,
            setting overflow-x to a non-visible value while overflow-y is left
            visible makes the browser compute overflow-y as auto too, so the
            row becomes vertically draggable as well. Same trap PopularShowcase
            documents. */}
        <ul
          ref={setRef}
          className="scroll-fade-port edit-story-rail no-scrollbar flex gap-4 overflow-x-auto overflow-y-hidden"
          role="list"
        >
          {children}
        </ul>
      </div>
    </div>
  );
}
