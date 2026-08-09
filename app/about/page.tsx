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
 * TINA'S WORDS — written 2026-08-09, and the only voice on this page.
 *
 * Verbatim. Sentences are PLACED, never rewritten: the opening runs as the
 * lede, `podium` is lifted onto the photograph because it is the line the
 * whole page turns on, and `manifesto` is set large because she wrote it as
 * one. The single edit is the brand name — she wrote "The Modest House" and
 * asked for "The Modesty House", to match the wordmark in the header directly
 * above it, the page titles and the domain.
 *
 * Held in strings rather than in JSX so the curly apostrophes and em dashes
 * she typed survive untouched — in JSX text they would have to be re-entered
 * as entities to satisfy react/no-unescaped-entities, which is exactly the
 * kind of transcription where a word quietly changes. §10.18: the copy on this
 * site is hers, and nothing here may invent a line of it.
 */
const VOICE = {
  opening: [
    'The Modesty House started because modest fashion is having a moment — a huge wave of brands, all rising at once — but they’re scattered everywhere.',
    'Beautiful labels, impossible to find, buried across a hundred different sites.',
  ],
  podium: 'I wanted to give them a podium.',
  curator: [
    'So this is a curator, not a catalogue. A place where modest brands get a stage, and where getting dressed feels creative again.',
    'It’s also for the ones who work the other way — who fall in love with something from H&M, Stradivarius, or Bershka that was never meant to be modest, and make it modest anyway. That’s the art. Taking anything and making it yours.',
  ],
  manifesto: 'Modest style, for everyone. Wherever you’re coming from.',
  headed:
    'Where this is headed: partnering with modest brands, building edits from the high-street names too, and turning this into a place where we share ideas and keep each other inspired — because the best reason to show up modest is seeing someone else do it well.',
  welcome: 'Welcome to The Modesty House.',
};

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

/** A narrow measure for the prose bands.
 *
 *  640px, not the `max-w-3xl` (768px) this was: the reading copy went from
 *  14px to 18px in the same pass, and a measure is a CHARACTER count, not a
 *  pixel one. Measured on the shipped render at 18px Jost, 768px carried 89
 *  characters a line — "So this is a curator, not a catalogue. A place where
 *  modest brands get a stage, and where" — against the 65-75 a reader tracks
 *  without losing the return sweep. 640px lands at about 74.
 *
 *  This exists because `${INNER} max-w-3xl` DOES NOT WORK, and fails silently.
 *  Two max-width utilities on one element are two declarations of the same
 *  property, so the winner is whichever Tailwind emits later in the stylesheet
 *  — not whichever is written last in the class string. `max-w-[1220px]` wins,
 *  and every band that thought it had a 768px measure was running at 1220.
 *  Measured on the shipped desktop build: the "Layering, and the high street"
 *  paragraphs set to 1219px, about 150 characters a line, against the 65-75 a
 *  reader can track. So the cap goes on its own element, nested inside INNER. */
const MEASURE = 'max-w-[640px]';

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
const BAND = 'py-20 md:py-28';
const INNER = 'max-w-[1220px] mx-auto px-8';

/** Reading copy.
 *
 *  17px, rising to 18px from md, on a 1.7 leading. The whole page was on
 *  Tailwind's `text-sm` — 14px — which is a UI size, a full step BELOW the
 *  15px the body sets, used here for eleven paragraphs of continuous prose.
 *  That is what Tina meant by "the letters look so small": not the typefaces,
 *  which are the house three, but a caption size doing an essay's job. */
const COPY = 'text-[17px] md:text-[18px] leading-[1.7]';

/** Meta / secondary copy — a step down from COPY, still above the old 14px. */
const COPY_SM = 'text-[15px] md:text-[16px] leading-[1.65]';

/**
 * A section label: a short rule, then the name of the band.
 *
 * 11px against the site-wide `.eyebrow`'s 10px, and with the rule beside it.
 * This element repeats nine times down the page, so it does more than any
 * other single thing to set how large — and how considered — the page reads.
 * The class is still `.eyebrow`, so the typeface and the uppercase treatment
 * stay the house ones; only the size and the tracking are lifted.
 */
function Eyebrow({
  children,
  tone = 'var(--muted)',
  rule = 'var(--brass)',
  center = false,
}: {
  children: React.ReactNode;
  tone?: string;
  rule?: string;
  center?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
      <span
        aria-hidden
        style={{ display: 'block', width: 30, height: 1, background: rule, flexShrink: 0 }}
      />
      <span className="eyebrow" style={{ fontSize: 11, letterSpacing: '0.3em', color: tone }}>
        {children}
      </span>
    </div>
  );
}

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
      {/* 1 — THE OPENING.
          Asymmetric on purpose: the title takes seven columns and her lede
          five, so the two sit as a spread rather than as a centred stack. The
          old band was a centred title over a 14px line, which is the layout
          every page on the internet opens with. */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} pt-8 md:pt-12`}>
          <div className="grid gap-10 md:gap-14 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <Eyebrow>About</Eyebrow>
              <h1
                className="section-heading mt-6"
                style={{
                  /* 7vw, not 8. Measured off the shipped render: "The archive
                     for" sets to 6.98em, and the title's column is 7/12 of the
                     inner width. At 8vw that phrase overflowed its column at
                     768, 819 and 1024 — three of the nine audited widths — and
                     dropped "for" onto a line of its own. 7vw is the largest
                     coefficient that keeps it on one line at every width from
                     768 up, and it changes nothing at 1280+ where the 88px cap
                     is already what applies. */
                  fontSize: 'clamp(42px,7vw,88px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.015em',
                  color: 'var(--ink)',
                }}
              >
                {/* No manual <br>: a hard break is one width's rag frozen and
                    wrong at the other eight. The clamp above is what controls
                    where this breaks. */}
                The archive for everything modest
              </h1>
            </div>

            <div className="md:col-span-5">
              {VOICE.opening.map((line, i) => (
                <p
                  key={line}
                  className={`serif ${i === 0 ? '' : 'mt-4'}`}
                  style={{
                    fontSize: 'clamp(20px,2.4vw,27px)',
                    lineHeight: 1.5,
                    color: i === 0 ? 'var(--ink)' : 'var(--plum)',
                    fontStyle: i === 0 ? 'normal' : 'italic',
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2 — THE PHOTOGRAPH, carrying the line the page turns on.
          The composition puts the lattice hard left and leaves the right half
          empty plum, so from md up the quote sits INSIDE the image. Below that
          it stacks — parchment text over a busy gold lattice at 393px is
          unreadable. */}
      <section>
        <div className="relative md:min-h-[600px]" style={{ background: 'var(--aubergine)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/about/mashrabiya-1440.webp"
            srcSet={aboutSrcSet('/about/mashrabiya.jpg')}
            sizes="100vw"
            alt="A carved mashrabiya screen casting patterned light on a plum wall"
            className="w-full h-72 object-cover md:absolute md:inset-0 md:h-full"
            decoding="async"
            loading="lazy"
          />
          <div
            className="hidden md:block md:absolute md:inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(37,10,36,0) 28%, rgba(37,10,36,0.6) 54%, rgba(37,10,36,0.84) 100%)',
            }}
          />
          <div
            className={`relative ${INNER} py-14 md:py-24 md:min-h-[600px] md:flex md:items-center md:justify-end`}
          >
            <div className="md:w-1/2">
              {/* Not --brass: it fails AA on this ground. #e7d3b6 is the
                  lighter brass the homepage already uses on aubergine. */}
              <Eyebrow tone="#e7d3b6" rule="#e7d3b6">
                Why this exists
              </Eyebrow>
              <p
                className="serif mt-6"
                style={{
                  fontSize: 'clamp(30px,5vw,56px)',
                  lineHeight: 1.08,
                  fontStyle: 'italic',
                  color: 'var(--parchment)',
                }}
              >
                {VOICE.podium}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 — A CURATOR, NOT A CATALOGUE. Her second and third paragraphs,
          closing on the manifesto line set at display size. */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={INNER}>
          <div className={MEASURE}>
            <Eyebrow>What this is</Eyebrow>

            {VOICE.curator.map((para, i) => (
              <p
                key={para}
                className={`${COPY} ${i === 0 ? 'mt-7' : 'mt-6'}`}
                style={{ color: 'var(--ink)' }}
              >
                {/* A drop cap on the first paragraph only — the oldest device
                    in magazine typesetting, and the point at which this page
                    stops looking like documentation.

                    Sized to occupy exactly two lines: the copy runs at
                    line-height 1.7, so two lines are 3.4em of the paragraph,
                    and a float of font-size 3.3em at line-height 1 is 3.3em
                    tall. The text then wraps to it with no manual clearing.

                    NOT aria-hidden, and the letter is NOT sliced out of the
                    string twice: the span holds the real "S" and the rest of
                    the sentence follows it, so the paragraph's text content is
                    still the whole sentence. Hiding the cap and printing
                    `para.slice(1)` would have had every screen reader announce
                    "o this is a curator". */}
                {i === 0 ? (
                  <span
                    className="serif"
                    style={{
                      float: 'left',
                      fontSize: '3.3em',
                      lineHeight: 1,
                      paddingRight: '0.09em',
                      marginTop: '-0.04em',
                      color: 'var(--plum)',
                    }}
                  >
                    {para.charAt(0)}
                  </span>
                ) : null}
                {i === 0 ? para.slice(1) : para}
              </p>
            ))}
          </div>

          {/* The manifesto line, given the width of the page rather than the
              measure — it is a statement, not reading copy. */}
          <div
            className="mt-16 md:mt-20 pt-12 md:pt-16"
            style={{ borderTop: '1px solid var(--hairline)' }}
          >
            <p
              className="serif max-w-4xl"
              style={{
                fontSize: 'clamp(28px,4.6vw,50px)',
                lineHeight: 1.1,
                color: 'var(--aubergine)',
              }}
            >
              {VOICE.manifesto}
            </p>
          </div>
        </div>
      </section>

      {/* 4 — RECEIPTS */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={INNER}>
          {/* Hairline rules BETWEEN the figures, rather than four numbers
              floating in a void — and drawn with a 1px grid gap over a tinted
              parent, not with borders on the cells.

              The border approach cannot work here. Which cell needs a left
              rule depends on the column count, which changes at md (2 up → 4
              up), and an inline `style={{}}` has no media query — a
              `i % 2` rule is right at two columns and wrong at four. The gap
              draws every internal rule, in both layouts, and none on the
              outside edges, because the parent's tint only shows where the
              cells are not. */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px"
            style={{ background: 'rgba(250,247,241,0.22)' }}
          >
            {figures.map((f) => (
              <div
                key={f.label}
                className="text-center px-3 py-8 md:py-6"
                style={{ background: 'var(--aubergine)' }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 'clamp(40px,6.5vw,68px)',
                    lineHeight: 1,
                    color: 'var(--parchment)',
                  }}
                >
                  {f.value}
                </div>
                {/* Not --brass: #a98a5b on --aubergine measures 4.41:1, just
                    under AA at label sizes. #e7d3b6 is the homepage's lighter
                    brass. */}
                <div
                  className="eyebrow mt-4"
                  style={{ fontSize: 11, letterSpacing: '0.26em', color: '#e7d3b6' }}
                >
                  {f.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — HOW WE SOLVE IT.
          Hanging brass numerals over a hairline, not four bordered boxes. The
          boxes made four short paragraphs read as a settings screen. */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <Eyebrow>How we solve it</Eyebrow>
          <h2
            className="section-heading mt-6"
            style={{ fontSize: 'clamp(30px,4.6vw,50px)', lineHeight: 1.04, color: 'var(--ink)' }}
          >
            Read everything, publish very little
          </h2>

          <ol className="mt-14 grid gap-x-14 gap-y-12 md:grid-cols-2">
            {HOW.map((h) => (
              <li
                key={h.step}
                className="flex gap-5 md:gap-7 pt-7"
                style={{ borderTop: '1px solid var(--hairline)' }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 'clamp(34px,4.4vw,54px)',
                    lineHeight: 0.85,
                    color: 'var(--brass)',
                    flexShrink: 0,
                    /* Bodoni's figures are PROPORTIONAL by default, so "01" is
                       narrower than "03" and each step's title started at a
                       different x — measured 230/232/840/840 at 1440, and
                       89/93/89/95 at 390. Tabular figures make all four
                       numerals one width, which is the only thing holding the
                       two rows on a common left edge. */
                    fontVariantNumeric: 'lining-nums tabular-nums',
                  }}
                >
                  {h.step}
                </div>
                <div>
                  <h3
                    className="serif"
                    style={{
                      fontSize: 'clamp(20px,2.1vw,25px)',
                      lineHeight: 1.2,
                      color: 'var(--ink)',
                    }}
                  >
                    {h.title}
                  </h3>
                  <p className={`${COPY} mt-3`} style={{ color: 'var(--ink)' }}>
                    {h.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 6 — THE STANDARD */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={INNER}>
          <Eyebrow>The standard</Eyebrow>
          <h2
            className="section-heading mt-6"
            style={{ fontSize: 'clamp(30px,4.6vw,50px)', lineHeight: 1.04, color: 'var(--ink)' }}
          >
            What gets in
          </h2>

          <div className="mt-12 grid gap-10 md:gap-14 md:grid-cols-2">
            <ul className="space-y-5">
              {[
                'Independent houses that design their own clothes.',
                'Pieces we would put in front of someone whose taste we respect.',
                'Stock a shopper can actually buy today, checked on every refresh.',
              ].map((t) => (
                <li key={t} className={`flex gap-4 ${COPY}`} style={{ color: 'var(--ink)' }}>
                  <Sparkle
                    size={18}
                    weight="fill"
                    style={{ color: 'var(--brass)', flexShrink: 0, marginTop: 6 }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            {/* A rule above the second list, on mobile only. Stacked, the six
                items read as ONE list in which three happen to carry a
                different icon — nothing marks where "what gets in" ends and
                what does not begin. The desktop columns give that break for
                free; below md it has to be drawn. Border WIDTH from Tailwind
                (so it can be dropped at md), COLOUR inline from the token. */}
            <ul
              className="space-y-5 border-t pt-8 md:border-t-0 md:pt-0"
              style={{ borderColor: 'var(--hairline)' }}
            >
              {[
                'Women’s clothing only.',
                'Clothing only — no perfume, bakhoor, candles or gift sets.',
                // "among the houses", not a flat ban: her own copy says
                // high-street pieces come in as styling material. Stated
                // absolutely, that line would contradict her two screens up.
                'No mass-market or budget labels among the houses.',
              ].map((t) => (
                <li key={t} className={`flex gap-4 ${COPY}`} style={{ color: 'var(--ink)' }}>
                  <Prohibit
                    size={18}
                    weight="bold"
                    style={{ color: 'var(--plum)', flexShrink: 0, marginTop: 6 }}
                  />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The seal, and its limits. The negative clause is load-bearing:
              without it the page implies a guarantee the site cannot honour. */}
          <div
            className="mt-14 p-7 md:p-10"
            style={{
              background: 'var(--bone)',
              border: '1px solid var(--hairline)',
              borderRadius: 8,
            }}
          >
            <div className="flex gap-3 items-center">
              <SealCheck size={22} weight="fill" style={{ color: 'var(--brass)' }} />
              <span
                className="eyebrow"
                style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--ink)' }}
              >
                What the seal means
              </span>
            </div>
            <p className={`${COPY} mt-5`} style={{ color: 'var(--ink)' }}>
              A seal is a judgement about craft and design — that we have looked at the clothes and
              think they are well made and well designed.
            </p>
            <p className={`${COPY_SM} mt-4`} style={{ color: 'var(--muted)' }}>
              It is not a promise about shipping, service or returns. Those are between you and the
              house, on the house&rsquo;s own site, under its own terms.
            </p>
            <Link
              href="/designers"
              className="nav-link inline-flex items-center gap-1.5 mt-7"
              style={{ fontSize: 12 }}
            >
              See the houses <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
        </div>
      </section>

      {/* 7 — WHERE THIS IS HEADED. Her paragraph, in her words. The old band
          here ("Layering, and the high street") said the same thing at three
          times the length and in a voice that was not hers — cut on her call
          when this copy arrived. */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className="max-w-4xl">
            <Eyebrow>Where this is headed</Eyebrow>
            <p
              className="serif mt-7"
              style={{
                fontSize: 'clamp(23px,3.2vw,36px)',
                lineHeight: 1.32,
                color: 'var(--ink)',
              }}
            >
              {VOICE.headed}
            </p>
          </div>
        </div>
      </section>

      {/* 8 — THE PEOPLE. Renders only once PEOPLE has real entries. */}
      {PEOPLE.length > 0 ? (
        <section className={BAND} style={{ background: 'var(--parchment)' }}>
          <div className={INNER}>
            <Eyebrow>Who is behind it</Eyebrow>
            <h2
              className="section-heading mt-6"
              style={{ fontSize: 'clamp(30px,4.6vw,50px)', lineHeight: 1.04, color: 'var(--ink)' }}
            >
              The people
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {PEOPLE.map((p) => (
                <div key={p.name}>
                  <div className="serif" style={{ fontSize: 26, color: 'var(--ink)' }}>
                    {p.name}
                  </div>
                  <div
                    className="eyebrow mt-3"
                    style={{ fontSize: 11, letterSpacing: '0.3em' }}
                  >
                    {p.role}
                  </div>
                  {p.line ? (
                    <p className={`${COPY} mt-4`} style={{ color: 'var(--ink)' }}>
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
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div className={INNER}>
          <div className={MEASURE}>
            <Eyebrow>Disclosure</Eyebrow>
            <h2
              className="section-heading mt-6"
              style={{ fontSize: 'clamp(26px,3.8vw,40px)', lineHeight: 1.08, color: 'var(--ink)' }}
            >
              How this is paid for
            </h2>
            <p className={`${COPY} mt-7`} style={{ color: 'var(--ink)' }}>
              Some links on this site are affiliate links. If you click one and buy something, we may
              earn a small commission — at no extra cost to you. It is what funds the site.
            </p>
            <p className={`${COPY} mt-4`} style={{ color: 'var(--ink)' }}>
              Commission never influences whether a house earns the seal, and it never changes the
              price you pay. We are not a shop: you buy from the house, on its own site.
            </p>
            {/* Standalone links, not inline in the sentence. Inline they measured
                32x20 and 82x20 — under the 44px tap target minimum, and a link
                inside running text cannot be padded without overlapping its lines. */}
            <p className={`${COPY_SM} mt-6`} style={{ color: 'var(--muted)' }}>
              The full detail is in the legal pages.
            </p>
            <div className="mt-1 flex flex-wrap gap-x-8">
              {[
                { href: '/terms', label: 'Terms' },
                { href: '/privacy', label: 'Privacy policy' },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center text-[16px]"
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

      {/* 10 — THE CLOSE. Her last line, at the size she wrote it for. */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={`${INNER} text-center`}>
          <h2
            className="section-heading"
            style={{
              fontSize: 'clamp(30px,5vw,56px)',
              lineHeight: 1.06,
              color: 'var(--parchment)',
            }}
          >
            {VOICE.welcome}
          </h2>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
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
