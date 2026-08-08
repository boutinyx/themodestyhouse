'use client';
import { useCallback, useRef, useState } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { CaretDown } from '@phosphor-icons/react';

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
    /* A REAL menu primitive, not a CSS hover trick.
     *
     * What this replaces: a panel shown by `hidden group-hover:block
     * group-focus-within:block`. Neither half of that is a tap. A touch screen
     * has no hover, and Safari — every iPhone and every iPad — deliberately does
     * NOT move focus to a <button> when you click it, so `:focus-within` never
     * became true either. Driven under WebKit at 390px and 819px, tapping
     * "Category" did nothing at all: the filters on /directory and on all twelve
     * lane pages were unreachable on every Apple device. Chromium hid it, because
     * its emulated tap does focus the button.
     *
     * Base UI is what the header nav and the currency switcher already use, so
     * this is the third instance of one pattern rather than a third hand-rolled
     * dropdown. It brings pointer + touch + keyboard, Escape, outside-click, a
     * focus ring that follows arrow keys, and collision-aware positioning — the
     * last of which also fixes the panel running off the right edge of a phone,
     * since it was absolutely positioned at `left: 0` with no awareness of the
     * viewport. RadioGroup is the honest semantics: one choice out of N, and
     * every row gets a real aria-checked.
     */
    <Menu.Root
      // The panel is unmounted while closed, so `atEnd` is stale from last time
      // by the time it reopens. rAF because the list has to be laid out before
      // scrollHeight means anything.
      onOpenChange={(open) => { if (open) requestAnimationFrame(syncAtEnd); }}
    >
      <Menu.Trigger
        // openOnHover keeps the desktop behaviour the CSS version had — point at
        // a chip and it opens — while click/tap now works everywhere. delay 0
        // because the pointer is already still by the time a delay would fire;
        // closeDelay is the grace period for travelling into the panel.
        openOnHover
        delay={0}
        closeDelay={120}
        className="chip inline-flex items-center gap-1.5"
        data-active={value !== 'all'}
      >
        {current ? current.label : label}
        {/* Phosphor, not the ▾ character (CLAUDE.md §6). */}
        <CaretDown size={11} weight="bold" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          sideOffset={8}
          align="start"
          collisionPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
          className="z-50"
        >
          <Menu.Popup
            /* menu-scroll hides the scrollbar and fades the last row instead —
               the fade is the scroll affordance. data-scrollable turns the fade
               off for short lists, so a 3-item menu isn't told it can scroll;
               data-at-end turns it off once you have actually reached the
               bottom. */
            className="menu-scroll rounded-xl border min-w-[190px] max-w-[var(--available-width)] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            data-scrollable={options.length > 7}
            data-at-end={atEnd}
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.RadioGroup
              value={value}
              onValueChange={(v) => onSelect(v as string)}
              className="menu-scroll-list p-2"
              ref={listRef}
              onScroll={syncAtEnd}
            >
              {[{ value: 'all', label: `All ${label.toLowerCase()}` }, ...options].map((o) => (
                <Menu.RadioItem
                  key={o.value}
                  value={o.value}
                  // Base UI leaves radio items open on click so a group can be
                  // adjusted repeatedly. A filter is picked once and the grid
                  // behind it changes, so a menu that lingers reads as stuck.
                  closeOnClick
                  // .menu-row, NOT .nav-link. See the note on .menu-row in
                  // globals.css: .nav-link is inline-flex and centres its
                  // content, which a Tailwind `justify-start` cannot override
                  // (unlayered beats layered in Tailwind v4), and `w-full` on an
                  // inline-level row inflated this panel to 603px for seven
                  // one-word options.
                  className="menu-row"
                  data-active={value === o.value}
                >
                  {o.label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
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
          className="flex-1 min-w-0"
          style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
        />
      </div>
      {/* The currency control used to sit here, pushed right. It moved to the
          header (2026-08-07): currency is a site-wide preference, so having it
          only on the pages that happen to carry an index console meant it was
          missing everywhere else and duplicated on the two that had it. */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="eyebrow mr-1">Filter</span>
        {children}
      </div>
    </div>
  );
}
