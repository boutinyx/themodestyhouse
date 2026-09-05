'use client';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { CompactCatalogue, CardSlice, CardSource } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import type { Garment } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from '@/lib/colour';
import { useCurrency } from './CurrencyProvider';
import { FX_BASE } from '@/lib/fx';
import { priceBounds, withinPrice, clampRange } from '@/lib/priceFilter';
import PriceRange from '@/components/PriceRange';
import { trackGoal } from '@/lib/pulse';
import { useZeroResultSearch } from './useZeroResultSearch';
import { LanguageNote } from './LanguageNote';

const STEP = 24;
const GARMENT_LABEL: Record<string, string> = {
  dress: 'Dresses', abaya: 'Abayas', hijab: 'Hijabs', skirt: 'Skirts',
  top: 'Tops', trousers: 'Trousers', set: 'Sets', swim: 'Swimwear',
};

export function DirectoryBrowser({ catalogue: cat, initialQuery = '', source = 'browse' }: {
  catalogue: CompactCatalogue;
  initialQuery?: string;
  /** Which server-side list `cat`'s row indices address, for fetching the cards
   *  beyond the embedded window. Defaults to 'browse' — what this component was
   *  hardcoded to until 2026-09-01, when /new-in became a second caller and
   *  every "Load more" past card 48 silently 409'd against a list of a
   *  different length. */
  source?: CardSource;
}) {
  const [q, setQ] = useState(initialQuery);
  const [garment, setGarment] = useState('all'); // Garment value, or 'all'
  const [brand, setBrand] = useState('all'); // brand slug, or 'all'
  const [colour, setColour] = useState('all'); // ColourFamily, or 'all'
  // null until the visitor touches the slider. Kept separate from `bounds` so
  // an untouched control filters nothing at all — the alternative, seeding it
  // to [min, max], makes every currency change or filter change silently
  // re-clamp a range the visitor never chose.
  const [price, setPrice] = useState<[number, number] | null>(null);
  const [visible, setVisible] = useState(STEP);
  const [sort, setSort] = useState<SortKey>('featured');
  // Card data for rows beyond the window the server embedded. See the
  // index/card split in lib/compactCatalogue.ts: the index columns for all
  // ~13k rows travel with the page (so filtering stays instant and local),
  // the columns only a CARD needs are fetched for what is actually on screen.
  const [extraCards, setExtraCards] = useState<CardSlice>({ rows: {} });
  const router = useRouter();
  const pathname = usePathname();
  /** The rowCount we already know is stale, because a 409 told us so and a
   *  router.refresh() is in flight. While `cat.rowCount` still equals this, the
   *  card fetch below is skipped entirely — otherwise clearing `extraCards`
   *  immediately re-fires the effect against the SAME stale catalogue, the
   *  server 409s a second time, and the fallback hard-reloads: which is the
   *  first version of this fix, and it did not work. */
  const staleRowCount = useRef<number | null>(null);
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
  // cat.colours is already in COLOUR_FAMILY_LABELS's canonical order — see the
  // pre-pass in encodeCatalogue — so this maps without re-sorting.
  //
  // The leading 'all' row is supplied rather than left to FilterDropdown, which
  // otherwise synthesises `All ${label.toLowerCase()}` — "All colour", which
  // reads wrong where "All brand" does not. A listed default option makes it
  // read "All colours"; the component borrows that label for its top row and
  // drops the duplicate from the list, exactly as Sort's 'featured' does. That
  // row carries no swatch, so its label sits flush left while the colours are
  // indented past their dot — left as is, because it is the row that CLEARS the
  // filter rather than a sixteenth colour, and a dot standing for "no colour"
  // would have to be invented.
  const colours = useMemo(
    () => [
      { value: 'all', label: 'All colours' },
      ...cat.colours.map((c) => ({
        value: c as string,
        label: COLOUR_FAMILY_LABELS[c],
        swatch: COLOUR_FAMILY_SWATCH[c],
      })),
    ],
    [cat],
  );

  // Filtering runs over the columnar row indices — see the same note in
  // FilterableGrid.tsx. Only the rows actually rendered get decoded below.
  const query = q.trim().toLowerCase();
  const garmentIdx = garment === 'all' ? -1 : cat.garments.indexOf(garment as Garment);
  const brandIdx = brand === 'all' ? -1 : cat.brands.findIndex((b) => b.slug === brand);
  const colourIdx = colour === 'all' ? -1 : cat.colours.indexOf(colour as (typeof cat.colours)[number]);

  const rowsBeforePrice = useMemo(() => {
    const rows: number[] = [];
    const n = cat.rows.title.length;
    for (let i = 0; i < n; i++) {
      if (garmentIdx !== -1 && cat.rows.garmentIdx[i] !== garmentIdx) continue;
      if (brandIdx !== -1 && cat.rows.brandIdx[i] !== brandIdx) continue;
      // A BIT TEST, not an equality: colourMask carries every family that
      // applies, so a two-colour product matches on either chip (Tina,
      // 2026-08-29, wanting to pick two colours at once). `?? 0` because the
      // column is dropped when every row is 0 — a surface where nothing is
      // classified must still filter to empty rather than crash on an absent
      // array. Same contract as the subtype columns, against colourMask's own
      // sentinel of 0.
      if (colourIdx !== -1 && ((cat.rows.colourMask?.[i] ?? 0) & (1 << colourIdx)) === 0) continue;
      if (query !== '') {
        const title = cat.rows.title[i].toLowerCase();
        const brandName = cat.brands[cat.rows.brandIdx[i]].name.toLowerCase();
        if (!title.includes(query) && !brandName.includes(query)) continue;
      }
      rows.push(i);
    }
    return rows;
  }, [cat, garmentIdx, brandIdx, colourIdx, query]);

  const bounds = useMemo(
    () => priceBounds(cat, rowsBeforePrice, preference),
    [cat, rowsBeforePrice, preference],
  );

  // Clamp rather than reset when the bounds move under a chosen range —
  // switching display currency must not throw away the visitor's choice.
  // `boundsHistory` tracks the bounds as of the last render that actually
  // changed them, so clampRange can reposition the range PROPORTIONALLY into
  // the new band instead of pushing both handles to the same absolute (and,
  // across a currency change, meaningless) numbers. A ref would be simpler,
  // but reading/writing one during render is a `react-hooks/refs` lint error
  // — and rightly so here, since an effect would run one paint too late,
  // flashing the collapsed range. This is React's own documented pattern for
  // adjusting state during render ("Adjusting some state when a prop
  // changes"): the conditional setState below re-renders synchronously,
  // before anything commits, so `boundsHistory.prev` is never stale by the
  // time `effectivePrice` reads it.
  const [boundsHistory, setBoundsHistory] = useState(() => ({ prev: bounds, curr: bounds }));
  if (boundsHistory.curr !== bounds) {
    setBoundsHistory({ prev: boundsHistory.curr, curr: bounds });
  }
  const effectivePrice = useMemo<[number, number] | null>(
    () => (price && bounds.usable ? clampRange(price, bounds, boundsHistory.prev) : null),
    [price, bounds, boundsHistory.prev],
  );

  const filteredRows = useMemo(() => {
    if (!effectivePrice) return rowsBeforePrice;
    // `bounds.openTop` is a fact about the whole catalogue (rows exist above
    // the p95 cap) — it must not be handed to withinPrice unconditionally,
    // or the top handle would mean "and up" even parked well below the true
    // max. "And up" only applies once the visitor has actually dragged the
    // top handle all the way to bounds.max, matching PriceRange's own
    // `atTop` check for the "+" label.
    const openTop = bounds.openTop && effectivePrice[1] >= bounds.max;
    return rowsBeforePrice.filter((i) =>
      withinPrice(cat, i, preference, effectivePrice, openTop),
    );
  }, [cat, rowsBeforePrice, effectivePrice, preference, bounds.openTop, bounds.max]);

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
  }, [garment, brand, colour, q, price]);

  // A search that found nothing — the one goal carrying words a visitor typed.
  // `q`, not the lowercased `query`, because the hook does its own trimming and
  // dedupe; `sortedRows`, because that is the set the grid will actually show.
  useZeroResultSearch(q, sortedRows.length);

  const shownRows = sortedRows.slice(0, visible);

  // `source` is an object literal at the /new-in call site, so it is a NEW
  // object on every render — keying the effect on its identity would refetch
  // forever, the same trap `missingKey` below exists for. Same fix and the same
  // shape as components/FilterableGrid.tsx.
  const sourceKey = JSON.stringify(source);

  // Which of the rows about to be painted have no card data yet. Joined into a
  // string for the effect's dependency because `missing` is rebuilt on every
  // render — keying on its identity would refetch forever.
  const missing = shownRows.filter((i) => !cat.cards.rows[i] && !extraCards.rows[i]);
  const missingKey = missing.join(',');

  useEffect(() => {
    if (missingKey === '') return;
    // A 409 already told us this catalogue is stale and a refresh is in flight.
    // Asking again with the same rowCount can only 409 again.
    if (staleRowCount.current === cat.rowCount) return;
    let cancelled = false;
    fetch('/api/catalogue/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, rows: missingKey.split(',').map(Number), rowCount: cat.rowCount }),
    })
      .then((r) => {
        // 409 means the row indices held here no longer address the same
        // products. Two very different causes, and until 2026-08-29 both were
        // treated as a deploy: the catalogue was rebuilt under this tab (a
        // deploy, or the nightly refresh — CLAUDE.md §10.35), OR a signed-in
        // staff member just edited a product from this very page, which
        // changes the published row count immediately.
        //
        // The old handling was `window.location.reload()`. Correct about the
        // data — retrying would paint the WRONG products under the right
        // titles — but for the staff case it is destructive: Tina reported
        // "if i click the load more button after having edited a product
        // instead of loading more down it jumps up to the beginning", and it
        // does exactly that. A hard reload discards `visible` (back to the
        // first 24) and the scroll position, after every single edit.
        //
        // router.refresh() re-renders the server component and streams a fresh
        // catalogue — new row order, new rowCount — WITHOUT tearing down this
        // component, so `visible` and the scroll position survive. The route is
        // `ƒ` (dynamic), so the refresh really does return current data rather
        // than a build-time payload.
        //
        // `extraCards` MUST be dropped at the same time: its keys are absolute
        // row indices against the OLD catalogue, and keeping them would paint
        // exactly the mismatch this guard exists to prevent.
        //
        // If a second 409 arrives for the same rowCount, the refresh did not
        // help — fall back to the original hard reload rather than loop.
        if (r.status === 409) {
          if (staleRowCount.current === cat.rowCount) {
            window.location.reload();
            return null;
          }
          staleRowCount.current = cat.rowCount;
          setExtraCards({ rows: {} });
          router.refresh();
          return null;
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceKey IS source, by value
  }, [missingKey, cat.rowCount, router, sourceKey]);

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
        {bounds.usable && (
          <PriceRange
            bounds={bounds}
            value={effectivePrice ?? [bounds.min, bounds.max]}
            onChange={setPrice}
            currency={preference ?? FX_BASE}
          />
        )}
        {/* `cat.colours.length > 1`, not `colours.length > 1`: `colours` carries
            the synthesised "All colours" row too, so it is never empty. And
            `> 1` rather than `> 0` because a surface where every classified row
            is one colour offers a filter that can only ever be a no-op. */}
        {cat.colours.length > 1 && (
          <FilterDropdown label="Colour" value={colour} options={colours} onSelect={setColour} />
        )}
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
              <button
                onClick={() => {
                  // `depth` is the number of rows AFTER this tap, so the
                  // distribution answers "is the first screen of 24 enough".
                  trackGoal('load_more', { lane: pathname, depth: String(visible + STEP) });
                  setVisible((v) => v + STEP);
                }}
                className="btn-pill"
                style={{ background: 'var(--aubergine)', color: 'var(--parchment)' }}
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
      {/* The corner "i" explaining why a brand's own product page may not
          be in English. Mounted here rather than per-route so it follows the
          grid wherever one is rendered — lanes, /directory, /designers/<slug>
          and /edits/<slug> — instead of needing four hand-written mounts that
          can drift apart. */}
      <LanguageNote />
    </div>
  );
}
