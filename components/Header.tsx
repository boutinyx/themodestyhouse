'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart } from '@phosphor-icons/react';
import { Nav } from './Nav';
import { useQuickView } from './QuickView';
import { CurrencySwitcher } from './CurrencySwitcher';
import { HeaderSearchField, HeaderSearchTrigger } from './HeaderSearch';
import { MobileNav } from './MobileNav';

// ONE desktop row — crest+wordmark, nav, utility — matching the reference
// mockup Tina sent 2026-08-20 ("i want to do the header like this"). A
// two-row version (nav on its own line under the logo, like the reference's
// actual layout) was tried 2026-08-21 and reverted the same day at Tina's
// request ("revert back") — back to this one-row shape.
// Two things from the reference were left out on purpose:
//   - No account or bag icon. This is a curated affiliate directory with no
//     accounts and no cart — CLAUDE.md §2 — so either would open onto
//     nothing.
//   - No black announcement bar. Still no real promotional copy to put in
//     one (CLAUDE.md §1 / §10.18's rule against inventing marketing copy).
//
// SUPERSEDED 2026-08-21's "always solid" (Tina then: "i want the header like
// this allt hte time so no transparent"). 2026-08-22 she asked for the
// opposite, but only where there is a photograph to be transparent over:
// "make sure the hero image spans behind the header & it gets transparent but
// make the header have a darker overlay so the buttons are visible. also, at
// the bottom of the header, add a small fade in overlay so the overlay isn't
// sharp at the bottom."
//
// So there are two states, and the second one is NOT optional: a header that
// stayed transparent everywhere would put near-white nav text on the parchment
// body of every other page and on the homepage the moment you scroll past the
// hero. `overHero` below is true only while a `[data-hero]` element is still
// under the header; every other case falls back to the solid parchment header
// this file already had.
//
// Still `sticky`, not `fixed`. It keeps reserving its own space at the top of
// the flow — `.hero-vh` pulls the hero up by exactly `--header-height` to slide
// the photograph underneath, which is a change to ONE page rather than a change
// to how every page's first element is positioned.
//
// Background is `var(--parchment)`, not `var(--bone)` — sampled directly
// from Tina's reference screenshot (a handful of pixels across its header
// background averaged to ~#f9f5f1), which is parchment, not bone.
//
// Wordmark is two lines — "THE MODESTY" / "HOUSE" — per Tina's explicit
// ask ("if you can do the modesty and under that line house that would be
// perfect"), not what the reference image itself shows (one line there).
// Sized at 14px, matching `.site-header .nav-link` exactly (2026-08-21,
// Tina: "make the letters as small as the others in the header") — it no
// longer stands out larger than the rest of the header.
export function Header() {
  const { favs } = useQuickView();
  const count = Object.keys(favs).length;
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  // True while a `[data-hero]` element still reaches past the bottom of the
  // header — i.e. while there is photograph behind the nav to be transparent
  // over.
  //
  // The INITIAL value is the pathname guess, and only the initial value: the
  // homepage is the one page with a hero today, and starting `false` there
  // meant the server HTML and first paint carried a solid parchment bar that
  // flipped to transparent a frame later — a visible flash on the site's most
  // looked-at surface. The effect below overrules the guess immediately, so a
  // hero added to another page still works and a homepage without one still
  // corrects itself.
  const [overHero, setOverHero] = useState(pathname === '/');
  const [menuOpen, setMenuOpen] = useState(false);
  // Search is open state, held HERE rather than inside HeaderSearch, because
  // its two halves sit in two different places in this row: the trigger in
  // the utility cluster on the right, the field in the nav's own slot in the
  // middle. Tina, 2026-08-22: "when you lcik searchbar i want it to not be
  // the pill anymore and instead show up inside the header" — so there is no
  // popup left to own its own state.
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // A route change closes it. Submitting the field navigates, and leaving the
  // field open across that navigation would land on /directory with the
  // header still in search mode and the nav still hidden. Done as a
  // during-render adjustment rather than an effect on `pathname`, because
  // eslint's react-hooks/set-state-in-effect fails the build on the effect
  // version (it is a cascading render) — this is React's own documented
  // "adjusting state when a prop changes" pattern and re-renders before the
  // browser paints, so the stale open state is never visible.
  const [searchPath, setSearchPath] = useState(pathname);
  if (searchPath !== pathname) {
    setSearchPath(pathname);
    setSearchOpen(false);
  }

  // The two state attributes below are all this component contributes to how
  // the header LOOKS; which colours each combination resolves to lives in
  // globals.css. Hover is real CSS `:hover` there rather than an onMouseEnter
  // here — see the note on that rule for why.

  // Measured from the hero's own rect on scroll rather than against a
  // viewport-height constant, because the hero's height is `100svh` with a
  // `min-height` floor — the two disagree on a short window, and a constant
  // would flip the header at the wrong scroll position there. rAF-throttled;
  // the listener is passive so it cannot delay the scroll itself. The first
  // measurement is scheduled rather than run inline, both because setState in
  // an effect body is a cascading render (eslint react-hooks/set-state-in-effect
  // fails the build on it) and because a frame's delay lets layout settle after
  // a client-side navigation.
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>('[data-hero]');
    let raf = 0;
    const check = () => {
      raf = 0;
      if (!hero) {
        setOverHero(false);
        return;
      }
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      setOverHero(hero.getBoundingClientRect().bottom > headerHeight);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);
    if (!hero) {
      return () => {
        if (raf) cancelAnimationFrame(raf);
      };
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // "Asking for it back" is two things, not one. The obvious half is the
  // pointer being over the header. The other half is a nav panel being OPEN:
  // Base UI portals those popups to <body>, so moving the pointer off the
  // trigger and down into the panel is a `mouseleave` on the header — without
  // this the header would drop back to transparent underneath its own open
  // dropdown, which reads as a bug. Watched via the `aria-expanded` /
  // `data-popup-open` attributes Base UI sets on the TRIGGER, which is inside
  // the header, so no portal chasing is needed (compare the pointer-geometry
  // machinery §10.34/§10.36 needed for the flyout, which had to know about the
  // portalled DOM itself).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const read = () => el.querySelector('[aria-expanded="true"], [data-popup-open]') !== null;
    const mo = new MutationObserver(() => setMenuOpen(read()));
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'data-popup-open'] });
    return () => mo.disconnect();
  }, []);

  // Keeps `--header-height` (globals.css) matched to this header's REAL
  // rendered height. It used to be what .hero-vh SUBTRACTED so the hero and
  // this sticky header together filled one viewport; since 2026-08-22 it is
  // what .hero-vh pulls the hero UP by, so the photograph runs behind the
  // header instead of starting below it. Either way the number has to be the
  // real height, and being wrong shows as a strip of the wrong thing. Tina:
  // "the picture needs to be same hight as screen because when i scroll now
  // i still see a big piece of the pciture" — hero-vh was a flat 100svh with
  // no header subtracted, so sticky header (which reserves its own flow
  // space, not an overlay) pushed the hero's bottom edge below the fold by
  // exactly the header's height, and required a scroll to pass through
  // before the next section began. A ResizeObserver (not a one-time measure
  // on mount) because the header's own height isn't a constant: it already
  // changes at the lg breakpoint (py-3 -> py-5) and would again if the
  // wordmark ever wrapped a third line or a promo bar were added above it.
  // globals.css carries a CSS-only breakpoint-matched fallback for the
  // instant before this effect's first measurement lands.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--header-height', `${entry.target.getBoundingClientRect().height}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rendered twice below (desktop row at lg+, mobile row under lg) so it
  // only ever appears once per breakpoint rather than twice at once. Now a
  // function of icon size rather than a fixed constant — 2026-08-23, Tina:
  // "header is too small" (mobile/tablet, following the hero's own text
  // getting bigger the same week). Desktop keeps its original 17px; mobile
  // gets 20px. A `size` prop on a Phosphor icon sets literal SVG width/height
  // attributes, which can't respond to a breakpoint on their own — hence the
  // function rather than one shared constant with a Tailwind class bolted on.
  const favourites = (size: number) => (
    <Link
      href="/favourites"
      className="nav-link inline-flex items-center gap-1.5 leading-none"
      aria-label="Favourites"
      // fontSize 14 to match the rest of the header — see the comment on
      // .site-header .nav-link in globals.css.
      style={{ fontSize: 14, letterSpacing: 0 }}
    >
      {/* translateY(-1px): Phosphor's heart glyph is not vertically centred
          inside its own viewBox — see the equivalent note this was copied
          from in the previous pill header before it's gone from git blame. */}
      <Heart
        size={size}
        weight={count > 0 ? 'fill' : 'regular'}
        style={{ display: 'block', transform: 'translateY(-1px)' }}
      />
      {count > 0 ? count : null}
    </Link>
  );

  const crest = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-240.webp" alt="The Modesty House" width={240} height={337} className="site-crest h-12 w-auto" />
  );

  return (
    <header
      ref={headerRef}
      data-over-hero={overHero}
      data-menu-open={menuOpen}
      className="site-header sticky top-0 left-0 right-0 z-50 w-full"
      // NO style prop. Fill, border and colour all live in globals.css now —
      // an inline `background` beats `.site-header[data-over-hero="true"]`'s
      // and the header stayed solid parchment over the photo (measured:
      // data-over-hero="true" with backgroundColor rgb(250,247,241)), and an
      // inline `transition` would likewise win and kill the animated custom
      // properties. Specificity, not preference.
    >
      {/* The darkening wash that makes the nav readable against the photograph.
          It is NOT the header's own background: it has to extend BELOW the
          header's bottom edge and fade out there — "add a small fade in overlay
          so the overlay isn't sharp at the bottom" — and a background cannot
          paint outside its own box. `bottom: -28px` gives it that extra strip;
          the gradient holds its darkness to 72% of its height (the header
          itself) and then runs to fully transparent across the strip, so there
          is no visible edge where it ends. pointer-events-none so it cannot
          swallow a click meant for the nav underneath, and z-0 against the
          content row's z-10 so it stays behind the text. */}
      {overHero && (
        <div
          aria-hidden
          className="header-wash absolute inset-x-0 top-0 z-0 pointer-events-none"
          style={{
            bottom: -28,
            background:
              'linear-gradient(to bottom, rgba(12,6,12,0.62) 0%, rgba(12,6,12,0.5) 55%, rgba(12,6,12,0.34) 72%, rgba(12,6,12,0) 100%)',
          }}
        />
      )}
      {/* py-5 at lg — thicker to match the reference's own proportions
          (Tina: "also in thickness"), scaled to the bigger crest below
          rather than added as bare padding. Mobile stays py-3; the
          reference itself is a desktop screenshot. */}
      <div className="relative z-10 flex items-center justify-between gap-6 px-4 lg:px-10 h-[88px] lg:h-auto lg:py-5">
        <div className="lg:hidden">
          <MobileNav />
        </div>

        {/* Desktop: crest + two-line wordmark. Crest is h-12 (bumped from h-9
            for the row's thickness, same reason as the padding above). The
            wordmark itself went 14 -> 17 -> back to 14px (2026-08-21, Tina:
            "make the letters as small as the others in the header") — it now
            matches `.site-header .nav-link`'s 14px exactly, rather than
            standing out larger than the rest of the row. */}
        <Link href="/" className="hidden lg:flex items-center gap-3">
          {crest}
          <span
            className="uppercase"
            style={{
              fontFamily: 'var(--font-label), serif',
              // --header-fg, not --aubergine: this is inline, and an inline
              // declaration cannot be overridden from the stylesheet, so the
              // var() is the only way the over-hero mode can reach it.
              // No transition needed: --header-fg is a registered <color> and
              // animates itself, so this follows without one. Adding one here
              // would just make the wordmark chase the variable.
              color: 'var(--header-fg)',
              letterSpacing: '0.14em',
              fontSize: 14,
              lineHeight: 1.3,
            }}
          >
            The Modesty
            <br />
            House
          </span>
        </Link>

        {/* Mobile: crest centred, since the hamburger and heart already
            take the left/right edges. */}
        <Link href="/" className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center">
          {crest}
        </Link>

        {/* Desktop nav, its own group so it sits in the middle of the row
            rather than clustered against the logo — or, while search is open,
            the search field in that same slot. Swapped rather than stacked:
            the field taking the nav's place is what keeps the header's HEIGHT
            unchanged, and the height is not cosmetic here — `--header-height`
            is what .hero-vh pulls the homepage photograph up by, so a header
            that grew on open would shove the hero every time. `flex-1` and
            `min-w-0` only while open, so the closed nav keeps the natural
            width it has always had. */}
        {searchOpen ? (
          <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center">
            <HeaderSearchField onClose={closeSearch} />
          </div>
        ) : (
          <div className="hidden lg:flex items-center">
            <Nav />
          </div>
        )}

        {/* Desktop utility cluster: search, favourites, a divider, then
            currency — matching the reference's icon row. */}
        <div className="hidden lg:flex items-center gap-6">
          {/* The trigger sets aria-expanded on a button INSIDE the header,
              which is what `menuOpen` watches — so over the hero the header
              has already gone solid by the time the field renders, and the
              field's --header-fg text resolves to aubergine on parchment
              rather than near-white on a photograph. */}
          <HeaderSearchTrigger open={searchOpen} onToggle={() => setSearchOpen((v) => !v)} />
          {favourites(17)}
          <span aria-hidden className="w-px h-4" style={{ background: 'var(--header-rule)' }} />
          <CurrencySwitcher />
        </div>

        {/* Mobile only needs favourites — search and currency live inside
            MobileNav's own panel. */}
        <div className="lg:hidden">{favourites(20)}</div>
      </div>
    </header>
  );
}
