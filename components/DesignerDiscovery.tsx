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

const pad = (n: number) => String(n).padStart(2, '0');

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
  /** Hover pre-lights the map without committing to opening a panel. Separate
   *  from `open` on purpose: a touch device never sets this, and the map still
   *  highlights correctly from the tap that opens the row. */
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? open;

  const openRegion = regions.find((r) => r.name === open) ?? null;

  return (
    <section className="max-w-[1220px] mx-auto px-8 py-10 md:py-20">
      <div className="grid gap-10 lg:gap-14 lg:grid-cols-[0.82fr_1.25fr]">
        {/* ---- copy ---- */}
        <div className="flex flex-col justify-center">
          <div className="eyebrow" style={{ color: 'var(--brass)' }}>Designer discovery</div>
          <h2
            className="serif mt-3"
            style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Independent labels.<br />
            <span className="italic" style={{ color: 'var(--plum)' }}>Global perspectives.</span>
          </h2>
          <p className="mt-4 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65, maxWidth: '34ch' }}>
            {totalBrands} houses across {totalPlaces} places. Open a region to see who is in it.
          </p>
          <Link href="/designers" className="nav-link inline-flex items-center gap-1.5 mt-7 self-start">
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
            src="/world-dots-v1.svg"
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
      <ul className="mt-10 md:mt-14" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {regions.map((r, i) => {
          const isOpen = open === r.name;
          return (
            <li key={r.name} style={{ borderTop: '1px solid var(--hairline)' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.name)}
                onMouseEnter={() => setHover(r.name)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r.name)}
                onBlur={() => setHover(null)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-4 md:gap-6 text-left transition-colors"
                style={{ padding: '18px 4px', minHeight: 60, background: 'transparent' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-label), serif',
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    color: 'var(--brass)',
                    width: 26,
                    flexShrink: 0,
                  }}
                >
                  {pad(i + 1)}
                </span>
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
                    {openRegion.brands.map((b) => (
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
