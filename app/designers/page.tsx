import type { Metadata } from 'next';
import { houses } from '@/lib/houses';
import { BrandMarquee } from '@/components/BrandMarquee';

export const metadata: Metadata = {
  title: 'Designers | The Modesty House',
  description: 'A curated index of modest brands, vetted for craft and taste.',
};

const BADGE: Record<string, string> = {
  verified: '✦ Verified',
  'editors-pick': "✦ Editor's Pick",
};

const FEATURED = 6;

export default function DesignersPage() {
  const all = houses();
  // Badged houses lead — there are five, so the sixth is the next in catalogue
  // order rather than a hardcoded slug, which keeps this correct as badges move.
  const ranked = [...all].sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
  const list = ranked.slice(0, FEATURED);
  const rest = ranked.slice(FEATURED);

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-8 pt-40 pb-20">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 mb-10 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-9">
        {list.map((b, i) => (
          <a
            key={b.slug}
            href={b.homepage}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group block"
          >
            {/* The arch. A 3:4 portrait, because fashion is shot vertically and a
                square crop cuts most garments off at the waist.

                aspectRatio reserves the box before the image loads, so the grid
                does not shift as the photographs arrive — the site has no
                next/image and CLS on grids is a known landmine. */}
            <span
              className="relative block overflow-hidden"
              style={{
                aspectRatio: '3 / 4',
                borderRadius: '999px 999px 4px 4px',
                background: 'var(--bone)',
                border: '1px solid var(--hairline)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image}
                alt={b.name}
                loading={i < 6 ? 'eager' : 'lazy'}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                /* Pulled down from the top: the arch eats the upper corners, and
                   on a model shot that is where the head and neckline sit. */
                style={{ objectPosition: 'center 22%' }}
              />
            </span>

            {/* Nothing is set on the photograph — that is the point of this
                treatment. No scrim, so the image is never dimmed to make room
                for type, and the name never has to fight a busy picture. */}
            <span className="block text-center mt-3">
              <span
                className="serif block"
                style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--ink)' }}
              >
                {b.name}
              </span>
              <span className="eyebrow block mt-1.5">{b.city}</span>
              {/* The seal moves under the name. On an arched tile the top-left
                  corner is the one place it cannot go — the radius clips it. */}
              {b.badge && (
                <span className="badge mt-2">{BADGE[b.badge]}</span>
              )}
            </span>
          </a>
        ))}
      </div>

      {rest.length > 0 && (
        <section className="mt-20">
          <h2 className="section-heading text-2xl md:text-3xl">The rest of the index</h2>
          <p className="mt-3 mb-8 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
            Every other house we carry — {rest.length} of them. Hover to hold a column still.
          </p>
          <BrandMarquee houses={rest} />
        </section>
      )}
    </main>
  );
}
