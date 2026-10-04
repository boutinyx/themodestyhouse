'use client';
import { useSyncExternalStore } from 'react';
// deployEnv only, NOT lib/creators: importing that would ship the fictional
// creator records in the JavaScript of every page, production included.
import { isProductionHost } from '@/lib/deployEnv';

/**
 * Whether the staging-only /creators section exists on this host. False on the
 * server render and on the real domain; flips to true after mount elsewhere, so
 * the header link never renders (or flashes) on themodestyhouse.com and the
 * first client render matches the server one. See lib/creators.ts.
 */
const noop = () => () => {};

export function useCreatorsEnabled(): boolean {
  return useSyncExternalStore(
    noop,
    () => !isProductionHost(window.location.host),
    () => false, // server render: off, so production never renders the link
  );
}
