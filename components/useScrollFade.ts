'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { scrollFade, type ScrollFade } from '@/lib/scrollFade';

/**
 * Measures a scroller and reports which edges should carry a fade.
 *
 * In `components/`, not `lib/` — `lib/` is where the `fs`-backed modules live,
 * and Invariant 10 makes "can a client file import this?" a live question for
 * anything sitting there. Position answers it. The pure arithmetic does live in
 * `lib/scrollFade.ts`, because that half is testable in node.
 */
export function useScrollFade<T extends HTMLElement>(axis: 'x' | 'y' = 'y') {
  const el = useRef<T | null>(null);
  // 'none' initially, deliberately: the server has no layout and cannot
  // measure, so first paint shows nothing and the fade appears after
  // hydration. That direction is the safe one — a fade arriving a frame late
  // reads as the UI settling; a fade vanishing reads as a bug.
  const [fade, setFade] = useState<ScrollFade>('none');

  const measure = useCallback(() => {
    const node = el.current;
    if (!node) return;
    // A STRING, not an object, and this is load-bearing. setState with a fresh
    // object re-renders on every ResizeObserver callback; a render can change
    // layout; a layout change re-fires the observer — "ResizeObserver loop
    // completed with undelivered notifications". React bails out when the next
    // state is Object.is-equal, so a primitive costs no renders at rest.
    setFade(
      axis === 'y'
        ? scrollFade({ start: node.scrollTop, viewport: node.clientHeight, content: node.scrollHeight })
        : scrollFade({ start: node.scrollLeft, viewport: node.clientWidth, content: node.scrollWidth }),
    );
  }, [axis]);

  /* A CALLBACK ref, not a ref object with an effect — and this is the whole
   * reason the first version shipped a fade that never lit.
   *
   * Both surfaces here live inside a portal that Base UI UNMOUNTS while closed:
   * the filter popup and the phone panel. An effect with a stable dependency
   * list runs once, on mount of the *component*, at which point the scroller
   * does not exist and `ref.current` is null — so it returned early, never
   * subscribed, and `data-fade` stayed "none" forever. Nothing errored; the
   * fade was simply always off, which looks exactly like "this list doesn't
   * overflow".
   *
   * A callback ref fires when the NODE attaches and again with null when it
   * detaches, so the subscription follows the element rather than the
   * component. Verified in both engines before and after — see the log entry.
   */
  const cleanup = useRef<(() => void) | null>(null);

  const ref = useCallback((node: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    el.current = node;

    if (!node) {
      // Detached: reset, so a reopened panel never paints last time's state
      // for a frame before the new measurement lands.
      setFade('none');
      return;
    }

    node.addEventListener('scroll', measure, { passive: true });

    const ro = new ResizeObserver(measure);
    // TWO subscriptions, both needed:
    //  - the SCROLLPORT, for anything changing its box — rotation, an iOS URL
    //    bar collapsing under 100dvh, a flex sibling growing.
    //  - each direct CHILD, for anything changing the CONTENT while the box
    //    stays put — a row wrapping when a webfont swaps in, an image arriving.
    // A ResizeObserver on a scroller does NOT fire when its scrollHeight
    // changes, only when its own border box does. Observing just the scroller
    // is the usual way to ship this bug and never see it on a fast laptop with
    // warm font caches.
    ro.observe(node);
    for (const child of Array.from(node.children)) ro.observe(child);

    // Bodoni, Marcellus and Jost load async with different metrics from their
    // fallbacks, so the first measurement is taken against the wrong type and a
    // list can cross the threshold when the real face lands.
    let live = true;
    document.fonts?.ready.then(() => { if (live) measure(); });

    // No requestAnimationFrame needed: ResizeObserver delivers an initial
    // observation for every element as soon as it is observed, after layout.
    // The callback ref fires on every reopen, so that first callback IS the
    // initial measurement.
    cleanup.current = () => {
      live = false;
      node.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [measure]);

  // Unmounting the whole component still has to release the subscription.
  useEffect(() => () => cleanup.current?.(), []);

  return { ref, fade, measure };
}
