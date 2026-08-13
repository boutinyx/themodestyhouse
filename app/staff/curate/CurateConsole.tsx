'use client';
import { useCallback, useState } from 'react';
import { RecentlyAdded } from './RecentlyAdded';
import { ReviewTray } from './ReviewTray';

/**
 * RecentlyAdded and ReviewTray each fetch their own data once on mount —
 * as SIBLING components under the server page they had no way to learn
 * about each other's changes. A cut made in RecentlyAdded saved correctly
 * (it calls the API directly) but ReviewTray, below it, kept showing
 * whatever it had fetched at page load, so it looked like the decision had
 * vanished. Tina hit this after cutting "so many" items and seeing none of
 * them in the tray. `refreshToken` bumps on every successful decision;
 * ReviewTray refetches whenever it changes, so the tray now stays live
 * instead of requiring a manual page reload.
 */
export function CurateConsole() {
  const [refreshToken, setRefreshToken] = useState(0);
  const onDecision = useCallback(() => setRefreshToken((t) => t + 1), []);

  return (
    <>
      <RecentlyAdded onDecision={onDecision} />
      <ReviewTray refreshToken={refreshToken} />
    </>
  );
}
