'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Product } from '@/lib/types';
import { useCurrency } from './CurrencyProvider';

type Ctx = {
  open: (p: Product) => void;
  favs: Record<string, Product>;
  toggleFav: (p: Product) => void;
  isFav: (id: string) => boolean;
};

const QuickViewCtx = createContext<Ctx | null>(null);

export function useQuickView(): Ctx {
  const c = useContext(QuickViewCtx);
  if (!c) throw new Error('useQuickView must be used within QuickViewProvider');
  return c;
}

export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Product | null>(null);
  const [favs, setFavs] = useState<Record<string, Product>>({});

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

  const toggleFav = useCallback((p: Product) => {
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
  const open = useCallback((p: Product) => setActive(p), []);

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
  product: Product;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
}) {
  const { price } = useCurrency();
  const [zoomed, setZoomed] = useState(false);

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
        <div
          className="relative w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
          style={{ background: 'var(--bone)', borderRadius: 6, maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-64 md:h-full object-cover cursor-zoom-in"
            onClick={() => setZoomed(true)}
          />
          <div className="p-8 flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-3 right-4 text-2xl leading-none"
            style={{ color: 'var(--muted)' }}
            aria-label="Close"
          >
            ×
          </button>
          <div className="brand-label">{product.brandName}</div>
          <h2 className="card-title card-title-xl mt-2">{product.title}</h2>
          <div className="price price-lg mt-3">
            {price(product.price, product.currency).text}
          </div>
          <div className="mt-auto pt-8 flex flex-col gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="btn-pill text-center"
            >
              Shop at {product.brandName} →
            </a>
            <button onClick={onToggleFav} className="chip w-full py-3" data-active={isFav}>
              {isFav ? '♥  Saved to favourites' : '♡  Add to favourites'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
