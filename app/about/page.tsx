import type { Metadata } from 'next';
import Link from 'next/link';
import { SealCheck, Sparkle, ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { aboutStats, roundedPieces } from '@/lib/aboutStats';
import { aboutSrcSet } from '@/lib/staticImage';
import HowBlocks from '@/components/HowBlocks';

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
      {/* 1 — STATEMENT.
          NOT `BAND`. Its `pb` is cut from 64/96 to 20/28 so "Why this exists"
          sits up close under the headline instead of a band's width away.
          The two are one opening now — same parchment, no rule between them —
          and BAND's full vertical rhythm is for separating bands that differ.
          The `pt` half of BAND is kept verbatim, so nothing above moves. */}
      <section className="pt-16 md:pt-24 pb-5 md:pb-7" style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} pt-16`}>
          <div className={`${MEASURE} mx-auto text-center`}>
          {/* No "About" eyebrow — cut on Tina's word. The <title>, the nav's
              active state and the headline itself all already say it. */}
          <h1
            className="section-heading mt-3"
            style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            The archive for everything modest
          </h1>
          {/* The standfirst that sat here — "a curated index of modest fashion
              … a curator, not a catalogue" — was cut on Tina's word. It was
              written before her copy existed and said the same thing as her
              own "So this is a curator, not a catalogue" one band below, in a
              voice that was not hers. */}
          </div>
        </div>
      </section>

      {/* 2 — WHY THIS EXISTS. Tina's words, on the page's own ground and BEFORE
          the photograph rather than overlaid on it — her call: the words first,
          the picture after.

          Taking the copy off a dark photograph forces two colours to change,
          and neither is cosmetic. The paragraphs were `--parchment` because
          they sat on plum; on parchment that is invisible. The eyebrow was
          #e7d3b6, the lighter brass kept for dark grounds; on parchment it
          measures about 1.7:1. Both revert to the light-ground defaults —
          `--ink` and the plain `.eyebrow`.

          `pt-0`: band 1 above is also parchment and already carries its own
          bottom padding, so BAND's `py` on both would leave ~190px of dead
          ground between two text blocks of the same colour. */}
      {MISSION.length ? (
        <section className="pb-16 md:pb-24" style={{ background: 'var(--parchment)' }}>
          {/* NO `MEASURE` here — Tina asked for this block full width, so it
              runs the whole of INNER instead of the 768px the other prose
              bands use.

              INNER's 1220px cap is the widest anything on this site goes: the
              header pill and the footer both sit on that line, and the long
              comment on INNER above exists because a band that ran outboard of
              them was a measured defect. Edge-to-edge would recreate it.

              The cost is line length. At 1156px of usable width and 14px Jost
              this sets about 180 characters a line, against the 65-75 a reader
              tracks without losing the return sweep — the same measurement the
              MEASURE comment above was written for. That is a deliberate trade
              she made, not an oversight; if the lines read long, two columns
              at md would buy back the measure without giving up the width. */}
          <div className={INNER}>
            <div className="eyebrow">Why this exists</div>
            {MISSION.map((para, i) => (
              <p
                key={para}
                className={`${i === 0 ? 'mt-5' : 'mt-3'} text-sm leading-relaxed`}
                style={{ color: 'var(--ink)' }}
              >
                {para}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 — Full-bleed photograph, carrying nothing. This is exactly the
          "clean image band" the copy slot's original comment described for the
          empty case; with the words moved above it, that is now its permanent
          shape rather than its fallback. The composition puts the lattice hard
          left and leaves the right half in plum, which is why it survives
          being cropped to 256px on a phone. */}
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
        </div>
      </section>

      {/* 4 — RECEIPTS */}
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

      {/* 5 — WHAT WE DO / THE PROBLEM */}
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

      {/* 6 — HOW WE SOLVE IT. Photograph left, words and blocks right.
          The picture is `08-rail` from the Higgsfield library, copied into
          `public/about/` and given its WebP variants — that folder is
          GITIGNORED (.gitignore:72), so an <img> pointing into it renders on
          this laptop and 404s in production (Invariant 11). It also had to go
          through scripts/optimise-images.mjs or lib/staticImage.test.ts fails
          on a missing variant. 1,015KB jpg -> 8/15/23/28KB webp.

          A rail of garments is the literal picture of the heading above it:
          everything the houses publish, of which very little is kept. */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className="grid gap-9 md:gap-14 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] md:items-start">
            {/* Square at md, not 4:5. Measured on the shipped render: at 4:5
                the figure stood 609px against a 407px text column and hung
                200px below the last block. A square is 460px there, which
                lands between the closed height and the height with a block
                open, so it reads as level either way.
                NOTE the comment sits ABOVE the element, not among the
                attributes: a JSX expression comment inside an opening tag is a
                syntax error. Writing this note is what proved it twice — first
                by putting it in the tag, then by quoting the brace-slash-star
                form inside a JSX comment, which closed the comment early.
                §10.27, in a third place. */}
            <figure
              className="m-0 overflow-hidden aspect-[16/10] md:aspect-square"
              style={{ borderRadius: 18, background: 'var(--aubergine)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/about/rail-1024.webp"
                srcSet={aboutSrcSet('/about/rail.jpg')}
                /* This is a COLUMN, not the viewport: below md it is the full
                   width, above it roughly 40% of a 1220px-capped page. `100vw`
                   here would have the browser pick the 1920 candidate to fill
                   a 460px box. */
                sizes="(min-width: 768px) 40vw, 100vw"
                alt="A brass rail hung with modest garments against a plum wall"
                className="w-full h-full object-cover"
                decoding="async"
                loading="lazy"
              />
            </figure>

            <div>
              <div className="eyebrow">How we solve it</div>
              <h2
                className="section-heading mt-3"
                style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
              >
                Read everything, publish very little
              </h2>
              <div className="mt-8">
                <HowBlocks blocks={HOW} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7 — THE STANDARD, on the purple. Tina asked for "what gets in" in the
          banner too, and the seal band was already directly beneath it, so
          these are ONE band rather than two aubergine sections stacked. Two
          would have read as one block anyway, but with a double-padded seam
          down the middle of it and two <section>s a screen reader announces
          separately.

          EVERY COLOUR HERE IS A DARK-GROUND VARIANT, and none of it is
          cosmetic. --ink is unreadable on aubergine. --brass is 4.41:1 there,
          which fails AA at label sizes. --muted goes the WRONG WAY on a dark
          ground — it was darkened to clear AA on parchment, so it gets worse
          here, which is exactly why --muted-on-dark exists. #e7d3b6 is the
          lighter brass the homepage already uses on this ground.

          The internal rules are parchment at 16%, not --hairline: a hairline
          picked for a light ground disappears on a dark one. */}
      <section className={`aubergine-band ${BAND}`}>
        <div className={INNER}>
          <div className="eyebrow" style={{ color: '#e7d3b6' }}>
            The standard
          </div>
          <h2
            className="section-heading mt-3"
            style={{
              fontSize: 'clamp(26px,4vw,40px)',
              lineHeight: 1.05,
              color: 'var(--parchment)',
            }}
          >
            What gets in
          </h2>

          {/* Phosphor Sparkle, filled — the mark the Verified badge already
              carries on the homepage rail, the spotlight and /designers, so the
              qualifying list is stamped with the site's own seal rather than a
              second icon invented for this page. */}
          <ul className="mt-9 space-y-4">
            {[
              'Independent houses that design their own clothes.',
              'Pieces we would put in front of someone whose taste we respect.',
              'Stock a shopper can actually buy today, checked on every refresh.',
            ].map((t) => (
              <li
                key={t}
                className="flex gap-3 text-sm leading-relaxed"
                style={{ color: 'var(--parchment)' }}
              >
                <Sparkle
                  size={16}
                  weight="fill"
                  aria-hidden
                  style={{ color: '#e7d3b6', flexShrink: 0, marginTop: 3 }}
                />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          {/* One sentence, no rule above it, per Tina — it now reads as the
              closing clause of the list rather than as a second section.

              This is a COMPRESSION of the three lines that were here, not new
              copy: "Women's clothing only" is menswear out, "clothing only" is
              the non-apparel veto, and the third is unchanged. All three are
              the editorial rules in CLAUDE.md §7, so the sentence cannot drift
              from what the pipeline actually does.

              "among the houses" is kept and is load-bearing. Stated as a flat
              ban on mass-market labels it would contradict "Layering, and the
              high street" one band below, which says high-street pieces are
              coming in as styling material. */}
          <p
            className="mt-8 text-sm leading-relaxed"
            style={{ color: 'var(--parchment)' }}
          >
            <span className="eyebrow" style={{ color: '#e7d3b6', marginRight: 8 }}>
              What we don&rsquo;t do
            </span>
            Menswear, perfume, bakhoor, candles, gift sets, or mass-market and budget labels among
            the houses.
          </p>

          {/* The seal, and its limits. The negative clause is load-bearing:
              without it the page implies a guarantee the site cannot honour. */}
          <div
            className="mt-12 pt-10"
            style={{ borderTop: '1px solid rgba(250,247,241,0.16)' }}
          >
          <div className={MEASURE}>
            <div className="flex gap-3 items-center">
              <SealCheck size={22} weight="fill" aria-hidden style={{ color: '#e7d3b6' }} />
              <div className="eyebrow" style={{ color: '#e7d3b6' }}>
                What the seal means
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--parchment)' }}>
              A seal is a judgement about craft and design — that we have looked at the clothes and
              think they are well made and well designed.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted-on-dark)' }}>
              It is not a promise about shipping, service or returns. Those are between you and the
              house, on the house&rsquo;s own site, under its own terms.
            </p>
            <Link
              href="/designers"
              className="nav-link inline-flex items-center gap-1.5 mt-7"
              style={{ color: '#e7d3b6' }}
            >
              See the houses <ArrowRight size={13} weight="bold" />
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* 8 — WHERE THIS IS GOING, with the disclosure alongside it on the
          right. Two columns of one band rather than two stacked bands, per
          Tina.

          `MEASURE` is off both columns: each is already about 47% of a
          1220px-capped page, which is ~540px — inside the 65-75 characters a
          measure exists to enforce, so capping at 768 would do nothing but
          leave a gap. Below md the grid collapses and they stack in the same
          order, disclosure last, which is where it was. */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
          <div className="grid gap-12 md:gap-16 md:grid-cols-2 md:items-start">
          <div>
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

          <div>
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
        </div>
      </section>

      {/* 9 — THE PEOPLE. Renders only once PEOPLE has real entries. */}
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
