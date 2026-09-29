'use client';

import { useState } from 'react';

export type PartnerFAQ = {
  /** Short label for the pill tab — the full question is too long to fit as
   *  a tab. Shown in the panel itself, in full, once selected. */
  label: string;
  q: string;
  a: string;
  images?: { src: string; alt: string; w: number; h: number }[];
};

/**
 * Layout 05 from faq-layouts.html ("Tabs") — Tina picked this one after
 * comparing all eight. Pill tabs float on the page's own (dark) background;
 * the answer panel is its own light "island" card, same pattern as every
 * other section on this page (screenshot card, price card) now that the
 * page itself is dark.
 *
 * Not components/PartnerFeatureAccordion.tsx with a new skin — that
 * component's whole point is a click-to-open LIST (every question visible
 * as its own row, one body open at a time). This is a different
 * information architecture: only one question is ever visible as a
 * question; the rest are reduced to short labels until picked. Forking
 * avoided bending one component to do both jobs.
 */
export function PartnerFAQTabs({ items }: { items: PartnerFAQ[] }) {
  const [active, setActive] = useState(0);
  const current = items[active];
  const maxH = current.images ? Math.max(...current.images.map((i) => i.h)) : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {items.map((item, i) => (
          <button
            key={item.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className="eyebrow"
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: `1px solid ${i === active ? 'var(--aubergine)' : 'rgba(233,226,220,0.28)'}`,
              background: i === active ? 'var(--aubergine)' : 'transparent',
              color: i === active ? 'var(--parchment)' : 'var(--muted-on-dark)',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl p-7 md:p-8" style={{ background: '#fff', border: '1px solid var(--hairline)' }}>
        <h3 className="section-heading text-xl md:text-2xl" style={{ color: 'var(--ink)' }}>
          {current.q}
        </h3>
        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--prose)' }}>
          {current.a}
        </p>
        {current.images && (
          <div className={current.images.length > 1 ? 'mt-6 grid gap-4 md:grid-cols-2' : 'mt-6'}>
            {current.images.map((image) => (
              <div
                key={image.src}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--hairline)', background: 'var(--parchment)', aspectRatio: `${image.w} / ${maxH}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- one-off internal screenshots, not editorial photography (lib/staticImage.ts's convention is /editorial and /about only) */}
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.w}
                  height={image.h}
                  loading="lazy"
                  className="w-full h-full"
                  style={{ objectFit: 'contain', objectPosition: 'top' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
