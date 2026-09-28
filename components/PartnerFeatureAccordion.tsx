'use client';

import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';

export type PartnerFeature = {
  h: string;
  p: string;
  images?: { src: string; alt: string; w: number; h: number }[];
};

/**
 * Same disclosure pattern as components/HowBlocks.tsx (title row, click to
 * reveal, one open at a time, grid-template-rows for an unknown-height
 * animation) — deliberately NOT that component itself. HowBlocks also opens
 * on desktop HOVER, which is right for /about's "when you hover it opens"
 * ask but wrong here: this page has no such ask, and a body that can hold a
 * two-image row is a different, heavier disclosure than HowBlocks' plain
 * paragraph. Forking avoids bending a shared, carefully-tuned component
 * (§10.25/§10.34's whole lesson: hover-vs-touch interactions are where
 * small "just reuse it" edits break something on a device you didn't test).
 *
 * Tina: "i think its too long not only on laptop but also on phone... is
 * there a way we can keep what we have but implement it in a different
 * way?" — same five features, same copy, same screenshots, collapsed by
 * default so the page reads as five short lines until someone taps one.
 */
export function PartnerFeatureAccordion({ features }: { features: PartnerFeature[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ol className="grid gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {features.map((f, i) => {
        const isOpen = openIndex === i;
        const maxH = f.images ? Math.max(...f.images.map((image) => image.h)) : 0;
        return (
          <li
            key={f.h}
            style={{
              background: '#fff',
              border: '1px solid var(--hairline)',
              borderRadius: 18,
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
              borderColor: isOpen ? 'var(--brass)' : 'var(--hairline)',
              boxShadow: isOpen ? '0 18px 40px -28px rgba(68,25,67,0.35)' : 'none',
            }}
          >
            <h2 style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`partner-feature-${i}`}
                onClick={() => setOpenIndex((cur) => (cur === i ? null : i))}
                className="w-full flex items-center gap-4 text-left"
                style={{ padding: '18px 20px', minHeight: 56, background: 'none', border: 0 }}
              >
                <span
                  className="section-heading text-lg md:text-xl"
                  style={{ color: 'var(--ink)', flex: 1 }}
                >
                  {f.h}
                </span>
                <CaretDown
                  size={16}
                  weight="bold"
                  aria-hidden
                  style={{
                    color: 'var(--muted)',
                    flexShrink: 0,
                    transition: 'transform 260ms ease',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
            </h2>

            <div
              id={`partner-feature-${i}`}
              style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 260ms ease' }}
            >
              <div style={{ overflow: 'hidden', visibility: isOpen ? 'visible' : 'hidden', transition: `visibility 0s linear ${isOpen ? '0s' : '260ms'}` }}>
                <div style={{ padding: '0 20px 20px' }}>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--prose)' }}>{f.p}</p>
                  {f.images && (
                    <div className={f.images.length > 1 ? 'mt-5 grid gap-4 md:grid-cols-2' : 'mt-5'}>
                      {f.images.map((image) => (
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}
