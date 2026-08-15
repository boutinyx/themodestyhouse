'use client';

import { useEffect, useRef, useState } from 'react';
// Phosphor, never a text glyph — CLAUDE.md §6. These replace ‹ › and ✦, which
// render at a different weight and optical centre on every platform and cannot
// take a `weight` prop.
import { CaretLeft, CaretRight, Sparkle } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';

type Pick = {
  id: string;
  brandSlug: string;
  garment: string;
  url: string;
  image: string;
  title: string;
  brandName: string;
  price: number;
  currency: string;
};


export default function EditorsRail({
  picks,
  surface = 'editors-rail',
  badgeLabel = "Editor's pick",
}: {
  picks: Pick[];
  /** data-surface on each card's outbound anchor, for click tracking — lets
   *  a second placement (e.g. the product page's "similar items" rail) be
   *  told apart from the homepage's own. */
  surface?: string;
  /** The homepage's rail is genuinely hand-curated, hence the Sparkle badge.
   *  A rail of algorithmically-similar items (same garment, different
   *  product) is not that claim — pass null to omit the badge rather than
   *  mislabel it. */
  badgeLabel?: string | null;
}) {
  const { price } = useCurrency();
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
            data-brand={p.brandSlug}
            data-garment={p.garment}
            data-surface={surface}
            className="group shrink-0"
            style={{ width: 230, scrollSnapAlign: 'start' }}
          >
            <div className="relative overflow-hidden" style={{ borderRadius: 6, border: '1px solid var(--hairline)', background: 'var(--bone)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shopifyImage(p.image, 460)}
                srcSet={shopifySrcSet(p.image)}
                /* The card is a fixed 230px at every width (see the wrapper),
                   so `sizes` is a constant rather than a viewport expression. */
                sizes="230px"
                alt={p.title}
                className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ height: 300 }}
                loading="lazy"
                decoding="async"
              />
              {badgeLabel && (
                <span className="badge absolute top-3 left-3"><Sparkle size={10} weight="fill" />{badgeLabel}</span>
              )}
            </div>
            <div className="brand-label mt-3">{p.brandName}</div>
            <div className="card-title card-title-lg mt-1">{p.title}</div>
            <div className="price mt-1">{price(p.price, p.currency).text}</div>
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
        <CaretLeft size={18} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="rail-arrow rail-arrow-right"
        style={{ opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
      >
        <CaretRight size={18} weight="bold" />
      </button>
    </div>
  );
}
