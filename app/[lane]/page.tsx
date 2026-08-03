import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LANES } from '@/lib/lanes';
import { productsForLane } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';

export function generateStaticParams() {
  return LANES.map((l) => ({ lane: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lane: string }> }): Promise<Metadata> {
  const { lane: slug } = await params;
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) return {};
  return { title: `${lane.title} | The Modesty House`, description: lane.intro };
}

export default async function LanePage({ params }: { params: Promise<{ lane: string }> }) {
  const { lane: slug } = await params;
  const lane = LANES.find((l) => l.slug === slug);
  if (!lane) notFound();
  const products = productsForLane(lane.slug);
  return (
    <main className="max-w-6xl mx-auto px-5 py-12">
      <div className="eyebrow">The edit</div>
      <h1 className="section-heading text-3xl md:text-4xl mt-2">{lane.title}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--taupe)' }}>{lane.intro}</p>
      <ProductGrid products={products} />
    </main>
  );
}
