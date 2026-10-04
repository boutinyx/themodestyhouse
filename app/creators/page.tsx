import Link from 'next/link';
import type { Metadata } from 'next';
import { CREATORS, MOMENTS, LATEST, collectionsForMoment, creatorBySlug, collectionBySlug } from '@/lib/creators';
import { shopifyImage } from '@/lib/shopifyImage';
import { ProductCard } from '@/components/ProductCard';
import { CreatorRail } from '@/components/creators/CreatorRail';
import { requireCreators, liveProducts, resolvePicks, Avatar, SectionHead, CollectionCard } from '@/components/creators/CreatorParts';

/**
 * /creators — overview. Order is Tina's (2026-10-04): hero, Loved by creators,
 * Shop by moment, All creators (swipe row), Latest collections, then one quiet
 * line for creators. Staging-only — see lib/creators.ts.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creators',
  description: 'Modest-fashion creators share what they actually wear, picked from every brand on The Modesty House.',
  robots: { index: false, follow: false },
};

export default async function CreatorsPage() {
  await requireCreators();
  const live = liveProducts();

  // One piece from each collection, with the creator who picked it.
  const loved = CREATORS.flatMap((creator) =>
    creator.collections.flatMap((collection) => {
      const picks = resolvePicks(collection, live);
      const p = picks[2] ?? picks[0];
      return p ? [{ creator, collection, ...p }] : [];
    }),
  );

  return (
    <main className="pb-16">
      {/* HERO — slid under the sticky header like the edit pages, so the header
          goes transparent over it (Header.tsx watches [data-hero]). */}
      <section
        data-hero
        className="relative overflow-hidden h-[620px] md:h-auto md:aspect-[16/9] md:max-h-[860px] w-full"
        style={{ marginTop: 'calc(-1 * var(--header-height))', background: 'var(--ink)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mockups/creator-shops/hero.png"
          alt="Four friends at a candlelit dinner table with pink roses"
          className="absolute inset-0 w-full h-full object-cover object-[42%_30%] md:object-[50%_35%]"
          loading="eager"
          fetchPriority="high"
        />
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(29,22,29,.05) 40%, rgba(29,22,29,.62))' }} />
        <div className="absolute inset-x-0 bottom-10 md:bottom-16 text-center" style={{ color: '#fff' }}>
          <div className="eyebrow" style={{ color: '#efe4d3', letterSpacing: '.22em' }}>
            The Modesty House
          </div>
          <h1 className="serif text-[64px] md:text-[clamp(64px,10vw,150px)] leading-[.9] mt-4">Creators</h1>
        </div>
      </section>

      <div className="max-w-[1220px] mx-auto px-5 md:px-7">
        {/* LOVED BY CREATORS */}
        <section className="pt-14 md:pt-18">
          <SectionHead title="Loved by creators" aside="Picked this month" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {loved.map(({ creator, collection, card }) => (
              <div key={card.id} className="shrink-0 w-[170px] md:w-[210px]">
                <ProductCard p={card} />
                <Link
                  href={`/creators/${creator.slug}/${collection.slug}`}
                  className="mt-2 flex items-center gap-2 text-[12px]"
                  style={{ color: 'var(--plum)' }}
                >
                  <Avatar creator={creator} size={24} />
                  Picked by {creator.name}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* SHOP BY MOMENT */}
        <section className="pt-14 md:pt-18">
          <SectionHead title="Shop by moment" aside="Collections from every creator" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-4">
            {MOMENTS.map((m) => {
              const list = collectionsForMoment(m.slug);
              const cover = list.flatMap(({ collection }) => resolvePicks(collection, live))[0];
              return (
                <Link
                  key={m.slug}
                  href={`/creators/moments/${m.slug}`}
                  className="group relative block overflow-hidden rounded-[22px] aspect-[3/4]"
                  style={{ background: 'var(--hairline)' }}
                >
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shopifyImage(cover.card.image, 600)}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                  <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(29,22,29,0) 45%, rgba(29,22,29,.65))' }} />
                  <div className="absolute left-4 right-4 bottom-4" style={{ color: '#fff' }}>
                    <b className="serif block font-normal text-[22px] md:text-[26px] leading-tight">{m.name}</b>
                    <span className="text-[12px] opacity-85">
                      {list.length} collection{list.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ALL CREATORS — swipe row */}
        <CreatorRail title="All creators">
          {CREATORS.map((creator) => {
            const covers = creator.collections.map((k) => resolvePicks(k, live)[0]).filter(Boolean);
            const picks = creator.collections.reduce((n, k) => n + resolvePicks(k, live).length, 0);
            return (
              <Link
                key={creator.slug}
                href={`/creators/${creator.slug}`}
                className="snap-start shrink-0 basis-[82%] md:basis-[41%] block overflow-hidden rounded-[24px] transition-shadow hover:shadow-lg"
                style={{ background: '#fff', border: '1px solid var(--hairline)' }}
              >
                <div className="grid grid-cols-[2fr_1fr] grid-rows-2 gap-[3px] h-[300px] md:h-[380px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={creator.photo} alt={creator.name} className="row-span-2 w-full h-full object-cover" style={{ objectPosition: '50% 18%' }} />
                  {covers.slice(0, 2).map((c) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={c!.card.id} src={shopifyImage(c!.card.image, 400)} alt="" loading="lazy" className="w-full h-full min-h-0 object-cover" />
                  ))}
                </div>
                <div className="flex items-center gap-3 px-4.5 py-4">
                  <Avatar creator={creator} size={46} />
                  <div>
                    <h3 className="serif text-[21px] leading-tight">{creator.name}</h3>
                    <div className="text-[13px]" style={{ color: 'var(--plum)' }}>
                      @{creator.handle}
                    </div>
                  </div>
                  <div className="ml-auto text-right text-[12px]" style={{ color: 'var(--muted)' }}>
                    {creator.collections.length} collections
                    <br />
                    {picks} picks
                  </div>
                </div>
              </Link>
            );
          })}
        </CreatorRail>

        {/* LATEST COLLECTIONS */}
        <section className="pt-14 md:pt-18">
          <SectionHead title="Latest collections" aside="Just added" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {LATEST.map(([c, k], i) => {
              const creator = creatorBySlug(c);
              const collection = creator && collectionBySlug(creator, k);
              if (!creator || !collection) return null;
              return <CollectionCard key={`${c}/${k}`} creator={creator} collection={collection} picks={resolvePicks(collection, live)} isNew={i < 2} />;
            })}
          </div>
        </section>

        <p className="text-center text-[13px] pt-12" style={{ color: 'var(--muted)' }}>
          Are you a creator?{' '}
          <Link href="/contact" className="underline underline-offset-4" style={{ color: 'var(--aubergine)' }}>
            Be seen by brands
          </Link>
        </p>
      </div>
    </main>
  );
}
