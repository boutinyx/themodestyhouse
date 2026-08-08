'use client';
import Link from 'next/link';
import { Heart } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Nav } from './Nav';
import { useQuickView } from './QuickView';
import { CurrencySwitcher } from './CurrencySwitcher';
import { MobileNav } from './MobileNav';

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
        {/* shrink-0: as a shrinkable flex item this whole block was allowed to
            compress below the width of its own text, and the wordmark — which
            has no overflow rule and no ellipsis — simply printed OUT of its box
            and straight through the navigation beside it. Measured at 768 and
            819px: "THE MODESTY HOUSE" and "PRODUCTS" rendered on top of each
            other, and the hairline between crest and wordmark was squeezed to
            nothing. The crest is the one thing on the page that must never
            deform, so it does not give way; the row's own breakpoint (below)
            is what makes the space, not shrinkage. */}
        <Link href="/" className="flex items-center gap-4 shrink-0">
          {/* logo-240.webp, not logo.png: the PNG was 308KB to fill a 34px-wide
              box, on every page of the site. New filename rather than new bytes
              at the old path — public/ is served with a 4-hour max-age and is
              not fingerprinted (CLAUDE.md §6). */}
          {/* width/height are the INTRINSIC ratio (240x337), not the rendered
              box. They exist to reserve the right shape before the file lands;
              giving them an invented 44x48 makes the reserved box the wrong
              shape and the crest jumps as it loads. `h-12 w-auto` sets the
              rendered size. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-240.webp" alt="The Modesty House crest" width={240} height={337} className="h-12 w-auto" />
          <span aria-hidden className="block w-px h-10 shrink-0" style={{ background: 'var(--hairline)' }} />
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
        {/* lg (1024), NOT md (768). The horizontal navigation needs about 800px
            of bar to lay out — crest + wordmark + five nav items + heart +
            currency — and at md the bar is only 736px wide. The row therefore
            switched to the desktop layout ~250px before it fitted, and since
            the wordmark has no ellipsis it printed straight through the nav:
            measured at 768 and 819px, "THE MODESTY HOUSE" and "PRODUCTS" drawn
            on top of each other, and the currency glyph clipped by the pill's
            own right edge. An iPad in portrait is 768 or 820, so this was the
            header on every tablet.
            Below 1024 the phone menu takes over, which is a full-screen panel
            and is entirely at home at tablet size. */}
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <div className="hidden lg:block">
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
            {/* No nudge. It carried translateY(-1px) on the argument that a
                heart's visual mass sits low in its box — but measured on the
                current header every other element centres on y=53 and the heart
                sat on 52, i.e. a pixel HIGH, and visibly out of line with the
                currency icon beside it. Re-measure before reintroducing one. */}
            <Heart size={17} weight={count > 0 ? 'fill' : 'regular'} style={{ display: 'block' }} />
            {count > 0 ? count : null}
          </Link>
          {/* Same hairline rule as the one between the crest and the wordmark,
              and the SAME LENGTH (h-10). It was h-8 on the reasoning that a row
              of controls needs less than the full-height crest, but two rules in
              one bar reading at different lengths just looks unresolved. */}
          {/* Currency is DESKTOP-ONLY in the bar. On a phone it moved inside the
              menu panel (components/MobileNav) — Tina's call, so the pill has
              room to breathe: crest + wordmark + heart + hamburger was four
              controls and two dividers in 390px, and the heart ended up crammed
              against the "HOUSE" of the wordmark. Its divider goes with it. */}
          <span aria-hidden className="hidden lg:block w-px h-10 shrink-0" style={{ background: 'var(--hairline)' }} />
          <div className="hidden lg:block">
            <CurrencySwitcher />
          </div>
          {/* Phone navigation, INSIDE the pill. What it replaces was a
              horizontally-scrolling row sitting on the hero photograph: measured
              at iPhone 13 width, 485px of content in a 358px box, with Editorial
              and About entirely off-screen. */}
          {/* No divider before the menu on a phone — Tina's call. With the
              currency switcher moved into the panel there are only two controls
              left in the pill, and a rule between them is dividing nothing. */}
          <div className="lg:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
