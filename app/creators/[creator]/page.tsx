import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';
import { creatorBySlug } from '@/lib/creators';
import { shopifyImage } from '@/lib/shopifyImage';
import { ProductCard } from '@/components/ProductCard';
import { requireCreators, liveProducts, resolvePicks, Crumbs, SectionHead } from '@/components/creators/CreatorParts';

/** /creators/[creator] — her shop: profile, top picks, collections. */

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ creator: string }> }): Promise<Metadata> {
  const c = creatorBySlug((await params).creator);
  return { title: c ? `${c.name}’s shop` : 'Not found', robots: { index: false, follow: false } };
}

export default async function CreatorPage({ params }: { params: Promise<{ creator: string }> }) {
  await requireCreators();
  const creator = creatorBySlug((await params).creator);
  if (!creator) notFound();

  const live = liveProducts();
  const collections = creator.collections.map((collection) => ({ collection, picks: resolvePicks(collection, live) }));
  const top = collections.flatMap(({ collection, picks }) => picks.slice(0, 2).map((p) => ({ ...p, collection })));
  const pickCount = collections.reduce((n, c) => n + c.picks.length, 0);
  const brandCount = new Set(collections.flatMap((c) => c.picks.map((p) => p.card.brandSlug))).size;

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-7 pb-16">
      <Crumbs items={[{ label: 'Creators', href: '/creators' }, { label: creator.name }]} />

      {/* PROFILE */}
      <section
        className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-4 md:gap-9 items-center text-center md:text-left py-7 md:py-11"
        style={{ borderBottom: '1px solid var(--hairline)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={creator.photo}
          alt={creator.name}
          className="mx-auto w-[130px] h-[130px] md:w-[220px] md:h-[220px] rounded-full object-cover"
          style={{ objectPosition: '50% 25%', boxShadow: '0 0 0 6px var(--parchment), 0 0 0 7px var(--brass)' }}
        />
        <div>
          <div className="eyebrow">Creator shop · {creator.city}</div>
          <h1 className="serif text-[36px] md:text-[50px] leading-none mt-1.5">{creator.name}</h1>
          <div className="flex gap-3.5 items-center justify-center md:justify-start mt-2 mb-3.5 text-[15px]" style={{ color: 'var(--plum)' }}>
            <span className="inline-flex items-center gap-1">
              <InstagramLogo size={18} /> @{creator.handle}
            </span>
            <span className="inline-flex items-center gap-1">
              <TiktokLogo size={18} /> @{creator.handle}
            </span>
          </div>
          <p className="max-w-[520px] mx-auto md:mx-0 leading-relaxed" style={{ color: '#4a3f4a' }}>
            {creator.bio}
          </p>
          <div className="flex gap-7 justify-center md:justify-start mt-4.5">
            {[
              [creator.collections.length, 'Collections'],
              [pickCount, 'Picks'],
              [brandCount, 'Brands'],
            ].map(([n, label]) => (
              <div key={label}>
                <b className="serif block font-normal text-[26px]" style={{ color: 'var(--aubergine)' }}>
                  {n}
                </b>
                <span className="text-[11px] uppercase tracking-[.08em]" style={{ color: 'var(--muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Instagram button deliberately NOT a link: the handles are fictional
            and must not send anyone to a stranger's account. */}
        <div className="flex md:flex-col gap-2.5 justify-center">
          <span className="btn-pill inline-flex items-center gap-2">
            <InstagramLogo size={18} /> Follow
          </span>
        </div>
      </section>

      {/* TOP PICKS */}
      <section className="pt-10">
        <SectionHead title="Her top picks" />
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {top.map(({ card, note }) => (
            <div key={card.id} className="shrink-0 w-[160px] md:w-[200px]">
              <ProductCard p={card} />
              {note && (
                <p className="serif italic text-[14px] leading-snug mt-1.5" style={{ color: 'var(--plum)' }}>
                  “{note}”
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="pt-10">
        <SectionHead title="Collections" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {collections.map(({ collection, picks }) => (
            <Link key={collection.slug} href={`/creators/${creator.slug}/${collection.slug}`} className="group block">
              <div className="grid grid-cols-2 grid-rows-2 gap-[3px] rounded-[18px] overflow-hidden aspect-square transition-transform group-hover:scale-[1.02]">
                {picks.slice(0, 4).map(({ card }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={card.id} src={shopifyImage(card.image, 400)} alt="" loading="lazy" className="w-full h-full min-h-0 object-cover" />
                ))}
              </div>
              <h3 className="serif text-[19px] mt-2.5">{collection.title}</h3>
              <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                {picks.length} pieces
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
