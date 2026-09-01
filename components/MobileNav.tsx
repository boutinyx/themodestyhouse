'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { trackGoal } from '@/lib/pulse';
import { List as ListIcon, X as XIcon, CaretRight, CaretDown } from '@phosphor-icons/react';
import { Dialog } from '@base-ui-components/react/dialog';
import { CATEGORY_LANES } from '@/lib/lanes';
import { DISPLAY_CURRENCIES, CURRENCY_LABEL } from '@/lib/fx';
import { CurrencyFlag } from './CurrencyFlag';
import {
  OUTERWEAR_SUBTYPE_LABELS, LAYERING_SUBTYPE_LABELS, HIJAB_SUBTYPE_LABELS,
  type OuterwearSubtype, type LayeringSubtype, type HijabSubtype,
} from '@/lib/specialty';
import { useCurrency } from './CurrencyProvider';
import { useScrollFade } from './useScrollFade';

// Split into two pairs 2026-08-21 alongside the 'outerwear' lane itself
// splitting into blazers-vests/cardigans-sweaters/jackets-coats (lib/lanes.ts)
// — same split components/Nav.tsx makes for the desktop flyout. jackets-coats
// has only one subtype (coat), so it falls through to a plain row() below,
// same as any other single-subtype lane.
const BLAZER_VEST_ORDER: OuterwearSubtype[] = ['blazer', 'vest'];
const CARDIGAN_SWEATER_ORDER: OuterwearSubtype[] = ['cardigan', 'sweater'];
const LAYERING_SUBTYPE_ORDER = Object.keys(LAYERING_SUBTYPE_LABELS) as LayeringSubtype[];
const HIJAB_SUBTYPE_ORDER = Object.keys(HIJAB_SUBTYPE_LABELS) as HijabSubtype[];

/**
 * The phone navigation: a full-screen takeover.
 *
 * It has been through two shapes. First a horizontally-scrolling row sitting on
 * the hero photograph — 485px of content in a 358px box at iPhone 13 width, with
 * "Editorial" and "About" entirely off-screen. Then a 280px dropdown, which
 * fixed the reachability but read badly: sixteen rows of 11–12px uppercase
 * Marcellus, all in one muted brown, all CENTRE-ALIGNED, opening white-on-white
 * from under the white header pill.
 *
 * The centring was not a style choice, it was a bug. `.nav-link` sets
 * `justify-content: center` because it is built for the horizontal desktop
 * header row, where centring a small inline box is right. Reused on a full-width
 * row in a vertical panel it flattened the whole thing: the `pl-6` indent on the
 * sub-items computed to 24px and then had no effect at all, so the hierarchy
 * (Products, then its categories, then pages) never rendered.
 * `.nav-link` is therefore NOT used here — this file styles its own rows, so
 * that fixing the phone menu cannot regress the desktop header.
 *
 * A Dialog, not a Menu: at full-screen size this is a takeover, and Dialog is
 * what gives scroll-lock on the body behind it, a focus trap, Escape, and a
 * portal that cannot be clipped by an ancestor's overflow.
 */
export function MobileNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Blazers & Vests / Cardigans & Sweaters each expand inline to their own
  // subtypes — mirrors the desktop header's hover flyout (components/
  // Nav.tsx), the touch equivalent of "hover". Fixed 2026-08-13 (as one
  // combined "Outerwear" row, split into these two 2026-08-21 alongside the
  // lane split itself): this row used to be a plain `row(...)` link like
  // every other category, so tapping it navigated straight to the lane with
  // no way to reach its subtypes — Tina: "clicking on outerwear on mobile
  // the subcategories dont open it takes you direcly to outerwear". A tap
  // toggles disclosure instead of navigating; only the sub-rows are real
  // links.
  const [blazersVestsOpen, setBlazersVestsOpen] = useState(false);
  const blazersVestsRowRef = useRef<HTMLDivElement>(null);
  const [cardigansSweatersOpen, setCardigansSweatersOpen] = useState(false);
  const cardigansSweatersRowRef = useRef<HTMLDivElement>(null);
  // Layering Basics and Hijabs & Scarves USED to get this same disclosure
  // treatment — Layering Basics 2026-08-15 (Tina: "i want the sub catagories
  // of layering basics to be like outerwear sub catagories... i want to be
  // able to click them"), Hijabs & Scarves 2026-08-15 evening (Tina: "i want
  // a dropdown that give khimars and jilbabs undercap et etc"). SUPERSEDED
  // 2026-08-24: both are now their own top-level eyebrow sections below
  // (alongside a new "Active" section), matching the desktop header's own
  // Clothing/Hijabs/Basics/Active split (Tina: "i want you to catagorize the
  // hamburger menu like our new and imporved header") — a disclosure toggle
  // stops making sense once the group has its own heading and isn't buried
  // inside the flat Category list any more, so both are now always-expanded
  // plain rows instead. Blazers & Vests / Cardigans & Sweaters keep their
  // disclosure — the desktop header still nests THOSE inside Clothing's own
  // panel, unlike Hijabs/Basics/Active, which are separate top-level groups
  // there.

  // Outerwear sits near the bottom of the Category list (9th of 10), so
  // opening it in place pushes its four sub-rows almost entirely below the
  // fold — measured on production: only "Blazers" got a 1.5px sliver inside
  // the viewport, Vests/Cardigans/Coats were fully off-screen with nothing
  // telling anyone to scroll further. Tina: "i want to click outerwear and
  // that works but the subcatogories not like versts blazers etc" — she could
  // open the disclosure but the actual links she needed were never on screen
  // to tap. This is why the FIRST verification of this feature (a Playwright
  // `.tap()`) looked clean: Playwright auto-scrolls an element into view
  // before tapping it, which silently hid the exact failure a real finger
  // hits. Caught only by checking `elementFromPoint`/`getBoundingClientRect`
  // directly, the same lesson as CLAUDE.md §10.26 — trust the harness's
  // method, not just its pass/fail.
  useEffect(() => {
    if (blazersVestsOpen) blazersVestsRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [blazersVestsOpen]);
  useEffect(() => {
    if (cardigansSweatersOpen) cardigansSweatersRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [cardigansSweatersOpen]);

  // Choosing a currency does NOT close the panel — it changes prices on the page
  // behind it, and the visitor may well want to try another one.
  const { preference, setPreference } = useCurrency();
  // The currency picker is a disclosure at the TOP of the panel as of
  // 2026-08-24 (Tina sent aabcollection.com's phone menu: a flag, the
  // region, and a chevron sitting just under the close/logo bar, above the
  // hairline that starts the navigation). It was a row of `.chip` buttons at
  // the FOOT of the panel before that — nine chips wrapped over three lines
  // that nobody scrolled to. Collapsed by default so it costs one row, not
  // nine.
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // Closing on navigation is done in each link's onClick, NOT in an effect on
  // `path`. Client-side navigation does not unmount this component, so something
  // has to close the panel — but doing it as `useEffect(() => setOpen(false),
  // [path])` is a cascading render, and react-hooks/set-state-in-effect fails
  // the lint on it. The click is the event that should close it anyway.
  const close = () => setOpen(false);

  // The panel holds more rows than any phone can show — measured, not assumed:
  // 1024px of content in a 756px scrollport at iPhone 13 size. The scrollbar is
  // hidden at rest on iOS, so without this the hidden rows have no affordance
  // at all. See lib/scrollFade.ts.
  const { ref: navRef, fade } = useScrollFade<HTMLElement>('y');

  // The trigger lives in an `hdr:hidden` wrapper, but the panel is portalled to
  // the body — so growing past the desktop breakpoint while it is open would
  // leave a full-screen phone menu over the desktop layout.
  // 1152 must match the `hdr:hidden` on the trigger in components/Header.tsx,
  // which is `--breakpoint-hdr` in app/globals.css — see the long note there
  // for why the header's own breakpoint is a measured number and not `lg`. It
  // was 768 while the trigger was `md:hidden`, then 1024 while it was
  // `lg:hidden`; the two are one decision written in two places, and they have
  // to move together. Third time it has moved, and each time both halves did.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1152px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isOn = (href: string) => path === href;

  /**
   * One row. Modelled on the Victoria's Secret phone menu, which Tina gave as
   * the reference: sans, ~17px, FLUSH LEFT at every level, a chevron at the
   * right edge, and an even vertical rhythm.
   *
   * Three things here are deliberate and were each wrong in the first attempt:
   *  - `--font-ui-stack` (Jost), not the display serif. Bodoni at 20–22px read
   *    as a headline per row rather than as navigation.
   *  - NO indent on sub-items. They used to carry `pl-4`; Tina's note was
   *    "they are not centered to the left". Grouping is carried by the eyebrows
   *    alone, so every label starts on the same left edge.
   *  - `justify-between` puts the chevron on the right edge of the ROW, not
   *    beside the text, so the chevrons line up in a column down the panel.
   */
  const row = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      onClick={close}
      className="flex items-center justify-between gap-4 py-4"
      style={{
        fontFamily: 'var(--font-ui-stack)',
        fontSize: 17,
        lineHeight: 1.35,
        letterSpacing: '0.01em',
        color: isOn(href) ? 'var(--aubergine)' : 'var(--ink)',
        fontWeight: isOn(href) ? 500 : 400,
      }}
      aria-current={isOn(href) ? 'page' : undefined}
    >
      {label}
      <CaretRight size={15} style={{ flexShrink: 0, color: 'var(--muted)' }} />
    </Link>
  );

  /** The subtype links inside an open disclosure row — no ref involved, so
   *  this is safe to share as a plain helper (unlike the row itself, which
   *  the eslint react-hooks/refs rule won't let take a ref through a
   *  function parameter — it can't statically prove the ref is only ever
   *  used for `ref=`, so each row below attaches its own ref directly in
   *  JSX instead of via a shared function).
   *
   *  Leads with an "All X" link to the bare lane page (no ?type=) — added
   *  2026-08-15 alongside the same fix in components/Nav.tsx. The row
   *  itself is a disclosure toggle, never a link (see outerwearRow's own
   *  comment on why), so before this there was no way to reach the
   *  unfiltered category view from the phone menu either. */
  const subtypeLinks = <T extends string,>(slug: string, allLabel: string, order: T[], labels: Record<T, string>) => (
    <div className="pb-2">
      <Link
        href={`/${slug}`}
        onClick={close}
        className="flex items-center py-3 pl-4"
        style={{
          fontFamily: 'var(--font-ui-stack)',
          fontSize: 15,
          lineHeight: 1.35,
          letterSpacing: '0.01em',
          color: 'var(--ink)',
          fontWeight: 500,
        }}
      >
        {allLabel}
      </Link>
      {order.map((t) => (
        <Link
          key={t}
          href={`/${slug}?type=${t}`}
          onClick={close}
          className="flex items-center py-3 pl-4"
          style={{
            fontFamily: 'var(--font-ui-stack)',
            fontSize: 15,
            lineHeight: 1.35,
            letterSpacing: '0.01em',
            color: 'var(--ink)',
          }}
        >
          {labels[t]}
        </Link>
      ))}
    </div>
  );

  /** Blazers & Vests' row: a disclosure toggle, not a link — see the note on
   *  `blazersVestsOpen` above. */
  const blazersVestsRow = () => (
    <div key="/blazers-vests" ref={blazersVestsRowRef}>
      <button
        type="button"
        onClick={() => setBlazersVestsOpen((v) => !v)}
        aria-expanded={blazersVestsOpen}
        className="flex items-center justify-between gap-4 py-4 w-full text-left"
        style={{
          fontFamily: 'var(--font-ui-stack)',
          fontSize: 17,
          lineHeight: 1.35,
          letterSpacing: '0.01em',
          color: path === '/blazers-vests' ? 'var(--aubergine)' : 'var(--ink)',
          fontWeight: path === '/blazers-vests' ? 500 : 400,
        }}
      >
        Blazers & Vests
        <CaretDown
          size={15}
          style={{
            flexShrink: 0,
            color: 'var(--muted)',
            transition: 'transform 150ms ease-out',
            transform: blazersVestsOpen ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>
      {blazersVestsOpen && subtypeLinks('blazers-vests', 'All Blazers & Vests', BLAZER_VEST_ORDER, OUTERWEAR_SUBTYPE_LABELS)}
    </div>
  );

  /** Cardigans & Sweaters' row — same shape as Blazers & Vests' above. */
  const cardigansSweatersRow = () => (
    <div key="/cardigans-sweaters" ref={cardigansSweatersRowRef}>
      <button
        type="button"
        onClick={() => setCardigansSweatersOpen((v) => !v)}
        aria-expanded={cardigansSweatersOpen}
        className="flex items-center justify-between gap-4 py-4 w-full text-left"
        style={{
          fontFamily: 'var(--font-ui-stack)',
          fontSize: 17,
          lineHeight: 1.35,
          letterSpacing: '0.01em',
          color: path === '/cardigans-sweaters' ? 'var(--aubergine)' : 'var(--ink)',
          fontWeight: path === '/cardigans-sweaters' ? 500 : 400,
        }}
      >
        Cardigans & Sweaters
        <CaretDown
          size={15}
          style={{
            flexShrink: 0,
            color: 'var(--muted)',
            transition: 'transform 150ms ease-out',
            transform: cardigansSweatersOpen ? 'rotate(180deg)' : undefined,
          }}
        />
      </button>
      {cardigansSweatersOpen && subtypeLinks('cardigans-sweaters', 'All Cardigans & Sweaters', CARDIGAN_SWEATER_ORDER, OUTERWEAR_SUBTYPE_LABELS)}
    </div>
  );

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        // The phone drawer, reported alongside the desktop groups so "how do
        // people navigate" is one question with one answer.
        if (o) trackGoal('nav_open', { group: 'phone-drawer' });
        setOpen(o);
      }}
    >
      <Dialog.Trigger
        aria-label="Open navigation"
        className="nav-link inline-flex items-center justify-center leading-none"
        style={{ fontSize: 13, letterSpacing: 0 }}
      >
        <ListIcon size={24} style={{ display: 'block' }} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Popup
          className="fixed inset-y-0 left-0 z-[70] flex flex-col transition-[opacity,transform] duration-200 ease-out data-[starting-style]:opacity-0 data-[starting-style]:translate-x-1 data-[ending-style]:opacity-0"
          style={{
            // Parchment, not white: the header pill it opens from is #fff, and a
            // white panel emerging from behind a white pill read as one blob.
            background: 'var(--parchment)',
            // dvh, not vh — vh on iOS Safari is the URL-bar-collapsed height, so
            // the last row sits under the browser chrome.
            // 2026-08-23, Tina: "i dont want it to completely open and fill the
            // screen on phone and tablet but show a little space of the hero" —
            // first tried leaving a gap at the BOTTOM, corrected immediately:
            // "not on the buttom i mean the side the right side." Was a full
            // `inset-0` takeover; now stops 56px short of the RIGHT edge
            // instead, so a strip of whatever's behind (the hero, on the
            // homepage) stays visible there. Full height again — only the
            // width is reduced. Square corners — Tina: "dont round out the
            // cornres." The shadow alone reads it as a sheet over the page.
            height: '100dvh',
            width: 'calc(100% - 56px)',
            boxShadow: '20px 0 40px -12px rgba(0,0,0,0.35)',
          }}
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>

          {/* Mirrors the header bar it replaces, so the crest does not appear to
              jump when the panel opens. The close sits exactly where the
              hamburger was. */}
          <div
            className="flex items-center justify-between px-5 shrink-0"
            style={{ height: 88, borderBottom: '1px solid var(--hairline)' }}
          >
            <Link href="/" onClick={close} className="flex items-center gap-3">
              {/* width/height are the file's INTRINSIC size (240x337), not the
                  rendered box — they exist to reserve the right shape before it
                  loads, and 44x48 reserved the wrong one. Matches Header.tsx. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-240.webp" alt="The Modesty House crest" width={240} height={337} className="h-12 w-auto" />
              <span
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-label-stack)',
                  color: 'var(--aubergine)',
                  letterSpacing: '0.22em',
                  lineHeight: 1.3,
                  fontSize: 12,
                }}
              >
                The&nbsp;Modesty
                <br />
                House
              </span>
            </Link>
            <Dialog.Close
              aria-label="Close navigation"
              className="inline-flex items-center justify-center"
              style={{ width: 44, height: 44, color: 'var(--aubergine)' }}
            >
              <XIcon size={22} style={{ display: 'block' }} />
            </Dialog.Close>
          </div>

          {/* This wrapper exists only to be the fade's containing block, and it
              must NOT be the scroller: an absolutely positioned pseudo resolves
              against its originating element's padding box, and a scroll
              container's padding box moves with the content, so a fade on the
              <nav> would scroll away on the first flick.

              min-h-0 is required, not decoration. The panel is a flex column;
              a flex item's default min-height is auto, i.e. "at least my
              content", so this wrapper would refuse to shrink below its 1024px
              of rows, the <nav> inside would never be shorter than its content,
              and nothing would scroll at all.

              --fade-to is --parchment because that is what Dialog.Popup paints
              above; the class defaults to #fff, which would read as a pale
              rectangle on this ground.

              Measured on production 2026-08-09, both engines, iPhone 13:
              1024px of rows in a 756px scrollport — 268px, about five tappable
              rows, hidden with no scrollbar at rest on iOS. */}
          <div
            className="scroll-fade flex-1 min-h-0"
            data-fade={fade}
            style={{ ['--fade-to' as string]: 'var(--parchment)' }}
          >
          {/* overscrollBehavior lives in .scroll-fade-port now — without it,
              flicking past the end of this list chains the scroll to the
              document behind the panel. */}
          <nav
            ref={navRef}
            className="scroll-fade-port h-full overflow-y-auto px-5 pb-10"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* CURRENCY — the first thing in the panel, above the hairline
                that starts the navigation, exactly where aabcollection.com
                puts its region picker (Tina's reference, 2026-08-24). The
                trigger shows the CURRENT choice — flag, label, chevron — so
                at rest it reads as a statement of what prices are in rather
                than as a control demanding attention; tapping it reveals all
                nine.

                Rendered as plain buttons rather than by reusing
                <CurrencySwitcher>: that control is a Base UI Menu, and a
                popup opened from inside a Dialog is both fiddly and a second
                tap. The option labels and the approximate-prices note are the
                existing strings, reused verbatim from the header control
                (§10.18). */}
            <div className="pt-4 pb-4" style={{ borderBottom: '1px solid var(--hairline)' }}>
              <button
                type="button"
                onClick={() => setCurrencyOpen((v) => !v)}
                aria-expanded={currencyOpen}
                className="flex items-center gap-3 py-1"
                style={{
                  fontFamily: 'var(--font-ui-stack)',
                  // 15, not the 17 every nav row uses — Tina, 2026-08-25: "in the
                  // hamburger the currency you selected it size should be the
                  // same as all the other owrds in the hamburger". It ALREADY
                  // was 17, measured: trigger 17px/Jost/400, "Clothing" 17px/
                  // Jost/400, identical. The mismatch is optical, not numeric:
                  // a currency label is ALL CAPS ("$ USD", "CA$ CAD") while
                  // every nav row is sentence case, and at one font-size a
                  // capital-only word reads a size larger because every glyph
                  // sits at cap height instead of x-height. 15 is what makes it
                  // sit level with the words around it, and it matches the
                  // option rows below so the whole block is one size.
                  fontSize: 15,
                  lineHeight: 1.35,
                  letterSpacing: '0.01em',
                  color: 'var(--ink)',
                }}
              >
                <CurrencyFlag currency={preference ?? 'USD'} />
                {CURRENCY_LABEL[preference ?? 'USD']}
                <CaretDown
                  size={15}
                  style={{
                    flexShrink: 0,
                    color: 'var(--muted)',
                    transition: 'transform 150ms ease-out',
                    transform: currencyOpen ? 'rotate(180deg)' : undefined,
                  }}
                />
              </button>
              {currencyOpen && (
                <div className="pt-1">
                  {/* The CURRENT choice is filtered out — Tina, 2026-08-25:
                      "you dont have to show the curenccy you have already
                      selected in the lst". The trigger directly above already
                      names it, so listing it again is one dead row that reads
                      like a choice. Nothing else needs an active/selected
                      state here as a result: every row in the list is, by
                      construction, a currency you are not currently in. */}
                  {DISPLAY_CURRENCIES.filter((o) => o !== (preference ?? 'USD')).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setPreference(o)}
                      className="flex items-center gap-3 py-3 w-full text-left"
                      style={{
                        fontFamily: 'var(--font-ui-stack)',
                        fontSize: 15,
                        lineHeight: 1.35,
                        letterSpacing: '0.01em',
                        color: 'var(--ink)',
                      }}
                    >
                      <CurrencyFlag currency={o} />
                      {CURRENCY_LABEL[o]}
                    </button>
                  ))}
                  <p
                    className="pt-1"
                    style={{
                      fontFamily: 'var(--font-ui-stack)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'var(--muted)',
                    }}
                  >
                    Converted prices are approximate. You pay the brand&rsquo;s own currency
                    at checkout.
                  </p>
                </div>
              )}
            </div>

            {/* "Clothing", not "Products" — matches the desktop header's
                trigger label (Nav.tsx, 2026-08-21). The Category list below
                now EXCLUDES Hijabs & Scarves, Layering Basics, Modest
                Swimwear and Modest Activewear — each of those is its own
                top-level eyebrow section further down, mirroring the
                desktop header's Clothing/Hijabs/Basics/Active split exactly
                (Tina, 2026-08-24: "i want you to catagorize the hamburger
                menu like our new and imporved header"). This reverses the
                2026-08-21 note that used to sit here, which deliberately
                kept Hijabs inline because that day's ask was scoped to the
                desktop header only — today's ask is explicitly about this
                panel too. */}
            <div className="pt-3">{row('/new-in', 'Clothing')}</div>

            {/* "Category" is the label already used on the /new-in filter
                bar — reused rather than invented, so the menu and the filters
                name the same things the same way.
                It is the ONLY thing carrying the grouping now that the rows are
                all flush left, which is why it stays: a run of identical rows
                with no grouping is the wall this menu started as.
                (An "Aesthetic" group sat below this one until 2026-08-09, when
                the /style/[vibe] pages were removed — see
                docs/log/2026-08-09-remove-style-vibe-feature.md.) */}
            <p className="eyebrow pt-5 pb-1">Category</p>
            {CATEGORY_LANES.filter((l) =>
              l.slug !== 'modest-hijabs' && l.slug !== 'layering-basics' &&
              l.slug !== 'modest-swimwear' && l.slug !== 'modest-activewear',
            ).map((l) =>
              l.slug === 'blazers-vests'
                ? blazersVestsRow()
                : l.slug === 'cardigans-sweaters'
                  ? cardigansSweatersRow()
                  : row(`/${l.slug}`, l.title),
            )}

            {/* Hijabs, Basics and Active — each its own eyebrow section, no
                disclosure toggle needed any more: the group already has its
                own heading, so "tap to reveal" was solving a problem
                (telling this apart from the flat Category list) that no
                longer exists once it has a heading of its own. Active has no
                subtypes on the desktop header either, so it's just the two
                lane links, same as the desktop panel. */}
            <p className="eyebrow pt-5 pb-1">Hijabs</p>
            {row('/modest-hijabs', 'All Hijabs & Scarves')}
            {HIJAB_SUBTYPE_ORDER.map((t) => row(`/modest-hijabs?type=${t}`, HIJAB_SUBTYPE_LABELS[t]))}

            <p className="eyebrow pt-5 pb-1">Basics</p>
            {row('/layering-basics', 'All Layering Basics')}
            {LAYERING_SUBTYPE_ORDER.map((t) => row(`/layering-basics?type=${t}`, LAYERING_SUBTYPE_LABELS[t]))}

            <p className="eyebrow pt-5 pb-1">Active</p>
            {row('/modest-swimwear', 'Modest Swimwear')}
            {row('/modest-activewear', 'Modest Activewear')}

            <div className="mt-5 pt-2" style={{ borderTop: '1px solid var(--hairline)' }}>
              {row('/designers', 'Designers')}
              {row('/editorial', 'Editorial')}
              {row('/about', 'About')}
              {row('/favourites', 'Favourites')}
            </div>
          </nav>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
