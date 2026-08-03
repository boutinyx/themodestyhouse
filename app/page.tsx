import Link from 'next/link';
import { newlyVerified, categoryCards } from '@/lib/houses';

export default function Home() {
  const rail = newlyVerified();
  const cats = categoryCards();
  const stories = [
    { cat: 'The List', title: 'The abaya houses defining quiet luxury', href: '/editorial' },
    { cat: 'Guide', title: 'How to layer for modest winter', href: '/editorial' },
    { cat: 'Interview', title: 'On craft, coverage and colour', href: '/editorial' },
    { cat: 'Feature', title: 'The new wave of hijabi swimwear', href: '/editorial' },
  ];

  return (
    <>
      {/* HERO — full-screen video */}
      <section>
        <div className="relative overflow-hidden" style={{ height: '100vh', minHeight: 560, background: 'var(--aubergine)' }}>
          <video
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 35%' }}
            autoPlay loop muted playsInline preload="auto" poster="/header-poster.jpg"
          >
            <source src="/header.mp4" type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 55% 42% at 50% 52%, rgba(0,0,0,0.34), rgba(0,0,0,0) 72%)' }}
          />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-5">
            <div className="eyebrow" style={{ color: 'var(--parchment)', textShadow: '0 1px 12px rgba(0,0,0,0.55)' }}>Curated modest fashion</div>
            <h1 className="serif text-5xl md:text-7xl mt-4" style={{ color: 'var(--parchment)', textShadow: '0 2px 30px rgba(0,0,0,0.55)', lineHeight: 1.02 }}>
              The archive for
              <br />
              <span className="italic">everything</span> modest.
            </h1>
            <div className="mt-14">
              <Link href="/directory" className="btn-pill" style={{ background: 'var(--parchment)', color: 'var(--aubergine)' }}>
                Explore the directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* NEWLY VERIFIED — house rail */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">Newly verified</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Houses that just earned the <span className="italic" style={{ color: 'var(--plum)' }}>seal</span>.
            </h2>
          </div>
          <Link href="/designers" className="nav-link">All designers →</Link>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory' }}>
          {rail.slice(0, 12).map((h) => (
            <a
              key={h.slug}
              href={h.homepage}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group shrink-0"
              style={{ width: 300, scrollSnapAlign: 'start' }}
            >
              <div className="relative overflow-hidden" style={{ borderRadius: 6, border: '1px solid var(--hairline)' }}>
                {h.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.image} alt={h.name} className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" style={{ height: 340 }} />
                )}
                {h.badge && <span className="badge absolute top-3 left-3">✦ Verified</span>}
              </div>
              <div className="serif mt-3" style={{ fontSize: 22, color: 'var(--ink)' }}>{h.name}</div>
              <div className="brand-label mt-1">{h.category} · {h.city}</div>
              <div className="nav-link mt-2">View house →</div>
            </a>
          ))}
        </div>
      </section>

      {/* THE EDIT */}
      <section className="max-w-[1220px] mx-auto px-8 py-8">
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

      {/* BROWSE BY CATEGORY */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">Browse the index</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>By category.</h2>
          </div>
          <Link href="/directory" className="nav-link">All categories →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cats.slice(0, 3).map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="group relative block overflow-hidden" style={{ borderRadius: 8, height: 420, background: 'var(--aubergine)' }}>
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.62), rgba(36,27,36,0) 60%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="serif" style={{ fontSize: 28, color: 'var(--parchment)' }}>{c.label}</div>
                <div className="nav-link mt-1" style={{ color: 'var(--parchment)' }}>Explore →</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FOR DESIGNERS */}
      <section className="aubergine-band">
        <div className="max-w-[1220px] mx-auto px-8 py-24">
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

      {/* NEWSLETTER */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center p-8 md:p-12" style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 12 }}>
          <div className="overflow-hidden" style={{ borderRadius: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/inbox-preview.png" alt="A Modesty House email in an inbox" className="w-full h-auto" />
          </div>
          <div className="text-center md:text-left">
            <div className="eyebrow">Join the house</div>
            <h3 className="serif mt-3" style={{ fontSize: 34, color: 'var(--ink)' }}>
              The Edit, <span className="italic" style={{ color: 'var(--plum)' }}>in your inbox.</span>
            </h3>
            <p className="mt-3 text-sm max-w-sm mx-auto md:mx-0" style={{ color: 'var(--muted)' }}>
              New houses, editorials, and the occasional drop. Once a week, never more.
            </p>
            <form action="mailto:hello@themodestyhouse.com" method="post" className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="your@email.com"
                className="flex-1 max-w-xs"
                style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
              />
              <button type="submit" className="btn-pill">Join the house</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
