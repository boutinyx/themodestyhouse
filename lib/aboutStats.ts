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

export type AboutStats = {
  /** Brands in the catalogue. */
  houses: number;
  /** Published products — everything the site serves. */
  pieces: number;
  /** Brands carrying the verified seal. */
  sealed: number;
};

export function aboutStats(): AboutStats {
  return {
    houses: BRANDS.length,
    pieces: getProducts().length,
    sealed: BRANDS.filter((b) => b.badge === 'verified').length,
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
