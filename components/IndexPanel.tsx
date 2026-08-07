'use client';
import { useCallback, useRef, useState } from 'react';
import { CurrencySwitcher } from './CurrencySwitcher';

/**
 * The index console — the search field and filter row shared by /directory and
 * every category lane, so the whole site reads as one instrument.
 *
 * Extracted from DirectoryBrowser on 2026-08-07. It had been copy-pasted into
 * FilterableGrid, which then drifted: lanes rendered every brand as a flat pill,
 * so /modest-tops opened with ~50 chips over five rows before a single garment
 * appeared. Filters belong behind a control, not spread across the page.
 */

export function FilterDropdown({
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

  // Whether the list is scrolled to its last row. The fade is a "there is more
  // below" signal, so it has to switch OFF at the bottom — otherwise it still
  // reads as more content and you keep scrolling at a list that has ended.
  // data-scrollable alone could not do this: it is a static
  // `options.length > 7`, answering "can this scroll at all", never "are we
  // there yet".
  const [atEnd, setAtEnd] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const syncAtEnd = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // 1px tolerance: scrollHeight/scrollTop are fractional on HiDPI, so an
    // exact === comparison never becomes true at the bottom.
    const bottomed = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    // A list that does not overflow is trivially "at the end" — no fade.
    setAtEnd(bottomed || el.scrollHeight <= el.clientHeight);
  }, []);

  return (
    <div className="relative group">
      <button type="button" className="chip" data-active={value !== 'all'}>
        {current ? current.label : label} ▾
      </button>
      <div
        className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-40"
        // The panel is shown with CSS, never unmounted, so the list keeps the
        // scroll position and atEnd value from last time. Re-measure as it opens.
        onMouseEnter={syncAtEnd}
        onFocus={syncAtEnd}
      >
        {/* menu-scroll hides the scrollbar and fades the last row instead — the
            fade is the scroll affordance. data-scrollable turns the fade off for
            short lists, so a 3-item menu isn't told it can scroll; data-at-end
            turns it off once you have actually reached the bottom. */}
        <div
          className="menu-scroll rounded-xl border min-w-[190px]"
          data-scrollable={options.length > 7}
          data-at-end={atEnd}
          style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
        >
          <div className="menu-scroll-list p-2" ref={listRef} onScroll={syncAtEnd}>
            <button type="button" onClick={() => onSelect('all')} className="block w-full text-left nav-link py-2 px-3">
              All {label.toLowerCase()}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onSelect(o.value)}
                className="block w-full text-left nav-link py-2 px-3 whitespace-nowrap"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function IndexPanel({
  q,
  onQ,
  className,
  children,
}: {
  q: string;
  onQ: (v: string) => void;
  className?: string;
  /** The <FilterDropdown /> controls for this surface. */
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
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
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search houses, pieces…"
          className="flex-1"
          style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="eyebrow mr-1">Filter</span>
        {children}
        {/* Pushed to the right: it changes how prices READ, it does not filter
            the grid, so it should not sit in the run of filter chips. */}
        <div className="ml-auto flex items-center gap-2">
          <span className="eyebrow">Prices in</span>
          <CurrencySwitcher />
        </div>
      </div>
    </div>
  );
}
