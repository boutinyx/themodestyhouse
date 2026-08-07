'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { brandVibe, VIBES } from '@/lib/vibes';
import { IndexPanel, FilterDropdown } from './IndexPanel';

const STEP = 24;
const GARMENT_LABEL: Record<string, string> = {
  dress: 'Dresses', abaya: 'Abayas', hijab: 'Hijabs', skirt: 'Skirts',
  top: 'Tops', trousers: 'Trousers', set: 'Sets', swim: 'Swimwear',
};

export function DirectoryBrowser({ products, initialQuery = '' }: { products: Product[]; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [garment, setGarment] = useState('all');
  const [vibe, setVibe] = useState('all');
  const [occasion, setOccasion] = useState('all');
  const [brand, setBrand] = useState('all');
  const [visible, setVisible] = useState(STEP);

  const garments = useMemo(() => {
    const present = new Set(products.map((p) => p.garment));
    return Object.keys(GARMENT_LABEL).filter((g) => present.has(g as never)).map((g) => ({ value: g, label: GARMENT_LABEL[g] }));
  }, [products]);
  const occasions = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.occasion))).sort().map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) })),
    [products]
  );
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brandName))).sort().map((b) => ({ value: b, label: b })), [products]);
  const vibes = VIBES.map((v) => ({ value: v.slug, label: v.title }));

  // Memoised: this walks the WHOLE catalogue (~6.5k rows), and without a memo it
  // re-ran on every render — so every keystroke in the search box filtered 6,500
  // objects before React had even started reconciling.
  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (garment === 'all' || p.garment === garment) &&
          (vibe === 'all' || brandVibe[p.brandSlug] === vibe) &&
          (occasion === 'all' || p.occasion.includes(occasion)) &&
          (brand === 'all' || p.brandName === brand) &&
          (query === '' || p.title.toLowerCase().includes(query) || p.brandName.toLowerCase().includes(query))
      ),
    [products, garment, vibe, occasion, brand, query]
  );

  // Reset the "load more" count whenever a filter changes. See the TODO in
  // components/FilterableGrid.tsx — same pattern, same planned fix.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setVisible(STEP); }, [garment, vibe, occasion, brand, q]);
  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* the index — one console, filters as dropdowns (components/IndexPanel) */}
      <IndexPanel q={q} onQ={setQ}>
        <FilterDropdown label="Category" value={garment} options={garments} onSelect={setGarment} />
        <FilterDropdown label="Aesthetic" value={vibe} options={vibes} onSelect={setVibe} />
        <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
      </IndexPanel>

      <div className="brand-label mt-8 mb-4">Showing {shown.length} of {filtered.length}</div>
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
              <button onClick={() => setVisible((v) => v + STEP)} className="btn-pill" style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
