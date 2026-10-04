'use client';
import { useRef, type ReactNode } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

/**
 * Horizontal swipe row with arrow buttons for mouse users. Touch scrolls
 * natively (scroll-snap); the arrows are hidden below md where they are not
 * needed. The next card always peeks in, so the row reads as "there is more".
 */
export function CreatorRail({ title, children }: { title: string; children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const slide = (dir: number) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.45, behavior: 'smooth' });
  return (
    <section className="pt-14 md:pt-18">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="serif text-[28px] md:text-[36px] leading-none" style={{ color: 'var(--aubergine)' }}>
          {title}
        </h2>
        <div className="hidden md:flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => slide(d)}
              aria-label={d < 0 ? 'Previous creators' : 'Next creators'}
              className="w-[42px] h-[42px] rounded-full grid place-items-center"
              style={{ background: '#fff', border: '1px solid var(--hairline)', color: 'var(--aubergine)' }}
            >
              {d < 0 ? <CaretLeft size={18} /> : <CaretRight size={18} />}
            </button>
          ))}
        </div>
      </div>
      <div ref={row} className="no-scrollbar flex gap-5 overflow-x-auto snap-x snap-mandatory pb-1.5">
        {children}
      </div>
    </section>
  );
}
