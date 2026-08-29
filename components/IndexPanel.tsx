'use client';
import { Menu } from '@base-ui-components/react/menu';
import { CaretDown } from '@phosphor-icons/react';
import { useScrollFade } from './useScrollFade';

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
  defaultValue = 'all',
  options,
  onSelect,
}: {
  label: string;
  value: string;
  /**
   * The value that means "nothing chosen here". While `value` equals it the
   * chip reads the generic `label` and is not styled active. Defaults to
   * 'all', which is what Category / Occasion / Brand use and what the synthetic
   * top row carried when this component only ever had one such sentinel.
   * The Sort control's default is a REAL key ('featured'), so it needs to say so.
   */
  defaultValue?: string;
  options: { value: string; label: string; swatch?: string }[];
  onSelect: (v: string) => void;
}) {
  // Deliberately not `options.find(...)`: when the default is a real, listed
  // option — as 'featured' is for Sort — a plain lookup always matches, so the
  // chip would show "Featured" from first paint and never the word "Sort".
  const current = value === defaultValue ? undefined : options.find((o) => o.value === value);

  // The top row IS the default. If `options` already describes that value
  // (Sort's 'featured'), borrow its label and drop the duplicate from the list;
  // otherwise synthesise the `All <label>` row this menu has always had.
  const defaultOption = options.find((o) => o.value === defaultValue);
  const rows = [
    // `swatch` is carried through as well as `label`. It used to borrow only the
    // label, so a listed default option's swatch was silently discarded and its
    // row was the one row in the menu with no dot — i.e. the only way to align
    // that row with the rest was to edit this component, which is not something
    // a caller can discover from the outside. Optional, so the seven call sites
    // that pass no swatch at all — including both Sort dropdowns, whose default
    // IS a listed option — are unaffected: `swatch` is simply undefined there.
    { value: defaultValue, label: defaultOption ? defaultOption.label : `All ${label.toLowerCase()}`, swatch: defaultOption?.swatch },
    ...options.filter((o) => o.value !== defaultValue),
  ];

  // Which edges carry the fade, from a real measurement of this list. This
  // replaces a pair of hand-rolled attributes: `data-at-end`, computed here,
  // and `data-scrollable`, which was the static guess `options.length > 7`.
  // That guess was off by a whole list — a 30px nowrap row in a 272px content
  // box overflows at 10 rows, i.e. 9 options, not 8 — and, worse, had no
  // runtime path back on when it guessed low. See lib/scrollFade.ts.
  const { ref: listRef, fade } = useScrollFade<HTMLDivElement>('y');

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
    // No onOpenChange rAF any more: Base UI unmounts the popup while closed, so
    // the hook's effect re-runs on every open, and ResizeObserver delivers an
    // initial observation after layout — exactly what the rAF was buying.
    <Menu.Root>
      <Menu.Trigger
        // openOnHover keeps the desktop behaviour the CSS version had — point at
        // a chip and it opens — while click/tap now works everywhere. delay 0
        // because the pointer is already still by the time a delay would fire;
        // closeDelay is the grace period for travelling into the panel.
        openOnHover
        delay={0}
        closeDelay={120}
        className="chip inline-flex items-center gap-1.5"
        data-active={value !== defaultValue}
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
            /* .scroll-fade hides the scrollbar and fades the clipped edge
               instead — the fade IS the scroll affordance. data-fade is now a
               measurement of this element rather than a guess about it.
               No --fade-to here on purpose: the class falls back to #fff, which
               is what this popup paints on the line below, so this surface
               renders exactly as it did. data-edges="end" suppresses the new
               leading fade, because this menu has only ever faded its bottom. */
            className="scroll-fade rounded-xl border min-w-[190px] max-w-[var(--available-width)] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            data-fade={fade}
            data-edges="end"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.RadioGroup
              value={value}
              onValueChange={(v) => onSelect(v as string)}
              /* max-h-72 is 18rem, the cap .menu-scroll-list used to impose —
                 it is this caller's layout decision, not the shared class's.
                 overflow-x-hidden closes an accidental scroller: per CSS
                 Overflow, `overflow-y: auto` makes a `visible` overflow-x
                 compute to `auto`, and .menu-row is nowrap, so a long brand
                 name made this list horizontally scrollable with the scrollbar
                 hidden and no fade on that axis. */
              className="scroll-fade-port max-h-72 overflow-y-auto overflow-x-hidden p-2"
              ref={listRef}
            >
              {rows.map((o) => (
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
                  {o.swatch && (
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        // The gap is an inline margin, not a Tailwind `gap-2`.
                        // .menu-row is unlayered CSS and Tailwind utilities are
                        // layered, so anything .menu-row declares wins — it does
                        // not declare `gap`, so `gap-2` would in fact work, but
                        // stating the spacing here keeps the swatch's geometry in
                        // one place and out of that argument entirely.
                        marginRight: 8,
                        flexShrink: 0,
                        borderRadius: 9999,
                        background: o.swatch,
                        // A border on EVERY swatch, not only the pale ones: white
                        // and cream are invisible on a parchment menu without it,
                        // and applying it selectively would make those two dots a
                        // different physical size and shift their labels by a pixel.
                        border: '1px solid var(--hairline)',
                      }}
                    />
                  )}
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
  showSearch = true,
  children,
}: {
  q: string;
  onQ: (v: string) => void;
  className?: string;
  /**
   * Whether to render the search field. Defaults to true — /directory and every
   * lane want it, because those pages are an index of hundreds or thousands of
   * pieces and typing is the fastest way through them.
   *
   * An EDIT is the opposite kind of page: a hand-picked set of ~24 items chosen
   * by Tina, where searching within the selection is a control with nothing to
   * do. Turned off there at her request, 2026-08-24. The filter row stays —
   * Brand and Sort are still meaningful across 17 houses.
   */
  showSearch?: boolean;
  /** The <FilterDropdown /> controls for this surface. */
  children: React.ReactNode;
}) {
  return (
    <div
      className={`index-panel${className ? ` ${className}` : ''}`}
      style={{
        background: 'var(--bone)',
        border: '1px solid var(--hairline)',
        borderRadius: 8,
        boxShadow: '0 30px 70px -40px rgba(42,18,38,.5)',
        padding: '22px 26px',
      }}
    >
      {showSearch && (
        <input
          aria-label="Search houses and pieces"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search houses, pieces…"
          className="index-panel-search w-full"
          style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
        />
      )}
      {/* The currency control used to sit here, pushed right. It moved to the
          header (2026-08-07): currency is a site-wide preference, so having it
          only on the pages that happen to carry an index console meant it was
          missing everywhere else and duplicated on the two that had it. */}
      <div className={`flex flex-wrap items-center gap-2${showSearch ? ' mt-4' : ''}`}>
        <span className="eyebrow mr-1">Filter</span>
        {children}
      </div>
    </div>
  );
}
