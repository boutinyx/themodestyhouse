'use client';

import { useCurrency } from './CurrencyProvider';
import { DISPLAY_CURRENCIES, FX_UPDATED, type CurrencyPreference } from '@/lib/fx';

const LABEL: Record<string, string> = { USD: '$ USD', GBP: '£ GBP', EUR: '€ EUR' };

/**
 * Lets a visitor see every price in one currency so they can compare across
 * brands. Native ("As listed") is the default and the only exact option —
 * converted prices are approximate and labelled as such, per ADR-0002.
 */
export function CurrencySwitcher() {
  const { preference, setPreference } = useCurrency();
  const options: CurrencyPreference[] = [null, ...DISPLAY_CURRENCIES];

  return (
    <div className="relative group">
      <button type="button" className="chip" data-active={preference !== null}>
        {preference ? LABEL[preference] : 'As listed'} ▾
      </button>
      <div className="absolute right-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-40">
        <div
          className="rounded-xl border p-2 min-w-[210px]"
          style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
        >
          {options.map((o) => (
            <button
              key={o ?? 'native'}
              type="button"
              onClick={() => setPreference(o)}
              className="block w-full text-left nav-link py-2 px-3 whitespace-nowrap"
              data-active={preference === o}
            >
              {o ? LABEL[o] : 'As listed'}
            </button>
          ))}
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
        </div>
      </div>
    </div>
  );
}
