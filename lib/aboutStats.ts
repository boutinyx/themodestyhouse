/**
 * The three figures the About page's receipts band prints.
 *
 * Computed, never hardcoded. CLAUDE.md carried "~34 brands / ~5k products" for
 * months while the real numbers drifted to 59 and 11,127 — and the nightly
 * refresh moved the product count again inside the afternoon this was written.
 * A number typed into a React file rots the same way.
 */
import { BRANDS } from '@/data/brands';
import { getProducts } from './products';

/**
 * `city` mixes granularity — 'USA', 'London', 'Arnhem' — so a country count
 * needs this hand-written map rather than `new Set(BRANDS.map(b => b.city))`.
 * A wrong entry here is a factual claim about a real company, so every key is
 * a real, unambiguous `city` value from data/brands.ts (verified 2026-10-01
 * against all 115 brands), and three brands whose `city` is literally
 * 'Europe' (diversity-modest, maison-hijab, ay-collection) are deliberately
 * left OUT of this map — there is no honest single country to credit them
 * to, so they're excluded from the count rather than guessed. Tina: "i want
 * countries" instead of the currencies figure on the partner/about receipts
 * band. **Add new brands' `city` here too** — an unmapped city silently
 * undercounts (never overstates), but drifts stale the same way the figures
 * in the file's own header comment once did.
 */
const CITY_TO_COUNTRY: Record<string, string> = {
  Amsterdam: 'Netherlands',
  Antwerp: 'Belgium',
  Arnhem: 'Netherlands',
  Australia: 'Australia',
  Belgium: 'Belgium',
  'Birmingham, United Kingdom': 'United Kingdom',
  Bochum: 'Germany',
  Canada: 'Canada',
  Clichy: 'France',
  'Dearborn, Michigan': 'United States',
  Denmark: 'Denmark',
  Doha: 'Qatar',
  Dubai: 'United Arab Emirates',
  France: 'France',
  Germany: 'Germany',
  'Holbæk': 'Denmark',
  India: 'India',
  Istanbul: 'Turkey',
  Jakarta: 'Indonesia',
  'Kuwait City': 'Kuwait',
  London: 'United Kingdom',
  'Los Angeles': 'United States',
  Malaysia: 'Malaysia',
  'Mississauga, Ontario': 'Canada',
  Netherlands: 'Netherlands',
  'New York': 'United States',
  Nijmegen: 'Netherlands',
  Norway: 'Norway',
  Paris: 'France',
  Riyadh: 'Saudi Arabia',
  Rotterdam: 'Netherlands',
  Singapore: 'Singapore',
  Sweden: 'Sweden',
  Sydney: 'Australia',
  Turkey: 'Turkey',
  UK: 'United Kingdom',
  USA: 'United States',
  'United Kingdom': 'United Kingdom',
  'United States': 'United States',
};

export type AboutStats = {
  /** Brands in the catalogue. */
  houses: number;
  /** Published products — everything the site serves. */
  pieces: number;
  /** Brands carrying the verified seal. */
  sealed: number;
  /**
   * Distinct currencies the houses trade in. Ties to ADR-0002: the price on
   * screen is what the shopper pays on the brand's own site. Still used by
   * the about page's own prose ("trading in N currencies"); the receipts
   * band itself now prints `countries` instead — see below.
   */
  currencies: number;
  /** Distinct countries, derived via `CITY_TO_COUNTRY` — see its comment. */
  countries: number;
};

export function aboutStats(): AboutStats {
  return {
    houses: BRANDS.length,
    pieces: getProducts().length,
    sealed: BRANDS.filter((b) => b.badge === 'verified').length,
    currencies: new Set(BRANDS.map((b) => b.currency)).size,
    countries: new Set(
      BRANDS.map((b) => CITY_TO_COUNTRY[b.city ?? '']).filter((c): c is string => Boolean(c)),
    ).size,
  };
}

/**
 * '11,000+' — rounded DOWN, so the page can never overstate the catalogue, and
 * so the printed figure survives a nightly refresh that moves the exact count
 * by a handful. Counts under a thousand print exactly; '0+' would be absurd.
 */
export function roundedPieces(n: number): string {
  if (n < 1000) return String(n);
  return `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}+`;
}
