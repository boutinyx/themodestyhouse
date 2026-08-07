import type { Metadata } from 'next';
import { browseProducts } from '@/lib/products';
import { DirectoryBrowser } from '@/components/DirectoryBrowser';

export const metadata: Metadata = {
  title: 'The Directory | The Modesty House',
  description: 'Browse modest pieces from every verified house.',
};

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const products = browseProducts();
  return (
    <main className="max-w-6xl mx-auto px-5 pt-32 pb-16">
      <div className="text-center mb-6">
        <h1 className="section-heading text-3xl md:text-4xl mt-2">
          {q ? <>Results for “{q}”</> : 'All'}
        </h1>
      </div>
      <DirectoryBrowser products={products} initialQuery={q ?? ''} />
    </main>
  );
}
