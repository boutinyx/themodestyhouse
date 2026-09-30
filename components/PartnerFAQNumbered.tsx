import type { PartnerFAQ } from './PartnerFAQTabs';

/**
 * Layout 04 from faq-layouts.html ("Numbered editorial list") — big brass
 * serif numerals, same shape /about's HowBlocks steps use — but with an
 * alternating left/right position added on top, on Tina's word: "i want to
 * have it om en om left and right" (Dutch: alternating, turn and turn
 * about). Replaces the tabs layout (components/PartnerFAQTabs.tsx, still
 * used elsewhere/kept for reference) with all five always visible — no
 * click needed, matching what "big number in gold" described from the
 * mockup.
 *
 * Only the BLOCK'S position and the number's side alternate (odd rows:
 * number then text, pinned left · even rows: text then number, pinned
 * right). The answer paragraph itself stays left-aligned regardless — a
 * right-aligned paragraph of running prose is measurably harder to read,
 * and nothing about "om en om" asked for that.
 *
 * No 'use client': nothing here is interactive, so this stays a plain
 * server component like the rest of the page.
 */
export function PartnerFAQNumbered({ items }: { items: PartnerFAQ[] }) {
  return (
    <div className="grid gap-12 md:gap-14">
      {items.map((item, i) => {
        const num = String(i + 1).padStart(2, '0');
        const onRight = i % 2 === 1;
        const maxH = item.images ? Math.max(...item.images.map((img) => img.h)) : 0;
        return (
          <div
            key={item.q}
            className={`flex gap-6 md:gap-8 max-w-xl ${onRight ? 'flex-row-reverse ml-auto' : 'mr-auto'}`}
          >
            <div
              className="serif shrink-0"
              style={{ fontSize: 'clamp(40px,6vw,64px)', lineHeight: 1, color: 'var(--brass)', fontVariantNumeric: 'lining-nums tabular-nums' }}
            >
              {num}
            </div>
            <div>
              <h3 className="section-heading text-xl md:text-2xl" style={{ color: 'var(--ink)' }}>
                {item.q}
              </h3>
              <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--prose)' }}>
                {item.a}
              </p>
              {item.images && (
                <div className={item.images.length > 1 ? 'mt-5 grid gap-4 sm:grid-cols-2' : 'mt-5'}>
                  {item.images.map((image) => (
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
      })}
    </div>
  );
}
