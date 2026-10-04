import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { momentBySlug, collectionsForMoment } from '@/lib/creators';
import { requireCreators, liveProducts, resolvePicks, Crumbs, SectionHead, CollectionCard, PickGrid } from '@/components/creators/CreatorParts';

/**
 * /creators/moments/[moment] — every creator's collections for one moment,
 * then all their pieces. `moments` is a static segment, so Next matches it
 * before /creators/[creator]/[collection].
 */

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ moment: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const m = momentBySlug((await params).moment);
  return { title: m ? `${m.name} — Creators` : 'Not found', robots: { index: false, follow: false } };
}

export default async function MomentPage({ params }: P) {
  await requireCreators();
  const moment = momentBySlug((await params).moment);
  if (!moment) notFound();
  const live = liveProducts();
  const list = collectionsForMoment(moment.slug).map((x) => ({ ...x, picks: resolvePicks(x.collection, live) }));
  // A collection can sit in two moments and a piece in two collections; show each piece once.
  const seen = new Set<string>();
  const all = list.flatMap((x) => x.picks).filter((p) => (seen.has(p.card.id) ? false : (seen.add(p.card.id), true)));

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-7 pb-16">
      <Crumbs items={[{ label: 'Creators', href: '/creators' }, { label: moment.name }]} />
      <section className="pt-7">
        <h1 className="serif text-[40px] md:text-[56px] leading-none mb-2" style={{ color: 'var(--aubergine)' }}>
          {moment.name}
        </h1>
        <p className="eyebrow mb-7">
          {list.length} collection{list.length === 1 ? '' : 's'} from our creators
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {list.map(({ creator, collection, picks }) => (
            <CollectionCard key={`${creator.slug}/${collection.slug}`} creator={creator} collection={collection} picks={picks} />
          ))}
        </div>
      </section>
      <section className="pt-14">
        <SectionHead title="Every piece" aside={`${all.length} pieces`} />
        <PickGrid picks={all} />
      </section>
    </main>
  );
}
