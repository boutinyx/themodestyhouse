import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { shopifyImage } from '@/lib/shopifyImage';
import { getProducts } from '@/lib/products';
import { creatorsEnabled, resolvePicks, type Creator, type CreatorCollection, type CreatorPick } from '@/lib/creators';
import type { Product } from '@/lib/types';

/**
 * Shared pieces for /creators. Server components (ProductCard is the only
 * client island). See lib/creators.ts for what the section is and why it is
 * staging-only.
 */

/** 404 on the real domain. Call first in every /creators page. */
export async function requireCreators(): Promise<void> {
  const h = await headers();
  if (!creatorsEnabled(h.get('x-forwarded-host') ?? h.get('host'))) notFound();
}

export function liveProducts(): Map<string, Product> {
  return new Map(getProducts().filter((p) => p.inStock !== false).map((p) => [p.id, p]));
}

export function Avatar({ creator, size }: { creator: Creator; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={creator.photo}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size, objectPosition: '50% 25%', boxShadow: '0 0 0 2px var(--bone), 0 0 0 3px var(--brass)' }}
    />
  );
}

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-6 text-[13px]" style={{ color: 'var(--muted)' }}>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && ' / '}
          {it.href ? (
            <Link href={it.href} className="underline underline-offset-4" style={{ color: 'var(--plum)' }}>
              {it.label}
            </Link>
          ) : (
            it.label
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1.5 mb-5">
      <h2 className="serif text-[28px] md:text-[36px] leading-none" style={{ color: 'var(--aubergine)' }}>
        {title}
      </h2>
      {aside && <span className="eyebrow">{aside}</span>}
    </div>
  );
}

/** A card for one collection: three cover pieces, title, byline. */
export function CollectionCard({
  creator,
  collection,
  picks,
  isNew = false,
}: {
  creator: Creator;
  collection: CreatorCollection;
  picks: CreatorPick[];
  isNew?: boolean;
}) {
  return (
    <Link
      href={`/creators/${creator.slug}/${collection.slug}`}
      className="block overflow-hidden rounded-[22px] transition-shadow hover:shadow-lg"
      style={{ background: '#fff', border: '1px solid var(--hairline)' }}
    >
      <div className="grid grid-cols-3 gap-[3px]">
        {picks.slice(0, 3).map(({ card }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={card.id} src={shopifyImage(card.image, 400)} alt="" loading="lazy" className="w-full aspect-[3/4] object-cover" />
        ))}
      </div>
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <Avatar creator={creator} size={34} />
        <div className="min-w-0">
          <h3 className="serif text-[20px] leading-tight truncate">{collection.title}</h3>
          <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
            by {creator.name} · {picks.length} pieces
          </div>
        </div>
        {isNew && (
          <span className="ml-auto eyebrow" style={{ color: 'var(--brass)' }}>
            New
          </span>
        )}
      </div>
    </Link>
  );
}

/** The creator's picks: the site's own product card, with her note under it. */
export function PickGrid({ picks }: { picks: CreatorPick[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 md:gap-x-5 gap-y-8 md:gap-y-10">
      {picks.map(({ card, note }, i) => (
        <div key={card.id}>
          <ProductCard p={card} priority={i < 4} />
          {note && (
            <p className="serif italic text-[15px] leading-snug mt-1.5" style={{ color: 'var(--plum)' }}>
              “{note}”
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export { resolvePicks };
