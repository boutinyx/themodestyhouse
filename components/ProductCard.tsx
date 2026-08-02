import type { Product } from '@/lib/types';

export function ProductCard({ p }: { p: Product }) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block border rounded-lg overflow-hidden hover:shadow-md transition"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image} alt={p.title} className="w-full aspect-[3/4] object-cover" loading="lazy" />
      <div className="p-2">
        <div className="text-xs text-gray-500">{p.brandName}</div>
        <div className="text-sm truncate">{p.title}</div>
        <div className="text-sm font-semibold">{p.currency} {p.price.toFixed(2)}</div>
      </div>
    </a>
  );
}
