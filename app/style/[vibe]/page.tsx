import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { VIBES } from '@/lib/vibes';
import { productsForVibe } from '@/lib/products';
import { FilterableGrid } from '@/components/FilterableGrid';

export function generateStaticParams() {
  return VIBES.map((v) => ({ vibe: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ vibe: string }> }): Promise<Metadata> {
  const { vibe } = await params;
  const v = VIBES.find((x) => x.slug === vibe);
  if (!v) return {};
  return { title: `${v.title} modest fashion | The Modesty House`, description: v.intro };
}

export default async function StylePage({ params }: { params: Promise<{ vibe: string }> }) {
  const { vibe } = await params;
  const v = VIBES.find((x) => x.slug === vibe);
  if (!v) notFound();
  const products = productsForVibe(v.slug);
  return (
    <main className="max-w-6xl mx-auto px-5 pt-40 pb-12">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">{v.title}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>{v.intro}</p>
      <FilterableGrid products={products} />
    </main>
  );
}
