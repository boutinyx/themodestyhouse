import type { Metadata } from 'next';
import { houses } from '@/lib/houses';

export const metadata: Metadata = {
  title: 'Designers | The Modesty House',
  description: 'A curated index of modest brands, vetted for craft and taste.',
};

const BADGE: Record<string, string> = {
  verified: '✦ Verified',
  'editors-pick': "✦ Editor's Pick",
};

export default function DesignersPage() {
  const list = houses();

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-8 pt-40 pb-20">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 mb-10 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {list.map((b, i) => (
          <a
            key={b.slug}
            href={b.homepage}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group relative block overflow-hidden"
            style={{
              aspectRatio: '1 / 1',
              borderRadius: 4,
              background: 'var(--bone)',
              border: '1px solid var(--hairline)',
            }}
          >
            {/* aspectRatio on the tile reserves the box before the image loads, so
                the grid does not shift as 58 hotlinked images arrive. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image}
              alt={b.name}
              loading={i < 10 ? 'eager' : 'lazy'}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />

            {/* The name sits ON the photograph, so it needs its own ground. The
                scrim is transparent across the top two-thirds and only gathers
                where the type is. */}
            <span
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(28,12,34,0) 46%, rgba(28,12,34,.30) 66%, rgba(28,12,34,.80))',
              }}
            />

            {b.badge && (
              <span className="badge absolute top-2.5 left-2.5">{BADGE[b.badge]}</span>
            )}

            <span className="absolute left-3 right-3 bottom-3">
              <span
                className="serif block"
                style={{ fontSize: 17, lineHeight: 1.12, color: 'var(--parchment)' }}
              >
                {b.name}
              </span>
              <span
                className="eyebrow block mt-1"
                style={{ color: 'var(--parchment)', opacity: 0.82 }}
              >
                {b.city}
              </span>
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
