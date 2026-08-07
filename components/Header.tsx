'use client';
import Link from 'next/link';
import { Heart } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Nav } from './Nav';
import { useQuickView } from './QuickView';
import { CurrencySwitcher } from './CurrencySwitcher';

export function Header() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { favs } = useQuickView();
  const count = Object.keys(favs).length;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // hide when scrolling UP past a threshold, show when scrolling down
      if (y < lastY.current && y > 120) setHidden(true);
      else setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 transition-transform duration-300 ease-out"
      style={{ transform: hidden ? 'translateY(-130%)' : 'translateY(0)' }}
    >
      <div
        className="max-w-6xl mx-auto flex items-center justify-between gap-6 pl-5 pr-6 py-3 rounded-[28px] border"
        style={{ borderColor: 'var(--hairline)', background: '#ffffff', boxShadow: '0 4px 24px rgba(43,38,34,0.14)' }}
      >
        <Link href="/" className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House crest" className="h-12 w-auto" />
          <span aria-hidden className="block w-px h-10" style={{ background: 'var(--hairline)' }} />
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-label), serif',
              color: 'var(--aubergine)',
              letterSpacing: '0.22em',
              lineHeight: 1.3,
              fontSize: '12px',
            }}
          >
            The&nbsp;Modesty
            <br />
            House
          </span>
        </Link>
        {/* Favourites and currency live HERE at every width, not in the scrolling
            row below. That row is `overflow-x-auto`, which establishes a clipping
            context — a dropdown opened inside it would be cut off on mobile. It
            also means the heart is declared once instead of twice. */}
        {/* gap-8 (32px) not gap-6. Measured off the live header: the nav labels
            sit ~27px apart, so 24px here made the heart/divider/currency cluster
            read tighter than the row it joins. */}
        <div className="flex items-center gap-5 md:gap-8">
          <div className="hidden md:block">
            <Nav />
          </div>
          <Link
            href="/favourites"
            className="nav-link inline-flex items-center gap-1.5 leading-none"
            aria-label="Favourites"
            /* letterSpacing is reset to 0: .nav-link sets 0.18em, which adds
               trailing space AFTER the last character and pushes the icon left
               of true centre. leading-none removes the same problem vertically. */
            style={{ fontSize: 13, letterSpacing: 0 }}
          >
            {/* 1px up: the heart's visual mass sits low in its bounding box, so a
                geometrically centred glyph still reads slightly low. */}
            <Heart size={17} weight={count > 0 ? 'fill' : 'regular'} style={{ transform: 'translateY(-1px)' }} />
            {count > 0 ? count : null}
          </Link>
          {/* Same hairline rule as the one between the crest and the wordmark
              (h-10). Slightly shorter here because it divides a single row of
              controls rather than the full-height crest. */}
          <span aria-hidden className="block w-px h-8 shrink-0" style={{ background: 'var(--hairline)' }} />
          <CurrencySwitcher />
        </div>
      </div>
      <div className="md:hidden flex items-center gap-5 px-5 pt-3 overflow-x-auto">
        <Nav />
      </div>
    </header>
  );
}
