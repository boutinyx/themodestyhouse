import Link from 'next/link';
import { LANES } from '@/lib/lanes';

export default function Home() {
  return (
    <>
      <section className="aubergine-band">
        <div className="max-w-6xl mx-auto px-5 py-24 text-center">
          <div className="eyebrow" style={{ color: '#d9c7d6' }}>modest style, for everyone</div>
          <h1 className="serif font-light text-5xl md:text-7xl tracking-wide mt-4" style={{ color: '#f7f0f5' }}>
            The Modest House
          </h1>
          <p className="mt-5 text-sm md:text-base max-w-md mx-auto" style={{ color: '#e7d8e4' }}>
            A curated edit of modest fashion — hijab, dresses, abaya and swim. Find your pieces.
          </p>
          <Link href="/hijabi-outfits" className="inline-block mt-8 btn-pill" style={{ background: '#f4ecef', color: 'var(--aubergine)' }}>
            Shop the edit
          </Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="eyebrow mb-5">The lanes</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="product-card block p-6">
              <div className="section-heading text-lg">{l.title}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--taupe)' }}>{l.intro}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
