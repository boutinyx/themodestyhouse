'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

const STEP = 24;

export function FilterableGrid({ products }: { products: Product[] }) {
  const [brand, setBrand] = useState('all');
  const [occasion, setOccasion] = useState('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(STEP);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandName))).sort(),
    [products]
  );
  const occasions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.occasion))).sort(),
    [products]
  );

  // Same match rule as DirectoryBrowser — title or brand, case-insensitive — so
  // searching behaves identically wherever the index console appears.
  const query = q.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (brand === 'all' || p.brandName === brand) &&
      (occasion === 'all' || p.occasion.includes(occasion)) &&
      (query === '' ||
        p.title.toLowerCase().includes(query) ||
        p.brandName.toLowerCase().includes(query))
  );

  // Reset the "load more" count whenever a filter changes.
  // TODO: express this as derived state (or remount via key) rather than an
  // effect; doing so changes paging behaviour, so it is deliberately not
  // bundled into the deployment-hardening change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, occasion, q]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* The index console — same shell, same search field and same "Filter"
          label as /directory (DirectoryBrowser), so every category page reads as
          the same instrument. The chips below stay lane-specific: a Category
          dropdown would be redundant on a page that already IS one category. */}
      <div
        className="mb-8"
        style={{
          background: 'var(--bone)',
          border: '1px solid var(--hairline)',
          borderRadius: 8,
          boxShadow: '0 30px 70px -40px rgba(42,18,38,.5)',
          padding: '22px 26px',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <span className="serif italic text-lg whitespace-nowrap" style={{ color: 'var(--ink)' }}>
            Search the index
          </span>
          <input
            aria-label="Search houses and pieces"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search houses, pieces…"
            className="flex-1"
            style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
          />
        </div>

        {occasions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="eyebrow mr-1">Filter</span>
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

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {occasions.length === 0 && <span className="eyebrow mr-1">Filter</span>}
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
