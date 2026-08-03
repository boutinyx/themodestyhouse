import type { Metadata } from 'next';
import { getProducts } from '@/lib/products';
import { DirectoryBrowser } from '@/components/DirectoryBrowser';

export const metadata: Metadata = {
  title: 'The Directory | The Modesty House',
  description: 'Browse modest pieces from every verified house.',
};

export default function DirectoryPage() {
  const products = getProducts();
  return (
    <main className="max-w-6xl mx-auto px-5 pt-32 pb-16">
      <div className="text-center mb-6">
        <div className="eyebrow">The directory</div>
        <h1 className="section-heading text-3xl md:text-4xl mt-2">Everything modest</h1>
      </div>
      <DirectoryBrowser products={products} />
    </main>
  );
}
