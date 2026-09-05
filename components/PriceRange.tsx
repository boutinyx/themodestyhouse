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
    <div className="flex flex-col gap-1.5 min-w-[190px]">
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
            {/* 20px targets: below the 24px the mobile audit checks for, so the
                visual dot is 12px and the hit area is padded around it. */}
            <Slider.Thumb
              index={0}
              getAriaLabel={() => 'Minimum price'}
              className="size-3 rounded-full outline-none focus-visible:ring-2"
              style={{ backgroundColor: 'var(--aubergine)', boxShadow: '0 0 0 6px var(--parchment)' }}
            />
            <Slider.Thumb
              index={1}
              getAriaLabel={() => 'Maximum price'}
              className="size-3 rounded-full outline-none focus-visible:ring-2"
              style={{ backgroundColor: 'var(--aubergine)', boxShadow: '0 0 0 6px var(--parchment)' }}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
