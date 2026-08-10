import type { Metadata } from 'next';
import { browseProducts } from '@/lib/products';
import { DirectoryBrowser } from '@/components/DirectoryBrowser';
import { encodeCatalogue } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';

export const metadata: Metadata = {
  title: 'Products | The Modesty House',
  description: 'Browse modest pieces from every verified house.',
};

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const catalogue = encodeCatalogue(browseProducts(), BRANDS);
  // Same header shape as app/[lane]/page.tsx — left-aligned h1 with a short line
  // under it — so the directory reads as one of the category pages rather than a
  // different template. The intro is this page's own metadata description,
  // reused rather than newly written.
  //
  // SHELL: max-w-[1220px] + px-8 + pt-32 md:pt-40. Those three values are now
  // the same on every page and on the footer. They were max-w-6xl + px-5, which
  // put this page's content edge 22px inside the footer's at 1440 and 12px
  // inside it on a phone — two boxes stacked directly on top of one another and
  // not lining up. The top padding clears the fixed header, whose bottom edge is
  // at 88px at every width.
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-16">
      <h1 className="section-heading text-3xl md:text-4xl">
        {q ? <>Results for “{q}”</> : 'Products'}
      </h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        Browse modest pieces from every verified house.
      </p>
      <DirectoryBrowser catalogue={catalogue} initialQuery={q ?? ''} />
    </main>
  );
}
