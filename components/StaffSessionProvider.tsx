'use client';
import { createContext, useContext } from 'react';

const StaffCtx = createContext(false);

/** True only for a signed-in staff session. Server-determined once at page
 *  render (see app/layout.tsx) — no client request, no hydration mismatch,
 *  since the boolean IS the server's own render-time fact, not
 *  client-only state like a currency preference. */
export function useIsStaff(): boolean {
  return useContext(StaffCtx);
}

export function StaffSessionProvider({ isStaff, children }: { isStaff: boolean; children: React.ReactNode }) {
  return <StaffCtx.Provider value={isStaff}>{children}</StaffCtx.Provider>;
}
