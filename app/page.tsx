import Link from 'next/link';
import { LANES, CATEGORY_LANES } from '@/lib/lanes';
import { BRANDS } from '@/data/brands';
import { getProducts, productsForLane } from '@/lib/products';
import { ProductGrid } from '@/components/ProductGrid';

export default function Home() {
  const covers: Record<string, string | undefined> = {};
  for (const l of LANES) covers[l.slug] = productsForLane(l.slug)[0]?.image;
  const featured = productsForLane('hijabi-outfits').slice(0, 8);
  const total = getProducts().length;
  const featBrand = BRANDS.find((b) => b.badge === 'editors-pick') || BRANDS[0];
  const featImg = getProducts().find((p) => p.brandSlug === featBrand.slug)?.image;

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
              <span className="italic">everything</span> modest.
            </h1>
            <div className="mt-14">
              <Link href="/hijabi-outfits" className="btn-pill" style={{ background: 'var(--parchment)', color: 'var(--aubergine)' }}>
                Explore the edit
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY — editorial tiles with the name on the image */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="eyebrow mb-6 text-center">Shop by category</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {CATEGORY_LANES.slice(0, 6).map((l) => (
            <Link
              key={l.slug}
              href={`/${l.slug}`}
              className="group relative block overflow-hidden"
              style={{ borderRadius: 'var(--radius-image)', aspectRatio: '4 / 5', background: 'var(--aubergine)' }}
            >
              {covers[l.slug] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={covers[l.slug]}
                  alt={l.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.55), rgba(36,27,36,0) 55%)' }}
              />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <div className="serif text-2xl md:text-3xl" style={{ color: 'var(--parchment)' }}>{l.title}</div>
                <div className="eyebrow mt-1" style={{ color: '#e7d8e4' }}>Shop {l.nav}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED DESIGNER */}
      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <a
            href={featBrand.homepage}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group block overflow-hidden"
            style={{ borderRadius: 'var(--radius-image)', border: '1px solid var(--hairline)' }}
          >
            {featImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featImg}
                alt={featBrand.name}
                className="w-full aspect-[4/5] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            )}
          </a>
          <div className="text-center md:text-left">
            <div className="eyebrow">Featured designer</div>
            <h2 className="serif text-4xl md:text-5xl mt-3" style={{ color: 'var(--ink)' }}>{featBrand.name}</h2>
            <div className="brand-label mt-2">{featBrand.category} · {featBrand.city}</div>
            <p className="mt-5 text-sm leading-relaxed max-w-md mx-auto md:mx-0" style={{ color: 'var(--muted)' }}>
              An editor&rsquo;s pick from the house — {featBrand.category.toLowerCase()} crafted in {featBrand.city}.
              One of the modest labels we&rsquo;ve vetted for craft and taste.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center md:justify-start">
              <a href={featBrand.homepage} target="_blank" rel="noopener noreferrer sponsored" className="btn-pill">
                Shop {featBrand.name} →
              </a>
              <Link
                href="/directory"
                className="btn-pill"
                style={{ background: 'transparent', color: 'var(--aubergine)', border: '1px solid var(--aubergine)' }}
              >
                All designers
              </Link>
            </div>
          </div>
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
