'use client';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import type { CompactCatalogue } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { HIJAB_TYPE_FILTER_LABELS } from '@/lib/hijabTypeFilter';
import { useCurrency } from './CurrencyProvider';

const STEP = 24;

export function FilterableGrid({
  catalogue: cat,
  initialType,
  afterFirstRow,
  trailingTile,
  searchable = true,
  showTypeFilter = true,
  showConsole = true,
}: {
  catalogue: CompactCatalogue;
  /** From the lane page's ?type= — e.g. the nav flyout's "Blazers" link
   *  lands on /outerwear?type=blazer. Only ever set from a controlled list of
   *  hrefs this codebase generates itself (Nav.tsx), but still validated
   *  against the catalogue's real subtype columns rather than trusted
   *  outright — an arbitrary query string is user input. */
  initialType?: string;
  /** Rendered as a full-width block AFTER the first row of cards.
   *
   *  Placed inside the grid rather than after it because "after the first row"
   *  is a position in the GRID, and the grid has a different column count at
   *  each breakpoint — 2 on a phone, 3 from 768px — so there is no single card
   *  index that means "end of row one". It is done with `order` instead: every
   *  card gets `order: i * 10`, and `.grid-story` takes an order that falls
   *  between them, set per breakpoint in globals.css. The alternative — putting
   *  it after a fixed number of cards in the DOM — leaves a hole in row one at
   *  whichever breakpoint it was not tuned for, because a `grid-column: 1/-1`
   *  child cannot start mid-row. */
  afterFirstRow?: ReactNode;
  /** Rendered as the LAST child of the grid, and only once every row is on
   *  screen. Gated on that deliberately: a "want more?" tile sitting above a
   *  Load more button tells someone they have reached the end when they have
   *  not. */
  trailingTile?: ReactNode;
  /** Whether the index console offers a search field — see IndexPanel's
   *  `showSearch`. False on /edits/[slug]: an edit is ~24 hand-picked pieces,
   *  so searching inside it is a control with nothing to do. */
  searchable?: boolean;
  /** Whether to offer the hijab fabric/style "Type" chip when the catalogue
   *  slice happens to carry one. False on /edits/[slug]: an edit cuts across
   *  garment categories, so a hijab-fabric filter over it is a control that
   *  answers a question the page is not asking. Tina, 2026-08-24: "type can go
   *  out too". Defaults to true, so the lanes are untouched. */
  showTypeFilter?: boolean;
  /** Whether to render the index console AT ALL — the search field and the whole
   *  filter row, not just one control inside it.
   *
   *  False on /designers/[slug], at Tina's request 2026-08-26: "i want the search
   *  bar inside each of those things to be gone like the whole block the search
   *  the filters". It is the right call on that page for a reason the other two
   *  flags do not cover — the console is not merely unhelpful there, it is
   *  MEANINGLESS. A brand page's catalogue is one brand, so `brands` has exactly
   *  one entry and the Brand dropdown offers a choice between "All" and the house
   *  whose page you are already on. `searchable`/`showTypeFilter` would each have
   *  removed one control and left that one behind.
   *
   *  Nothing about the FILTERING is removed, here or anywhere: `q`, `brand`,
   *  `fabricType` and `sort` still exist and still apply. Only the controls that
   *  change them are gone, exactly as with the Outerwear/Layering type dropdowns
   *  above. `initialType` therefore still narrows the grid on arrival. */
  showConsole?: boolean;
}) {
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  // Independent of `type` below (the sub-category flyout's URL-driven
  // state, from 034a985) — this is a plain in-page filter, same shape as
  // `brand`, not synced to the URL. Only meaningful on lanes where
  // cat.hijabTypeFilters is non-empty (in practice: only modest-hijabs).
  const [fabricType, setFabricType] = useState('all');
  const [type, setType] = useState(() => {
    if (!initialType) return 'all';
    if ((cat.layeringSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.outerwearSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.hijabSubtypes as string[]).includes(initialType)) return initialType;
    return 'all';
  }); // layering, outerwear OR hijab subtype, or 'all'
  // Re-syncs `type` when `initialType` (or the catalogue it's validated
  // against) changes — NOT redundant with the useState initializer above,
  // which only ever runs once, at mount. Clicking a DIFFERENT subtype link
  // while already on this lane (e.g. the header flyout's Vests link while
  // viewing /outerwear?type=blazer) is a same-route, search-params-only
  // client navigation: Next.js re-renders the page with a new `initialType`
  // prop, but React does not remount FilterableGrid over it, so the lazy
  // initializer never re-runs and silently keeps showing the OLD subtype's
  // products while the URL and the <h1> (computed fresh server-side on every
  // render) both already say the new one. Tina: "it doesnt change the
  // clothing when i click on a sub catagaorie". Confirmed live: landed on
  // ?type=blazer (fresh mount, correct), then clicked Vests from the
  // still-open header flyout — URL and h1 both updated to "vest"/"Vests",
  // but the grid kept showing blazers until this effect was added.
  useEffect(() => {
    const resolved = !initialType
      ? 'all'
      : (cat.layeringSubtypes as string[]).includes(initialType) ||
          (cat.outerwearSubtypes as string[]).includes(initialType) ||
          (cat.hijabSubtypes as string[]).includes(initialType)
        ? initialType
        : 'all';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(resolved);
  }, [initialType, cat]);
  const [q, setQ] = useState('');
  const [visible, setVisible] = useState(STEP);
  const [sort, setSort] = useState<SortKey>('featured');
  const { preference } = useCurrency();

  const brands = useMemo(
    () => [...cat.brands].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.slug, label: b.name })),
    [cat]
  );
  // cat.hijabTypeFilters is already in HIJAB_TYPE_FILTER_LABELS's canonical
  // order (lib/compactCatalogue.ts's pre-pass) and already contains only the
  // types actually present on this lane — no further sort/filter needed,
  // same as how `brands` above is the one place that DOES need a sort
  // (brand names have no canonical order the way subtype keys do).
  const fabricTypes = useMemo(
    () => cat.hijabTypeFilters.map((t) => ({ value: t, label: HIJAB_TYPE_FILTER_LABELS[t] })),
    [cat]
  );
  // Outerwear's in-page "Type" dropdown was removed 2026-08-13 at Tina's
  // explicit request ("i dont want this filter anymore i only want to be
  // able to filter using the products -> outerwear -> choose"): the header's
  // hover flyout (components/Nav.tsx / components/MobileNav.tsx) is now the
  // ONLY way to reach a filtered Outerwear view. Layering Basics's own
  // in-page dropdown followed the same day it got a flyout of its own,
  // 2026-08-15 ("i want the sub catagories of layering basics to be like
  // outerwear sub catagories"). The underlying filtering by subtype is NOT
  // removed in either case — `typeIdx`/`usingOuterwearTypes` below still
  // apply it, so a flyout link's `?type=blazer` (or `?type=undercap`) still
  // narrows the grid on arrival; only the in-page control to CHANGE it, once
  // there, is gone.

  // Same match rule as DirectoryBrowser — title or brand, case-insensitive — so
  // searching behaves identically wherever the index console appears.
  // Filtering runs over the columnar row indices, not decoded objects: a brand
  // match is one integer compare instead of a string compare across every
  // product, and only the rows actually shown get decoded into cards below.
  const query = q.trim().toLowerCase();
  const brandIdx = brand === 'all' ? -1 : cat.brands.findIndex((b) => b.slug === brand);
  // A lane page only ever has ONE of these three non-empty at a time — a
  // lane is layering-basics, outerwear, or modest-hijabs, never a mix — so
  // this picks whichever subtype column actually applies here, same pattern
  // as the old binary `usingOuterwearTypes` just extended to a third case.
  const typeDomain: 'layering' | 'outerwear' | 'hijab' | 'none' =
    cat.layeringSubtypes.length > 0
      ? 'layering'
      : cat.outerwearSubtypes.length > 0
        ? 'outerwear'
        : cat.hijabSubtypes.length > 0
          ? 'hijab'
          : 'none';
  const typeIdx =
    type === 'all'
      ? -1
      : typeDomain === 'outerwear'
        ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
        : typeDomain === 'hijab'
          ? cat.hijabSubtypes.indexOf(type as (typeof cat.hijabSubtypes)[number])
          : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);

  const fabricTypeIdx = fabricType === 'all' ? -1 : cat.hijabTypeFilters.indexOf(fabricType as (typeof cat.hijabTypeFilters)[number]);

  const filteredRows = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      if (typeIdx !== -1) {
        // `?? -1` is load-bearing: encodeCatalogue omits a subtype column
        // entirely when every row in it is -1 (see the SENTINEL_COLUMNS note
        // in lib/compactCatalogue.ts), so an absent column means "no row has
        // a subtype", which is exactly -1 for every i.
        const rowTypeIdx =
          typeDomain === 'outerwear'
            ? (cat.rows.outerwearSubtypeIdx?.[i] ?? -1)
            : typeDomain === 'hijab'
              ? (cat.rows.hijabSubtypeIdx?.[i] ?? -1)
              : (cat.rows.layeringSubtypeIdx?.[i] ?? -1);
        if (rowTypeIdx !== typeIdx) continue;
      }
      // Independent of the typeIdx/typeDomain check above — ANDed, not a
      // replacement. A visitor can arrive via the Khimars & Jilbabs flyout
      // link (narrows by sub-category) and also pick "Jersey" here (narrows
      // further by fabric).
      if (fabricTypeIdx !== -1 && (cat.rows.hijabTypeFilterIdx?.[i] ?? -1) !== fabricTypeIdx) continue;
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, brandIdx, typeIdx, typeDomain, fabricTypeIdx, query]);

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
  }, [brand, type, fabricType, q]);

  const shownRows = sortedRows.slice(0, visible);
  const shownCards = useMemo(() => shownRows.map((i) => decodeCard(cat, i)), [cat, shownRows]);

  return (
    <div>
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. No Type
          dropdown either, as of 2026-08-15 — all three lanes that have
          subtypes (Outerwear, Layering Basics, Hijabs & Scarves) filter by
          them via the header flyout only; see the note on `type`/`typeIdx`
          above. */}
      {showConsole && (
      <IndexPanel q={q} onQ={setQ} showSearch={searchable} className="mb-8">
        {/* Occasion filter pulled from the UI 2026-08-12 at Tina's request —
            broken, pending a fix. The underlying data (cat.occasions,
            rows.occasionMask) is untouched in lib/compactCatalogue.ts;
            restoring this is re-adding the state/memo/filter-branch removed
            here, not re-deriving anything. See
            docs/log/2026-08-12-occasion-filter-removed.md. */}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* Only rendered on a lane with fabric/style groups to offer — in
            practice, only /modest-hijabs. Independent of the sub-category
            flyout (Khimars & Jilbabs/Undercaps, 034a985) — see the comment
            on fabricTypeIdx above. */}
        {showTypeFilter && fabricTypes.length > 0 && (
          <FilterDropdown label="Type" value={fabricType} options={fabricTypes} onSelect={setFabricType} />
        )}
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
      )}

      {/* NO CHIP ROW. One was built here on 2026-08-26 from a component Tina
          supplied, and removed the same day: "nvm only keep the filter bar".
          The console above is the whole filtering UI. If it ever comes back,
          `components/ActiveFilters.tsx` is in git at 6301e96 along with the
          measurements — the sort-is-not-a-filter reasoning and the 24px tap
          target are the two parts worth not re-deriving. */}
      <div className="brand-label mb-4">
        Showing {shownCards.length} of {sortedRows.length}
      </div>

      {sortedRows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pieces match.</p>
      ) : (
        <>
          <div className="product-grid">
            {shownCards.map((p, i) => (
              // The first row is the LCP candidate — see the priority note in ProductCard.
              // `order` is what lets `afterFirstRow` sit between rows; see its prop doc.
              // A real wrapper, NOT display:contents — `contents` removes the
              // element's box, so it stops being a grid item and `order` on it
              // does nothing at all. The wrapper is the grid item; the card
              // fills it.
              <div key={p.id} style={{ order: i * 10 }}>
                <ProductCard p={p} priority={i < 4} />
              </div>
            ))}
            {afterFirstRow && <div className="grid-story">{afterFirstRow}</div>}
            {/* order beyond every card's `i * 10`, so it is last however many
                are visible — the cards' own order values are what position
                `afterFirstRow`, and this has to sit past all of them. */}
            {trailingTile && visible >= sortedRows.length && (
              <div style={{ order: shownCards.length * 10 + 5 }}>{trailingTile}</div>
            )}
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
