import Link from 'next/link';
// ssr entrypoint: app/page.tsx is a server component (CLAUDE.md §6).
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { newlyVerified, categoryCards } from '@/lib/houses';
import StyleIt from '@/components/StyleIt';
import HeroSearch from '@/components/HeroSearch';
import VerifiedSpotlight from '@/components/VerifiedSpotlight';
import EditorsRail from '@/components/EditorsRail';
import { getProducts } from '@/lib/products';
import { getPosts } from '@/lib/posts';
import { isSpecialty } from '@/lib/specialty';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { editorialVariant, editorialSrcSet } from '@/lib/staticImage';

export default function Home() {
  const rail = newlyVerified();
  const cats = categoryCards();
  const posts = getPosts();
  const feature = posts[0];
  const moreStories = posts.slice(1, 4);
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
          {/* The LCP element on a phone. It was one 1920px JPEG (227KB) served
              to every width; a 390px viewport now takes the 640 variant at 19KB.
              fetchPriority=high because it is above the fold and must not queue
              behind the lazy grid images below it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-home-1440.webp"
            srcSet="/hero-home-640.webp 640w, /hero-home-1024.webp 1024w, /hero-home-1440.webp 1440w, /hero-home-1920.webp 1920w"
            sizes="100vw"
            alt="A rail of aubergine modest dresses in a boutique"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 45%' }}
            fetchPriority="high"
            decoding="async"
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
      <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Chosen by <span className="italic" style={{ color: 'var(--plum)' }}>hand</span>.
            </h2>
          </div>
          {/* Beside the heading from md up; on a phone it moves BELOW the rail
              (Tina's call) — at 390px it was sharing a line with a 28px display
              heading and the two collided. */}
          {/* !hidden / !inline-flex, not the bare utilities: `.nav-link` sets
              `display: inline-flex` in globals.css at the same specificity, and
              wins on source order — so `hidden` did nothing and BOTH copies of
              this link rendered at every width. */}
          <Link href="/directory" className="nav-link !hidden md:!inline-flex items-center gap-1.5">
            All products <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
        <EditorsRail picks={editorsPicks} />
        <Link href="/directory" className="nav-link md:!hidden inline-flex items-center gap-1.5 mt-6">
          All products <ArrowRight size={13} weight="bold" />
        </Link>
      </section>

      {/* NEWLY VERIFIED — spotlight */}
      <VerifiedSpotlight houses={rail.slice(0, 8)} />

      {/* BROWSE BY CATEGORY */}
      <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>By category.</h2>
          </div>
          <Link href="/directory" className="nav-link inline-flex items-center gap-1.5">All categories <ArrowRight size={13} weight="bold" /></Link>
        </div>
        <div className="tmh-cat-grid">
          {cats.slice(0, 5).map((c, i) => (
            <Link key={c.slug} href={`/${c.slug}`} className={`tmh-cat-card group${i === 0 ? ' tmh-cat-feat' : ''}`}>
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shopifyImage(c.image, 600)}
                  srcSet={shopifySrcSet(c.image, [300, 400, 600, 900])}
                  /* The grid is 4-up above 820px and 2-up below it, and the
                     first card spans BOTH columns at every width (.tmh-cat-feat,
                     globals.css:57) — so it needs twice the pixels its siblings
                     do. One measured card here was fetching a 3522px original
                     into a 156px box. */
                  sizes={i === 0 ? '(max-width: 820px) 100vw, 50vw' : '(max-width: 820px) 50vw, 25vw'}
                  alt={c.label}
                  loading={i === 0 ? undefined : 'lazy'}
                  decoding="async"
                />
              )}
              <div className="tmh-cat-scrim" />
              {c.count > 0 && <span className="tmh-cat-count">{c.count} pieces</span>}
              <div className="tmh-cat-cap">
                <div className="lbl">{c.label}</div>
                <div className="go inline-flex items-center gap-1.5">Explore <ArrowRight size={12} weight="bold" /></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FOR DESIGNERS */}
      <section className="aubergine-band my-10 md:my-20">
        <div className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
          <div className="max-w-2xl">
            <div>
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
                    {/* --brass-on-dark, not --brass: this sits on the aubergine band, where
                        plain brass is 4.42:1 and the on-dark variant is 6.08:1. That is
                        exactly the distinction the two tokens exist to make. */}
                    <span className="serif italic" style={{ color: 'var(--brass-on-dark)' }}>{['i', 'ii', 'iii'][i]}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Link href="/contact?topic=seal" className="btn-pill inline-block mt-8" style={{ background: 'var(--brass)', color: 'var(--ink)' }}>
                Apply for the seal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* THE EDIT */}
      <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="serif mt-2" style={{ fontSize: 'clamp(28px,4vw,44px)', lineHeight: 1.05, color: 'var(--ink)' }}>
              Reading, not just <span className="italic" style={{ color: 'var(--plum)' }}>shopping</span>.
            </h2>
          </div>
          <Link href="/editorial" className="nav-link inline-flex items-center gap-1.5">All stories <ArrowRight size={13} weight="bold" /></Link>
        </div>
        {feature && (
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
            <Link href={`/editorial/${feature.slug}`} className="relative block overflow-hidden" style={{ borderRadius: 8, minHeight: 460, background: 'var(--aubergine)' }}>
              {feature.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editorialVariant(feature.image, 900) ?? feature.image}
                  srcSet={editorialSrcSet(feature.image)}
                  sizes="(max-width: 768px) 100vw, 60vw"
                  alt={feature.imageAlt || ''}
                  className="absolute inset-0 w-full h-full object-cover"
                  decoding="async"
                />
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,27,36,0.78), rgba(36,27,36,0) 55%)' }} />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <div className="eyebrow" style={{ color: '#e7d3b6' }}>{feature.category}</div>
                <div className="serif mt-2" style={{ fontSize: 30, color: 'var(--parchment)', lineHeight: 1.08 }}>{feature.title}</div>
              </div>
            </Link>
            {moreStories.length > 0 && (
              <div className="flex flex-col gap-4">
                {moreStories.map((s) => (
                  <Link key={s.slug} href={`/editorial/${s.slug}`} className="flex gap-4 p-3 items-center" style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--bone)' }}>
                    <div className="shrink-0 overflow-hidden" style={{ width: 84, height: 84, borderRadius: 4, background: '#ece5d8' }}>
                      {s.image && (
                        // An 84px square that was being served the 1696px original.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editorialVariant(s.image, 400) ?? s.image}
                          alt={s.imageAlt || ''}
                          className="w-full h-full object-cover"
                          width={84}
                          height={84}
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div>
                      <div className="eyebrow">{s.category}</div>
                      <div className="serif mt-1" style={{ fontSize: 18, color: 'var(--ink)', lineHeight: 1.2 }}>{s.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

    </>
  );
}
