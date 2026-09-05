'use client';

import { Slider } from '@base-ui-components/react/slider';
import { formatPrice } from '@/lib/price';
import type { PriceBounds } from '@/lib/priceFilter';

/**
 * The price range control in IndexPanel.
 *
 * Base UI's Slider rather than a hand-rolled one, deliberately: CLAUDE.md
 * §10.25 records that hand-rolling a dropdown instead of reusing this same
 * primitive family is what left the filter menus unreachable on every iPhone
 * and iPad for as long as they existed. Its value is a readonly number[] with
 * indexed thumbs, and it handles pointer, touch and keyboard natively.
 *
 * Every colour is an inline var(--token) style, per §6 — colour is never a
 * Tailwind class in this repo. Every amount goes through formatPrice, which is
 * ADR-0002's single source of truth for money.
 */
export default function PriceRange({
  bounds,
  value,
  onChange,
  currency,
}: {
  bounds: PriceBounds;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  currency: string;
}) {
  if (!bounds.usable) return null;

  const atTop = value[1] >= bounds.max;
  const label =
    `${formatPrice(value[0], currency)} — ${formatPrice(value[1], currency)}` +
    (bounds.openTop && atTop ? '+' : '');

  return (
    // basis-full below md so the slider gets its OWN row on a phone.
    // IndexPanel lays its children out with `flex flex-wrap gap-2`, and at
    // 390px the track and the Colour chip ended up shoulder to shoulder —
    // the chip read as sitting on the end of the track. Measured on staging
    // 2026-09-05: thumb right edge at x=478, Colour chip left edge at x=485.
    // Layout only, so a Tailwind utility is the right tool here (§6).
    <div className="flex flex-col gap-1.5 basis-full md:basis-auto md:min-w-[190px]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow" style={{ color: 'var(--muted)' }}>
          Price
        </span>
        <span className="text-[13px]" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
      </div>
      <Slider.Root
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        // Both handles may meet but never cross; a zero-width range is a
        // legitimate "exactly this price" selection.
        minStepsBetweenValues={0}
      >
        <Slider.Control className="flex items-center h-6 w-full touch-none select-none">
          <Slider.Track
            className="h-[3px] w-full rounded-full"
            style={{ backgroundColor: 'var(--hairline)' }}
          >
            <Slider.Indicator className="rounded-full" style={{ backgroundColor: 'var(--plum)' }} />
            {/* The visible dot is 12px (a deliberate design choice), but the
                HIT AREA must be at least 24px (WCAG 2.2 §2.5.8, and
                scripts/mobile-audit.mjs's smallTargets floor). Slider.Thumb's
                own element — the one this `.price-thumb` className lands on —
                is what the audit measures and what the browser hit-tests: its
                nested `<input type="range">` is stretched to 100% of it via
                Base UI's visuallyHidden, so enlarging THIS element enlarges
                the tappable area, not just its padding. The visible dot is a
                separate, `pointer-events-none` child, centered inside it. */}
            <Slider.Thumb
              index={0}
              getAriaLabel={() => 'Minimum price'}
              className="price-thumb size-6 rounded-full outline-none flex items-center justify-center"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full pointer-events-none"
                style={{ backgroundColor: 'var(--aubergine)' }}
              />
            </Slider.Thumb>
            <Slider.Thumb
              index={1}
              getAriaLabel={() => 'Maximum price'}
              className="price-thumb size-6 rounded-full outline-none flex items-center justify-center"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full pointer-events-none"
                style={{ backgroundColor: 'var(--aubergine)' }}
              />
            </Slider.Thumb>
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      {(value[0] > bounds.min || value[1] < bounds.max) && (
        <button
          type="button"
          onClick={() => onChange([bounds.min, bounds.max])}
          // py-1.5 brings the tap target to 24px tall without changing the
          // 12px text — measured 56x18 with no padding (§I2).
          className="text-[12px] underline underline-offset-2 self-start py-1.5 -my-1.5"
          style={{ color: 'var(--muted)' }}
        >
          Reset price
        </button>
      )}
    </div>
  );
}
