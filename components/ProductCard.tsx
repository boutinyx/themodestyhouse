import type { Product } from '@/lib/types';

export function ProductCard({ p }: { p: Product }) {
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer sponsored" className="product-card block">
      <div className="product-imgwrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.image} alt={p.title} className="product-img w-full aspect-[3/4] object-cover" loading="lazy" />
      </div>
      <div className="p-2.5">
        <div className="brand-label">{p.brandName}</div>
        <div className="serif text-[15px] leading-snug mt-1 truncate">{p.title}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm" style={{ color: 'var(--ink)' }}>
            {p.currency} {p.price.toFixed(2)}
          </span>
          <span className="btn-pill">Shop</span>
        </div>
      </div>
    </a>
  );
}
