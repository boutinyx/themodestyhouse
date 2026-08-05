'use client';
import type { Product } from '@/lib/types';
import { formatPrice } from '@/lib/price';
import { useQuickView } from './QuickView';

export function ProductCard({ p }: { p: Product }) {
  const { open, isFav, toggleFav } = useQuickView();
  const fav = isFav(p.id);
  return (
    <div
      className="group block text-center cursor-pointer"
      onClick={() => open(p)}
      role="button"
      tabIndex={0}
      aria-label={`Quick view: ${p.title} by ${p.brandName}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(p); } }}
    >
      <div
        className="relative overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius-image)', background: '#fff' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.title}
          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <button
          onClick={(e) => { e.stopPropagation(); toggleFav(p); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition"
          style={{ background: 'rgba(255,255,255,0.85)', color: fav ? 'var(--aubergine)' : 'var(--muted)' }}
          aria-label="Add to favourites"
        >
          {fav ? '♥' : '♡'}
        </button>
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="serif text-sm mt-1 px-2 truncate" style={{ color: 'var(--ink)' }}>{p.title}</div>
      <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
        {formatPrice(p.price, p.currency)}
      </div>
    </div>
  );
}
