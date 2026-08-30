'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  DISPLAY_CURRENCIES,
  displayPrice,
  type CurrencyPreference,
  type DisplayCurrency,
} from '@/lib/fx';
import { trackGoal } from '@/lib/pulse';

const STORAGE_KEY = 'tmh_currency';

type Ctx = {
  /** USD by default, at Tina's request (2026-08-12) — supersedes ADR-0002's
   *  native-by-default decision, see docs/decisions/ADR-0002-currency-display.md.
   *  `null` (native/"As listed") is no longer offered by any switcher, but the
   *  type keeps it as a defensive fallback for lib/fx.ts's conversion helpers. */
  preference: CurrencyPreference;
  setPreference: (c: CurrencyPreference) => void;
  /** Formats a price for display, honouring the current preference. */
  price: (amount: number, nativeCurrency: string) => { text: string; approximate: boolean };
};

const CurrencyCtx = createContext<Ctx | null>(null);

export function useCurrency(): Ctx {
  const c = useContext(CurrencyCtx);
  if (!c) throw new Error('useCurrency must be used within CurrencyProvider');
  return c;
}

function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return typeof v === 'string' && (DISPLAY_CURRENCIES as readonly string[]).includes(v);
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // 'USD' on BOTH server and client — a hardcoded default, not user-specific
  // data, so server and client agree from the first render with no hydration
  // mismatch. A returning visitor's own explicit choice (if different) is
  // applied after mount, once localStorage is readable — same approach as
  // favourites in QuickView.tsx.
  const [preference, setPref] = useState<CurrencyPreference>('USD');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Deliberate: localStorage is unavailable during SSR, so a stored choice
      // can only be applied after mount. Reading it in useState would desync the
      // server and client render. Same pattern as favourites in QuickView.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isDisplayCurrency(saved)) setPref(saved);
    } catch {
      /* private mode / storage disabled — USD default is a fine fallback */
    }
  }, []);

  const setPreference = useCallback((c: CurrencyPreference) => {
    // The goal lives HERE, not in the three switchers (header, footer, mobile
    // nav), because this is the one function all of them call — and because the
    // effect above, which applies a returning visitor's saved choice, calls
    // `setPref` directly and so can never be mistaken for a fresh decision.
    // Re-picking the current currency is a no-op and is not a change.
    if (c && c !== preference) trackGoal('currency_change', { currency: c, from: preference ?? '' });
    setPref(c);
    try {
      if (c) localStorage.setItem(STORAGE_KEY, c);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [preference]);

  const price = useCallback(
    (amount: number, nativeCurrency: string) => displayPrice(amount, nativeCurrency, preference),
    [preference],
  );

  return (
    <CurrencyCtx.Provider value={{ preference, setPreference, price }}>
      {children}
    </CurrencyCtx.Provider>
  );
}
