import Link from 'next/link';
import { newlyVerified, trust, categoryCards } from '@/lib/houses';
import { IndexBar } from '@/components/IndexBar';

export default function Home() {
  const rail = newlyVerified();
  const t = trust();
  const cats = categoryCards();
  const stories = [
    { cat: 'The List', title: 'The abaya houses defining quiet luxury', href: '/editorial' },
    { cat: 'Guide', title: 'How to layer for modest winter', href: '/editorial' },
    { cat: 'Interview', title: 'On craft, coverage and colour', href: '/editorial' },
    { cat: 'Feature', title: 'The new wave of hijabi swimwear', href: '/editorial' },
  ];

  return (
    <>
      {/* HERO */}
      <section className="max-w-[1220px] mx-auto px-8 pt-32 pb-36">
        <div className="grid grid-cols-1 md:grid-cols-[1.05fr_.95fr] gap-12 items-center">
          <div>
            <div className="eyebrow">The modest fashion directory</div>
            <h1 className="serif mt-4" style={{ fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.98, color: 'var(--ink)' }}>
              The archive for <span className="italic" style={{ color: 'var(--plum)' }}>everything</span> modest.
            </h1>
            <p className="mt-6 max-w-md" style={{ color: 'var(--muted)', fontSize: 17, lineHeight: 1.6 }}>
              A curated index of modest fashion houses — vetted for craft and taste. Explore verified designers, not endless catalogues.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/directory" className="btn-pill">Explore the directory</Link>
              <Link href="/editorial" className="btn-pill" style={{ background: 'transparent', color: 'var(--aubergine)', border: '1px solid var(--aubergine)' }}>
                Read the edit
              </Link>
            </div>
          </div>
          <div className="relative overflow-hidden" style={{ borderRadius: 6, height: 600, background: 'var(--aubergine)' }}>
            <video
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 30%' }}
              autoPlay loop muted playsInline preload="auto" poster="/header-poster.jpg"
            >
              <source src="/header.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.6), rgba(36,27,36,0) 55%)' }} />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
              <span className="eyebrow" style={{ color: '#e7d3b6' }}>Vol. 01 · Autumn</span>
              <span className="badge">✦ {t.houses} verified houses</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="serif italic text-xl md:text-2xl" style={{ color: 'var(--parchment)' }}>
                Quiet luxury, and the houses defining it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INDEX BAR — signature, floats over the seam */}
      <div style={{ marginTop: -84, position: 'relative', zIndex: 10 }}>
        <IndexBar />
      </div>

      {/* TRUST STRIP */}
      <div className="mt-16" style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
        <div className="max-w-[1220px] mx-auto px-8 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center">
          {[
            [`${t.houses}`, 'Verified houses'],
            [`${t.cities}`, 'Cities'],
            [`${t.categories}`, 'Categories'],
            ['Weekly', 'Updated'],
          ].map(([n, label], i) => (
            <div key={label} className="flex items-center gap-8">
              <div className="flex items-baseline gap-2">
                <span className="serif" style={{ color: 'var(--brass)', fontSize: 22 }}>{n}</span>
                <span className="eyebrow">{label}</span>
              </div>
              {i < 3 && <span aria-hidden style={{ width: 1, height: 16, background: 'var(--brass)', opacity: 0.5 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* NEWLY VERIFIED — house rail */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">Newly verified</div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Houses that just earned the <span className="italic" style={{ color: 'var(--plum)' }}>seal</span>.
            </h2>
          </div>
          <Link href="/directory" className="nav-link">All designers →</Link>
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
          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_.9fr] gap-12 items-center">
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
            <div className="text-center p-10" style={{ border: '1px solid rgba(243,238,228,0.2)', borderRadius: 12 }}>
              <div className="serif" style={{ fontSize: 34, color: 'var(--parchment)' }}>✦</div>
              <div className="eyebrow mt-4" style={{ color: 'var(--brass)' }}>Verified by</div>
              <div className="wordmark mt-1" style={{ color: 'var(--parchment)', fontSize: 20 }}>The Modesty House</div>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-[1220px] mx-auto px-8 py-20">
        <div className="max-w-2xl mx-auto text-center p-12" style={{ background: 'var(--bone)', border: '1px solid var(--hairline)', borderRadius: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="The Modesty House" className="h-14 w-auto mx-auto" />
          <h3 className="serif mt-5" style={{ fontSize: 30, color: 'var(--ink)' }}>
            The Edit, <span className="italic" style={{ color: 'var(--plum)' }}>in your inbox.</span>
          </h3>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
            New houses, editorials, and the occasional drop. Once a week, never more.
          </p>
          <form action="mailto:hello@themodestyhouse.com" method="post" className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
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
      </section>
    </>
  );
}
