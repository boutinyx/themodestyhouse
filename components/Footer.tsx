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
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-x-6 gap-y-8 md:gap-8">
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

              The two non-category lanes (/modest-wedding-guest,
              /modest-summer-outfits) are excluded by the CATEGORY_LANES filter
              and, since 2026-08-24, are linked from nowhere — see the note
              below where their column used to be.
              /hijabi-outfits used to be a third, held back deliberately because
              it near-duplicated /directory; it was retired on 2026-08-19 once
              the reason became clear (112 of 113 brands carry
              community: 'hijabi', so the lane had no selectivity left). */}
          <Col
            head="Products"
            /* Two of the five tracks — the track the "More" column used to hold
               is exactly what this takes over, so the template below is
               unchanged and nothing else moves. */
            /* NO md:text-center. It was added 2026-08-25 with `justify-center`
               so the eyebrow would sit over the centred sub-column pair — but
               that put "PRODUCTS" over the GUTTER between the two lists, 120px
               right of "Modest Dresses", while EDITORIAL and THE HOUSE sit
               flush above their own first link. Tina: "products name should
               just be where it was". The heading is back at the column's left
               edge, level with its first item and with every other heading in
               the row; the LINKS stay centred in the span, which is the
               separate thing she asked for earlier the same day.

               `md:w-max md:mx-auto` is what makes those two compatible. Simply
               dropping the centring left the heading at the SPAN's left edge
               (429px) while `justify-center` on the list held the pair at
               470px — measured, 41px apart, which is not "where it was"
               either. Shrinking the whole column to max-content and centring
               THAT moves heading and list together, so the heading sits exactly
               on its first link the way EDITORIAL and THE HOUSE do. */
            className="col-span-2 md:col-span-2 md:w-max md:mx-auto"
            /* grid-flow-col + a fixed row count fills DOWN the first sub-column
               and then down the second (7 then 6), which is how a reader scans
               a list. Plain `grid-cols-2` would flow across — 1,2 / 3,4 — and
               interleave the two halves.

               `auto-cols-max` + `justify-center`, 2026-08-25 (Tina: "put them
               closr together center"). Implicit grid tracks default to `auto`,
               which STRETCHES to fill free space exactly like 1fr — so across a
               two-track span the pair sat 264px apart with a hole between them.

               `md:grid-cols-none` is load-bearing and was the first fix that did
               NOT work without it: `auto-cols-max` sets grid-auto-columns, which
               only sizes IMPLICIT tracks. The base `grid-cols-1` (mobile) leaves
               an EXPLICIT 1fr first column in force at every width, so sub-column
               one kept absorbing all the free space and shoved sub-column two
               right — measured unchanged at 262px apart. Clearing the template at
               md makes both tracks implicit, so both take max-content.
               `max-content` sizes each sub-column to its longest label, and
               `justify-center` centres the resulting pair in the span; the
               eyebrow above it is NOT centred with it — see the note on the
               column's own className above. (`md:text-left` on the list below is
               inert now: it existed only to undo the `md:text-center` that has
               gone. Left in place because left is what the rows want anyway.)

               GUTTER: gap-x-20 (80px). Went 32 -> 40 -> 80; Tina on the 40px
               version: "not that close". 80 is the value that matches the ~73px
               gutter between the footer's other columns (Products->Editorial,
               Editorial->The House), so the whole row reads at one rhythm rather
               than the Products pair having a tighter internal rhythm than
               everything beside it. Rendered 40/64/80/96/112 side by side before
               picking.

               MOBILE STAYS ONE COLUMN, left-aligned: at 390px each half would be
               ~150px and "Cardigans & Sweaters" wraps to three lines. (gap-x is
               inert there — one column has no column gap.) */
            listClassName="grid grid-cols-2 md:grid-cols-none md:grid-flow-col md:grid-rows-7 md:auto-cols-max md:justify-center md:text-left gap-x-4 gap-y-1 md:gap-x-20 md:gap-y-2"
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
              Removing it puts them back in that state. Both are still routed and
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
          <div className="eyebrow" style={{ color: 'var(--muted-on-dark)' }}>© 2026 The Modesty House · themodestyhouse.com</div>
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
