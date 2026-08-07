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
  // Same header shape as app/[lane]/page.tsx — left-aligned h1 with a short line
  // under it — so the directory reads as one of the category pages rather than a
  // different template. pt-40 matches theirs too; it was pt-32. The intro is this
  // page's own metadata description, reused rather than newly written.
  return (
    <main className="max-w-6xl mx-auto px-5 pt-40 pb-16">
      <h1 className="section-heading text-3xl md:text-4xl">
        {q ? <>Results for “{q}”</> : 'All'}
      </h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        Browse modest pieces from every verified house.
      </p>
      <DirectoryBrowser products={products} initialQuery={q ?? ''} />
    </main>
  );
}
