'use client';
import { useState, useEffect } from 'react';
import type { CardProduct } from '@/lib/compactCatalogue';
import { Heart, Eye, ArrowUpRight } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { useQuickView } from './QuickView';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { useIsStaff } from './StaffSessionProvider';
import { StaffEditControl, type StaffEditResult, laneLabel, garmentMoveLabel, subtypeLabel } from './StaffEditControl';
import { pickRegionalUrl, readTimeZone } from '@/lib/regionalLink';
import { withUtm } from '@/lib/outbound';

/**
 * `priority` marks a card as above the fold. Measured over CDP (iPhone 13,
 * 4x CPU throttle, 1.6 Mbps / 150 ms RTT, 2026-08-19): the LCP element on
 * every grid page IS a ProductCard image, and with a blanket loading="lazy"
 * all 18 in-viewport images were queued at equal Low priority, so the one the
 * user actually waits for competed with 17 it does not. A/B with the harness
 * applied to BOTH arms so its distortion cancels, 3 runs each:
 *   /modest-activewear 4616/4600/4644 ms -> 3524/3692/3488 ms
 *   /directory         4612/4580/4456 ms -> 3144/3284/3076 ms
 * Be honest about the size of the win: this moves these pages from "poor"
 * (>4000 ms) to "needs improvement". It does NOT reach the 2500 ms "good"
 * band — that needs fewer initial cards or a smaller first-card variant.
 *
 * Optional on purpose: ProductGrid and /favourites never pass it and are
 * unaffected no-ops.
 */
export function ProductCard({ p, priority = false }: { p: CardProduct; priority?: boolean }) {
  const { open, isFav, toggleFav } = useQuickView();
  const { price } = useCurrency();
  const isStaff = useIsStaff();
  const [staffState, setStaffState] = useState<StaffEditResult | null>(null);
  const fav = isFav(p.id);
  // `p.url` is the SSR default (correct for the overwhelming majority of
  // products, which have no altUrl at all). Only swaps post-mount, and only
  // for the handful of dual-region items — see lib/regionalLink.ts.
  const [href, setHref] = useState(p.url);
  useEffect(() => {
    if (!p.altUrl) return;
    // Reading the browser's timezone after mount, same SSR-mismatch reasoning
    // as QuickViewProvider's localStorage read below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHref(pickRegionalUrl(p.url, p.altUrl, readTimeZone()));
  }, [p.url, p.altUrl]);
  return (
    // The card's primary action is now a real outbound link, not a modal — a
    // crawler (or a shopping agent) can follow it, which it never could when
    // this was a div[onClick]/button pair. Card, quick-view button and heart
    // are still SIBLINGS, never nested: the anchor covers the whole card
    // (image + text) at z-10, and the two buttons sit above it at z-20. Nesting
    // a <button> inside the <a> is exactly the `nested-interactive` axe
    // violation this file was already rewritten once to remove (see below).
    <div className="group relative block text-center" style={staffState?.type === 'delete' ? { opacity: 0.35 } : undefined}>
      <a
        href={withUtm(href, 'product-card')}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${p.title} by ${p.brandName} — opens ${p.brandName}'s site`}
        data-brand={p.brandSlug}
        data-garment={p.garment}
        data-surface="product-card"
        className="absolute inset-0 z-10"
      />
      {/* SITE-WIDE CARD SHAPE, 2026-08-25 — Tina: "you see the ratio of the
          products on the homepage ... i want that across the whole website and
          also the size of the icon like the heart etc and the background i want
          the same across the whole page".
          The homepage rails (components/PopularShowcase.tsx) were taken to
          2:3 / 32px buttons / no border on 2026-08-25 and everything else was
          left behind. Measured live before changing anything: rail 0.667 ratio,
          32x32 button, 20px heart, no border, 0 radius; this card 0.750, 40x40,
          22px heart, 1px hairline, 2px radius. Backgrounds were ALREADY
          identical (#fff) — the border and the rounded corner are what read as
          a different background.
          The border and radius are dropped rather than added to the rails,
          because the rails are the surface she approved. */}
      <div
        className="product-photo relative overflow-hidden"
        style={{ background: '#fff' }}
      >
        {/* srcset/sizes, so the CDN sends a card-sized photograph instead of the
            1500–2600px original the brand uploaded.
            Measured effect: see docs/log/2026-08-07-mobile-overhaul.md.

            `sizes` has to describe THIS grid, and it was describing a different
            one: "(max-width: 820px) 50vw, 25vw" — two columns under 820, four
            above. `.product-grid` is two columns under 768 and THREE above
            (globals.css), inside a 1220px container with 32px gutters and a 26px
            gap. So between 820 and about 1300 the browser was asked for a
            quarter of the viewport to fill a third of it and picked a variant
            ~25% too small: soft, slightly mushy product photographs on exactly
            the widths most people browse at.
            The three arms below are the three real regimes: 2-up, 3-up fluid,
            and 3-up against the capped container, where the card stops growing
            at (1220 - 52) / 3 = 389px. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shopifyImage(p.image, 400)}
          srcSet={shopifySrcSet(p.image)}
          sizes="(max-width: 767px) 50vw, (max-width: 1284px) 31vw, 389px"
          alt={p.title}
          className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
        />
        {/* Staff-only edit control (docs/log/2026-08-12-inline-staff-editing.md).
            Rendered only for a signed-in staff session, and stays live after
            an action — moving or deleting must not hide the control, since
            a mistaken action needs to be immediately correctable without a
            reload. Bottom-left, clear of quick-view/favourite up top. */}
        {isStaff && (
          <StaffEditControl id={p.id} garment={p.garment} onChanged={setStaffState} />
        )}
        {/* Quick view — the card's former primary action, demoted to a secondary
            affordance now that the card itself goes straight to the brand.
            Still opens the same modal, which still has its own "Shop at
            {brand}" outbound link for anyone who previews first. */}
        <button
          type="button"
          onClick={() => open(p)}
          aria-label={`Quick view: ${p.title} by ${p.brandName}`}
          className="absolute top-2 left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', lineHeight: 1 }}
        >
          {/* 40px -> 32px, 2026-08-25, to match the homepage rails per Tina's
              "the size of the icon like the heart etc ... the same across the
              whole page".
              READ THIS BEFORE CHANGING IT BACK. 40px was not arbitrary: the
              2026-08-13 marketing audit flagged 32px here as sitting in the
              tap path of the card's own primary action (the full-card outbound
              anchor underneath, z-10) and recommended 40-44px. 32px still
              clears the 24px floor in WCAG 2.2 SC 2.5.8 with room to spare, so
              this trades a RECOMMENDATION for site-wide consistency, which was
              Tina's explicit call — it does not breach the standard.
              Tailwind's w/h still beats the SVG's own width/height attributes,
              so the class overrides `size` without two separate icons. */}
          <Eye size={20} weight="regular" className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => toggleFav(p)}
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{
            background: 'rgba(255,255,255,0.85)',
            color: fav ? 'var(--aubergine)' : 'var(--muted)',
            lineHeight: 1,
          }}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart size={20} weight={fav ? 'fill' : 'regular'} className="w-5 h-5" />
        </button>
        {/* Visible outbound-link cue — the card's aria-label already says
            "opens {brand}'s site", but a sighted user had no visual signal the
            click leaves the site (2026-08-13 marketing audit). Bottom-right,
            since both top corners already carry the quick-view/favourite
            buttons. Decorative only: aria-hidden + pointer-events-none, so it
            never competes with the full-card anchor (z-10) underneath it for
            the click. */}
        <div
          aria-hidden="true"
          className="absolute bottom-2 right-2 z-20 w-6 h-6 rounded-full flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', lineHeight: 1 }}
        >
          <ArrowUpRight size={14} weight="bold" />
        </div>
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="card-title mt-1 px-2">{p.title}</div>
      <div className="price mt-1">{price(p.price, p.currency).text}</div>
      {staffState?.type === 'move' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Moved to {garmentMoveLabel(staffState.garment)}
        </div>
      )}
      {staffState?.type === 'moveLane' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Moved to {laneLabel(staffState.lane)}
          {staffState.subtype && ` — ${subtypeLabel(staffState.lane, staffState.subtype)}`}
        </div>
      )}
      {staffState?.type === 'delete' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Removed</div>
      )}
    </div>
  );
}
