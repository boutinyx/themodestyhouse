'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Nav } from './Nav';
import { useQuickView } from './QuickView';

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
        <div className="hidden md:flex items-center gap-6">
          <Nav />
          <Link
            href="/favourites"
            className="nav-link"
            aria-label="Favourites"
            /* .nav-link is 12px, which is right for words and too small for a
               glyph — the heart is the one item here people aim at. */
            style={{ fontSize: 16, letterSpacing: '0.08em' }}
          >
            {count > 0 ? `♥ ${count}` : '♡'}
          </Link>
        </div>
      </div>
      <div className="md:hidden flex items-center gap-5 px-5 pt-3 overflow-x-auto">
        <Nav />
        <Link
          href="/favourites"
          className="nav-link whitespace-nowrap"
          aria-label="Favourites"
          style={{ fontSize: 16, letterSpacing: '0.08em' }}
        >
          {count > 0 ? `♥ ${count}` : '♡'}
        </Link>
      </div>
    </header>
  );
}
