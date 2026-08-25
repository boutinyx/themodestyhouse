import rates from '@/data/fx-rates.json';
import { formatPrice } from '@/lib/price';

/**
 * APPROXIMATE currency conversion for display only.
 *
 * ADR-0002 says prices are shown in each brand's native currency and are never
 * converted, because a converted number does not match what the shopper pays at
 * checkout on the brand's own site. That still holds for the DEFAULT.
 *
 * This is the opt-in exception: the visitor explicitly asks to see everything in
 * one currency so they can compare. It is therefore always rendered with a "≈"
 * and never presented as the real price — see CurrencySwitcher and ADR-0002.
 *
 * Rates are baked in at build time by scripts/fetch-rates.mjs. They are stale by
 * construction, which is fine for a comparison aid and is disclosed in the UI.
 */

export const FX_BASE = rates.base;
export const FX_UPDATED = rates.fetchedAt;
export const FX_RATES: Record<string, number> = rates.rates;

/** Currencies a visitor may switch the display to. Set by Tina 2026-08-12 from
 *  the site's actual visitor-country breakdown (Pulse), minus a single China
 *  hit judged to be a bot: Netherlands/France/Belgium/Slovenia -> EUR, United
 *  States -> USD, United Kingdom -> GBP, Canada -> CAD, Denmark -> DKK,
 *  Australia -> AUD, Saudi Arabia -> SAR, Bahamas -> BSD, Türkiye -> TRY.
 *  This is a curated list of what our audience actually uses, not every
 *  currency we hold a rate for (see FX_RATES, which also covers every brand's
 *  own native currency for a different reason).
 *
 *  EXTENDED 2026-08-25 from four days of Pulse (20/21/22/24 Aug, 43 visitors),
 *  same rule as before — every country that appeared gets its currency, one-hit
 *  countries included: Egypt -> EGP (2), Algeria -> DZD (2), Morocco -> MAD,
 *  Tunisia -> TND, Switzerland -> CHF, Kuwait -> KWD, South Africa -> ZAR.
 *  North Africa was the reason to look: Egypt/Algeria/Morocco/Tunisia together
 *  were 5 of those 43 and none of them could see a price in their own money.
 *  Two countries in that window deliberately got NOTHING new, because their
 *  currency is pegged 1:1 to one already offered and the offered one is what
 *  circulates there: Gibraltar (GIP -> GBP) and Panama (PAB -> USD, where the
 *  US dollar is legal tender alongside the balboa). */
export const DISPLAY_CURRENCIES = [
  'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'DKK', 'TRY', 'SAR', 'BSD',
  'EGP', 'DZD', 'MAD', 'TND', 'CHF', 'KWD', 'ZAR',
] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/** `null` means "show each brand's own currency" — the only mode in which a
 *  displayed price is exact. No switcher offers it as of 2026-08-12 (USD is
 *  the default instead, at Tina's request — see ADR-0002's Supersession
 *  section), but it is kept as a defensive fallback throughout this module. */
export type CurrencyPreference = DisplayCurrency | null;

/** Labels for the currency choices. Lives here, not in a component, because
 *  there are now THREE controls offering the same choice — the desktop header
 *  (components/CurrencySwitcher), the footer (components/FooterCurrency) and
 *  the phone menu (components/MobileNav) — and they must not be able to drift
 *  apart. Symbols are the commonly recognised informal ones, not necessarily
 *  what `Intl.NumberFormat('en-US', ...)` renders in an actual price (verified
 *  separately: DKK/TRY/SAR/BSD render as their bare ISO code in en-US ICU, not
 *  a symbol — a label reading "DKK DKK" would be redundant, so this table uses
 *  krona/lira/riyal/dollar shorthand instead; it never touches price text). */
export const CURRENCY_LABEL: Record<string, string> = {
  USD: '$ USD',
  GBP: '£ GBP',
  EUR: '€ EUR',
  CAD: 'CA$ CAD',
  AUD: 'A$ AUD',
  DKK: 'kr DKK',
  TRY: '₺ TRY',
  SAR: 'SR SAR',
  BSD: 'B$ BSD',
  // Added 2026-08-25. Same rule as the block above and verified the same way:
  // en-US ICU renders EVERY one of these seven as its bare ISO code
  // (`EGP 44.95`, `CHF 44.95`, `KWD 44.950`, …), so a label built from ICU's
  // own symbol would read "EGP EGP". These are the commonly written Latin
  // shorthands instead — Egyptian pound, Algerian dinar (دج / DA), Moroccan
  // dirham, Tunisian dinar, Swiss franc, Kuwaiti dinar, South African rand.
  EGP: 'E£ EGP',
  DZD: 'DA DZD',
  MAD: 'DH MAD',
  TND: 'DT TND',
  // CHF alone, not "Fr CHF" like its neighbours. Both desktop menus uppercase
  // their rows (.mega-row / .menu-row), which turned the Swiss franc's "Fr"
  // into "FR CHF" — and FR is France's country code, on a list of country
  // flags. CHF is how the Swiss franc is universally written anyway.
  CHF: 'CHF',
  KWD: 'KD KWD',
  ZAR: 'R ZAR',
};
/** What `preference === null` is called in the UI. */
export const NATIVE_LABEL = 'As listed';

export function hasRate(currency: string): boolean {
  return typeof FX_RATES[currency] === 'number' && FX_RATES[currency] > 0;
}

/**
 * Convert an amount between two currencies via the base.
 * Returns null when either side lacks a rate, so callers fall back to the exact
 * native price rather than inventing a number.
 */
export function convert(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (!Number.isFinite(amount)) return null;
  const f = FX_RATES[from];
  const t = FX_RATES[to];
  if (!f || !t) return null;
  return (amount / f) * t;
}

/**
 * The string to display for a price.
 *
 * With no preference, or when conversion is impossible, this is the exact native
 * price. When converting it is prefixed with "≈" and rounded to whole units —
 * decimals on an approximation imply a precision that is not there.
 */
export function displayPrice(
  amount: number,
  nativeCurrency: string,
  preference: CurrencyPreference,
): { text: string; approximate: boolean } {
  if (!preference || preference === nativeCurrency) {
    return { text: formatPrice(amount, nativeCurrency), approximate: false };
  }
  const converted = convert(amount, nativeCurrency, preference);
  if (converted === null) {
    return { text: formatPrice(amount, nativeCurrency), approximate: false };
  }
  return { text: `≈ ${formatPrice(Math.round(converted), preference)}`, approximate: true };
}
