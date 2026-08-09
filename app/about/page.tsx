import type { Metadata } from 'next';
import Link from 'next/link';
// Sparkle went with the purple "The standard" band — its three criteria are
// step 02 of HOW now, and the blocks are numbered rather than iconed.
import { SealCheck, ArrowRight } from '@phosphor-icons/react/dist/ssr';
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
 * An ARRAY rather than one string, so each paragraph is its own <p>.
 *
 * CUT on her word, 2026-08-09 — four paragraphs that were here and are now on
 * the page nowhere:
 *   "It's also for the ones who work the other way — …make it modest anyway."
 *   "Modest style, for everyone. Wherever you're coming from."
 *   "Where this is headed: partnering with modest brands, …do it well."
 *   "Welcome to The Modesty House."
 * Recorded verbatim here rather than only in git, because they are hers and
 * putting any of them back should be a copy-and-paste, not a retype.
 */
const MISSION = [
  'The Modesty House started because modest fashion is having a moment — a huge wave of brands, all rising at once — but they’re scattered everywhere. Beautiful labels, impossible to find, buried across a hundred different sites. I wanted to give them a podium.',
  'So this is a curator, not a catalogue. A place where modest brands get a stage, and where getting dressed feels creative again.',
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

/** How the catalogue is actually built. Mechanism, not marketing.
 *
 *  "The standard" was a purple band of its own until 2026-08-09; Tina asked
 *  for it gone and folded in here. Two things happened rather than a paste:
 *
 *  - "What gets in" became step 02 — its three criteria are the filter, and
 *    the filter belongs between reading everything and throwing most of it
 *    away. Nothing about it was reworded.
 *  - "What we don't do" did NOT become a sixth step. Its list — menswear,
 *    perfume, bakhoor, candles, gift sets — was already step 03's body, word
 *    for word, so a separate block would have been the same duplication this
 *    page has spent the day losing. The one thing it said that step 03 did
 *    not, "no mass-market or budget labels", is now a sentence inside it.
 *
 *  "among the houses" is kept, and is load-bearing: as a flat ban it would
 *  contradict "Layering, and the high street" further down the page, which
 *  says high-street pieces are coming in as styling material.
 */
const HOW = [
  {
    step: '01',
    title: 'We read the houses directly',
    body: 'Every house publishes its own product feed. We read all of them, so the catalogue is the houses’ own stock — not a reseller’s copy of it.',
  },
  {
    step: '02',
    title: 'What gets in',
    body: 'Independent houses that design their own clothes. Pieces we would put in front of someone whose taste we respect. Stock a shopper can actually buy today, checked on every refresh.',
  },
  {
    step: '03',
    title: 'We throw most of it away',
    body: 'Menswear, perfume, bakhoor, candles and gift sets are removed before anything is published, and no mass-market or budget labels among the houses. Whole labels are cut when they do not meet the standard, and cut labels stay cut.',
  },
  {
    step: '04',
    title: 'We check it again every night',
    body: 'The catalogue is re-read nightly. New arrivals appear, and anything a house has removed or sold out stops being shown — so what you click still exists.',
  },
  {
    step: '05',
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
          NOT `BAND`. Its `pb` is cut from 64/96 to 20/28 so the mission prose
          sits up close under the headline instead of a band's width away. (It
          was cut for the "Why this exists" eyebrow, removed on Tina's word
          2026-08-09; the tight `pb` is still right without it — the first
          paragraph, rather than a label, now sits close under.)
          The two are one opening now — same parchment, no rule between them —
          and BAND's full vertical rhythm is for separating bands that differ.
          The `pt` half of BAND is kept verbatim, so nothing above moves. */}
      <section className="pt-16 md:pt-24 pb-5 md:pb-7" style={{ background: 'var(--parchment)' }}>
        <div className={`${INNER} pt-16`}>
          <div className={`${MEASURE} mx-auto text-center`}>
          {/* Just "About", and no eyebrow above it. Both on Tina's word, in
              that order: the eyebrow went because it duplicated the word, and
              the headline is now the word. */}
          <h1
            className="section-heading"
            style={{ fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            About
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
            {/* The "Why this exists" eyebrow is gone, on Tina's word
                2026-08-09. The first paragraph loses its mt-5 with it: that
                margin existed to separate the prose FROM the eyebrow, and left
                behind it would read as an unexplained gap under the headline
                rather than as spacing. The band's own pb, and section 1's
                deliberately tight pb above it, now carry the whole rhythm. */}
            {MISSION.map((para, i) => (
              <p
                key={para}
                className={`${i === 0 ? '' : 'mt-3'} text-sm leading-relaxed`}
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

      {/* 5 — WHAT WE DO / THE PROBLEM.
          The two columns are locked to a SUBGRID, so the eyebrows, the
          headings and the body copy each sit on a shared baseline.

          Tina sent a screenshot of this band reading "so uneven", and it was:
          "One place for modest womenswear" wraps to two lines in a ~560px
          column at 36px while "It is scattered, and hard to trust" fits on
          one, so the left body started a whole line lower than the right. Two
          independent columns have no way to know that.

          Fixed with `grid-template-rows: subgrid`, not by nudging: each column
          spans the parent's three rows and inherits their heights, so every
          row is as tall as the taller of the two — at every width, and however
          either heading happens to wrap. A `min-height` on the headings would
          have papered over 1440 and broken again at 768, and left an empty
          line at any width where both fit on one.

          `gap-y-0` at md is deliberate: the row gap would otherwise land
          BETWEEN eyebrow, heading and body. The spacing inside a column stays
          on the margins it always used. Below md there is one column, the
          subgrid is off, and gap-y separates the two blocks as before.

          Browsers without subgrid (pre-Safari 16 / pre-Chrome 117) get exactly
          today's behaviour — unaligned, not broken. */}
      <section className={BAND} style={{ background: 'var(--parchment)' }}>
        <div
          className={`${INNER} grid gap-y-12 gap-x-12 md:gap-y-0 md:gap-x-16 md:grid-cols-2 md:grid-rows-[auto_auto_auto]`}
        >
          <div className="md:grid md:grid-rows-subgrid md:row-span-3">
            <div className="eyebrow">What we do</div>
            <h2
              className="section-heading mt-3"
              style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--ink)' }}
            >
              One place for modest womenswear
            </h2>
            <div className="mt-5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                We index modest womenswear from independent houses and put it in one place, so it
                can be looked through the way a wardrobe is — by shape, by occasion, by mood —
                instead of one shop at a time.
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                We do not sell anything. Every piece links out to the house that made it.
              </p>
            </div>
          </div>

          <div className="md:grid md:grid-rows-subgrid md:row-span-3">
            <div className="eyebrow">The problem</div>
            <h2
              className="section-heading mt-3"
              style={{ fontSize: 'clamp(24px,3.5vw,36px)', lineHeight: 1.1, color: 'var(--ink)' }}
            >
              {/* A manual break, deliberately — and the one place on this page
                  where that is right. The h1 has a note saying a hard break is
                  one width's rag frozen and wrong at the others; that holds
                  when you are fighting the wrap. Here the two-line shape IS the
                  decision: the subgrid makes the heading row two lines tall
                  because the left heading needs two, and Tina asked for this
                  one to fill it rather than leave a gap under a single line.
                  Safe at every audited width — the longer half, "and hard to
                  trust", is ~213px at the 27px this sets at 768, inside a
                  320px column — and if a width ever did wrap it to three, the
                  subgrid absorbs it and the columns stay level. */}
              It is scattered,
              <br />
              and hard to trust
            </h2>
            <div className="mt-5">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                Modest fashion lives on {houses} separate storefronts trading in {currencies}{' '}
                currencies. There is no single window onto it, so finding a piece means remembering
                which house carries what, and opening a dozen tabs to compare.
              </p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                Search does not help much either: it rewards whoever spends the most, which is
                rarely the houses doing the most interesting work.
              </p>
            </div>
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

      {/* 7 — THE SEAL, in a band of its own with a real heading, per Tina — it
          was a small labelled block tacked onto the end of "The standard", and
          the seal is its own subject.

          It now runs BEFORE "What gets in" — swapped on 2026-08-09 at Tina's
          request. The two moved as whole blocks, each keeping its own ground,
          so the band rhythm still alternates (bone, parchment, aubergine,
          bone) and no two same-coloured bands touch.

          A light ground, so every colour is a light variant: the label and
          icon --brass-ink (--brass itself is 3.07:1 on parchment and fails AA
          at label sizes, which is exactly what --brass-ink exists for), the
          body --ink, the caveat --muted, and the link with no dark-ground
          override. The rule that used to separate it inside the purple band is
          gone — a band boundary does that job now.

          The negative clause is load-bearing: without it the page implies a
          guarantee the site cannot honour. */}
      {/* #f0e8d9 — the darker beige Tina asked for. It is 1.14:1 against
          --parchment, which is a visible step without becoming a second brand
          colour.

          THE TEXT HAD TO MOVE WITH IT, and this is not fussiness. Measured on
          this ground, --brass-ink falls to 4.12:1 and --muted to 4.10:1,
          both under the 4.5 AA floor for label and body text — and every
          beige darker than --parchment does this, including ones far lighter
          than the one chosen. #826430 and #726758 are the darkest-by-one-step
          variants of those two tokens that clear it here (4.52 and 4.54), and
          they still clear it on parchment (5.15, 5.17) so they read as the
          same colours, not new ones. --ink is 13.72 and needs nothing.

          They are literals rather than tokens because they exist for this one
          band; promoting them would imply a second light ground the rest of
          the site does not have. */}
      <section className={BAND} style={{ background: '#f0e8d9' }}>
        <div className={INNER}>
          <div className={MEASURE}>
            <div className="flex gap-3 items-center">
              <SealCheck size={20} weight="fill" aria-hidden style={{ color: '#826430' }} />
              <div className="eyebrow" style={{ color: '#826430' }}>
                The seal
              </div>
            </div>
            <h2
              className="section-heading mt-4"
              style={{ fontSize: 'clamp(26px,4vw,40px)', lineHeight: 1.05, color: 'var(--ink)' }}
            >
              What the seal means
            </h2>
            <p className="mt-6 text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
              A seal is a judgement about craft and design — that we have looked at the clothes and
              think they are well made and well designed.
            </p>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: '#726758' }}>
              It is not a promise about shipping, service or returns. Those are between you and the
              house, on the house&rsquo;s own site, under its own terms.
            </p>
            {/* The colour override is required, not decorative. `.nav-link`
                takes `color: var(--muted)` from the STYLESHEET, so it is not
                visible at this call site — and on this darker ground --muted
                is 4.10:1. axe caught it as the only violation on the page
                after the ground changed: I had hand-checked every colour
                written in the markup and missed the one inherited from a
                class. #726758 is the same darkened muted the caveat above
                uses, at 4.54:1. Hover still resolves to --aubergine, which is
                far above the floor here. */}
            {/* The seal's own call to action, moved here on Tina's word
                2026-08-09 when the closing "Start with the directory" band was
                removed. It belongs on the section that explains the seal, not
                in a band at the foot of the page.

                The fill is #826430, NOT --brass. --brass (#a98a5b) is what the
                pill carried on the aubergine band, and against this ground it
                measures 2.66:1 — under the 3:1 WCAG 2.2 SC 1.4.11 asks of a
                control's boundary, so the pill would have had no discernible
                edge. #826430 is the brass this band already uses for its icon
                and eyebrow: 4.52:1 on the ground, and --parchment on it is
                5.15:1, clearing AA at the pill's 12px. --ink would NOT (3.03:1)
                — the text colour has to flip with the fill. The token's own
                comment says --brass is "badges/graphic only, never buttons",
                which is the same rule reached from the other end. */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/contact?topic=seal"
                className="btn-pill inline-block"
                style={{ background: '#826430', color: 'var(--parchment)' }}
              >
                Apply for the seal
              </Link>
              <Link
                href="/designers"
                className="nav-link inline-flex items-center gap-1.5"
                style={{ color: '#726758' }}
              >
                See the houses <ArrowRight size={13} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8 — WHERE THIS IS GOING, the full width of the page.
          The two-column grid is gone with the disclosure that used to fill the
          right half, so this runs the whole of INNER, as Tina asked.

          `MEASURE` is deliberately off it: at 1156px and 14px this sets about
          180 characters a line, well past the 65-75 the MEASURE comment names
          — the same trade she made for the mission band above (whose "Why this
          exists" eyebrow she later removed, though the full-width measure
          stayed), and the same reason it is stated here rather than quietly
          capped.

          THE DISCLOSURE THAT WAS HERE IS DELETED, on her word. Kept verbatim
          for a paste-back, since re-typing a legal paragraph from memory is
          how one quietly changes:
            "Some links on this site are affiliate links. If you click one and
             buy something, we may earn a small commission — at no extra cost
             to you. It is what funds the site."
            "Commission never influences whether a house earns the seal, and it
             never changes the price you pay. We are not a shop: you buy from
             the house, on its own site."
            "The full detail is in the legal pages." + Terms / Privacy policy
          The site is NOT left without an FTC disclosure: components/Footer.tsx
          carries one on every page, plus a "Full disclosure" link, and its
          comment says it must stay site-wide and visible. Verified in the
          served HTML, not assumed. P0-D in CLAUDE.md §11 is about the site
          having a disclosure at all, and the footer is what satisfies it. */}
      <section className={BAND} style={{ background: 'var(--bone)' }}>
        <div className={INNER}>
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

    </main>
  );
}
