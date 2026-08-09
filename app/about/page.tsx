import type { Metadata } from 'next';
import Link from 'next/link';
import { SealCheck, Prohibit, Sparkle, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { aboutStats, roundedPieces } from '@/lib/aboutStats';
import { aboutSrcSet } from '@/lib/staticImage';

export const metadata: Metadata = {
  title: 'About | The Modesty House',
  description:
    'What The Modesty House does, the problem it solves, how it solves it, and who is behind it.',
};

/**
 * COPY SLOT — filled 2026-08-09 with Tina's own words. This is the slot the
 * band was built around; nothing else on the page changed to accommodate it.
 *
 * VERBATIM. Her paragraphing, her em dashes, her apostrophes. The single edit
 * is the brand name — she wrote "The Modest House" and asked for "The Modesty
 * House", to match the wordmark in the header, the page titles and the domain.
 * §10.18: the copy on this site is hers, and nothing here may invent a line of
 * it or tidy one.
 *
 * An ARRAY, not the string this was, because it is six paragraphs. Rendered as
 * one block of text they would run together into a wall inside a half-width
 * overlay; the map below is the only structural change to the original band.
 */
const MISSION = [
  'The Modesty House started because modest fashion is having a moment — a huge wave of brands, all rising at once — but they’re scattered everywhere. Beautiful labels, impossible to find, buried across a hundred different sites. I wanted to give them a podium.',
  'So this is a curator, not a catalogue. A place where modest brands get a stage, and where getting dressed feels creative again.',
  'It’s also for the ones who work the other way — who fall in love with something from H&M, Stradivarius, or Bershka that was never meant to be modest, and make it modest anyway. That’s the art. Taking anything and making it yours.',
  'Modest style, for everyone. Wherever you’re coming from.',
  'Where this is headed: partnering with modest brands, building edits from the high-street names too, and turning this into a place where we share ideas and keep each other inspired — because the best reason to show up modest is seeing someone else do it well.',
  'Welcome to The Modesty House.',
];

/**
 * COPY SLOT — the people behind the application.
 *
 * Empty on purpose. These are real, identifiable people; names, roles and
 * biographies are facts, and inventing any of them would be fabricating a claim
 * about a person. The band does not render until this has real entries.
 *
 * Shape: { name, role, line } — `line` is one sentence, optional.
 */
const PEOPLE: { name: string; role: string; line?: string }[] = [];

// px-8 at every width, matching every other page shell and the footer.
/** A narrow measure for the prose bands.
 *
 *  This exists because `${INNER} max-w-3xl` DOES NOT WORK, and fails silently.
 *  Two max-width utilities on one element are two declarations of the same
 *  property, so the winner is whichever Tailwind emits later in the stylesheet
 *  — not whichever is written last in the class string. `max-w-[1220px]` wins,
 *  and every band that thought it had a 768px measure was running at 1220.
 *  Measured on the shipped desktop build: the "Layering, and the high street"
 *  paragraphs set to 1219px, about 150 characters a line, against the 65-75 a
 *  reader can track. So the cap goes on its own element, nested inside INNER. */
const MEASURE = 'max-w-3xl';

/* The gutter lives on INNER, with the max-width — NOT on the full-bleed band.
   Those two orders are not the same thing. With `px-8` on the section and
   `max-w-[1220px] mx-auto` on the child, the child is 1220px wide and centred
   INSIDE the already-padded 1376px area, so at 1440 the page body ran
   110 → 1330 while the header pill and the footer (which put both on one
   element) ran 142 → 1298. Every band, card and rule on this page hung 32px
   outboard of the furniture above and below it, on both sides, at every desktop
   width. Padding inside the max-width puts this page on the same grid as the
   rest of the site. Every section here has an INNER child, so the band keeps
   only its vertical rhythm and its background colour. */
const BAND = 'py-16 md:py-24';
const INNER = 'max-w-[1220px] mx-auto px-8';

/** How the catalogue is actually built. Mechanism, not marketing. */
const HOW = [
  {
    step: '01',
    title: 'We read the houses directly',
    body: 'Every house publishes its own product feed. We read all of them, so the catalogue is the houses’ own stock — not a reseller’s copy of it.',
  },
  {
    step: '02',
    title: 'We throw most of it away',
    body: 'Menswear, perfume, bakhoor, candles and gift sets are removed before anything is published. Whole labels are cut when they do not meet the standard, and cut labels stay cut.',
  },
  {
    step: '03',
    title: 'We check it again every night',
    body: 'The catalogue is re-read nightly. New arrivals appear, and anything a house has removed or sold out stops being shown — so what you click still exists.',
  },
  {
    step: '04',
    title: 'We send you to the house',
    body: 'There is no cart here. Every piece links to the house that made it, at its own price in its own currency, and you buy from them.',
  },
];

export default function AboutPage() {
  const { houses, pieces, sealed, currencies } = aboutStats();

  const figures = [
    { value: String(houses), label: 'houses indexed' },
    { value: roundedPieces(pieces), label: 'pieces catalogued' },
    { value: String(currencies), label: 'currencies' },
    { value: String(sealed), label: 'carrying the seal' },
  ];

  return (
    <main>
      {/* 1 — STATEMENT */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} pt-16`}>
          <div className={`${MEASURE} mx-auto text-center`}>
          <div className="eyebrow">About</div>
          <h1
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            The archive for everything modest
          </h1>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            The Modesty House is a curated index of modest fashion — brand by brand, piece by
            piece. A curator, not a catalogue: we frame the fashion and point you to where
            it&rsquo;s sold.
          </p>
          </div>
        </div>
      </section>

      {/* 2 — Full-bleed photograph. The composition puts the lattice hard left
          and leaves the right half empty plum, so from md up the note sits
          INSIDE the image. Below that it stacks — parchment text over a busy
          gold lattice at 393px is unreadable. */}
      <section>
        <div className="relative md:min-h-[560px]" style={{ background: 'var(--aubergine)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/mashrabiya-1440.webp"
            srcSet={aboutSrcSet('/about/mashrabiya.jpg')}
            sizes="100vw"
            alt="A carved mashrabiya screen casting patterned light on a plum wall"
            className="w-full h-64 object-cover md:absolute md:inset-0 md:h-full"
            decoding="async"
            loading="lazy"
          />
          {MISSION.length ? (
            <div
              className="hidden md:block md:absolute md:inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(37,10,36,0) 30%, rgba(37,10,36,0.55) 55%, rgba(37,10,36,0.78) 100%)',
              }}
            />
          ) : null}
          {MISSION.length ? (
            <div
              className={`relative ${INNER} px-5 md:px-8 py-12 md:py-24 md:min-h-[560px] md:flex md:items-center md:justify-end`}
            >
              <div className="md:w-1/2">
                {/* Not --brass: it fails AA on this ground. #e7d3b6 is the
                    lighter brass the homepage already uses on aubergine. */}
                <div className="eyebrow" style={{ color: '#e7d3b6' }}>
                  Why this exists
                </div>
                {MISSION.map((para, i) => (
                  <p
                    key={para}
                    className={`${i === 0 ? 'mt-4' : 'mt-3'} text-sm leading-relaxed`}
                    style={{ color: 'var(--parchment)' }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3 — RECEIPTS */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={`${INNER} grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6 text-center`}>
          {figures.map((f) => (
            <div key={f.label}>
              <div
                className="serif"
                style={{
                  fontSize: 'clamp(34px,5vw,56px)',
                  lineHeight: 1,
                  color: 'var(--parchment)',
                }}
              >
                {f.value}
              </div>
              {/* Not --brass: #a98a5b on --aubergine measures 4.41:1, just under
                  AA at this 10px size. #e7d3b6 is the homepage's lighter brass. */}
              <div className="eyebrow mt-3" style={{ color: '#e7d3b6' }}>
                {f.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — WHAT WE DO / THE PROBLEM */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} grid gap-12 md:grid-cols-2`}>
          <div>
            <div className="eyebrow">What we do</div>
            <h2
              className="section-heading mt-3"
              style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--ink)' }}
            >
              One place for modest womenswear
            </h2>
            <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              We index modest womenswear from independent houses and put it in one place, so it can
              be looked through the way a wardrobe is — by shape, by occasion, by mood — instead of
              one shop at a time.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              We do not sell anything. Every piece links out to the house that made it.
            </p>
          </div>

          <div>
            <div className="eyebrow">The problem</div>
            <h2
              className="section-heading mt-3"
              style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--ink)' }}
            >
              It is scattered, and hard to trust
            </h2>
            <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              Modest fashion lives on {houses} separate storefronts trading in {currencies}{' '}
              currencies. There is no single window onto it, so finding a piece means remembering
              which house carries what, and opening a dozen tabs to compare.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              Search does not help much either: it rewards whoever spends the most, which is rarely
              the houses doing the most interesting work.
            </p>
          </div>
        </div>
      </section>

      {/* 5 — HOW WE SOLVE IT */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className="eyebrow">How we solve it</div>
          <h2
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Read everything, publish very little
          </h2>

          <ol className="mt-10 grid gap-8 md:grid-cols-2">
            {HOW.map((h) => (
              <li
                key={h.step}
                className="p-6"
                style={{
                  background: 'var(--parchment)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 8,
                }}
              >
                <div className="eyebrow" style={{ color: 'var(--plum)' }}>
                  {h.step}
                </div>
                <h3
                  className="serif mt-3"
                  style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--ink)' }}
                >
                  {h.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                  {h.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 — THE STANDARD */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={INNER}>
          <div className="eyebrow">The standard</div>
          <h2
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            What gets in
          </h2>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <ul className="space-y-4">
              {[
                'Independent houses that design their own clothes.',
                'Pieces we would put in front of someone whose taste we respect.',
                'Stock a shopper can actually buy today, checked on every refresh.',
              ].map((t) => (
                <li
                  key={t}
                  className="flex gap-3 text-sm leading-relaxed"
                  style={{ color: 'var(--ink)' }}
                >
                  <Sparkle
                    size={16}
                    weight="fill"
                    style={{ color: 'var(--brass)', flexShrink: 0, marginTop: 3 }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <ul className="space-y-4">
              {[
                'Women’s clothing only.',
                'Clothing only — no perfume, bakhoor, candles or gift sets.',
                // "among the houses", not a flat ban: the band below says
                // high-street pieces are coming in as styling material. Stated
                // absolutely, that line would contradict it two screens later.
                'No mass-market or budget labels among the houses.',
              ].map((t) => (
                <li
                  key={t}
                  className="flex gap-3 text-sm leading-relaxed"
                  style={{ color: 'var(--ink)' }}
                >
                  <Prohibit
                    size={16}
                    weight="bold"
                    style={{ color: 'var(--plum)', flexShrink: 0, marginTop: 3 }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The seal, and its limits. The negative clause is load-bearing:
              without it the page implies a guarantee the site cannot honour. */}
          <div
            className="mt-12 p-6 md:p-8"
            style={{
              background: 'var(--bone)',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
            }}
          >
            <div className="flex gap-3 items-center">
              <SealCheck size={20} weight="fill" style={{ color: 'var(--brass)' }} />
              <div className="eyebrow" style={{ color: 'var(--ink)' }}>
                What the seal means
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              A seal is a judgement about craft and design — that we have looked at the clothes and
              think they are well made and well designed.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              It is not a promise about shipping, service or returns. Those are between you and the
              house, on the house&rsquo;s own site, under its own terms.
            </p>
            <Link href="/designers" className="nav-link inline-flex items-center gap-1.5 mt-6">
              See the houses <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7 — WHERE THIS IS GOING */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className={MEASURE}>
          <div className="eyebrow">Where this is going</div>
          <h2
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Layering, and the high street
          </h2>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            Modest dressing is not only bought from modest houses. A great deal of it is layering —
            a mainstream dress over a polo neck, a longer shirt worn open, a slip under something
            sheer. We want to cover that too, with our own styling on it, so the pieces you already
            own are part of the picture.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            It also answers something the independent houses cannot. Almost all of them are online
            only and ship from abroad, so nothing can be tried on before it arrives. High-street
            names — an H&amp;M, a Bershka — are already on the street where you live.
          </p>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            The podium stays with the modest houses. High-street pieces come in as things to layer,
            not as houses to feature: the independents keep the front page, the seal and the
            editorial, and the space to show what they can do.
          </p>
          </div>
        </div>
      </section>

      {/* 8 — THE PEOPLE. Renders only once PEOPLE has real entries. */}
      {PEOPLE.length > 0 ? (
        <section className={BAND} style={{ background: 'var(--parchment)' }}>
          <div className={INNER}>
            <div className="eyebrow">Who is behind it</div>
            <h2
              className="section-heading mt-3"
              style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
            >
              The people
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {PEOPLE.map((p) => (
                <div key={p.name}>
                  <div className="serif" style={{ fontSize: 22, color: 'var(--ink)' }}>
                    {p.name}
                  </div>
                  <div className="eyebrow mt-2">{p.role}</div>
                  {p.line ? (
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                      {p.line}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 9 — HOW THIS IS PAID FOR */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className={MEASURE}>
          <div className="eyebrow">Disclosure</div>
          <h2
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(24px,3.5vw,34px)', lineHeight: 1.1, color: 'var(--ink)' }}
          >
            How this is paid for
          </h2>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            Some links on this site are affiliate links. If you click one and buy something, we may
            earn a small commission — at no extra cost to you. It is what funds the site.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            Commission never influences whether a house earns the seal, and it never changes the
            price you pay. We are not a shop: you buy from the house, on its own site.
          </p>
          {/* Standalone links, not inline in the sentence. Inline they measured
              32x20 and 82x20 — under the 44px tap target minimum, and a link
              inside running text cannot be padded without overlapping its lines. */}
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            The full detail is in the legal pages.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-8">
            {[
              { href: '/terms', label: 'Terms' },
              { href: '/privacy', label: 'Privacy policy' },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center text-sm"
                style={{
                  minHeight: 44,
                  color: 'var(--plum)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* 10 — CLOSE */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={`${INNER} text-center`}>
          <h2
            className="section-heading"
            style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--parchment)' }}
          >
            Start with the directory
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/directory"
              className="btn-pill inline-block"
              style={{ background: 'var(--parchment)', color: 'var(--ink)' }}
            >
              Browse the directory
            </Link>
            <Link
              href="/contact?topic=seal"
              className="btn-pill inline-block"
              style={{ background: 'var(--brass)', color: 'var(--ink)' }}
            >
              Apply for the seal
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
