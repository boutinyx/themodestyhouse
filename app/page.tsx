import Link from 'next/link';
import { LANES } from '@/lib/lanes';
import { getProducts, productsForLane } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';

export default function Home() {
  const covers: Record<string, string | undefined> = {};
  for (const l of LANES) covers[l.slug] = productsForLane(l.slug)[0]?.image;
  const featured = productsForLane('hijabi-outfits').slice(0, 8);
  const total = getProducts().length;

  return (
    <>
      {/* HERO — full-screen video, header overlays the top */}
      <section>
        <div
          className="relative overflow-hidden"
          style={{ height: '100vh', minHeight: 560, background: 'var(--aubergine)' }}
        >
          <video
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 35%' }}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/header-poster.jpg"
          >
            <source src="/header.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 55% 42% at 50% 52%, rgba(0,0,0,0.34), rgba(0,0,0,0) 72%)' }}
          />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-5">
            <div className="eyebrow" style={{ color: 'var(--parchment)', textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}>Curated modest fashion</div>
            <h1
              className="serif text-5xl md:text-7xl mt-4"
              style={{ color: 'var(--parchment)', textShadow: '0 2px 30px rgba(0,0,0,0.55)', lineHeight: 1.02 }}
            >
              The archive for
              <br />
              everything modest.
            </h1>
            <div className="mt-14">
              <Link href="/hijabi-outfits" className="btn-pill" style={{ background: 'var(--parchment)', color: 'var(--aubergine)' }}>
                Explore the edit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="eyebrow mb-6 text-center">Shop by category</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {LANES.map((l) => (
            <Link key={l.slug} href={`/${l.slug}`} className="group block">
              <div className="product-imgwrap aspect-[4/5]">
                {covers[l.slug] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={covers[l.slug]} alt={l.title} className="product-img w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" style={{ background: '#ece5d8' }} />
                )}
              </div>
              <div className="section-heading text-base mt-3">{l.title}</div>
              <div className="brand-label mt-1">Shop {l.nav} →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* EDITORIAL — the aubergine moment */}
      <section className="aubergine-band my-10">
        <div className="max-w-3xl mx-auto px-5 py-20 text-center">
          <div className="eyebrow" style={{ color: '#c9b2c4' }}>A curator, not a catalogue</div>
          <p className="serif text-2xl md:text-4xl leading-snug mt-4" style={{ color: 'var(--parchment)' }}>
            We frame the fashion and point you to where it&rsquo;s sold — a curated index of modest brands, vetted for craft and taste.
          </p>
          <Link href="/about" className="inline-block mt-8 btn-pill" style={{ background: 'var(--parchment)', color: 'var(--aubergine)' }}>
            Our story
          </Link>
        </div>
      </section>

      {/* NEW IN */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="eyebrow">New in</div>
            <h2 className="section-heading text-2xl md:text-3xl mt-1">Fresh from the archive</h2>
          </div>
          <Link href="/hijabi-outfits" className="nav-link">View all →</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      {/* TRUST BAR */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            ['Curated by hand', 'Every piece chosen by eye, not an algorithm.'],
            ['Brands worth knowing', `A vetted index of ${total.toLocaleString()}+ modest pieces.`],
            ['Always fresh', 'New arrivals added every week.'],
          ].map(([t, d]) => (
            <div key={t} className="product-card p-6">
              <div className="section-heading text-lg">{t}</div>
              <div className="text-sm mt-2" style={{ color: 'var(--muted)' }}>{d}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
