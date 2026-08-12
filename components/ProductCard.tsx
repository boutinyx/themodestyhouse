'use client';
import { useState } from 'react';
import type { CardProduct } from '@/lib/compactCatalogue';
import { Heart, Eye } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { useQuickView } from './QuickView';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { useIsStaff } from './StaffSessionProvider';
import { StaffEditControl, type StaffEditResult } from './StaffEditControl';
import { GARMENT_LABELS } from '@/lib/tag';

export function ProductCard({ p }: { p: CardProduct }) {
  const { open, isFav, toggleFav } = useQuickView();
  const { price } = useCurrency();
  const isStaff = useIsStaff();
  const [staffState, setStaffState] = useState<StaffEditResult | null>(null);
  const fav = isFav(p.id);
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
        href={p.url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${p.title} by ${p.brandName} — opens ${p.brandName}'s site`}
        data-brand={p.brandSlug}
        data-garment={p.garment}
        data-surface="product-card"
        className="absolute inset-0 z-10"
      />
      <div
        className="relative overflow-hidden border"
        style={{ borderColor: 'var(--hairline)', borderRadius: 'var(--radius-image)', background: '#fff' }}
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
          className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        {/* Staff-only edit control (docs/log/2026-08-12-inline-staff-editing.md).
            Rendered only for a signed-in staff session, and only until this
            card has been acted on this page load — no double-submits. */}
        {isStaff && !staffState && (
          <StaffEditControl id={p.id} garment={p.garment} onChanged={setStaffState} />
        )}
        {/* Quick view — the card's former primary action, demoted to a secondary
            affordance now that the card itself goes straight to the brand.
            Still opens the same modal, which still has its own "Shop at
            {brand}" outbound link for anyone who previews first. Shifts right
            when the staff edit pencil is present so the two never overlap. */}
        <button
          type="button"
          onClick={() => open(p)}
          aria-label={`Quick view: ${p.title} by ${p.brandName}`}
          className="absolute top-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{ left: isStaff ? 40 : 8, background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', lineHeight: 1 }}
        >
          <Eye size={20} weight="regular" />
        </button>
        <button
          type="button"
          onClick={() => toggleFav(p)}
          className="absolute top-2 right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center transition"
          style={{
            background: 'rgba(255,255,255,0.85)',
            color: fav ? 'var(--aubergine)' : 'var(--muted)',
            lineHeight: 1,
          }}
          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart size={22} weight={fav ? 'fill' : 'regular'} />
        </button>
      </div>
      <div className="brand-label mt-3">{p.brandName}</div>
      <div className="card-title mt-1 px-2">{p.title}</div>
      <div className="price mt-1">{price(p.price, p.currency).text}</div>
      {staffState?.type === 'move' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Moved to {GARMENT_LABELS[staffState.garment]}
        </div>
      )}
      {staffState?.type === 'delete' && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Removed</div>
      )}
    </div>
  );
}
