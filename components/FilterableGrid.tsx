'use client';
import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

export function FilterableGrid({ products }: { products: Product[] }) {
  const [brand, setBrand] = useState('all');
  const [occasion, setOccasion] = useState('all');

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandName))).sort(),
    [products]
  );
  const occasions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.occasion))).sort(),
    [products]
  );

  const filtered = products.filter(
    (p) =>
      (brand === 'all' || p.brandName === brand) &&
      (occasion === 'all' || p.occasion.includes(occasion))
  );

  return (
    <div>
      {occasions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button className="chip" data-active={occasion === 'all'} onClick={() => setOccasion('all')}>
            All occasions
          </button>
          {occasions.map((o) => (
            <button key={o} className="chip capitalize" data-active={occasion === o} onClick={() => setOccasion(o)}>
              {o}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-5">
        <button className="chip" data-active={brand === 'all'} onClick={() => setBrand('all')}>
          All brands
        </button>
        {brands.map((b) => (
          <button key={b} className="chip" data-active={brand === b} onClick={() => setBrand(b)}>
            {b}
          </button>
        ))}
      </div>
      <div className="brand-label mb-4">{filtered.length} pieces</div>
      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <div className="product-grid">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
