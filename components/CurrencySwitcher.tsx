'use client';

import { Menu } from '@base-ui-components/react/menu';
import { CaretDown } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { CurrencyFlag } from './CurrencyFlag';
import { DISPLAY_CURRENCIES, CURRENCY_LABEL as LABEL, type CurrencyPreference } from '@/lib/fx';

/**
 * Lets a visitor see every price in one currency so they can compare across
 * brands. USD is the default as of 2026-08-12 (Tina's call — supersedes
 * ADR-0002's native-by-default decision; see
 * docs/decisions/ADR-0002-currency-display.md). Converted prices are still
 * approximate and labelled as such (the "≈" and the footnote below), and a
 * visitor can switch to GBP/EUR — or, if they want exact native prices, that
 * option still exists internally (`lib/fx.ts`'s `CurrencyPreference` keeps
 * `null`) but is no longer offered by any switcher.
 *
 * Lives in the header beside favourites. It used to sit inside the index console
 * on /directory and each lane, which meant it was absent from every other page
 * and duplicated on the two that had it. Currency is a site-wide preference, so
 * it belongs in site-wide furniture.
 *
 * Built on the same Base UI primitives as the header nav (components/NavMenu),
 * rather than a third hand-rolled dropdown. That hands over open/close, outside
 * click, Escape, focus management, keyboard navigation and collision-aware
 * positioning — and it PORTALS, so the panel cannot be clipped by an ancestor's
 * overflow. The rows were a `Menu.RadioGroup` until 2026-08-25 — an honest
 * semantic while the list held every currency including the current one. It no
 * longer does (Tina: "i dont want to see the currency ive selected in the
 * currency list"), so they are plain `Menu.Item` actions now; see the comment
 * on the list itself.
 */
export function CurrencySwitcher() {
  const { preference, setPreference } = useCurrency();
  const options = DISPLAY_CURRENCIES;

  return (
    <Menu.Root>
      <Menu.Trigger
        // Opens on hover, like the Products menu next to it. Base UI's `Menu`
        // is click-only by default while `NavigationMenu` opens on hover, and
        // that difference is felt immediately: pointing at the dollar did
        // nothing while its neighbour opened. closeDelay gives you time to
        // travel from the trigger down into the panel without it shutting on
        // the way. (The "Styles" menu this used to sit beside was removed on
        // 2026-08-09 with the /style/[vibe] pages.)
        openOnHover
        // delay 0: the default 100ms before opening is small on paper but reads
        // as lag, because the pointer is already still by the time it fires.
        // closeDelay stays non-zero — that one is not lag, it is the grace
        // period for travelling from the trigger down into the panel.
        delay={0}
        closeDelay={120}
        /* MOUSE: swallow the press, so hover alone drives this menu.
         *
         * Tina's report was "when i click the currency button it stays". Base UI
         * distinguishes a HOVER-opened menu from a CLICK-opened one: the first
         * closes when the pointer leaves, the second is pinned open until an
         * outside click or Escape. So pointing at the dollar and then clicking
         * it — the natural thing to do — silently promoted the menu to
         * click-opened, and from then on moving the pointer away did nothing.
         *
         * Preventing the press on a mouse means it is never promoted: hover
         * opens, moving away closes, and the click is inert.
         *
         * The `pointerType` test is what keeps this honest on touch. A tap
         * reports 'touch' (a stylus 'pen') and is let through, so tap-to-open
         * still works. This control renders inside `hidden lg:flex`
         * (Header.tsx), so a phone never sees it — MobileNav carries its own
         * currency rows — but an iPad in landscape is >=1024px, gets this
         * header, and has no hover at all. Gating on pointerType rather than
         * deleting the click is what stops this repeating §10.25, where the
         * filter dropdowns were unreachable on every Apple device for as long
         * as they existed.
         *
         * A first attempt instead dropped the CLOSE whose reason was
         * `trigger-press`, via a controlled Menu.Root. It made the click
         * harmless but left the menu click-PROMOTED, so hovering away still
         * would not close it — i.e. it preserved the exact complaint. The probe
         * caught that; do not go back to it.
         */
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        aria-label={`Prices in ${preference ?? 'USD'}. Change currency`}
        className="nav-link group inline-flex items-center justify-center leading-none"
        data-active={true}
        /* letterSpacing 0: .nav-link sets 0.18em, which adds trailing space
           AFTER the last glyph and pushes the text off centre. fontSize 14,
           not the historic 13: matches the header's other nav text, bumped
           to 14 site-wide via `.site-header .nav-link` 2026-08-20 (Tina:
           "as big letters as they have," aabcollection.com) — this trigger
           carries its own inline override so it needs the same number
           explicitly, an inline style always beats an external class. */
        style={{ fontSize: 14, letterSpacing: 0 }}
      >
        {/* No flag on the trigger itself — Tina's call 2026-08-20: the flag
            stays on each row INSIDE the dropdown below (still `CurrencyFlag`,
            unchanged there) so a visitor can still see it to pick a currency,
            it's just not sitting in the header at rest. `preference ?? 'USD'`:
            CurrencyPreference's type still permits `null` (lib/fx.ts keeps it
            as a defensive fallback), but no switcher offers it any more, so
            this never actually reads as the fallback at runtime — it exists
            to satisfy the type. */}
        {LABEL[preference ?? 'USD']}
        {/* Chevron, matching the "USD ⌄" reference Tina sent 2026-08-20 —
            same Chevron pattern as the Products trigger (NavMenu.tsx),
            rotating open via Base UI's own `data-popup-open` attribute
            rather than tracked state. */}
        <CaretDown size={9} weight="bold" aria-hidden="true" className="ms-1 transition-transform duration-200 group-data-[popup-open]:rotate-180" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={10} align="end" collisionPadding={{ left: 16, right: 16 }} className="z-50">
          <Menu.Popup
            // 100ms and a shallower scale: the open animation is the other half
            // of the perceived lag, and 150ms with a 5% scale reads as the panel
            // arriving late rather than as motion.
            // max-w caps the panel at a readable measure. Without it the note at
            // the foot is one unbroken line, and since the panel shrink-to-fits
            // its content that made the whole menu 421px wide to hold four
            // one-word options. 260 wraps the note to three short lines and puts
            // the panel back in proportion with the header it drops out of.
            //
            // PARCHMENT AND SQUARE as of 2026-08-24 (Tina: "on desktop a look
            // and feel like the menu"). It was a white, rounded-xl, heavily
            // shadowed card — a popover from a different family than the
            // header's own Clothing/Hijabs panels beside it, which are
            // parchment, square-cornered and read as the header itself
            // extending downward (components/NavMenu.tsx). Same ground, same
            // corners and the same `.mega-row` rows below is what makes this
            // read as one menu system rather than two.
            className="border px-4 py-3 min-w-[210px] max-w-[260px] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{ background: 'var(--parchment)', borderColor: 'var(--hairline)', boxShadow: '0 10px 24px -14px rgba(43,38,34,0.28)' }}
          >
            {/* Menu.Item, NOT Menu.RadioGroup/RadioItem — changed 2026-08-25.
                Tina: "i dont want to see the currency ive selected in the
                currency list". Once the current choice is filtered out of the
                list, a radio group is the wrong primitive by definition: its
                whole job is to show WHICH of its items is selected, and no
                item here ever is. `aria-checked="false"` on all eight would be
                an honest but useless announcement, and a group with no checked
                member is a broken radio group. These are actions now —
                "switch to EUR" — which is what they always were behaviourally,
                since picking one closes the menu. The trigger above still names
                the current currency, so nothing is lost. Matches the phone
                menu, changed the same day. */}
            <div>
              {options.filter((o) => o !== (preference ?? 'USD')).map((o) => (
                <Menu.Item
                  key={o}
                  onClick={() => setPreference(o as CurrencyPreference)}
                  // .mega-row, NOT `w-full … nav-link`, and no longer
                  // .menu-row either. The old line was right about WHY a
                  // dedicated class is needed (the row is a flex container, so
                  // text-align has nothing to act on, and a Tailwind
                  // `justify-start` cannot beat .nav-link — Tailwind v4 emits
                  // utilities inside @layer utilities and an unlayered rule
                  // wins over any layered one). .mega-row is the header menu's
                  // own row class (14px Jost, uppercase, ink not muted, with
                  // the sliding underline on its nested label span), swapped in
                  // 2026-08-24 so this panel reads as the same menu as the
                  // Clothing/Hijabs panels two triggers along. See globals.css.
                  className="mega-row"
                  style={{ gap: 10 }}
                >
                  <CurrencyFlag currency={o} />
                  <span className="mega-row-label">{LABEL[o]}</span>
                </Menu.Item>
              ))}
            </div>
            <p
              // px-1, not px-3: .mega-row pads 4px horizontally where
              // .menu-row padded 12px, so the note now lines up with the
              // labels above it rather than sitting indented past them.
              className="px-1 pt-3 pb-1"
              style={{
                fontFamily: 'var(--font-ui-stack)',
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--muted)',
                borderTop: '1px solid var(--hairline)',
                marginTop: 4,
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              Converted prices are approximate. You pay the brand&rsquo;s own currency at
              checkout.
            </p>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
