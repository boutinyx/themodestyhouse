'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { brandVibe, VIBES } from '@/lib/vibes';

const STEP = 24;

export function FilterableGrid({ products }: { products: Product[] }) {
  const [brand, setBrand] = useState('all');
  const [occasion, setOccasion] = useState('all');
  const [vibe, setVibe] = useState('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(STEP);

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brandName))).sort().map((b) => ({ value: b, label: b })),
    [products]
  );
  const occasions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.occasion))).sort()
      .map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) })),
    [products]
  );
  const vibes = VIBES.map((v) => ({ value: v.slug, label: v.title }));

  // Same match rule as DirectoryBrowser — title or brand, case-insensitive — so
  // searching behaves identically wherever the index console appears.
  // Memoised for the same reason as DirectoryBrowser: unmemoised it re-filtered
  // the whole lane on every render, including every keystroke.
  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (brand === 'all' || p.brandName === brand) &&
          (occasion === 'all' || p.occasion.includes(occasion)) &&
          (vibe === 'all' || brandVibe[p.brandSlug] === vibe) &&
          (query === '' ||
            p.title.toLowerCase().includes(query) ||
            p.brandName.toLowerCase().includes(query))
      ),
    [products, brand, occasion, vibe, query]
  );

  // Reset the "load more" count whenever a filter changes.
  // TODO: express this as derived state (or remount via key) rather than an
  // effect; doing so changes paging behaviour, so it is deliberately not
  // bundled into the deployment-hardening change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, occasion, vibe, q]);

  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. */}
      <IndexPanel q={q} onQ={setQ} className="mb-8">
        <FilterDropdown label="Aesthetic" value={vibe} options={vibes} onSelect={setVibe} />
        {occasions.length > 0 && (
          <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        )}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
      </IndexPanel>

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
