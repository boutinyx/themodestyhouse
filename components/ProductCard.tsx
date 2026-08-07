'use client';
import type { Product } from '@/lib/types';
import { Heart } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { useQuickView } from './QuickView';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';

export function ProductCard({ p }: { p: Product }) {
  const { open, isFav, toggleFav } = useQuickView();
  const { price } = useCurrency();
  const fav = isFav(p.id);
  return (
    // The card WRAPPER is no longer interactive. It used to be a
    // div[role="button"][tabindex=0] with the favourites <button> inside it, so
    // every card nested one control inside another — axe flags this as
    // `nested-interactive` (24 per grid page), and a screen reader cannot
    // announce either control reliably. The two are now SIBLINGS: a transparent
    // button covering the image opens quick view, and the heart sits above it.
    <div className="group block text-center">
      <div
        className="relative overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius-image)', background: '#fff' }}
      >
        {/* srcset/sizes, so the CDN sends a card-sized photograph instead of the
            1500–2600px original the brand uploaded. `sizes` describes the grid:
            two columns below the 820px hand-written breakpoint, four above.
            Measured effect: see docs/log/2026-08-07-mobile-overhaul.md. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shopifyImage(p.image, 400)}
          srcSet={shopifySrcSet(p.image)}
          sizes="(max-width: 820px) 50vw, 25vw"
          alt={p.title}
          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        {/* Covers the photograph, sits BELOW the heart. Real <button>, so Enter
            and Space work without a hand-rolled onKeyDown. */}
        <button
          type="button"
          onClick={() => open(p)}
          aria-label={`Quick view: ${p.title} by ${p.brandName}`}
          className="absolute inset-0 z-10 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => toggleFav(p)}
          className="absolute top-2 right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{
            background: 'rgba(255,255,255,0.85)',
            color: fav ? 'var(--aubergine)' : 'var(--muted)',
            lineHeight: 1,
          }}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart size={22} weight={fav ? 'fill' : 'regular'} />
        </button>
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="card-title mt-1 px-2">{p.title}</div>
      <div className="price mt-1">{price(p.price, p.currency).text}</div>
    </div>
  );
}
