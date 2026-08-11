'use client';

import { Menu } from '@base-ui-components/react/menu';
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
 * overflow. RadioGroup is the honest semantic here: one choice out of three, and
 * it gives each row a real `aria-checked`.
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
        className="nav-link inline-flex items-center justify-center leading-none"
        data-active={true}
        /* letterSpacing 0: .nav-link sets 0.18em, which adds trailing space AFTER
           the last glyph and pushes an icon left of true centre.
           gap is the space between the flag and its currency code. */
        style={{ fontSize: 13, letterSpacing: 0, gap: 8 }}
      >
        {/* CurrencyFlag (already used by the footer's equivalent control)
            shows the flag of the actually-selected currency — was a fixed
            CurrencyDollar glyph regardless of selection, misleading once
            GBP/EUR was picked. Same icon, same label source (LABEL) as the
            footer, so the two controls read as one preference.
            `preference ?? 'USD'`: CurrencyPreference's type still permits
            `null` (lib/fx.ts keeps it as a defensive fallback), but no
            switcher offers it any more, so this never actually reads as the
            fallback at runtime — it exists to satisfy the type. */}
        <CurrencyFlag currency={preference} />
        {LABEL[preference ?? 'USD']}
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
            className="rounded-xl border p-2 min-w-[210px] max-w-[260px] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.RadioGroup
              value={preference ?? 'USD'}
              onValueChange={(v) => setPreference(v as CurrencyPreference)}
            >
              {options.map((o) => (
                <Menu.RadioItem
                  key={o}
                  value={o}
                  // Base UI leaves radio items open on click (`closeOnClick`
                  // defaults to false, so a radio group can be adjusted several
                  // times). A currency is picked once, so the menu lingering
                  // after the choice just reads as stuck.
                  closeOnClick
                  // .menu-row, NOT `w-full … nav-link`. The old line was right
                  // about WHY (the row is a flex container, so text-align has
                  // nothing to act on) and wrong about the fix: a Tailwind
                  // `justify-start` cannot beat .nav-link, because Tailwind v4
                  // emits utilities inside @layer utilities and an unlayered
                  // rule wins over any layered one. Measured on the shipped
                  // build: these rows were still centred. .menu-row owns the
                  // property outright. See globals.css.
                  className="menu-row"
                  data-active={preference === o}
                  style={{ gap: 10 }}
                >
                  <CurrencyFlag currency={o} />
                  {LABEL[o]}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
            <p
              className="px-3 pt-2 pb-1"
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
