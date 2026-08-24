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
  listClassName = 'space-y-2',
}: {
  head: string;
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
}) {
  return (
    <div className={className}>
      <div className="eyebrow" style={{ color: 'var(--brass)' }}>{head}</div>
      <ul className={`mt-4 text-sm ${listClassName}`}>{children}</ul>
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
      <div className="max-w-[1220px] mx-auto px-8 py-16">
        {/* 5 columns at md+: brand, Products, More, Editorial, The House — one
            explicit track per direct grid child. Was 4 tracks
            (1.4fr_1fr_1fr_1fr) for what used to be 4 children; the "More"
            column (6237f64, 2026-08-19) made it 5 without updating this
            template, so with no 5th track and no `grid-auto-flow: dense`,
            "The House" silently wrapped to row 2 col 1 — a huge gap under
            Products (11 items, the tallest column) instead of sitting beside
            Editorial. Reported by Tina as "the footer is still fucked". */}
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-10">
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
            className="md:col-span-2"
            /* grid-flow-col + a fixed row count fills DOWN the first sub-column
               and then down the second (7 then 6), which is how a reader scans
               a list. Plain `grid-cols-2` would flow across — 1,2 / 3,4 — and
               interleave the two halves.
               MOBILE STAYS ONE COLUMN: at 390px each half would be ~150px and
               "Cardigans & Sweaters" wraps to three lines. */
            listClassName="grid grid-cols-1 md:grid-flow-col md:grid-rows-7 gap-x-8 gap-y-2"
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
          <Col head="Editorial">
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

          {/* col-span-2 on a phone. This column carries the sign-up pill, and in
              a half-width footer column the pill had 163px to work with: the
              button took 95 of them and the email field was left 66px wide,
              showing "Your er". Given the full row the field is ~230px and the
              pill reads as a pill again. */}
          <div className="col-span-2 md:col-span-1">
            <div className="eyebrow" style={{ color: 'var(--brass)' }}>The House</div>
            <ul className="mt-4 space-y-2 text-sm">
              <FLink href="/designers">Designers</FLink>
              <FLink href="/about">About</FLink>
              <FLink href="/faq">FAQ</FLink>
              <FLink href="/favourites">Favourites</FLink>
              <FLink href="/contact?topic=seal">Apply for the seal</FLink>
              <FLink href="/contact">Contact</FLink>
            </ul>

            {/* Sign-up posts to /api/subscribe, which emails the address to us.
                There is still no subscriber database (see lib/subscribe.ts), so
                the copy says "we'll add you", not "an issue is on its way".
                NOTE: the old version rendered <FLink> — an <li> — inside a <p>,
                which is invalid HTML and produced a stray bullet in the footer. */}
            <div className="mt-7">
              <div className="eyebrow" style={{ color: 'var(--brass)' }}>The Edit, in your inbox</div>
              <NewsletterSignup />
            </div>
          </div>
        </div>

        {/* FTC / EU affiliate disclosure. Must stay site-wide and visible without
            interaction — it is the disclosure a regulator looks for first. */}
        {/* The rule spans the full column; only the TEXT is capped at 720.
            It used to be one element carrying both, so the hairline stopped
            where the paragraph did — 720px — while the identical hairline above
            the copyright row ran the full width. Measured: 720 vs 960 at
            1024px, 720 vs 1156 at 1440. Two stacked rules in the same footer
            ending at different points made the upper one read as a stub. */}
        <div
          className="mt-14 pt-6"
          style={{ borderTop: '1px solid rgba(243,238,228,0.12)', color: 'var(--muted-on-dark)', fontSize: 12, lineHeight: 1.6 }}
        >
        <div style={{ maxWidth: 720 }}>
          The Modesty House is a discovery and affiliate site — we don&rsquo;t sell anything
          ourselves. Some links may be affiliate links, and if you buy through one we may earn a
          commission at no extra cost to you. Prices default to an approximate conversion
          (marked with &asymp;) and can change; the amount you actually pay is set by the
          brand, in its own currency, on its own site.{' '}
          {/* inline-flex + min-height, the same correction as <FLink> above: at
              12px inside a 1.6 line-height this link's hit area was 72x18, under
              the 24px floor in WCAG 2.2 SC 2.5.8. It was reported on every one
              of the 312 pages the audit rendered — the single most common
              finding, because it is in the site-wide footer. */}
          <Link
            href="/terms"
            className="inline-flex items-center"
            style={{ color: '#c8bda9', textDecoration: 'underline', textUnderlineOffset: 2, minHeight: 24 }}
          >
            Full disclosure
          </Link>
          .
        </div>
        </div>

        <div className="mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(243,238,228,0.12)' }}>
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
