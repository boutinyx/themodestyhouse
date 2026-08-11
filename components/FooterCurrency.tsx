'use client';

import { Menu } from '@base-ui-components/react/menu';
import { CaretUp } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { CurrencyFlag } from './CurrencyFlag';
import { DISPLAY_CURRENCIES, CURRENCY_LABEL as LABEL, type CurrencyPreference } from '@/lib/fx';

/**
 * The currency control, repeated at the foot of every page.
 *
 * It is the same site-wide preference as the header's <CurrencySwitcher> — both
 * read and write the one <CurrencyProvider> context, so changing it in either
 * place updates the other immediately. The header control is the one you reach
 * for on arrival; this is the one you reach for after scrolling a grid, where
 * the header is off screen. Region/currency at the foot is also where most
 * retail sites put it.
 *
 * USD is the default as of 2026-08-12 (Tina's call — supersedes ADR-0002's
 * native-by-default decision; see docs/decisions/ADR-0002-currency-display.md).
 * "As listed"/native is no longer offered here or in any switcher — see
 * CurrencyProvider.tsx and CurrencySwitcher.tsx.
 *
 * DIFFERENCES FROM THE HEADER CONTROL, all deliberate:
 *   - Flags, at Tina's request. See components/CurrencyFlag for why they are
 *     inline SVG rather than emoji.
 *   - CLICK to open, not hover. The header control opens on hover because it
 *     sits in a nav bar you point at; a hover-opened popup at the foot of the
 *     page would fire at whatever the pointer happened to be resting on while
 *     you scrolled past. Click also means the §10.28 pointer-down dance (which
 *     exists purely to stop a click PINNING a hover-opened menu) is not needed
 *     here — there is nothing to pin.
 *   - `side="top"`. This sits in the last row of the page, so a menu dropping
 *     downwards would open into the viewport edge and be flipped by collision
 *     detection on most screens anyway. Opening upwards by default is steadier.
 *   - Its own dark-footer colours. `.nav-link`/`.menu-row` are written against
 *     the parchment ground and their `var(--muted)` is unreadable on
 *     `var(--ink)`; the popup itself is white, like every other popup here, so
 *     the ROWS do use `.menu-row`.
 */
export function FooterCurrency() {
  const { preference, setPreference } = useCurrency();
  const options = DISPLAY_CURRENCIES;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Prices in ${preference ?? 'USD'}. Change currency`}
        // `group` is what the caret's rotate-on-open hangs off.
        className="footer-currency-trigger group inline-flex items-center"
        style={{
          fontFamily: 'var(--font-label-stack)',
          fontSize: 11,
          letterSpacing: 'var(--track-label)',
          textTransform: 'uppercase',
          lineHeight: 1,
          // NOTE: `color` is deliberately NOT here — it is on
          // .footer-currency-trigger in globals.css, because an inline colour
          // would beat the :hover and [data-popup-open] rules.
          // WCAG 2.2 SC 2.5.8 — 11px type in a flex row gives an 11px-tall
          // target, the same defect the footer links above were corrected for.
          minHeight: 32,
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <CurrencyFlag currency={preference} />
        {LABEL[preference ?? 'USD']}
        <CaretUp
          size={9}
          weight="bold"
          aria-hidden="true"
          className="transition-transform duration-200 group-data-[popup-open]:rotate-180"
        />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="top"
          sideOffset={10}
          align="start"
          collisionPadding={{ left: 16, right: 16 }}
          className="z-50"
        >
          <Menu.Popup
            className="rounded-xl border p-2 min-w-[190px] max-w-[260px] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{
              background: '#fff',
              borderColor: 'var(--hairline)',
              boxShadow: '0 8px 30px rgba(43,38,34,0.14)',
            }}
          >
            <Menu.RadioGroup
              value={preference ?? 'USD'}
              onValueChange={(v) => setPreference(v as CurrencyPreference)}
            >
              {options.map((o) => (
                <Menu.RadioItem
                  key={o}
                  value={o}
                  // A currency is picked once; leaving the menu open after the
                  // choice (Base UI's default for a radio group) reads as stuck.
                  closeOnClick
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
