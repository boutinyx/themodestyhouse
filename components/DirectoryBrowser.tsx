'use client';
import { useMemo, useState, useEffect } from 'react';
import type { CompactCatalogue, CardSlice } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import type { Garment } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { useCurrency } from './CurrencyProvider';

const STEP = 24;
const GARMENT_LABEL: Record<string, string> = {
  dress: 'Dresses', abaya: 'Abayas', hijab: 'Hijabs', skirt: 'Skirts',
  top: 'Tops', trousers: 'Trousers', set: 'Sets', swim: 'Swimwear',
};

export function DirectoryBrowser({ catalogue: cat, initialQuery = '' }: { catalogue: CompactCatalogue; initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const [garment, setGarment] = useState('all'); // Garment value, or 'all'
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  const [visible, setVisible] = useState(STEP);
  const [sort, setSort] = useState<SortKey>('featured');
  // Card data for rows beyond the window the server embedded. See the
  // index/card split in lib/compactCatalogue.ts: the index columns for all
  // ~13k rows travel with the page (so filtering stays instant and local),
  // the columns only a CARD needs are fetched for what is actually on screen.
  const [extraCards, setExtraCards] = useState<CardSlice>({ rows: {} });
  const [cardsError, setCardsError] = useState(false);
  const { preference } = useCurrency();

  const garments = useMemo(() => {
    const present = new Set(cat.garments);
    return Object.keys(GARMENT_LABEL).filter((g) => present.has(g as Garment)).map((g) => ({ value: g, label: GARMENT_LABEL[g] }));
  }, [cat]);
  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );

  // Filtering runs over the columnar row indices — see the same note in
  // FilterableGrid.tsx. Only the rows actually rendered get decoded below.
  const query = q.trim().toLowerCase();
  const garmentIdx = garment === 'all' ? -1 : cat.garments.indexOf(garment as Garment);
  const brandIdx = brand === 'all' ? -1 : cat.brands.findIndex((b) => b.slug === brand);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (garmentIdx !== -1 && cat.rows.garmentIdx[i] !== garmentIdx) continue;
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, garmentIdx, brandIdx, query]);

  const sortedRows = useMemo(
    () => sortRowIndices(cat, filteredRows, sort, preference),
    [cat, filteredRows, sort, preference],
  );

  // Reset the "load more" count whenever a filter changes. See the TODO in
  // components/FilterableGrid.tsx — same pattern, same planned fix.
  // `sort` is deliberately NOT in this dependency array: reordering the same
  // set of rows is not a change of set, so discarding what has already been
  // loaded would be gratuitous.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [garment, brand, q]);

  const shownRows = sortedRows.slice(0, visible);

  // Which of the rows about to be painted have no card data yet. Joined into a
  // string for the effect's dependency because `missing` is rebuilt on every
  // render — keying on its identity would refetch forever.
  const missing = shownRows.filter((i) => !cat.cards.rows[i] && !extraCards.rows[i]);
  const missingKey = missing.join(',');

  useEffect(() => {
    if (missingKey === '') return;
    let cancelled = false;
    fetch('/api/catalogue/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'browse', rows: missingKey.split(',').map(Number), rowCount: cat.rowCount }),
    })
      .then((r) => {
        // 409 means the catalogue was rebuilt under this tab — a deploy, or the
        // nightly refresh (CLAUDE.md §10.35). Every row index held here now
        // points at a different product, so retrying would paint the WRONG
        // products under the right titles. Reload instead.
        if (r.status === 409) { window.location.reload(); return null; }
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<CardSlice>;
      })
      .then((slice) => {
        if (cancelled || !slice) return;
        setExtraCards((prev) => ({ rows: { ...prev.rows, ...slice.rows } }));
        setCardsError(false);
      })
      .catch(() => { if (!cancelled) setCardsError(true); });
    return () => { cancelled = true; };
  }, [missingKey, cat.rowCount]);

  // decodeCard returns null while a row's card data is still in flight. Render
  // what has arrived rather than holding the whole grid back.
  const shownCards = useMemo(
    () => shownRows.map((i) => decodeCard(cat, i, extraCards)).filter((c): c is NonNullable<typeof c> => c !== null),
    [cat, shownRows, extraCards],
  );

  return (
    <div>
      {/* the index — one console, filters as dropdowns (components/IndexPanel) */}
      <IndexPanel q={q} onQ={setQ}>
        <FilterDropdown label="Category" value={garment} options={garments} onSelect={setGarment} />
        {/* Occasion filter pulled from the UI 2026-08-12 at Tina's request —
            broken, pending a fix. The underlying data (cat.occasions,
            rows.occasionMask) is untouched in lib/compactCatalogue.ts;
            restoring this is re-adding the state/memo/filter-branch removed
            here, not re-deriving anything. See
            docs/log/2026-08-12-occasion-filter-removed.md. */}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* Unlike the three above, this dropdown's "nothing chosen" value is a
            real key: 'featured' IS a sort order, not the absence of one. It is
            also listed in SORT_OPTIONS, so FilterDropdown labels its default
            row from there rather than synthesising "All sort", and renders that
            row once rather than twice. */}
        <FilterDropdown
          label="Sort"
          value={sort}
          defaultValue="featured"
          options={SORT_OPTIONS}
          onSelect={(v) => setSort(v as SortKey)}
        />
      </IndexPanel>

      <div className="brand-label mt-8 mb-4">Showing {shownCards.length} of {sortedRows.length}</div>
      {sortedRows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <>
          <div className="product-grid">
            {shownCards.map((p, i) => (
              // The first row is the LCP candidate — see the priority note in ProductCard.
              <ProductCard key={p.id} p={p} priority={i < 4} />
            ))}
          </div>
          {cardsError && shownCards.length < shownRows.length && (
            <p className="text-center mt-8" style={{ color: 'var(--muted)', fontFamily: 'var(--font-ui), sans-serif', fontSize: 14 }}>
              Some pieces could not be loaded. Refresh to try again.
            </p>
          )}
          {visible < sortedRows.length && (
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
