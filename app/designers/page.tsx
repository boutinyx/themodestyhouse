import type { Metadata } from 'next';
import { houses, type House } from '@/lib/houses';

export const metadata: Metadata = {
  title: 'Designers | The Modesty House',
  description: 'A curated index of modest brands, vetted for craft and taste.',
};

const BADGE: Record<string, string> = {
  verified: '✦ Verified',
  'editors-pick': "✦ Editor's Pick",
};

/** The founder's pick, in the order Tina gave them. Chosen by hand, so it is a
 *  list of slugs rather than anything derived — a badge or a catalogue count
 *  would only approximate it and would drift the moment either changed. */
const FOUNDERS_PICK = ['veiled', 'aab', 'summer-evenings', 'inayah', 'glow-modesty'];

function Tile({ b, eager }: { b: House; eager: boolean }) {
  return (
    <a
      href={b.homepage}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block"
    >
      {/* The arch. A 3:4 portrait, because fashion is shot vertically and a
          square crop cuts most of these garments off at the waist.

          aspectRatio reserves the box before the image loads, so the grid does
          not shift as the photographs arrive — the site has no next/image and
          CLS on grids is a known landmine. */}
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
          loading={eager ? 'eager' : 'lazy'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          /* Pulled down from the top: the arch eats the upper corners, and on a
             model shot that is where the head and neckline sit. */
          style={{ objectPosition: 'center 22%' }}
        />
      </span>

      {/* Nothing is set on the photograph. No scrim, so the image is never
          dimmed to make room for type, and the name never has to fight a busy
          picture — which matters when 58 shops means 58 different backgrounds. */}
      <span className="block text-center mt-3">
        <span
          className="serif block"
          style={{ fontSize: 17, lineHeight: 1.15, color: 'var(--ink)' }}
        >
          {b.name}
        </span>
        <span className="eyebrow block mt-1.5">{b.city}</span>
        {/* The seal sits under the name: on an arched tile the top-left corner
            is the one place it cannot go, because the radius clips it. */}
        {b.badge && <span className="badge mt-2">{BADGE[b.badge]}</span>}
      </span>
    </a>
  );
}

export default function DesignersPage() {
  const all = houses();
  const bySlug = new Map(all.map((h) => [h.slug, h]));
  const picked = FOUNDERS_PICK.map((s) => bySlug.get(s)).filter((h): h is House => Boolean(h));
  const rest = all.filter((h) => !FOUNDERS_PICK.includes(h.slug));

  return (
    <main className="max-w-[1220px] mx-auto px-5 md:px-8 pt-40 pb-24">
      <h1 className="section-heading text-3xl md:text-4xl mt-2">Designers</h1>
      <p className="mt-3 max-w-xl text-sm" style={{ color: 'var(--muted)' }}>
        A curated index of modest fashion, brand by brand — vetted for craft and taste.
      </p>

      <h2 className="eyebrow mt-14 mb-6">Founder&rsquo;s pick</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-9">
        {picked.map((b) => (
          <Tile key={b.slug} b={b} eager />
        ))}
      </div>

      {rest.length > 0 && (
        <>
          <h2 className="eyebrow mt-20 mb-6">
            The rest of the index · {rest.length}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-9">
            {rest.map((b, i) => (
              <Tile key={b.slug} b={b} eager={i < 5} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
