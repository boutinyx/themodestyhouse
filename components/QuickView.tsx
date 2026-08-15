'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { CardProduct } from '@/lib/compactCatalogue';
import { Heart, X, ArrowUpRight, Copy, Check } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { shopifyImage, shopifySrcSet, DETAIL_WIDTHS } from '@/lib/shopifyImage';
import { SITE_URL } from '@/lib/schema';
import { pickRegionalUrl, readTimeZone } from '@/lib/regionalLink';

type Ctx = {
  open: (p: CardProduct) => void;
  favs: Record<string, CardProduct>;
  toggleFav: (p: CardProduct) => void;
  isFav: (id: string) => boolean;
};

const QuickViewCtx = createContext<Ctx | null>(null);

export function useQuickView(): Ctx {
  const c = useContext(QuickViewCtx);
  if (!c) throw new Error('useQuickView must be used within QuickViewProvider');
  return c;
}

export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<CardProduct | null>(null);
  // Existing localStorage entries are full Product objects written before this
  // change — a structural superset of CardProduct, so they still satisfy this
  // type and need no migration.
  const [favs, setFavs] = useState<Record<string, CardProduct>>({});

  // Hydration-sensitive: favourites live in localStorage, which is not
  // available during SSR. Reading it lazily in useState would make the
  // server and client render differ and trip a hydration mismatch, so the
  // read must happen after mount. TODO: migrate to useSyncExternalStore.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFavs(JSON.parse(localStorage.getItem('tmh_favs') || '{}'));
    } catch {}
  }, []);

  const toggleFav = useCallback((p: CardProduct) => {
    setFavs((prev) => {
      const next = { ...prev };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = p;
      try {
        localStorage.setItem('tmh_favs', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => !!favs[id], [favs]);
  const open = useCallback((p: CardProduct) => setActive(p), []);

  return (
    <QuickViewCtx.Provider value={{ open, favs, toggleFav, isFav }}>
      {children}
      {active && (
        <Modal
          product={active}
          isFav={!!favs[active.id]}
          onToggleFav={() => toggleFav(active)}
          onClose={() => setActive(null)}
        />
      )}
    </QuickViewCtx.Provider>
  );
}

function Modal({
  product,
  isFav,
  onToggleFav,
  onClose,
}: {
  product: CardProduct;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
}) {
  const { price } = useCurrency();
  const [zoomed, setZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  // Same dual-region routing as ProductCard — see lib/regionalLink.ts.
  const [shopHref, setShopHref] = useState(product.url);
  useEffect(() => {
    if (!product.altUrl) return;
    // Reading the browser's timezone after mount — same SSR-mismatch
    // reasoning as QuickViewProvider's localStorage read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShopHref(pickRegionalUrl(product.url, product.altUrl, readTimeZone()));
  }, [product.url, product.altUrl]);

  // `id` is always `${brandSlug}:${shopifyId}` (Invariant 1) — stripping the
  // known prefix is safer than splitting on the first ':', since a Shopify id
  // is numeric and can't itself contain one, but a brand slug never will
  // either way this stays correct.
  const shareUrl = `${SITE_URL}/product/${product.brandSlug}/${product.id.slice(product.brandSlug.length + 1)}`;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomed) setZoomed(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, zoomed]);

  return (
    <>
      {zoomed && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(20,15,20,0.92)' }}
          onClick={() => setZoomed(false)}
        >
          {/* DELIBERATELY the unresized original. This is the zoomed view — the
              whole point is the full-resolution photograph, so it must not be
              routed through shopifyImage(). It loads only on click, so it costs
              nothing until someone asks for it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.title}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
          />
        </div>
      )}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(36,27,36,0.55)' }}
        onClick={onClose}
      >
        {/* role/aria-modal/aria-labelledby: this is a dialog and was not
            announced as one, so a screen reader met it as a stray group of
            links in the middle of the page.

            The panel keeps `overflow-hidden` — it is what clips the photograph
            to the rounded corner, and it is what keeps the close button, which
            is absolutely positioned against this box, from scrolling away. The
            SCROLLING happens in the text column instead (see below).

            dvh, not vh: on iOS `vh` is the URL-bar-collapsed height, so 90vh is
            more than 90% of what is actually on screen — the same trap the phone
            menu already documents. */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
          className="relative w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
          style={{ background: 'var(--bone)', borderRadius: 6, maxHeight: '90dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shopifyImage(product.image, 600)}
            srcSet={shopifySrcSet(product.image, DETAIL_WIDTHS)}
            /* Full width of the modal on a phone, half of it once the panel
               goes side-by-side at md. */
            sizes="(max-width: 768px) 100vw, 50vw"
            alt={product.title}
            className="w-full h-64 md:h-full object-cover cursor-zoom-in"
            onClick={() => setZoomed(true)}
            decoding="async"
          />
          {/* This column scrolls, and `min-h-0` is what lets it.
              The panel is capped at 90dvh; on a phone it is ONE column — a 256px
              photograph, then brand, a title that can run to three lines, price
              and two stacked buttons. With the panel clipping and this column
              unable to shrink below its content, the overflow was simply CUT,
              and what sits at the bottom is "Shop at …" — the only thing this
              modal exists to offer. A grid item's default `min-height: auto`
              refuses to shrink past its content, so overflow-y alone would have
              done nothing here. */}
          <div className="p-8 flex flex-col min-h-0 overflow-y-auto overscroll-contain">
          {/* Phosphor X, not the × character (CLAUDE.md §6). The glyph rendered
              at a different weight and optical centre on every platform, and
              sat in a 24px box on a phone; this is a 44px target. */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 inline-flex items-center justify-center leading-none"
            style={{ color: 'var(--muted)', width: 44, height: 44 }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <div className="brand-label">{product.brandName}</div>
          <h2 id="quickview-title" className="card-title card-title-xl mt-2">{product.title}</h2>
          <div className="price price-lg mt-3">
            {price(product.price, product.currency).text}
          </div>
          <div className="mt-auto pt-8 flex flex-col gap-3">
            <a
              href={shopHref}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-brand={product.brandSlug}
              data-garment={product.garment}
              data-surface="quickview"
              className="btn-pill text-center inline-flex items-center justify-center gap-2"
            >
              Shop at {product.brandName}
              <ArrowUpRight size={15} weight="bold" />
            </a>
            <button onClick={onToggleFav} className="chip w-full py-3 inline-flex items-center justify-center gap-2" data-active={isFav}>
              <Heart size={17} weight={isFav ? 'fill' : 'regular'} />
              {isFav ? 'Saved to favourites' : 'Add to favourites'}
            </button>
            {/* A link back to a page of OURS, not the brand's — the full-card
                anchor and the button above both leave the site immediately,
                so there was nothing on themodestyhouse.com to share. Shown
                at every width (Tina asked for it on mobile and tablet too,
                2026-08-15) — the modal's text column already scrolls
                (min-h-0 overflow-y-auto above), so a third stacked button
                costs nothing it can't absorb. Links to a noindex page
                (app/product/[brandSlug]/[shopifyId]) so it works when
                clicked without repeating the 2026-08-05 thin-content
                mistake. */}
            <button
              onClick={copyShareLink}
              className="chip w-full py-3 inline-flex items-center justify-center gap-2"
            >
              {copied ? <Check size={17} weight="bold" /> : <Copy size={17} />}
              {copied ? 'Link copied' : 'Copy share link'}
            </button>
            {copyError && (
              <p className="text-xs text-center" style={{ color: '#b3261e' }}>
                Couldn&apos;t copy automatically — copy this instead: {shareUrl}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
