import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return <p className="text-sm" style={{ color: 'var(--taupe)' }}>No pieces yet.</p>;
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
