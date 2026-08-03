import Link from 'next/link';
import { LANES } from '@/lib/lanes';

export default function Home() {
  return (
    <>
      <section className="aubergine-band">
        <div className="max-w-6xl mx-auto px-5 py-24 text-center">
          <h1 className="serif text-5xl md:text-7xl" style={{ color: 'var(--parchment)' }}>
            The Modesty House
          </h1>
          <p className="serif italic text-xl md:text-2xl mt-5" style={{ color: '#e7d8e4' }}>
            The archive for everything modest.
          </p>
          <Link
            href="/hijabi-outfits"
            className="inline-block mt-8 btn-pill"
            style={{ background: 'var(--parchment)', color: 'var(--aubergine)' }}
          >
            Explore the archive
          </Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="eyebrow mb-5">The edit</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="product-card block p-6">
              <div className="section-heading text-lg">{l.title}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--muted)' }}>{l.intro}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
