'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

// The header's own search — added 2026-08-20 alongside the rest of the
// reference layout Tina sent (icon + "SEARCH" label, matching Wishlist/Bag
// beside it). Deliberately real, not decorative: the reference shows it as a
// plain label with no visible input, but a "SEARCH" control that does nothing
// on click would be worse than not having one at all. Submits to the same
// place HeroSearch does (`/directory?q=`), so typing "linen dress" here and
// typing it into the homepage hero land on the identical results.
//
// CHANGED 2026-08-22: it is no longer a floating pill hanging under the
// trigger. Tina: "when you click searchbar i want it to not be the pill
// anymore and instead show up inside the header". So the field now takes the
// nav's own slot in the header row — same line, same height, no popup, no
// rounded pill border. Nothing is portalled and nothing is absolutely
// positioned, which is also why the header's height does not change when it
// opens (and therefore why `--header-height`, which .hero-vh pulls the
// homepage photograph up by, does not move under the hero — see Header.tsx).
//
// The open state lives in Header, not here, because the trigger sits in the
// utility cluster on the right while the field replaces the nav in the
// middle: two different places in the row, one piece of state. Hence two
// exports rather than one self-contained component.
//
// No Base UI primitive: this isn't a menu (RadioGroup/Menu.Item don't fit a
// text field) and there is no floating element left to position.

/** The icon+label control in the header's utility cluster. Becomes a Close
 *  control while the field is open — the same button toggles both ways, so
 *  there is never a state where the field is open with no visible way out
 *  besides Escape (which is not discoverable on a touch device). */
export function HeaderSearchTrigger({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Close search' : 'Search'}
      className="nav-link inline-flex items-center gap-1.5 leading-none"
    >
      {open ? (
        <X size={15} weight="bold" aria-hidden="true" style={{ display: 'block' }} />
      ) : (
        <MagnifyingGlass size={15} weight="bold" aria-hidden="true" style={{ display: 'block' }} />
      )}
      {open ? 'Close' : 'Search'}
    </button>
  );
}

/** The field itself, rendered inline in the header row in place of the nav. */
export function HeaderSearchField({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open, and let Escape close it. There is deliberately NO outside
  // pointerdown handler any more: the field is part of the header row rather
  // than a popup over the page, so clicking a nav item or the page body is
  // not "dismissing an overlay" — and a pointerdown closer would have raced
  // the toggle button's own click, reopening it.
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = (inputRef.current?.value ?? '').trim();
    onClose();
    router.push(query ? `/directory?q=${encodeURIComponent(query)}` : '/directory');
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="header-search-field flex w-full max-w-[92%] items-center gap-3"
      // A single hairline under the field, not a border on four sides: the
      // pill outline is exactly what Tina asked to lose, and an underline is
      // what makes it read as part of the header row rather than an object
      // sitting in it. --header-rule so it follows the over-hero mode.
      //
      // marginTop 7px (Tina: "go needs to be aligned with the rest of the
      // text in the header... put the line a bit more down"): this row's own
      // box is 7px taller than a plain nav item (the 6px paddingBottom + 1px
      // border that make the hairline), so centering it in the header via the
      // parent's `items-center` sat its TEXT 3.5px higher than every other
      // header row (measured live: nav text top at y=32, this row's at
      // y=28.5, both in an 88px-tall header). A naive +3.5px margin only
      // closes HALF that gap — the parent centers the item's margin box, so
      // adding margin also grows the box the centering math divides by,
      // cancelling half the nudge. Confirmed live: marginTop 3.5 landed the
      // text at y=30.25, not y=32. Doubling it (7px) accounts for that and
      // lands exactly on y=32, matching the rest of the header.
      style={{ borderBottom: '1px solid var(--header-rule)', paddingBottom: 6, marginTop: 7 }}
    >
      <input
        ref={inputRef}
        className="header-search-input"
        name="q"
        placeholder="Search dresses, abayas, hijabs, brands…"
        aria-label="Search modest pieces, brands and categories"
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          background: 'transparent',
          outline: 'none',
          // --header-fg, not a literal: inline declarations cannot be
          // overridden from the stylesheet, so the var() is the only way the
          // over-hero mode reaches the typed text.
          color: 'var(--header-fg)',
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          letterSpacing: '0.02em',
        }}
      />
      {/* Uncontrolled input above (defaultless, read from the ref on submit),
          so typing does not re-render the whole header on every keystroke —
          the header carries the scroll listener, the ResizeObserver and the
          nav. This button is what makes an uncontrolled field fine: there is
          no state to mirror, and Enter submits the form anyway. */}
      <button
        type="submit"
        className="nav-link leading-none"
        style={{ flex: 'none' }}
      >
        Go
      </button>
    </form>
  );
}
