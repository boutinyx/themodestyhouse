import Link from 'next/link';
import { PinterestLogo, InstagramLogo, TiktokLogo } from '@phosphor-icons/react/dist/ssr';
import { CATEGORY_LANES } from '@/lib/lanes';
import { EDITS } from '@/lib/edits';
import { NewsletterSignup } from './NewsletterSignup';
import { FooterCurrency } from './FooterCurrency';

function Col({
  head,
  children,
  className = '',
  /** Defaults to the single-column stack every other footer column uses.
   *  Products overrides it to flow into two sub-columns from md up — note a
   *  grid <ul> cannot use `space-y-*` (that targets adjacent siblings and is
   *  meaningless once the children are grid items), so an override supplies
   *  its own `gap-y-*`. */
  listClassName = 'space-y-1 md:space-y-2',
}: {
  head: string;
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
}) {
  return (
    <div className={className}>
      <div className="eyebrow" style={{ color: 'var(--brass)' }}>{head}</div>
      <ul className={`mt-3 text-sm ${listClassName}`}>{children}</ul>
    </div>
  );
}

function FLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      {/* inline-flex + min-height: at 14px type with the list's own spacing the
          hit area was a 20px-tall strip, against the 24px floor in WCAG 2.2
          SC 2.5.8 — and 20px is simply hard to hit with a thumb. Growing the
          BOX rather than adding padding keeps the visual rhythm of the column
          unchanged. */}
      <Link
        href={href}
        className="inline-flex items-center hover:opacity-100 transition"
        style={{ color: '#b9ad9c', minHeight: 32 }}
      >
        {children}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', color: '#b9ad9c', marginTop: 80 }}>
      <div className="max-w-[1220px] mx-auto px-8 py-10 md:py-12">
        {/* 5 columns at md+: brand, Products, More, Editorial, The House — one
            explicit track per direct grid child. Was 4 tracks
            (1.4fr_1fr_1fr_1fr) for what used to be 4 children; the "More"
            column (6237f64, 2026-08-19) made it 5 without updating this
            template, so with no 5th track and no `grid-auto-flow: dense`,
            "The House" silently wrapped to row 2 col 1 — a huge gap under
            Products (11 items, the tallest column) instead of sitting beside
            Editorial. Reported by Tina as "the footer is still fucked". */}
        {/* Three layouts, and the lg one is a FLEX row rather than a grid.
            Tina, 2026-08-25, after the pill move: "use playwright to center
            everything good" — she picked "even out the footer columns" from
            three readings. Measured on staging BEFORE changing anything, at
            1440: the gaps between column CONTENTS were 83 / 83 / 32px. The
            grid itself was centred correctly (142px margin either side); what
            was uneven was that Products spanned two 1fr tracks and was centred
            inside them, so it floated with ~50px of slack on each side while
            Editorial and The House sat on the bare 32px grid gap.

            No fr template fixes that, because the slack comes from content
            being narrower than its track. `lg:flex lg:justify-between` gives
            the browser the job instead: every column sizes to its content and
            the leftover is divided equally between them, which is the
            definition of one rhythm. `lg:gap-x-12` is a FLOOR, not the gap —
            free space is distributed on top of it.

            Nothing here may use `mx-auto` at lg: an auto margin on a flex item
            absorbs free space and takes precedence over justify-content, so a
            single stray `mx-auto` would silently eat the whole distribution.
            That is why Products lost its own below.

            md is a 2x2 — brand + Products, then Editorial + The House — and
            that is the fix for a real OVERFLOW, not a spacing preference.
            Measured on staging at a 768 viewport before the change:
            `documentElement.scrollWidth` came back 824 in Chromium and 872 in
            WebKit against a 768 clientWidth, i.e. the page scrolled sideways.
            Cause: four columns across meant Products' two max-content
            sub-columns plus their 80px gutter needed ~311px inside a ~213px
            span, and `fr` tracks floor at min-content, so the row could not
            shrink — it pushed The House past the container's right edge (box
            765..824 against a grid ending at 736). An iPad in portrait is 820
            wide and was seeing 52px of it.

            Four-across at md was tried first and does fit (0 overflow) if
            Products stacks into one column — but 13 links in one column made
            it three times the height of everything beside it and left the
            right half of the tablet footer empty. Half a 768 row is 336px,
            which fits the sub-column pair at a 32px gutter with room to spare,
            so the 2x2 keeps the pair AND the height sane. The template is just
            the base `grid-cols-2` carried up: every column is already
            `col-span-2 md:col-span-1`, so nothing here needs an md template of
            its own. */}
        <div className="grid grid-cols-2 lg:grid-cols-none lg:flex lg:justify-between lg:items-start gap-x-6 gap-y-8 md:gap-x-8 md:gap-y-10 lg:gap-x-12">
          <div className="col-span-2 md:col-span-1">
            <div className="wordmark text-lg" style={{ color: 'var(--parchment)' }}>The Modesty House</div>
            <p className="mt-3 text-sm max-w-xs" style={{ color: 'var(--muted-on-dark)' }}>
              A curated index of modest fashion houses — vetted for craft and taste.
            </p>
            <div className="flex items-center gap-1 mt-5" style={{ color: '#b9ad9c' }}>
              <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:opacity-70 transition" style={{ width: 44, height: 44, marginLeft: -12 }}><PinterestLogo size={20} /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:opacity-70 transition" style={{ width: 44, height: 44 }}><InstagramLogo size={20} /></a>
              <a href="https://tiktok.com" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center hover:opacity-70 transition" style={{ width: 44, height: 44 }}><TiktokLogo size={20} /></a>
            </div>

            {/* Sign-up posts to /api/subscribe, which emails the address to us.
                There is still no subscriber database (see lib/subscribe.ts), so
                the copy says "we'll add you", not "an issue is on its way".
                NOTE: an older version rendered <FLink> — an <li> — inside a <p>,
                which is invalid HTML and produced a stray bullet in the footer.

                Moved here from "The House" on 2026-08-25 — Tina: "can you pit
                the email pill under the social media icons".

                `max-w-xs` matches the strapline above it, so the pill, the
                paragraph and the social row all end on the same right edge
                instead of the pill running to whatever the column happens to
                be. It also protects the pill from the thing that put it in "The
                House" in the first place: the field is `flex-1` behind a
                fixed-width brass button, so at ~163px it collapsed to 66px and
                read "Your er". This column is 1.4fr of a 5.4fr row — the widest
                of the five — so it has more room than the one it left, but the
                cap is what makes that true at every width rather than just at
                1440.

                mt-6, not the mt-5 the social row uses: the icons carry 44px tap
                targets around 20px glyphs, so their box already extends ~12px
                below the last visible pixel of the logos. Matching the numbers
                would look tighter than matching the numbers. */}
            <div className="mt-6 max-w-xs">
              <div className="eyebrow" style={{ color: 'var(--brass)' }}>The Edit, in your inbox</div>
              <NewsletterSignup />
            </div>
          </div>

          {/* ALL of CATEGORY_LANES, not a slice — 13 as of 2026-08-24, counted
              from lib/lanes.ts rather than copied. (This note said "9", then
              "11"; the number goes stale every time a lane is added, which is
              precisely why nothing here hard-codes it.) It was once
              `.slice(0, 6)`, which silently dropped /modest-sets,
              /modest-swimwear and /modest-activewear — and since CATEGORY_LANES
              is itself LANES.filter(kind === 'category'), that left half the
              lanes with no internal link anywhere on the site. The sitemap gets
              an unlinked page crawled, but internal links are what pass ranking
              signal and tell a crawler the page matters, and the footer is the
              only link position that appears on every page. Measured 2026-08-08.

              /modest-summer-outfits is excluded by the CATEGORY_LANES filter
              and, since 2026-08-24, is linked from nowhere — see the note
              below where its column used to be. It was one of two such lanes
              until /modest-wedding-guest was retired on 2026-08-27 (308 to
              /modest-dresses, next.config.ts), which is what losing every
              internal link eventually leads to.
              /hijabi-outfits used to be a third, held back deliberately because
              it near-duplicated /directory; it was retired on 2026-08-19 once
              the reason became clear (112 of 113 brands carry
              community: 'hijabi', so the lane had no selectivity left). */}
          <Col
            head="Products"
            /* NO text-center anywhere. It was added 2026-08-25 with
               `justify-center` so the eyebrow would sit over the centred
               sub-column pair — but that put "PRODUCTS" over the GUTTER
               between the two lists, 120px right of "Modest Dresses", while
               EDITORIAL and THE HOUSE sat flush above their own first link.
               Tina: "products name should just be where it was".

               `md:w-max md:mx-auto` used to be what reconciled that with the
               pair being centred in a two-track span. Both are gone as of the
               flex row above, and nothing was lost: a flex item sizes to its
               content, so the heading and the first link share a left edge by
               construction rather than by a width trick — and `mx-auto` would
               have broken `justify-between` outright (an auto margin on a flex
               item eats free space before justify-content sees it).

               col-span-2 at md is gone with the fifth track; the span classes
               that remain only matter on the phone grid. */
            className="col-span-2 md:col-span-1"
            /* grid-flow-col + a fixed row count fills DOWN the first sub-column
               and then down the second (7 then 6), which is how a reader scans
               a list. Plain `grid-cols-2` would flow across — 1,2 / 3,4 — and
               interleave the two halves.

               `auto-cols-max` + `justify-center`, 2026-08-25 (Tina: "put them
               closr together center"). Implicit grid tracks default to `auto`,
               which STRETCHES to fill free space exactly like 1fr — so across a
               two-track span the pair sat 264px apart with a hole between them.

               `lg:grid-cols-none` is load-bearing and was the first fix that did
               NOT work without it: `auto-cols-max` sets grid-auto-columns, which
               only sizes IMPLICIT tracks. The base `grid-cols-2` (mobile) leaves
               an EXPLICIT track in force at every width, so sub-column one kept
               absorbing all the free space and shoved sub-column two right —
               measured unchanged at 262px apart. Clearing the template makes
               both tracks implicit, so both take max-content, sized to their
               longest label.

               `justify-start`, not the old `justify-center`: at lg the whole
               column is a flex item sized to its own content, so there is no
               span left to centre the pair inside — centring would only have
               shifted it away from its own heading. The eyebrow and the first
               link now share a left edge by construction.

               GUTTER: gap-x-20 (80px) at lg. Went 32 -> 40 -> 80; Tina on the
               40px version: "not that close". 80 matches the gutter between the
               footer's other columns, so the whole row reads at one rhythm
               rather than the Products pair having a tighter internal rhythm
               than everything beside it. Rendered 40/64/80/96/112 side by side
               before picking.

               md gets 32px instead, and that number is not taste either: half a
               768 row is 336px and the pair's two max-content columns are
               ~115 + ~145, so 32 is what fits with margin. 80 there is what
               overflowed the page sideways before the 2x2 (see the container's
               own note).

               MOBILE STAYS ONE COLUMN, left-aligned: at 390px each half would be
               ~150px and "Cardigans & Sweaters" wraps to three lines. */
            listClassName="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-none md:grid-flow-col md:grid-rows-7 md:auto-cols-max md:justify-start md:gap-x-8 md:gap-y-2 lg:gap-x-20"
          >
            {CATEGORY_LANES.map((l) => (
              <FLink key={l.slug} href={`/${l.slug}`}>{l.title}</FLink>
            ))}
          </Col>

          {/* The "More" column stood here from 2026-08-19 until 2026-08-24, when
              Tina cut it: "Modest Wedding Guest / Modest Summer Outfits get these
              out of the footer". It rendered every non-category lane —
              LANES.filter(kind !== 'category'), which is exactly those two
              (kind 'occasion' and 'season').

              KNOWN COST, raised with her rather than buried here: the column was
              added because those two lanes had almost no internal links — measured
              2026-08-19, /modest-summer-outfits had ZERO anywhere on the site and
              /modest-wedding-guest had one, against 25-35 for every category lane.
              Removing it put them back in that state, and on 2026-08-27
              /modest-wedding-guest was retired outright — a lane nothing links to
              is a lane nobody misses. /modest-summer-outfits is still routed and
              still in sitemap.xml, but a sitemap entry only gets a URL crawled;
              internal links are what pass ranking signal (§8). If they should keep
              a link without their own column, the cheap fix is a single line each
              in "The House", not a restored column.

              The slot this freed is what the Products column now spans. */}

          {/* Was "The Edit" / "Guides" / "Interviews", all three pointing at
              /editorial. "Guides" and "Interviews" are not sections that exist:
              content/editorial holds 2 posts, one tagged Guide, one Styling,
              and zero interviews — so two of the three labels promised a page
              the site has never had.

              A brief experiment listed the posts themselves, by name, but
              Tina asked for that to be removed 2026-08-20 — full article
              titles reading as a list in the footer was not wanted. Back to
              just the section link. */}
          <Col
            head="Editorial"
            className="col-span-2 md:col-span-1"
            listClassName="grid grid-cols-2 gap-y-1 md:block md:space-y-2"
          >
            <FLink href="/editorial">The Edit</FLink>
            {/* Every live /edits/[slug], from lib/edits.ts — so a new edit is
                linked the moment it exists. A page can be in the sitemap and
                still be reachable from nowhere (§8), and internal links are what
                pass ranking signal; the sitemap only gets it crawled. Note the
                footer's lane columns render CATEGORY_LANES, which an edit is
                deliberately not part of — see lib/edits.ts for why an edit is
                not a lane. */}
            {EDITS.map((e) => (
              <FLink key={e.slug} href={`/edits/${e.slug}`}>{e.title}</FLink>
            ))}
          </Col>

          {/* col-span-2 on a phone. It no longer HAS to be — the reason was
              the sign-up pill, which moved to the brand column on 2026-08-25 —
              but it stays: at 390px a half-width column puts "Apply for the
              seal" on three lines, and the two-column list inside it is what
              gives the phone footer its rhythm. */}
          <div className="col-span-2 md:col-span-1">
            <div className="eyebrow" style={{ color: 'var(--brass)' }}>The House</div>
            <ul className="mt-3 text-sm grid grid-cols-2 gap-y-1 md:block md:space-y-2">
              <FLink href="/designers">Designers</FLink>
              <FLink href="/about">About</FLink>
              <FLink href="/faq">FAQ</FLink>
              <FLink href="/favourites">Favourites</FLink>
              <FLink href="/contact?topic=seal">Apply for the seal</FLink>
              <FLink href="/contact">Contact</FLink>
            </ul>

            {/* The sign-up pill lived here until 2026-08-25 — Tina: "can you
                pit the email pill under the social media icons". It is now in
                the brand column at the far left, under the social row. */}
          </div>
        </div>

        {/* The site-wide FTC / EU affiliate disclosure paragraph stood here
            until 2026-08-25. Tina: "its still too long just get rid of this
            text", quoting it in full — it was four lines of small print above
            the copyright row and it was making the footer long.

            RAISED WITH HER RATHER THAN REMOVED QUIETLY, because this is the
            one piece of footer copy with a legal job: the comment it replaces
            read "Must stay site-wide and visible without interaction — it is
            the disclosure a regulator looks for first", and CLAUDE.md §11
            P0-D tracks affiliate disclosure as a launch item. What still
            carries it: /privacy, /terms (the page the removed "Full
            disclosure" link pointed at) and FAQ Q10. What is gone is the
            site-wide, no-interaction-required one, which is the form the FTC's
            "clear and conspicuous" guidance actually asks for.

            Materially this is defensible only while Skimlinks stays OFF
            (`NEXT_PUBLIC_SKIMLINKS_ID` unset — CLAUDE.md §11 P0-E: the
            monetisation is still a stub, so no link on the site currently
            earns anything). The moment it is switched on, a one-line version
            needs to come back here. That is the same condition the cookie-
            consent gap is already parked behind in P0-D.

            The copyright row below keeps its own borderTop, so removing this
            block leaves one clean rule rather than an empty one. */}

        <div className="mt-6 pt-5 md:mt-8 md:pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(243,238,228,0.12)' }}>
          {/* text-center below md. The row is `flex-col items-center` on a
              phone, which centres each CHILD as a box — but this one is a full-
              width block whose text still defaults to `start`, so its two
              wrapped lines hugged the left edge while the narrower Privacy/Terms
              row sat centred beneath them. Measured at 390px: this block 326px
              wide with its text at x=32, that row 244px wide at x=73 — a 41px
              mismatch, and the reason Tina's screenshot reads as broken.
              `items-center` centres boxes; it does not centre text inside a box
              that is already as wide as its parent. */}
          <div className="eyebrow text-center md:text-left" style={{ color: 'var(--muted-on-dark)' }}>© 2026 The Modesty House · themodestyhouse.com</div>
          {/* 10px eyebrow type gave these a 15px-tall hit area. inline-flex with
              a min-height grows the target without changing the type or the
              baseline the row sits on. */}
          {/* The currency control sits with Privacy/Terms rather than up in a
              column: it is site furniture, not a destination, and the foot of
              the page is where a shopper looks for it after scrolling a grid
              past the header's copy of the same control. Both write the one
              CurrencyProvider context, so they can never disagree. */}
          <div className="eyebrow flex items-center gap-3" style={{ color: 'var(--muted-on-dark)' }}>
            <FooterCurrency />
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="inline-flex items-center" style={{ color: 'inherit', minHeight: 32 }}>Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="inline-flex items-center" style={{ color: 'inherit', minHeight: 32 }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
