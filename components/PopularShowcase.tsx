'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardProduct } from '@/lib/compactCatalogue';
// Phosphor, never a text glyph — CLAUDE.md §6.
import { CaretLeft, CaretRight, Eye, Heart } from '@phosphor-icons/react';
import { useCurrency } from './CurrencyProvider';
import { trackGoal } from '@/lib/pulse';
import { useQuickView } from './QuickView';
import { useScrollFade } from './useScrollFade';
import { shopifyImage, shopifySrcSet } from '@/lib/shopifyImage';
import { withUtm, type OutboundSurface } from '@/lib/outbound';
import { productAltText } from '@/lib/altText';

/**
 * Homepage "Popular items" rail — replaces the StyleIt mix-and-match picker
 * (Tina, 2026-08-23: "instead of our 'Every modest brand, in one house.'
 * block with the outfit picker... a showcase like this with popular items").
 *
 * Full-bleed: the row breaks out of the site's normal 1220px container to
 * the actual edges of the viewport ("picture to the edge") — the outermost
 * `marginLeft: calc(50% - 50vw)` div below is the standard breakout trick,
 * since `width: 100vw` alone ignores wherever the element actually sits in
 * the page. The section heading stays in app/page.tsx, same as every other
 * homepage rail (EditorsRail's "Chosen by hand" heading lives there too) —
 * only the row itself needs to escape the container, so only the row is in
 * this component.
 *
 * Cards are plain image + caption, no border/radius/card-background — the
 * photographs are meant to butt up against each other and the screen edges,
 * not sit in individual boxes like every other rail on this site
 * (EditorsRail, ProductCard). Heart + quick-view follow the SAME accessible
 * shape ProductCard already established: the outbound link covers the whole
 * card at z-10, the two buttons are SIBLINGS at z-20, never nested inside
 * the <a> — nesting a <button> in an <a> is the `nested-interactive` axe
 * violation ProductCard was already rewritten once to remove.
 *
 * No "sold out" or discount badge: Tina asked for a sold-out badge, then
 * said "not necessary now" before this shipped, and there is no compare-at
 * price anywhere in the catalogue for a real "% off" badge — CLAUDE.md's
 * rule against shipping placeholder data as if it were real.
 *
 * ~2.5 cards visible, not a clean 4 or 5 (Tina, 2026-08-23: "I want you to
 * show 2 and a half so people know there is more... look at the aab one") —
 * checked aab's own site live rather than guessing: their homepage "SALE
 * MOST WANTED" rail shows exactly this ratio on a phone viewport (one full
 * card either side of a centred one, each neighbour cropped by the screen
 * edge). Their version is a plain crop, no fade — the "make that half a
 * little transparent" softening is Tina's own addition on top of that
 * layout, not something copied from them.
 *
 * The edge fade reuses `useScrollFade`/`.scroll-fade` (globals.css) rather
 * than a one-off opacity trick — the wrapper/port split, the `data-fade`
 * state and the `--fade-to` token already exist and are exercised by
 * IndexPanel/MobileNav; this only adds the horizontal geometry
 * (`.scroll-fade-x`) the class's own comment already called out as the next
 * axis to add. Reusing it also means the rail-arrows' enabled/disabled
 * state (`canLeft`/`canRight` below) comes from the SAME measurement as the
 * fade, so the two can never disagree about whether there's more to scroll.
 */
export default function PopularShowcase({
  items,
  surface = 'popular-showcase',
}: {
  items: CardProduct[];
  /** Which rail this is, for the outbound UTM and the `data-surface` Pulse
   *  reads. Defaults to the original homepage rail so the existing call site
   *  is unchanged; the "Our picks on abayas" rail below it passes
   *  'abaya-picks' so the two do not report as one surface. */
  surface?: OutboundSurface;
}) {
  const { price } = useCurrency();
  const { open, isFav, toggleFav } = useQuickView();

  // useScrollFade's `ref` is a callback ref (it has to fire on attach/detach
  // to survive a portal remount elsewhere — see its own comment), so it
  // can't also expose a `.current` to call `scrollBy` on. `scrollerNode`
  // captures the same element via that callback for the arrows' imperative
  // scroll, without duplicating useScrollFade's own overflow measurement.
  const { ref: fadeRef, fade } = useScrollFade<HTMLDivElement>('x');
  const scrollerNode = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useCallback((node: HTMLDivElement | null) => {
    scrollerNode.current = node;
    fadeRef(node);
  }, [fadeRef]);
  // 'end' = more content to the right only; 'both' = more either way — see
  // lib/scrollFade.ts's own naming note (names describe the CONTENT, not
  // the scrollbar).
  const canLeft = fade === 'start' || fade === 'both';
  const canRight = fade === 'end' || fade === 'both';

  // The arrows have to sit centred on the IMAGE, not the card (caption text
  // sits below it). EditorsRail's `.rail-arrow` default (top: 150px) only
  // works there because that rail's images are a fixed 300px tall; these
  // are `aspect-[3/4]` and fluid with the card's own responsive width, so a
  // static number would drift at every breakpoint. Measuring the first
  // card's actual rendered height and feeding it back as an inline `top`
  // (which beats the class's own value) keeps the arrows correct at any
  // width without hand-tuning a height per breakpoint.
  const firstImage = useRef<HTMLImageElement>(null);
  const [arrowTop, setArrowTop] = useState(200);
  useEffect(() => {
    const el = firstImage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setArrowTop(el.clientHeight / 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    // `surface` already distinguishes the two homepage rails for outbound
    // clicks, so reuse it rather than inventing a second name for the same rail.
    trackGoal('rail_scroll', { rail: surface, direction: dir === 1 ? 'right' : 'left' });
    const el = scrollerNode.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  // Vertical wheel input ALWAYS scrolls the page, full stop — never the
  // row. Tried two other shapes of this before landing here, both
  // disproven live with Playwright rather than assumed:
  //   1. Redirect vertical wheel to the row's scrollLeft, chaining to the
  //      page at each boundary. Reproduced: a plain continuous scroll DOWN
  //      the page froze `window.scrollY` the instant the cursor crossed
  //      onto the row, for as long as the row still had room to move
  //      sideways (Tina: "i can scroll... not until i hit the cards...
  //      then im stuck").
  //   2. Attach NO handler at all, on the theory that removing the
  //      redirect would just restore native page scrolling. Reproduced
  //      live that this is worse, not neutral: `overflow-x: auto` alone
  //      (even with `overflow-y: hidden`) makes an element the wheel
  //      event's target with no valid axis to apply it to, and Chromium
  //      does NOT chain that unhandled event up to the page — scrollY
  //      froze PERMANENTLY the moment the cursor touched the row, for
  //      every remaining tick of the test, not just a couple.
  // So the row is never allowed to treat a vertical gesture as its own —
  // this handler unconditionally hands deltaY to `window.scrollBy` and
  // never touches `scrollLeft`. The row is reachable by the arrows and by
  // a genuine HORIZONTAL gesture only (shift+wheel or a trackpad's
  // two-finger sideways swipe produce deltaX, which this never intercepts
  // and the browser's own native overflow-x:auto handles unassisted).
  useEffect(() => {
    const el = scrollerNode.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      window.scrollBy(0, e.deltaY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      {/* .scroll-fade / .scroll-fade-x (globals.css): the wrapper carries the
          fade pseudo-elements, data-fade is a real measurement (useScrollFade
          above), not a guess. --fade-to matches this section's own
          background (parchment, not the class's white default) so the fade
          resolves into the actual surface behind it instead of a visible
          white sliver. --fade-size-x is wider than the vertical default —
          proportional to these much bigger cards, not the ~40px menu rows
          the vertical version was tuned for. */}
      <div
        className="scroll-fade scroll-fade-x"
        data-fade={fade}
        style={{ ['--fade-to' as string]: 'var(--parchment)', ['--fade-size-x' as string]: '100px' }}
      >
        {/* overflow-y-hidden is load-bearing, not decorative — per the CSS
            Overflow spec, setting overflow-x to a non-visible value while
            overflow-y is left at its default (visible) makes the BROWSER
            compute overflow-y as auto too, so this row was quietly
            vertically scrollable/draggable as well as horizontally.
            IndexPanel.tsx hit the mirror-image version of this same trap
            (its overflow-y:auto list needed overflow-x-hidden). Reported
            live: "i can still scroll up and down in the cards" — confirmed
            via Playwright (`getComputedStyle(...).overflowY` read `auto`
            despite never being set) before applying this. */}
        <div ref={scrollerRef} className="scroll-fade-port flex gap-2 overflow-x-auto overflow-y-hidden" style={{ scrollSnapType: 'x mandatory' }}>
        {items.map((p, i) => {
          const fav = isFav(p.id);
          return (
            <div key={p.id} className="group relative shrink-0 w-[42%] md:w-[28%] lg:w-[20%]" style={{ scrollSnapAlign: 'start' }}>
              <a
                href={withUtm(p.url, surface)}
                target="_blank"
                rel="noopener noreferrer sponsored"
                aria-label={`${p.title} by ${p.brandName} — opens ${p.brandName}'s site`}
                data-brand={p.brandSlug}
                data-garment={p.garment}
                data-surface={surface}
                draggable={false}
                className="absolute inset-0 z-10"
              />
              <div className="relative overflow-hidden" style={{ background: '#fff' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={i === 0 ? firstImage : undefined}
                  src={shopifyImage(p.image, 600)}
                  srcSet={shopifySrcSet(p.image)}
                  sizes="(max-width: 767px) 42vw, (max-width: 1023px) 28vw, 20vw"
                  alt={productAltText(p)}
                  // draggable=false — an <img> (and a <link>/<a>, set above
                  // too) is natively draggable in every browser with no
                  // attribute needed at all: click-and-drag anywhere on this
                  // full-bleed row started the browser's own "drag this
                  // image" ghost-preview gesture, which follows the cursor
                  // in ANY direction. Reported live: "I can move the row up
                  // and down" — confirmed via a dispatched `dragstart` that
                  // fired uncancelled. Every other card on the site (Product-
                  // Card, EditorsRail) has the same gap; this row is where it
                  // is easiest to trigger, since the photo runs edge-to-edge
                  // with no card padding around it to click on instead.
                  draggable={false}
                  // BOX SHAPE, 2026-08-25: aspect-[2/3], was aspect-[3/4].
                  // Tina, on the abaya rail: "some of the pictures dont fit
                  // really good into our frame... i think we should better
                  // keep everything like how they have done it", then "can
                  // you do all the rows so also the Popular items from
                  // brands. the same ratios as the photos from the abayas."
                  // With object-contain the ONLY way a photo fills its box
                  // uncropped is for the box to already BE the photo's shape
                  // — the same reasoning lib/edits.ts's `imageRatio` field
                  // spells out. Measured, not guessed: of the 16 abaya
                  // photographs the brands actually serve, 10 are exactly
                  // 0.667 (2:3), the median is 0.667, and the spread is
                  // 0.564-0.800. Against the old 3/4 (0.750) box that left
                  // white bars down both sides of the majority of the row;
                  // against 2/3 those ten fit edge to edge with no bars and
                  // no crop. Applied to BOTH rails, per her second message,
                  // so the two rows stay one set.
                  // object-cover for EVERY card, 2026-08-25. Abayas used to
                  // be the exception (object-contain) because Tina asked to
                  // "zoom the picture on the abayas a little out": against
                  // the old 3:4 box a full-length abaya photo is much
                  // taller/narrower, so cover was cutting the top and bottom
                  // off to fill the width, which is what read as "too zoomed
                  // in". That exception existed only to compensate for a box
                  // that was the wrong shape, and the box is the right shape
                  // now (2:3 = the measured median of the real photographs),
                  // so contain no longer buys anything: it just leaves bars
                  // on the minority whose ratio isn't exactly 2:3 — "i see
                  // that some still not fit can you zoom those in".
                  // Measured what cover actually costs at THIS box, rather
                  // than assuming: the whole abaya spread is 0.564-0.800
                  // against 0.667, so the worst crop in the row is 16.6% off
                  // the sides (the three 0.776-0.800 photos) and 15.4% off
                  // top and bottom (Avyaana's 0.564 "Peach Floral"). Checked
                  // that one by eye — the model is centred with headroom, so
                  // nothing is decapitated. At the old 3:4 box the same
                  // change would have cost 25%+, which is why it was wrong
                  // then and right now.
                  className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
                {/* Icon glyph itself down to 20px (was 24px) per Tina: "icons
                    need to be a bit smaller" — button stays 32px (more
                    breathing room in the circle now, 6px a side), position
                    stays 8px inset in the corner. */}
                <button
                  type="button"
                  onClick={() => open(p)}
                  aria-label={`Quick view: ${p.title} by ${p.brandName}`}
                  className="absolute top-2 left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition"
                  style={{ background: 'rgba(255,255,255,0.85)', color: 'var(--muted)', lineHeight: 1 }}
                >
                  <Eye size={20} weight="regular" className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleFav(p)}
                  className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    color: fav ? 'var(--aubergine)' : 'var(--muted)',
                    lineHeight: 1,
                  }}
                  aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <Heart size={20} weight={fav ? 'fill' : 'regular'} className="w-5 h-5" />
                </button>
              </div>
              <div className="text-center px-4">
                <div className="brand-label mt-3">{p.brandName}</div>
                <div className="card-title mt-1">{p.title}</div>
                <div className="price mt-1">{price(p.price, p.currency).text}</div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="rail-arrow rail-arrow-left"
        // left: 12px, not the class's default -10px — this row is genuinely
        // 100vw (the breakout wrapper above), so the default would sit the
        // arrow 10px past the actual edge of the viewport and force a
        // horizontal scrollbar on the whole page. EditorsRail can use -10
        // safely because ITS row sits inside the normal padded container,
        // nowhere near the real document edge — which is also why EditorsRail
        // never needed a z-index override: its arrows sit OUTSIDE the row
        // entirely. Sitting the arrow INSIDE the edge here means it overlaps
        // the end card's own full-cover outbound <a> (z-10) — found live via
        // Playwright: clicking "scroll right" near the end of the rail hit
        // the last card's link instead, because both were z-10 and the
        // anchor happened to win the paint order. z-30 settles it outright.
        style={{ top: arrowTop, left: 12, zIndex: 30, opacity: canLeft ? 1 : 0, pointerEvents: canLeft ? 'auto' : 'none' }}
      >
        <CaretLeft size={18} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="rail-arrow rail-arrow-right"
        style={{ top: arrowTop, right: 12, zIndex: 30, opacity: canRight ? 1 : 0, pointerEvents: canRight ? 'auto' : 'none' }}
      >
        <CaretRight size={18} weight="bold" />
      </button>
    </div>
  );
}
