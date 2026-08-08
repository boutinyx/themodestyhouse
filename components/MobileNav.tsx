'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { List as ListIcon, X as XIcon, CaretRight } from '@phosphor-icons/react';
import { Dialog } from '@base-ui-components/react/dialog';
import { CATEGORY_LANES } from '@/lib/lanes';
import { DISPLAY_CURRENCIES, CURRENCY_LABEL, NATIVE_LABEL } from '@/lib/fx';
import { useCurrency } from './CurrencyProvider';

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
  // Choosing a currency does NOT close the panel — it changes prices on the page
  // behind it, and the visitor may well want to try another one.
  const { preference, setPreference } = useCurrency();

  // Closing on navigation is done in each link's onClick, NOT in an effect on
  // `path`. Client-side navigation does not unmount this component, so something
  // has to close the panel — but doing it as `useEffect(() => setOpen(false),
  // [path])` is a cascading render, and react-hooks/set-state-in-effect fails
  // the lint on it. The click is the event that should close it anyway.
  const close = () => setOpen(false);

  // The trigger lives in an `lg:hidden` wrapper, but the panel is portalled to
  // the body — so growing past the desktop breakpoint while it is open would
  // leave a full-screen phone menu over the desktop layout.
  // 1024 must match the `lg:hidden` on the trigger in components/Header.tsx. It
  // was 768 while the trigger was `md:hidden`; the two are one decision written
  // in two places, and they have to move together.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label="Open navigation"
        className="nav-link inline-flex items-center justify-center leading-none"
        style={{ fontSize: 13, letterSpacing: 0 }}
      >
        <ListIcon size={20} style={{ display: 'block' }} />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Popup
          className="fixed inset-0 z-[70] flex flex-col transition-[opacity,transform] duration-200 ease-out data-[starting-style]:opacity-0 data-[starting-style]:translate-y-1 data-[ending-style]:opacity-0"
          style={{
            // Parchment, not white: the header pill it opens from is #fff, and a
            // white panel emerging from behind a white pill read as one blob.
            background: 'var(--parchment)',
            // dvh, not vh — vh on iOS Safari is the URL-bar-collapsed height, so
            // the last row sits under the browser chrome.
            height: '100dvh',
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

          {/* overscrollBehavior: contain — without it, flicking past the end of
              this list chains the scroll to the document behind the panel. */}
          <nav
            className="flex-1 overflow-y-auto px-5 pb-10"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          >
            <div className="pt-3">{row('/directory', 'Products')}</div>

            {/* "Category" is the label already used on the /directory filter
                bar — reused rather than invented, so the menu and the filters
                name the same things the same way.
                It is the ONLY thing carrying the grouping now that the rows are
                all flush left, which is why it stays: a run of identical rows
                with no grouping is the wall this menu started as.
                (An "Aesthetic" group sat below this one until 2026-08-09, when
                the /style/[vibe] pages were removed — see
                docs/log/2026-08-09-remove-style-vibe-feature.md.) */}
            <p className="eyebrow pt-5 pb-1">Category</p>
            {CATEGORY_LANES.map((l) => row(`/${l.slug}`, l.title))}

            <div className="mt-5 pt-2" style={{ borderTop: '1px solid var(--hairline)' }}>
              {row('/designers', 'Designers')}
              {row('/editorial', 'Editorial')}
              {row('/about', 'About')}
              {row('/favourites', 'Favourites')}
            </div>

            {/* CURRENCY — at the foot of the panel, where Victoria's Secret puts
                its region picker. It used to be a dropdown in the header bar;
                moving it here is what freed the space in the pill.

                Rendered as plain rows rather than by reusing <CurrencySwitcher>:
                that control is a Base UI Menu, and a popup opened from inside a
                Dialog is both fiddly and a second tap. Here the whole choice is
                already visible, so picking a currency is one tap.

                "Currency" is the plainest possible label for the group; the
                option labels and the approximate-prices note are the existing
                strings, reused verbatim from the header control (§10.18). */}
            <p className="eyebrow pt-6 pb-2">Currency</p>
            <div className="flex flex-wrap gap-2">
              {[null, ...DISPLAY_CURRENCIES].map((o) => (
                <button
                  key={o ?? 'native'}
                  type="button"
                  onClick={() => setPreference(o)}
                  className="chip"
                  data-active={preference === o}
                  aria-pressed={preference === o}
                  style={{ minHeight: 40, paddingLeft: 16, paddingRight: 16 }}
                >
                  {o ? CURRENCY_LABEL[o] : NATIVE_LABEL}
                </button>
              ))}
            </div>
            <p
              className="mt-3"
              style={{
                fontFamily: 'var(--font-ui-stack)',
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--muted)',
              }}
            >
              Converted prices are approximate. You pay the brand&rsquo;s own currency at
              checkout.
            </p>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
