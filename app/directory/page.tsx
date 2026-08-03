import type { Metadata } from 'next';
import { BRANDS } from '@/data/brands';
import { BrandCard } from '@/components/BrandCard';

export const metadata: Metadata = {
  title: 'Designers | The Modesty House',
  description: 'A curated index of modest brands, vetted for craft and taste.',
};

export default function DirectoryPage() {
  return (
    <main className="max-w-4xl mx-auto px-5 py-12">
      <div className="eyebrow">The directory</div>
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>
      <div className="flex flex-col gap-3">
        {BRANDS.map((b) => (
          <BrandCard key={b.slug} b={b} />
        ))}
      </div>
    </main>
  );
}
