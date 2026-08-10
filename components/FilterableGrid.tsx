'use client';
import { useMemo, useState, useEffect } from 'react';
import type { CompactCatalogue } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';

const STEP = 24;

export function FilterableGrid({ catalogue: cat }: { catalogue: CompactCatalogue }) {
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  const [occasion, setOccasion] = useState('all');
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(STEP);

  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );
  const occasions = useMemo(
    () => [...cat.occasions].sort().map((o) => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) })),
    [cat]
  );

  // Same match rule as DirectoryBrowser — title or brand, case-insensitive — so
  // searching behaves identically wherever the index console appears.
  // Filtering runs over the columnar row indices, not decoded objects: a brand
  // match is one integer compare instead of a string compare across every
  // product, and only the rows actually shown get decoded into cards below.
  const query = q.trim().toLowerCase();
  const brandIdx = brand === 'all' ? -1 : cat.brands.findIndex((b) => b.slug === brand);
  const occasionIdx = occasion === 'all' ? -1 : cat.occasions.indexOf(occasion);
  const occasionBit = occasionIdx === -1 ? 0 : 1 << occasionIdx;

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (occasionBit !== 0 && (cat.rows.occasionMask[i] & occasionBit) === 0) continue;
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, brandIdx, occasionBit, query]);

  // Reset the "load more" count whenever a filter changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, occasion, q]);

  const shownRows = filteredRows.slice(0, visible);
  const shownCards = useMemo(() => shownRows.map((i) => decodeCard(cat, i)), [cat, shownRows]);

  return (
    <div>
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. */}
      <IndexPanel q={q} onQ={setQ} className="mb-8">
        {occasions.length > 0 && (
          <FilterDropdown label="Occasion" value={occasion} options={occasions} onSelect={setOccasion} />
        )}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
      </IndexPanel>

      <div className="brand-label mb-4">
        Showing {shownCards.length} of {filteredRows.length}
      </div>

      {filteredRows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <>
          <div className="product-grid">
            {shownCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {visible < filteredRows.length && (
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
