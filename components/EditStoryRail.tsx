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
    <div className="relative mt-10">
      <div
        className="scroll-fade scroll-fade-x edit-rail-bleed"
        // RIGHT EDGE ONLY, and never both — Tina: "not that much and only for
        // the right side". `useScrollFade` reports 'start' and 'both' as well,
        // which would paint a left-hand fade once you have scrolled; that is
        // collapsed away here rather than by changing the hook, because the
        // hook's measurement is correct and shared with the buttons. Only the
        // PAINTING is opinionated.
        data-fade={canRight ? 'end' : 'none'}
        // THE FADE REACHES THE ARROW. Tina, pointing at it: "you see where the
        // arrow is? the transparnecy thing needs to be till there".
        //
        // They were 148px apart at 1440 and the reason is worth writing down:
        // the fade lives on THIS element, which bleeds to the screen edge,
        // while the arrows are absolutely positioned against the outer
        // `div.relative` — which does NOT bleed, so `right: 6` means 6px from
        // the CONTENT COLUMN, not from the screen. Two different right edges.
        //
        //   fade = (strip beyond the column) + 6px offset + 32px arrow
        //   strip = (100vw - min(1220px, 100vw)) / 2 + 32px   (half gutter + px-8)
        //
        // which lands the fade's left edge exactly on the arrow's: 70px at
        // 1006, 144px at 1368, 180px at 1440. A constant cannot do this — the
        // strip is 0 below 1220 and grows with every pixel above it.
        style={{
          ['--fade-to' as string]: 'var(--parchment)',
          ['--fade-size-x' as string]: 'calc((100vw - min(1220px, 100vw)) / 2 + 70px)',
        }}
      >
        {/* overflow-y-hidden is load-bearing: per the CSS Overflow spec,
            setting overflow-x to a non-visible value while overflow-y is left
            visible makes the browser compute overflow-y as auto too, so the
            row becomes vertically draggable as well. Same trap PopularShowcase
            documents. */}
        <ul
          ref={setRef}
          className="scroll-fade-port edit-story-rail no-scrollbar flex gap-4 overflow-x-auto overflow-y-hidden pr-8 md:pr-0"
          role="list"
        >
          {children}
        </ul>
      </div>

      {/* ON the photographs, centred — where they started. They were moved
          above the row after Tina sent a screenshot of one sitting on a model,
          then moved back at her request ("but them back where they were"). Her
          call: this is the placement she wants, and it is the same one every
          other rail on the site uses.
          `.rail-arrow` is absolutely positioned against the wrapper above,
          which now bleeds to the right screen edge — so `right: 6` puts the
          next arrow at the edge of the screen rather than the content column. */}
      <button
        type="button"
        aria-label="Previous photographs"
        onClick={() => scrollBy(-1)}
        className="rail-arrow rail-arrow-sm rail-arrow-left"
        style={{ top: '38%', left: 6, opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
        tabIndex={canLeft ? 0 : -1}
        aria-hidden={!canLeft}
      >
        <CaretLeft size={13} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="More photographs"
        onClick={() => scrollBy(1)}
        className="rail-arrow rail-arrow-sm"
        style={{ top: '38%', right: 6, opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
        tabIndex={canRight ? 0 : -1}
        aria-hidden={!canRight}
      >
        <CaretRight size={13} weight="bold" />
      </button>
    </div>
  );
}
