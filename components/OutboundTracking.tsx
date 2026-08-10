'use client';

import { useEffect } from 'react';
import { OUTBOUND_EVENT, outboundProps, track } from '@/lib/pulse';

/**
 * Records a Pulse `outbound_click` whenever a visitor leaves for a brand.
 *
 * ONE delegated listener on the document, rather than an onClick per link.
 * Outbound anchors are rendered by six components and three of them are SERVER
 * components — an onClick would force `BrandCard`, `BrandMarquee` and
 * `VerifiedSpotlight` to `'use client'`, pushing their data back into the RSC
 * payload that `lib/compactCatalogue.ts` just took 2.9x out of (§8). Delegation
 * costs one listener for the whole site and picks up every outbound link that
 * already exists plus any added later.
 *
 * The selector is `rel~="sponsored"`, which is exactly the site's definition of
 * an outbound affiliate link (§6 makes that token mandatory on them). It is
 * therefore self-maintaining: a new outbound link is tracked because it is
 * correctly marked up, not because someone remembered this file.
 *
 * `capture: true` so the event is seen even if something downstream stops
 * propagation. It never calls preventDefault and never blocks navigation.
 */
export function OutboundTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest('a[rel~="sponsored"]') : null;
      if (!el) return;
      track(OUTBOUND_EVENT, outboundProps(el));
    };
    // Pointer-device clicks and keyboard activation both surface as 'click'.
    document.addEventListener('click', onClick, { capture: true });
    // Declares that the listener is LIVE, so `npm run audit:outbound` can wait
    // for hydration rather than for markup. The anchors are server-rendered and
    // therefore present well before this effect runs — an audit that waited for
    // them clicked too early and silently lost the first click on every page
    // (§10.28 rule 2: an interaction result is void unless the page is
    // interactive). Costs one attribute; nothing else reads it.
    document.documentElement.setAttribute('data-outbound-ready', '');
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.documentElement.removeAttribute('data-outbound-ready');
    };
  }, []);

  return null;
}
