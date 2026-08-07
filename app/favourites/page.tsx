'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuickView } from '@/components/QuickView';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/lib/types';

const UNDO_MS = 8000;

export default function FavouritesPage() {
  const { favs, toggleFav, isFav } = useQuickView();
  const items = Object.values(favs);

  // Removal is destructive and one tap away, and favourites live only in this
  // browser — there is no server copy to recover from. So every removal is
  // undoable rather than confirmed: a confirm dialog on every heart would make
  // clearing a long list miserable, while undo costs nothing until it is needed.
  const [undoable, setUndoable] = useState<Product[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The heart lives inside ProductCard and calls toggleFav directly, so this
  // page never learns about a removal by being clicked. Instead it WATCHES the
  // favourites map and reacts to anything that disappears — which covers the
  // heart here, the heart in quick view, and Clear all, with one mechanism.
  const prev = useRef<Record<string, Product>>({});
  const restoring = useRef(false);

  useEffect(() => {
    const gone = Object.values(prev.current).filter((p) => !favs[p.id]);
    prev.current = favs;

    if (restoring.current) { restoring.current = false; return; }
    if (gone.length === 0) return;

    setUndoable(gone);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUndoable([]), UNDO_MS);
  }, [favs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const clearAll = useCallback(() => {
    // Each toggle removes one; the watcher above collects them into a single
    // undoable batch, so this needs no undo bookkeeping of its own.
    Object.values(favs).forEach(toggleFav);
  }, [favs, toggleFav]);

  const undo = useCallback(() => {
    restoring.current = true;
    // Guard each one: the shopper may have re-saved a piece by hand in the
    // meantime, and toggling it again would remove it a second time.
    undoable.forEach((p) => { if (!isFav(p.id)) toggleFav(p); });
    setUndoable([]);
    if (timer.current) clearTimeout(timer.current);
  }, [undoable, toggleFav, isFav]);

  return (
    <main className="max-w-6xl mx-auto px-5 pt-28 pb-16">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="section-heading text-3xl md:text-4xl mt-2">
          Favourites{items.length > 0 ? <span style={{ color: 'var(--muted)' }}> ({items.length})</span> : null}
        </h1>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="nav-link"
            style={{ color: 'var(--muted)', textDecoration: 'underline', textUnderlineOffset: 4 }}
          >
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>
          No favourites yet. Tap the ♡ on any piece to save it here.
        </p>
      ) : (
        <div className="product-grid mt-8">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {undoable.length > 0 && (
        <div
          role="status"
          className="fixed left-1/2 bottom-6 -translate-x-1/2 flex items-center gap-4 px-5 py-3 rounded-full z-50"
          style={{
            background: 'var(--aubergine)',
            color: 'var(--parchment)',
            boxShadow: '0 8px 30px rgba(43,38,34,0.28)',
          }}
        >
          <span className="text-sm">
            {undoable.length === 1 ? 'Removed 1 piece' : `Removed ${undoable.length} pieces`}
          </span>
          <button
            onClick={undo}
            className="text-sm"
            style={{ color: 'var(--brass)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Undo
          </button>
        </div>
      )}
    </main>
  );
}
