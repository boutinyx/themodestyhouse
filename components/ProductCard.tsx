import type { Product } from '@/lib/types';

export function ProductCard({ p }: { p: Product }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block text-center"
    >
      <div
        className="overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius-image)', background: '#fff' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.title}
          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="serif text-sm mt-1 px-2 truncate" style={{ color: 'var(--ink)' }}>
        {p.title}
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
        {p.currency} {p.price.toFixed(2)}
      </div>
    </a>
  );
}
