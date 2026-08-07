'use client';

import { Menu } from '@base-ui-components/react/menu';
import { CurrencyDollar } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { DISPLAY_CURRENCIES, FX_UPDATED, type CurrencyPreference } from '@/lib/fx';

const LABEL: Record<string, string> = { USD: '$ USD', GBP: '£ GBP', EUR: '€ EUR' };
const NATIVE = 'native';

/**
 * Lets a visitor see every price in one currency so they can compare across
 * brands. Native ("As listed") is the default and the only exact option —
 * converted prices are approximate and labelled as such, per ADR-0002.
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
 * overflow. RadioGroup is the honest semantic here: one choice out of four, and
 * it gives each row a real `aria-checked`.
 */
export function CurrencySwitcher() {
  const { preference, setPreference } = useCurrency();
  const options: CurrencyPreference[] = [null, ...DISPLAY_CURRENCIES];

  return (
    <Menu.Root>
      <Menu.Trigger
        // Opens on hover AS WELL AS click, so it behaves like the Directory and
        // Styles menus next to it. Base UI's `Menu` is click-only by default
        // while `NavigationMenu` opens on hover, and that difference is felt
        // immediately: pointing at the dollar did nothing while its neighbours
        // opened. closeDelay gives you time to travel from the trigger down into
        // the panel without it shutting on the way.
        openOnHover
        // delay 0: the default 100ms before opening is small on paper but reads
        // as lag, because the pointer is already still by the time it fires.
        // closeDelay stays non-zero — that one is not lag, it is the grace
        // period for travelling from the trigger down into the panel.
        delay={0}
        closeDelay={120}
        aria-label={preference ? `Prices in ${preference}. Change currency` : 'Prices as listed. Change currency'}
        className="nav-link inline-flex items-center justify-center leading-none"
        data-active={preference !== null}
        /* letterSpacing 0: .nav-link sets 0.18em, which adds trailing space AFTER
           the last glyph and pushes an icon left of true centre.
           gap 12px is the space between the DISC and its currency code — the one
           that was actually meant by "more spacing". The surrounding cluster gap
           (Header.tsx) stays at its original gap-6; widening that moved the
           divider, which was not the ask. */
        style={{ fontSize: 13, letterSpacing: 0, gap: preference ? 12 : 0 }}
      >
        {/* 1px UP, MEASURED rather than judged by eye. On a screenshot of the
            live header the nav labels (EDITORIAL, ABOUT…) and the divider all
            centre on y=69.0. With no nudge the disc centres on 70.0 and with
            +1px on 71.0 — both sit low, because the +1px was carried over from
            the STROKED glyph, whose strokes stop short of the box. The fill
            weight is a symmetric disc whose geometric centre already is its
            visual centre, so any downward nudge only drops it. -1px lands it on
            69.0: the same height as the words beside it, which is the ask. */}
        {/* weight="fill" is a DELIBERATE choice, confirmed by Tina 2026-08-07.
            Note it does not merely thicken the strokes: Phosphor's fill variant
            for this glyph is a solid disc with the dollar knocked out of it
            (the `A104,104` arc in its path), so an active currency reads as a
            coin badge — heavier than the outlined heart beside it. That contrast
            is wanted. Do not "correct" it to bold or regular. */}
        <CurrencyDollar
          size={18}
          weight={preference ? 'fill' : 'regular'}
          style={{ transform: 'translateY(-1px)', display: 'block' }}
        />
        {preference ?? null}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={10} align="end" collisionPadding={{ left: 16, right: 16 }} className="z-50">
          <Menu.Popup
            // 100ms and a shallower scale: the open animation is the other half
            // of the perceived lag, and 150ms with a 5% scale reads as the panel
            // arriving late rather than as motion.
            className="rounded-xl border p-2 min-w-[210px] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            <Menu.RadioGroup
              value={preference ?? NATIVE}
              onValueChange={(v) => setPreference(v === NATIVE ? null : (v as CurrencyPreference))}
            >
              {options.map((o) => (
                <Menu.RadioItem
                  key={o ?? NATIVE}
                  value={o ?? NATIVE}
                  // Base UI leaves radio items open on click (`closeOnClick`
                  // defaults to false, so a radio group can be adjusted several
                  // times). A currency is picked once, so the menu lingering
                  // after the choice just reads as stuck.
                  closeOnClick
                  // justify-center, not just text-center: .nav-link sets
                  // `display: inline-flex`, so the row is a flex container and
                  // text-align has nothing to act on — which is why these stayed
                  // left-aligned when text-center was added.
                  className="w-full justify-center text-center nav-link py-2 px-3 whitespace-nowrap cursor-pointer"
                  data-active={preference === o}
                >
                  {o ? LABEL[o] : 'As listed'}
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
              checkout. Rates from {new Date(FX_UPDATED).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}.
            </p>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
