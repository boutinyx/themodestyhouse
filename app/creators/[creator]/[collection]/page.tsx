import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { creatorBySlug, collectionBySlug } from '@/lib/creators';
import { shopifyImage } from '@/lib/shopifyImage';
import { requireCreators, liveProducts, resolvePicks, Crumbs, Avatar, PickGrid } from '@/components/creators/CreatorParts';

/** /creators/[creator]/[collection] — one collection, every piece with her note. */

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ creator: string; collection: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { creator, collection } = await params;
  const c = creatorBySlug(creator);
  const k = c && collectionBySlug(c, collection);
  return { title: c && k ? `${k.title} by ${c.name}` : 'Not found', robots: { index: false, follow: false } };
}

export default async function CollectionPage({ params }: P) {
  await requireCreators();
  const { creator: cs, collection: ks } = await params;
  const creator = creatorBySlug(cs);
  const collection = creator && collectionBySlug(creator, ks);
  if (!creator || !collection) notFound();
  const picks = resolvePicks(collection, liveProducts());

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-7 pb-16">
      <Crumbs items={[{ label: 'Creators', href: '/creators' }, { label: creator.name, href: `/creators/${creator.slug}` }, { label: collection.title }]} />

      <section className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-5 md:gap-10 items-center py-7">
        <div className="grid grid-cols-3 gap-1 rounded-[22px] overflow-hidden">
          {picks.slice(0, 3).map(({ card }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={card.id} src={shopifyImage(card.image, 600)} alt="" className="w-full aspect-[3/4] object-cover" />
          ))}
        </div>
        <div>
          <div className="eyebrow">Collection</div>
          <h1 className="serif text-[34px] md:text-[46px] leading-[1.02] mt-2.5 mb-3.5" style={{ color: 'var(--aubergine)' }}>
            {collection.title}
          </h1>
          <div className="flex items-center gap-2.5 mb-4 text-[14px]">
            <Avatar creator={creator} size={34} />
            <span>
              by <b className="font-medium">{creator.name}</b> · {picks.length} pieces
            </span>
          </div>
          <p
            className="text-[26px] leading-tight pl-3.5"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--plum)', borderLeft: '3px solid var(--brass)' }}
          >
            “{collection.note}”
          </p>
        </div>
      </section>

      <PickGrid picks={picks} />
    </main>
  );
}
