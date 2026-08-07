'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { VIBES } from '@/lib/vibes';
import { CATEGORY_LANES } from '@/lib/lanes';

function Dropdown({
  label,
  href,
  activeWhen,
  items,
  path,
  columns = 1,
}: {
  label: string;
  href?: string;
  activeWhen: boolean;
  items: { href: string; label: string }[];
  path: string;
  /** Lay the panel out as a wide grid instead of one tall column. */
  columns?: number;
}) {
  // The panel used to be pure CSS (`group-hover:block group-focus-within:block`).
  // Clicking an item left focus inside the panel, so :focus-within stayed true
  // and the menu hung around until you clicked somewhere else.
  //
  // Closing on navigation is handled by remounting: <Dropdown key={path}> in
  // Nav() below, which resets this to false. That is deliberate rather than a
  // useEffect — resetting state from an effect trips react-hooks/set-state-in-effect
  // and causes a cascading render. The per-item onClick covers navigating to the
  // page you are already on, where `path` never changes and no remount happens.
  const [open, setOpen] = useState(false);

  return (
    <div
      // `flex items-center`, not just `relative`. As a plain block this wrapper
      // put its inline-flex child in a LINE BOX, and the line box's leading
      // pushed Directory and Styles 0.75px below Designers/Editorial/About,
      // which have no wrapper. Measured, not guessed: the two groups reported
      // top 47.75 vs 47.00. Making the wrapper a flex container removes the line
      // box entirely, so every nav item shares one vertical centre.
      className="relative flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      {href ? (
        <Link
          href={href}
          className="nav-link"
          data-active={activeWhen}
          onFocus={() => setOpen(true)}
        >
          {label}
        </Link>
      ) : (
        <button
          type="button"
          className="nav-link"
          data-active={activeWhen}
          aria-haspopup="true"
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen((o) => !o)}
        >
          {label}
        </button>
      )}

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50">
          <div
            className="rounded-2xl border p-3"
            style={{
              background: '#fff',
              borderColor: 'var(--hairline)',
              boxShadow: '0 8px 30px rgba(43,38,34,0.14)',
            }}
          >
            {/* max-content, NOT minmax(0,1fr). This panel is absolutely
                positioned, so it shrink-to-fits; minmax(0,…) explicitly lets a
                column shrink below its content width, and because the items are
                whitespace-nowrap the labels then overflowed and overlapped each
                other. max-content sizes each column to its widest label, which
                is what makes the panel a wide rectangle rather than a heap. */}
            <div
              className="grid gap-x-6"
              style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}
            >
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="block nav-link py-2 px-3 whitespace-nowrap rounded-lg"
                  data-active={path === it.href}
                  onClick={() => setOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Nav() {
  const path = usePathname();
  const categoryItems = CATEGORY_LANES.map((l) => ({ href: `/${l.slug}`, label: l.title }));
  const styleItems = VIBES.map((v) => ({ href: `/style/${v.slug}`, label: v.title }));

  return (
    <nav className="flex items-center gap-5 md:gap-7">
      {/* key={path} remounts each Dropdown on navigation, which resets its `open`
          state — this is what makes the menu close after it has taken you
          somewhere, instead of hanging around until you click elsewhere. */}
      <Dropdown
        key={`dir-${path}`}
        label="Directory"
        href="/directory"
        activeWhen={path === '/directory' || path.startsWith('/modest') || path.startsWith('/hijabi')}
        items={categoryItems}
        path={path}
        // 9 categories in one column was a very tall menu. Three columns makes it
        // a wide panel instead — 3 rows rather than 9.
        columns={3}
      />
      <Dropdown key={`sty-${path}`} label="Styles" activeWhen={path.startsWith('/style')} items={styleItems} path={path} />
      <Link href="/designers" className="nav-link" data-active={path.startsWith('/designers')}>Designers</Link>
      <Link href="/editorial" className="nav-link" data-active={path.startsWith('/editorial')}>Editorial</Link>
      <Link href="/about" className="nav-link" data-active={path.startsWith('/about')}>About</Link>
    </nav>
  );
}
