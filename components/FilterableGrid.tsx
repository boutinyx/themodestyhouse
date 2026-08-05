'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

const STEP = 24;

export function FilterableGrid({ products }: { products: Product[] }) {
  const [brand, setBrand] = useState('all');
  const [occasion, setOccasion] = useState('all');
  const [visible, setVisible] = useState(STEP);

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

  // Reset the "load more" count whenever a filter changes.
  // TODO: express this as derived state (or remount via key) rather than an
  // effect; doing so changes paging behaviour, so it is deliberately not
  // bundled into the deployment-hardening change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, occasion]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      <div className="mb-6 p-4 md:p-5" style={{ border: '1px solid var(--hairline)', borderRadius: 24, background: 'var(--bone)' }}>
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
        <div className="flex flex-wrap gap-2">
          <button className="chip" data-active={brand === 'all'} onClick={() => setBrand('all')}>
            All brands
          </button>
          {brands.map((b) => (
            <button key={b} className="chip" data-active={brand === b} onClick={() => setBrand(b)}>
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="brand-label mb-4">
        Showing {shown.length} of {filtered.length}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <>
          <div className="product-grid">
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {visible < filtered.length && (
            <div className="text-center mt-12">
              <button
                onClick={() => setVisible((v) => v + STEP)}
                className="btn-pill"
                style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
