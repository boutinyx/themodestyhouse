'use client';

import { useEffect, useRef, useState } from 'react';
import { CurrencyDollar } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { DISPLAY_CURRENCIES, FX_UPDATED, type CurrencyPreference } from '@/lib/fx';

const LABEL: Record<string, string> = { USD: '$ USD', GBP: '£ GBP', EUR: '€ EUR' };

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
 * Opens on CLICK, not hover: this sits next to a link in a fixed header, and a
 * hover-triggered panel there opens whenever the pointer crosses it on its way
 * somewhere else. Click also makes it reachable on touch.
 */
export function CurrencySwitcher() {
  const { preference, setPreference } = useCurrency();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const options: CurrencyPreference[] = [null, ...DISPLAY_CURRENCIES];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={preference ? `Prices in ${preference}. Change currency` : 'Prices as listed. Change currency'}
        className="nav-link inline-flex items-center gap-1 leading-none"
        data-active={preference !== null}
        /* Matches the favourites link exactly: .nav-link's 0.18em tracking adds
           trailing space after the last glyph and shoves the icon off centre. */
        style={{ fontSize: 13, letterSpacing: 0 }}
      >
        <CurrencyDollar size={17} weight={preference ? 'fill' : 'regular'} style={{ transform: 'translateY(-1px)' }} />
        {preference ?? null}
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div
            className="rounded-xl border p-2 min-w-[210px]"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            {options.map((o) => (
              <button
                key={o ?? 'native'}
                type="button"
                onClick={() => {
                  setPreference(o);
                  setOpen(false);
                }}
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
      )}
    </div>
  );
}
