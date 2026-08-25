'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CaretDown, ArrowRight } from '@phosphor-icons/react';

/** One house, flattened to what the band actually renders. Deliberately NOT a
 *  `Brand` — a Brand carries `description`, which for the sealed houses runs to
 *  several hundred words each, and this is a client component, so every field
 *  on it is serialised into the page. Same rule as CardProduct vs Product
 *  (CLAUDE.md §8). */
export type DiscoveryBrand = {
  name: string;
  city: string;
  href: string;
  /** true = the brand's own storefront, so it needs target/rel/sponsored. */
  external: boolean;
};
export type DiscoveryRegion = { name: string; count: number; brands: DiscoveryBrand[] };
export type DiscoveryPin = { x: number; y: number; n: number; region: string; city: string };

/** How many houses a region shows before "see all". Tina's number. */
const PREVIEW = 5;

export default function DesignerDiscovery({
  regions,
  pins,
  totalBrands,
  totalPlaces,
  mapW,
  mapH,
}: {
  regions: DiscoveryRegion[];
  pins: DiscoveryPin[];
  totalBrands: number;
  totalPlaces: number;
  mapW: number;
  mapH: number;
}) {
  /** Which region's houses are showing. Null = none; only one at a time, so the
   *  band never grows by more than one panel and the page below it moves once. */
  const [open, setOpen] = useState<string | null>(null);
  /** Europe is 56 houses; dropping all of them into the page at once pushed
   *  everything below it off the screen (Tina: "lets just show 5 when you open
   *  it up and a button with see more. because else its too long"). Resets to
   *  false whenever a different region opens, so "see all" never carries over. */
  const [showAll, setShowAll] = useState(false);
  /** Hover pre-lights the map without committing to opening a panel. Separate
   *  from `open` on purpose: a touch device never sets this, and the map still
   *  highlights correctly from the tap that opens the row. */
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? open;

  const openRegion = regions.find((r) => r.name === open) ?? null;

  return (
    <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
      {/* The map track is deliberately much the larger of the two — Tina:
          "can you make the map also more visible and longer". Was
          0.82fr/1.25fr. The dots themselves also went a step darker and a
          step denser in world-dots-v2.svg. */}
      <div className="grid gap-10 lg:gap-16 lg:grid-cols-[0.62fr_1.62fr] items-center">
        {/* ---- copy ---- */}
        {/* Centred on a phone, left-aligned from lg — Tina: "this needs to go in
            the middle the text in the middle on phone". `items-center` is what
            actually centres the CTA, since a flex child ignores text-align;
            `mx-auto` does the same for the capped paragraph measure.
            The "Designer discovery" eyebrow that stood above the heading was cut
            the same day ("'Designer discovery' can go") — the heading says what
            the band is. */}
        <div className="flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
          <h2
            className="serif"
            style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Independent labels.<br />
            <span className="italic" style={{ color: 'var(--plum)' }}>Global perspectives.</span>
          </h2>
          <p
            className="mt-4 text-sm mx-auto lg:mx-0"
            style={{ color: 'var(--muted)', lineHeight: 1.65, maxWidth: '34ch' }}
          >
            {totalBrands} houses across {totalPlaces} places. Open a region to see who is in it.
          </p>
          <Link href="/designers" className="nav-link inline-flex items-center gap-1.5 mt-7">
            Explore all designers <ArrowRight size={13} weight="bold" />
          </Link>
        </div>

        {/* ---- map ---- */}
        {/* The dotted world is a STATIC ASSET, not inline SVG: ~1,500 circles is
            50 KB of markup that would otherwise ride on the homepage's HTML on
            every request (CLAUDE.md §8 on payload). As a file it is fetched once
            and cached, and gzips to 4.5 KB. Regenerate with
            scripts/gen-world-dots.mjs; NEVER overwrite it in place (§6).
            The pins are inline because they are tiny and they need state. */}
        <div className="relative self-center w-full" style={{ aspectRatio: `${mapW} / ${mapH}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/world-dots-v2.svg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full"
          />
          <svg
            viewBox={`0 0 ${mapW} ${mapH}`}
            className="absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {pins.map((p) => {
              const lit = active === null || active === p.region;
              return (
                <circle
                  key={p.city}
                  cx={p.x}
                  cy={p.y}
                  r={3.2 + Math.sqrt(p.n) * 2.4}
                  fill={active === p.region ? 'var(--plum)' : 'var(--aubergine)'}
                  opacity={lit ? 0.92 : 0.16}
                  style={{ transition: 'opacity 180ms ease, fill 180ms ease' }}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* ---- regions ---- */}
      {/* Full width under both columns, not squeezed into a third column beside
          the map — Tina: "i want the ... boxes to be bigger in length". A row is
          the full 1220px measure and 60px tall, so the count sits at the far
          right of the page rather than 200px in. */}
      {/* Tina: "put some space between the cards and the map." */}
      {/* marginBottom, NOT `margin: 0`. An inline style beats a class, so
          `margin: 0` here silently cancelled the `mt-24` beside it and the rows
          sat flush against the map — which is the gap Tina asked for in the
          first place. Tailwind's preflight already zeroes a ul, so the reset is
          only kept for the bottom edge. */}
      <ul className="mt-16 md:mt-24" style={{ listStyle: 'none', marginBottom: 0, padding: 0 }}>
        {regions.map((r) => {
          const isOpen = open === r.name;
          return (
            <li key={r.name} style={{ borderTop: '1px solid var(--hairline)' }}>
              <button
                type="button"
                onClick={() => { setOpen(isOpen ? null : r.name); setShowAll(false); }}
                onMouseEnter={() => setHover(r.name)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.name)}
                onBlur={() => setHover(null)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-4 md:gap-6 text-left transition-colors"
                /* Taller than the 60px it shipped at yesterday — Tina: "can you
                   make it longer". The 01/02/03 index that sat to the left of
                   the name is gone the same day ("you can put the 01 02 03 04 05
                   out ust keep the place"). */
                style={{ padding: '26px 4px', minHeight: 84, background: 'transparent' }}
              >
                <span
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-label), serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    fontSize: 'clamp(12px,1.4vw,15px)',
                    color: isOpen ? 'var(--plum)' : 'var(--ink)',
                  }}
                >
                  {r.name}
                </span>
                <span
                  className="serif"
                  style={{ fontSize: 'clamp(18px,2vw,26px)', color: 'var(--aubergine)', lineHeight: 1 }}
                >
                  {r.count}
                </span>
                <CaretDown
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  style={{
                    color: 'var(--muted)',
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 180ms ease',
                  }}
                />
              </button>

              {/* Rendered only when open. A CSS-only max-height reveal would keep
                  113 links in the DOM and in the tab order at all times. */}
              {isOpen && openRegion && (
                <div className="pb-8 pt-1">
                  <ul
                    className="grid gap-x-8 gap-y-1"
                    style={{
                      listStyle: 'none',
                      margin: 0,
                      padding: 0,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    }}
                  >
                    {(showAll ? openRegion.brands : openRegion.brands.slice(0, PREVIEW)).map((b) => (
                      <li key={b.href + b.name}>
                        {b.external ? (
                          <a
                            href={b.href}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            data-surface="designer-discovery"
                            className="inline-flex items-baseline gap-2 hover:opacity-70 transition"
                            style={{ color: 'var(--ink)', fontSize: 14, minHeight: 32, lineHeight: '32px' }}
                          >
                            {b.name}
                            <span className="eyebrow" style={{ fontSize: 9.5 }}>{b.city}</span>
                          </a>
                        ) : (
                          <Link
                            href={b.href}
                            className="inline-flex items-baseline gap-2 hover:opacity-70 transition"
                            style={{ color: 'var(--ink)', fontSize: 14, minHeight: 32, lineHeight: '32px' }}
                          >
                            {b.name}
                            <span className="eyebrow" style={{ fontSize: 9.5 }}>{b.city}</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Only when there is genuinely more. The label carries the
                      real remaining count rather than a bare "See more", so the
                      row does not hide an unknown quantity. */}
                  {openRegion.brands.length > PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className="nav-link inline-flex items-center gap-1.5 mt-5"
                      style={{ minHeight: 32 }}
                    >
                      {showAll
                        ? 'Show fewer'
                        : `See all ${openRegion.count} in ${openRegion.name}`}
                      <CaretDown
                        size={12}
                        weight="bold"
                        aria-hidden="true"
                        style={{
                          transform: showAll ? 'rotate(180deg)' : 'none',
                          transition: 'transform 180ms ease',
                        }}
                      />
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        <li style={{ borderTop: '1px solid var(--hairline)' }} />
      </ul>
    </section>
  );
}
