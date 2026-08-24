'use client';
import { useCallback, useRef } from 'react';
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

  const scrollBy = (dir: 1 | -1) => {
    const el = node.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="relative mt-10">
      <div
        className="scroll-fade scroll-fade-x"
        data-fade={fade}
        // --fade-to is the surface this resolves INTO. Parchment, not the
        // class's white default: the story block sits on the page background,
        // and a white ramp would leave a visible pale sliver over it.
        style={{ ['--fade-to' as string]: 'var(--parchment)', ['--fade-size-x' as string]: '90px' }}
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

      {/* Buttons are hidden from assistive tech and from keyboards when there
          is nothing to scroll to — a focusable control that does nothing is
          worse than no control. The rail itself is keyboard-scrollable, so
          nothing is lost. */}
      <button
        type="button"
        aria-label="Previous photographs"
        onClick={() => scrollBy(-1)}
        className="rail-arrow rail-arrow-left"
        style={{ top: '38%', left: 6, opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
        tabIndex={canLeft ? 0 : -1}
        aria-hidden={!canLeft}
      >
        <CaretLeft size={18} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="More photographs"
        onClick={() => scrollBy(1)}
        className="rail-arrow"
        style={{ top: '38%', right: 6, opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
        tabIndex={canRight ? 0 : -1}
        aria-hidden={!canRight}
      >
        <CaretRight size={18} weight="bold" />
      </button>
    </div>
  );
}
