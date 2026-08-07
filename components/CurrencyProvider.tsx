'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  DISPLAY_CURRENCIES,
  displayPrice,
  type CurrencyPreference,
  type DisplayCurrency,
} from '@/lib/fx';

const STORAGE_KEY = 'tmh_currency';

type Ctx = {
  /** null = show each brand's own currency. The default, and the only exact mode. */
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
  // Starts as null on BOTH server and client. Reading localStorage during the
  // initial render would make the two disagree and trip a hydration mismatch,
  // so the stored choice is applied after mount — same approach as favourites
  // in QuickView.tsx.
  const [preference, setPref] = useState<CurrencyPreference>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Deliberate: localStorage is unavailable during SSR, so the stored choice
      // can only be applied after mount. Reading it in useState would desync the
      // server and client render. Same pattern as favourites in QuickView.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isDisplayCurrency(saved)) setPref(saved);
    } catch {
      /* private mode / storage disabled — native currency is a fine fallback */
    }
  }, []);

  const setPreference = useCallback((c: CurrencyPreference) => {
    setPref(c);
    try {
      if (c) localStorage.setItem(STORAGE_KEY, c);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

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
