'use client';
import { useMemo, useState, useEffect } from 'react';
import type { CompactCatalogue } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import { LAYERING_SUBTYPE_LABELS, OUTERWEAR_SUBTYPE_LABELS } from '@/lib/specialty';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { useCurrency } from './CurrencyProvider';

const STEP = 24;

export function FilterableGrid({
  catalogue: cat,
  initialType,
}: {
  catalogue: CompactCatalogue;
  /** From the lane page's ?type= — e.g. the nav flyout's "Blazers" link
   *  lands on /outerwear?type=blazer. Only ever set from a controlled list of
   *  hrefs this codebase generates itself (Nav.tsx), but still validated
   *  against the catalogue's real subtype columns rather than trusted
   *  outright — an arbitrary query string is user input. */
  initialType?: string;
}) {
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  const [type, setType] = useState(() => {
    if (!initialType) return 'all';
    if ((cat.layeringSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.outerwearSubtypes as string[]).includes(initialType)) return initialType;
    return 'all';
  }); // layering OR outerwear subtype, or 'all'
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(STEP);
  const [sort, setSort] = useState<SortKey>('featured');
  const { preference } = useCurrency();

  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );
  // Non-empty on exactly ONE lane at a time — /layering-basics has real
  // layeringSubtype values and an empty outerwearSubtypes array; /outerwear
  // is the reverse. Every other lane has both empty, so `types` is `[]` and
  // the dropdown doesn't render at all (see the `types.length > 0` gate
  // below) — same pattern the Occasion dropdown used before it was pulled
  // (2026-08-12). Kept in each column's own canonical order
  // (lib/specialty.ts), not resorted here. Falls back to outerwear when
  // layering is empty rather than concatenating the two: a lane is never
  // both at once, by construction (isLayering/isOuterwear are mutually
  // exclusive — see lib/specialty.ts::isOuterwear's isLayering() guard).
  const types = useMemo(
    () =>
      cat.layeringSubtypes.length > 0
        ? cat.layeringSubtypes.map((t) => ({ value: t, label: LAYERING_SUBTYPE_LABELS[t] }))
        : cat.outerwearSubtypes.map((t) => ({ value: t, label: OUTERWEAR_SUBTYPE_LABELS[t] })),
    [cat]
  );

  // Same match rule as DirectoryBrowser — title or brand, case-insensitive — so
  // searching behaves identically wherever the index console appears.
  // Filtering runs over the columnar row indices, not decoded objects: a brand
  // match is one integer compare instead of a string compare across every
  // product, and only the rows actually shown get decoded into cards below.
  const query = q.trim().toLowerCase();
  const brandIdx = brand === 'all' ? -1 : cat.brands.findIndex((b) => b.slug === brand);
  const usingOuterwearTypes = cat.layeringSubtypes.length === 0 && cat.outerwearSubtypes.length > 0;
  const typeIdx =
    type === 'all'
      ? -1
      : usingOuterwearTypes
        ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
        : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        const rowTypeIdx = usingOuterwearTypes ? cat.rows.outerwearSubtypeIdx[i] : cat.rows.layeringSubtypeIdx[i];
        if (rowTypeIdx !== typeIdx) continue;
      }
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, brandIdx, typeIdx, usingOuterwearTypes, query]);

  const sortedRows = useMemo(
    () => sortRowIndices(cat, filteredRows, sort, preference),
    [cat, filteredRows, sort, preference],
  );

  // Reset the "load more" count whenever a filter changes.
  // `sort` is deliberately NOT in this dependency array: reordering the same
  // set of rows is not a change of set, so discarding what has already been
  // loaded would be gratuitous. Same reasoning as DirectoryBrowser.tsx.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(STEP);
  }, [brand, type, q]);

  const shownRows = sortedRows.slice(0, visible);
  const shownCards = useMemo(() => shownRows.map((i) => decodeCard(cat, i)), [cat, shownRows]);

  return (
    <div>
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. Layering
          Basics and Outerwear are the two exceptions — each is one category
          by garment/specialty-status but spans several genuinely different
          kinds of piece, so they alone get a "Type" dropdown, gated on
          `types.length > 0` so no other lane ever renders it. */}
      <IndexPanel q={q} onQ={setQ} className="mb-8">
        {types.length > 0 && (
          <FilterDropdown label="Type" value={type} options={types} onSelect={setType} />
        )}
        {/* Occasion filter pulled from the UI 2026-08-12 at Tina's request —
            broken, pending a fix. The underlying data (cat.occasions,
            rows.occasionMask) is untouched in lib/compactCatalogue.ts;
            restoring this is re-adding the state/memo/filter-branch removed
            here, not re-deriving anything. See
            docs/log/2026-08-12-occasion-filter-removed.md. */}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* Unlike the two above, this dropdown's "nothing chosen" value is a
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

      <div className="brand-label mb-4">
        Showing {shownCards.length} of {sortedRows.length}
      </div>

      {sortedRows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <>
          <div className="product-grid">
            {shownCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {visible < sortedRows.length && (
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
