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

/** Currencies a visitor may switch the display to. Deliberately a short list of
 *  the ones our audience actually uses, not every currency we hold a rate for. */
export const DISPLAY_CURRENCIES = ['USD', 'GBP', 'EUR'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

/** `null` means "show each brand's own currency" — the default, and the only
 *  mode in which a displayed price is exact. */
export type CurrencyPreference = DisplayCurrency | null;

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
