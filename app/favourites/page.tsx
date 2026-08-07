'use client';
import { useQuickView } from '@/components/QuickView';
import { ProductCard } from '@/components/ProductCard';

export default function FavouritesPage() {
  const { favs } = useQuickView();
  const items = Object.values(favs);
  return (
    <main className="max-w-6xl mx-auto px-5 pt-28 pb-16">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Favourites</h1>
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
    </main>
  );
}
