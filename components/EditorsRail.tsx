'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/price';

type Pick = {
  id: string;
  url: string;
  image: string;
  title: string;
  brandName: string;
  price: number;
  currency: string;
};


export default function EditorsRail({ picks }: { picks: Pick[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="flex gap-6 overflow-x-auto no-scrollbar pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {picks.map((p) => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group shrink-0"
            style={{ width: 230, scrollSnapAlign: 'start' }}
          >
            <div className="relative overflow-hidden" style={{ borderRadius: 6, border: '1px solid var(--hairline)', background: 'var(--bone)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.title}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ height: 300 }}
              />
              <span className="badge absolute top-3 left-3">✦ Editor&rsquo;s pick</span>
            </div>
            <div className="eyebrow mt-3">{p.brandName}</div>
            <div className="serif mt-1" style={{ fontSize: 17, color: 'var(--ink)', lineHeight: 1.2 }}>{p.title}</div>
            <div className="brand-label mt-1">{formatPrice(p.price, p.currency)}</div>
          </a>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="rail-arrow rail-arrow-left"
        style={{ opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="rail-arrow rail-arrow-right"
        style={{ opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
      >
        ›
      </button>
    </div>
  );
}
