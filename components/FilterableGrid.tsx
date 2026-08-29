'use client';
import { useMemo, useState, useEffect, type ReactNode } from 'react';
import type { CompactCatalogue, CardSlice, CardSource } from '@/lib/compactCatalogue';
import { decodeCard } from '@/lib/compactCatalogue';
import { ProductCard } from './ProductCard';
import { IndexPanel, FilterDropdown } from './IndexPanel';
import { sortRowIndices, SORT_OPTIONS, type SortKey } from '@/lib/sortRows';
import { HIJAB_TYPE_FILTER_LABELS } from '@/lib/hijabTypeFilter';
import { DRESS_SUBTYPE_LABELS, SWIM_SUBTYPE_LABELS, ACTIVE_SUBTYPE_LABELS } from '@/lib/specialty';
import { COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from '@/lib/colour';
import { useCurrency } from './CurrencyProvider';
import { LanguageNote } from './LanguageNote';

const STEP = 24;

export function FilterableGrid({
  catalogue: cat,
  initialType,
  afterFirstRow,
  trailingTile,
  searchable = true,
  showTypeFilter = true,
  laneDomain,
  showConsole = true,
  source,
}: {
  catalogue: CompactCatalogue;
  /** What this grid's row indices index into, so card data for rows beyond the
   *  embedded window can be fetched (lib/compactCatalogue.ts's index/card
   *  split).
   *
   *  OPTIONAL, and absent means "never fetch". A page whose catalogue is small
   *  enough to embed whole passes nothing and behaves exactly as before —
   *  /edits/[slug] is the case, at 275 picks for the largest edit. A page that
   *  omits it AND uses embedCards would silently render a short grid, so the
   *  two belong together at every call site. */
  source?: CardSource;
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
  /** Which subtype domain THIS lane owns (lib/laneSubtypes.ts::domainForLane).
   *  Ownership is declared, never inferred from which columns are non-empty:
   *  a swim cap is `isSwim` AND appears on /modest-hijabs, so that lane's
   *  encoded catalogue carries a populated swimSubtypes column it does not own.
   *  Undefined on the brand and edit grids, which have no lane. */
  laneDomain?: 'layering' | 'outerwear' | 'hijab' | 'swim' | 'active' | null;
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
  // Same shape as `brand` and `fabricType`: plain in-page state, never URL-driven.
  const [colour, setColour] = useState('all');
  const [type, setType] = useState(() => {
    if (!initialType) return 'all';
    if ((cat.layeringSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.outerwearSubtypes as string[]).includes(initialType)) return initialType;
    if ((cat.hijabSubtypes as string[]).includes(initialType)) return initialType;
    // cat.dressSubtypes is DELIBERATELY not accepted here — see the Type
    // dropdown's comment below. Dress subtypes are in-page state only, never
    // URL-driven, so /modest-dresses?type=occasion resolves to 'all'.
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
  // Card data fetched for rows the server did not embed — see the `source` prop.
  const [extraCards, setExtraCards] = useState<CardSlice>({ rows: {} });
  const [cardsError, setCardsError] = useState(false);
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
  // The Modest Dresses "Type" options. `cat.dressSubtypes` is already in
  // DRESS_SUBTYPE_LABELS's canonical order (encodeCatalogue filters that order
  // rather than collecting as it goes), so no sort is needed — same as
  // fabricTypes below.
  const dressTypes = useMemo(
    () => cat.dressSubtypes.map((t) => ({ value: t as string, label: DRESS_SUBTYPE_LABELS[t] })),
    [cat.dressSubtypes],
  );
  // The Modest Swimwear / Modest Activewear "Type" options, same shape and
  // same already-canonical ordering as dressTypes above. Added 2026-08-29:
  // before this, /modest-activewear's only Type control was `fabricTypes`
  // below — the HIJAB FABRIC filter — because 15 of the lane's 56 items are
  // sports hijabs. It offered "Caps & Underscarves", "Instant Hijabs" and
  // "Sport Hijabs" as the only way to narrow a lane of leggings, sports
  // dresses and co-ords. /modest-swimwear had no Type control at all.
  const swimTypes = useMemo(
    () => (laneDomain === 'swim' ? cat.swimSubtypes.map((t) => ({ value: t as string, label: SWIM_SUBTYPE_LABELS[t] })) : []),
    [cat.swimSubtypes, laneDomain],
  );
  const activeTypes = useMemo(
    () => (laneDomain === 'active' ? cat.activeSubtypes.map((t) => ({ value: t as string, label: ACTIVE_SUBTYPE_LABELS[t] })) : []),
    [cat.activeSubtypes, laneDomain],
  );
  const fabricTypes = useMemo(
    () => cat.hijabTypeFilters.map((t) => ({ value: t, label: HIJAB_TYPE_FILTER_LABELS[t] })),
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
  // row carries no swatch, so its label sits flush left while the fifteen
  // colours are indented past their dot — left as is, because it is the row
  // that CLEARS the filter rather than a sixteenth colour, and a dot standing
  // for "no colour" would have to be invented.
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
  //
  // SWIM AND ACTIVE COME FIRST, and that ordering is the fix rather than a
  // preference. The comment above used to say a lane has only one of these
  // non-empty at a time; that stopped being true the moment a lane carried
  // hijabs, which /modest-activewear does (15 of 56) and /modest-swimwear does
  // (swim caps and turbans). Both would otherwise resolve to 'hijab' and
  // filter by the wrong column. swimSubtype()/activeSubtype() each return null
  // unless isSwim()/isActivewear() is true, so these two can only ever be
  // non-empty on their own lane — putting them first is safe everywhere else.
  const typeDomain: 'swim' | 'active' | 'layering' | 'outerwear' | 'hijab' | 'dress' | 'none' =
    laneDomain === 'swim' && cat.swimSubtypes.length > 0
      ? 'swim'
      : laneDomain === 'active' && cat.activeSubtypes.length > 0
        ? 'active'
        : cat.layeringSubtypes.length > 0
          ? 'layering'
          : cat.outerwearSubtypes.length > 0
            ? 'outerwear'
            : cat.hijabSubtypes.length > 0
              ? 'hijab'
              : cat.dressSubtypes.length > 0
                ? 'dress'
                : 'none';
  const typeIdx =
    type === 'all'
      ? -1
      : typeDomain === 'swim'
        ? cat.swimSubtypes.indexOf(type as (typeof cat.swimSubtypes)[number])
        : typeDomain === 'active'
          ? cat.activeSubtypes.indexOf(type as (typeof cat.activeSubtypes)[number])
          : typeDomain === 'outerwear'
            ? cat.outerwearSubtypes.indexOf(type as (typeof cat.outerwearSubtypes)[number])
            : typeDomain === 'hijab'
              ? cat.hijabSubtypes.indexOf(type as (typeof cat.hijabSubtypes)[number])
              : typeDomain === 'dress'
                ? cat.dressSubtypes.indexOf(type as (typeof cat.dressSubtypes)[number])
                : cat.layeringSubtypes.indexOf(type as (typeof cat.layeringSubtypes)[number]);

  const fabricTypeIdx = fabricType === 'all' ? -1 : cat.hijabTypeFilters.indexOf(fabricType as (typeof cat.hijabTypeFilters)[number]);
  const colourIdx = colour === 'all' ? -1 : cat.colours.indexOf(colour as (typeof cat.colours)[number]);

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
          typeDomain === 'swim'
            ? (cat.rows.swimSubtypeIdx?.[i] ?? -1)
            : typeDomain === 'active'
              ? (cat.rows.activeSubtypeIdx?.[i] ?? -1)
              : typeDomain === 'outerwear'
            ? (cat.rows.outerwearSubtypeIdx?.[i] ?? -1)
            : typeDomain === 'hijab'
              ? (cat.rows.hijabSubtypeIdx?.[i] ?? -1)
              : typeDomain === 'dress'
                ? (cat.rows.dressSubtypeIdx?.[i] ?? -1)
                : (cat.rows.layeringSubtypeIdx?.[i] ?? -1);
        if (rowTypeIdx !== typeIdx) continue;
      }
      // Independent of the typeIdx/typeDomain check above — ANDed, not a
      // replacement. A visitor can arrive via the Khimars & Jilbabs flyout
      // link (narrows by sub-category) and also pick "Jersey" here (narrows
      // further by fabric).
      if (fabricTypeIdx !== -1 && (cat.rows.hijabTypeFilterIdx?.[i] ?? -1) !== fabricTypeIdx) continue;
      // A BIT TEST, not an equality: colourMask carries every family that
      // applies, so a two-colour product matches on either chip (Tina,
      // 2026-08-29, wanting to pick two colours at once). `?? 0` because the
      // column is dropped when every row is 0 — a lane where nothing is
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
  }, [cat, brandIdx, typeIdx, typeDomain, fabricTypeIdx, colourIdx, query]);

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
  }, [brand, type, fabricType, colour, q]);

  const shownRows = sortedRows.slice(0, visible);

  // See the identical block in components/DirectoryBrowser.tsx — same split,
  // same reasoning. Kept as two copies rather than a shared hook because the
  // two components already duplicate their whole filter/sort/visible shape and
  // folding only this part out would leave the harder half still duplicated.
  const missing = source ? shownRows.filter((i) => !cat.cards.rows[i] && !extraCards.rows[i]) : [];
  const missingKey = missing.join(',');
  // `source` is an object literal at the lane and designer call sites, so it is
  // a fresh identity on every render. Key the effect on its VALUE.
  const sourceKey = JSON.stringify(source ?? null);

  useEffect(() => {
    if (missingKey === '' || !source) return;
    let cancelled = false;
    fetch('/api/catalogue/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, rows: missingKey.split(',').map(Number), rowCount: cat.rowCount }),
    })
      .then((r) => {
        // The catalogue was rebuilt under this tab — every row index is stale.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceKey IS source, by value
  }, [missingKey, cat.rowCount, sourceKey]);

  const shownCards = useMemo(
    () => shownRows.map((i) => decodeCard(cat, i, extraCards)).filter((c): c is NonNullable<typeof c> => c !== null),
    [cat, shownRows, extraCards],
  );

  return (
    <div>
      {/* The same index console as /directory — one instrument across the site.
          No Category dropdown: this page already IS one category. No Type
          dropdown for the three FLYOUT lanes, as of 2026-08-15 — Outerwear,
          Layering Basics and Hijabs & Scarves filter by subtype via the header
          flyout only; see the note on `type`/`typeIdx` above. Modest Dresses,
          added 2026-08-26, is the exception and does render one — it has no
          flyout of its own to filter from. */}
      {showConsole && (
      <IndexPanel q={q} onQ={setQ} showSearch={searchable} className="mb-8">
        {/* Occasion filter pulled from the UI 2026-08-12 at Tina's request —
            broken, pending a fix. The underlying data (cat.occasions,
            rows.occasionMask) is untouched in lib/compactCatalogue.ts;
            restoring this is re-adding the state/memo/filter-branch removed
            here, not re-deriving anything. See
            docs/log/2026-08-12-occasion-filter-removed.md. */}
        <FilterDropdown label="Brand" value={brand} options={brands} onSelect={setBrand} />
        {/* `cat.colours.length > 1`, not `colours.length > 1`: `colours` carries
            the synthesised "All colours" row too, so it is never empty. And
            `> 1` rather than `> 0` because a lane where every classified row is
            one colour offers a filter that can only ever be a no-op. */}
        {cat.colours.length > 1 && (
          <FilterDropdown label="Colour" value={colour} options={colours} onSelect={setColour} />
        )}
        {/* Only rendered on a lane with fabric/style groups to offer — in
            practice, only /modest-hijabs. Independent of the sub-category
            flyout (Khimars & Jilbabs/Undercaps, 034a985) — see the comment
            on fabricTypeIdx above. */}
        {/* The hijab FABRIC filter. Suppressed where the lane has a Type
            domain of its own, so /modest-activewear and /modest-swimwear can
            never show two "Type" chips — one of which would be about
            headwear. In practice that leaves it on /modest-hijabs only,
            which is where it was always meant to be. */}
        {showTypeFilter && fabricTypes.length > 0 && swimTypes.length === 0 && activeTypes.length === 0 && (
          <FilterDropdown label="Type" value={fabricType} options={fabricTypes} onSelect={setFabricType} />
        )}
        {/* Modest Dresses' Everyday / Occasion / Slip filter, 2026-08-26 —
            Tina: "those 2 are going to ahve a filter in the modest dresses
            catagory... then 1 more filter with slip dresses also a type."

            This is the ONE lane whose subtypes get an in-page dropdown rather
            than a header flyout, and that is deliberate, not an inconsistency:
            the flyouts Hijabs and Basics use hang off their own top-level nav
            triggers, Dresses is a plain row inside the Clothing panel, and the
            nested flyouts that used to hang off such rows were removed on
            2026-08-22 at Tina's request after the column-occlusion saga
            (§10.34/§10.36). Adding one back for Dresses would re-open exactly
            that. A dropdown is also what she literally asked for.

            It shares the `type` state with those flyout lanes but is NOT
            URL-driven, and that is load-bearing rather than laziness. If
            `?type=occasion` were honoured here, app/[lane]/page.tsx would set
            the h1, the <title>, the canonical and the JSON-LD ItemList from
            it (via lib/laneSubtypes.ts) — and then picking a DIFFERENT option
            in this dropdown would change the grid while the heading still read
            "Occasion Dresses", i.e. the exact page-contradicts-itself defect
            the 2026-08-19 subtype work was done to remove. The three flyout
            lanes escape it only because they have no in-page control to
            desync with. So `initialType` explicitly rejects dress subtypes,
            /modest-dresses stays a single canonical URL, and lib/laneSubtypes
            has no entry for it. The closest precedent is the hijab fabric
            dropdown two lines up, which is likewise pure in-page state.

            `showTypeFilter` gates it alongside the hijab
            fabric filter: /edits/[slug] passes false, and an edit cutting
            across categories has no business offering a dress-only chip. The
            two can never both render — a catalogue has dress subtypes or hijab
            fabric groups, never both. */}
        {showTypeFilter && swimTypes.length > 0 && (
          <FilterDropdown label="Type" value={type} options={swimTypes} onSelect={setType} />
        )}
        {showTypeFilter && activeTypes.length > 0 && (
          <FilterDropdown label="Type" value={type} options={activeTypes} onSelect={setType} />
        )}
        {showTypeFilter && dressTypes.length > 0 && (
          <FilterDropdown label="Type" value={type} options={dressTypes} onSelect={setType} />
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
          {cardsError && shownCards.length < shownRows.length && (
            <p className="text-center mt-8" style={{ color: 'var(--muted)', fontFamily: 'var(--font-ui), sans-serif', fontSize: 14 }}>
              Some pieces could not be loaded. Refresh to try again.
            </p>
          )}
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
      {/* The corner "i" explaining why a brand's own product page may not
          be in English. Mounted here rather than per-route so it follows the
          grid wherever one is rendered — lanes, /directory, /designers/<slug>
          and /edits/<slug> — instead of needing four hand-written mounts that
          can drift apart. */}
      <LanguageNote />
    </div>
  );
}
