import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LANES } from '@/lib/lanes';
import { productsForLane } from '@/lib/products';
import { FilterableGrid } from '@/components/FilterableGrid';
import { encodeCatalogue } from '@/lib/compactCatalogue';
import { BRANDS } from '@/data/brands';

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
  const catalogue = encodeCatalogue(productsForLane(lane.slug), BRANDS);
  return (
    <main className="max-w-[1220px] mx-auto px-8 pt-32 md:pt-40 pb-12">
      <h1 className="section-heading text-3xl md:text-4xl">{lane.title}</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>{lane.intro}</p>
      <FilterableGrid catalogue={catalogue} />
    </main>
  );
}
