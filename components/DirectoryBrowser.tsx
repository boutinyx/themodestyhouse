'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { brandVibe, VIBES } from '@/lib/vibes';

const STEP = 24;
const GARMENT_LABEL: Record<string, string> = {
  dress: 'Dresses', abaya: 'Abayas', hijab: 'Hijabs', skirt: 'Skirts',
  top: 'Tops', trousers: 'Trousers', set: 'Sets', swim: 'Swimwear',
};

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative group">
      <button type="button" className="chip" data-active={value !== 'all'}>
        {current ? current.label : label} ▾
      </button>
      <div className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-40">
        <div
          className="rounded-xl border p-2 min-w-[190px] max-h-72 overflow-auto"
          style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
        >
          <button type="button" onClick={() => onSelect('all')} className="block w-full text-left nav-link py-2 px-3">
            All {label.toLowerCase()}
          </button>
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => onSelect(o.value)} className="block w-full text-left nav-link py-2 px-3 whitespace-nowrap">
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  const query = q.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (garment === 'all' || p.garment === garment) &&
      (vibe === 'all' || brandVibe[p.brandSlug] === vibe) &&
      (occasion === 'all' || p.occasion.includes(occasion)) &&
      (brand === 'all' || p.brandName === brand) &&
      (query === '' || p.title.toLowerCase().includes(query) || p.brandName.toLowerCase().includes(query))
  );

  // Reset the "load more" count whenever a filter changes. See the TODO in
  // components/FilterableGrid.tsx — same pattern, same planned fix.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setVisible(STEP); }, [garment, vibe, occasion, brand, q]);
  const shown = filtered.slice(0, visible);

  return (
    <div>
      {/* the index — one console, filters as dropdowns */}
      <div style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 8, boxShadow: '0 30px 70px -40px rgba(42,18,38,.5)', padding: '22px 26px' }}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <span className="serif italic text-lg whitespace-nowrap" style={{ color: 'var(--ink)' }}>Search the index</span>
          <input
            aria-label="Search houses and pieces"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search houses, pieces…"
            className="flex-1"
            style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="eyebrow mr-1">Refine</span>
          <FilterDropdown label="Category" value={garment} options={garments} onSelect={setGarment} />
          <FilterDropdown label="Aesthetic" value={vibe} options={vibes} onSelect={setVibe} />
          <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
          <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        </div>
      </div>

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
