import Link from 'next/link';
import { newlyVerified, categoryCards } from '@/lib/houses';
import StyleIt from '@/components/StyleIt';
import HeroSearch from '@/components/HeroSearch';
import VerifiedSpotlight from '@/components/VerifiedSpotlight';
import EditorsRail from '@/components/EditorsRail';
import { getProducts } from '@/lib/products';
import { isSpecialty } from '@/lib/specialty';

export default function Home() {
  const rail = newlyVerified();
  const cats = categoryCards();
  const stories = [
    { cat: 'The List', title: 'The abaya houses defining quiet luxury', href: '/editorial' },
    { cat: 'Guide', title: 'How to layer for modest winter', href: '/editorial' },
    { cat: 'Interview', title: 'On craft, coverage and colour', href: '/editorial' },
    { cat: 'Feature', title: 'The new wave of hijabi swimwear', href: '/editorial' },
  ];
  const seenBrand = new Set<string>();
  const editorsPicks = getProducts()
    .filter((p) => p.inStock && p.image && !isSpecialty(p) && ['dress', 'abaya', 'skirt', 'top', 'set'].includes(p.garment))
    .filter((p) => {
      if (seenBrand.has(p.brandSlug)) return false;
      seenBrand.add(p.brandSlug);
      return true;
    })
    .slice(0, 12);

  return (
    <>
      {/* HERO — editorial modest-fashion image */}
      <section>
        <div className="relative overflow-hidden" style={{ height: '100vh', minHeight: 560, background: 'var(--aubergine)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-home.jpg?v=17b"
            alt="A rail of aubergine modest dresses in a boutique"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 45%' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.42)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 55% 42% at 50% 54%, rgba(0,0,0,0.30), rgba(0,0,0,0) 72%)' }}
          />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-5">
            <div className="eyebrow" style={{ color: 'var(--parchment)', textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}>Curated modest fashion</div>
            <h1 className="serif text-4xl md:text-6xl mt-4" style={{ color: 'var(--parchment)', textShadow: '0 2px 30px rgba(0,0,0,0.55)', lineHeight: 1.02 }}>
              The archive for
              <br />
              <span className="italic">everything</span> modest.
            </h1>
            <div className="mt-12 w-full max-w-2xl px-2">
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      {/* STYLE IT — mix & match picker */}
      <StyleIt />

      {/* EDITOR'S PICKS — scrollable rail */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">Picks from the editor</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Chosen by <span className="italic" style={{ color: 'var(--plum)' }}>hand</span>.
            </h2>
          </div>
          <Link href="/editorial" className="nav-link">All stories →</Link>
        </div>
        <EditorsRail picks={editorsPicks} />
      </section>

      {/* NEWLY VERIFIED — spotlight */}
      <VerifiedSpotlight houses={rail.slice(0, 8)} />

      {/* BROWSE BY CATEGORY */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">Browse the index</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>By category.</h2>
          </div>
          <Link href="/directory" className="nav-link">All categories →</Link>
        </div>
        <div className="tmh-cat-grid">
          {cats.slice(0, 5).map((c, i) => (
            <Link key={c.slug} href={`/${c.slug}`} className={`tmh-cat-card group${i === 0 ? ' tmh-cat-feat' : ''}`}>
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.label} />
              )}
              <div className="tmh-cat-scrim" />
              {c.count > 0 && <span className="tmh-cat-count">{c.count} pieces</span>}
              <div className="tmh-cat-cap">
                <div className="lbl">{c.label}</div>
                <div className="go">Explore →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FOR DESIGNERS */}
      <section className="aubergine-band my-20">
        <div className="max-w-[1220px] mx-auto px-8 py-20">
          <div className="max-w-2xl">
            <div>
              <div className="eyebrow" style={{ color: 'var(--brass)' }}>For designers</div>
              <h2 className="serif mt-3" style={{ fontSize: 'clamp(28px,4vw,46px)', lineHeight: 1.05, color: 'var(--parchment)' }}>
                Are you a modest fashion house? <span className="italic">Apply for the seal.</span>
              </h2>
              <ol className="mt-6 space-y-3">
                {[
                  'Submit your house & lookbook',
                  'We review craft, sizing and ethics',
                  'Go live with the verified seal',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3" style={{ color: '#e7d8e4' }}>
                    <span className="serif italic" style={{ color: 'var(--brass)' }}>{['i', 'ii', 'iii'][i]}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <a href="mailto:hello@themodestyhouse.com?subject=Apply%20for%20the%20seal" className="btn-pill inline-block mt-8" style={{ background: 'var(--brass)', color: 'var(--ink)' }}>
                Apply for the seal
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* THE EDIT */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">The Edit</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Reading, not just <span className="italic" style={{ color: 'var(--plum)' }}>shopping</span>.
            </h2>
          </div>
          <Link href="/editorial" className="nav-link">All stories →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
          <Link href={stories[0].href} className="relative block overflow-hidden" style={{ borderRadius: 8, minHeight: 460, background: 'var(--aubergine)' }}>
            {rail[0]?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={rail[0].image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.7), rgba(36,27,36,0) 55%)' }} />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <div className="eyebrow" style={{ color: '#e7d3b6' }}>{stories[0].cat}</div>
              <div className="serif mt-2" style={{ fontSize: 30, color: 'var(--parchment)' }}>{stories[0].title}</div>
            </div>
          </Link>
          <div className="flex flex-col gap-4">
            {stories.slice(1).map((s, i) => (
              <Link key={i} href={s.href} className="flex gap-4 p-3 items-center" style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--bone)' }}>
                <div className="shrink-0 overflow-hidden" style={{ width: 84, height: 84, borderRadius: 4, background: '#ece5d8' }}>
                  {rail[i + 1]?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rail[i + 1].image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <div className="eyebrow">{s.cat}</div>
                  <div className="serif mt-1" style={{ fontSize: 18, color: 'var(--ink)', lineHeight: 1.2 }}>{s.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
