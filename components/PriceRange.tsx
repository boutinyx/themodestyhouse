'use client';

import { useState } from 'react';
import { Popover } from '@base-ui-components/react/popover';
import { Slider } from '@base-ui-components/react/slider';
import { CaretDown } from '@phosphor-icons/react';
import { formatPrice } from '@/lib/price';
import type { PriceBounds } from '@/lib/priceFilter';

/**
 * The price filter — a chip that opens a panel of bars, a two-handle track and
 * two typeable pills.
 *
 * Tina, 2026-09-05, with two screenshots: *"i want the filter to be on the
 * right side and i want it to be more like airbnb but then white"*. So: the
 * Airbnb layout and interaction, in this site's palette rather than their pink,
 * with white circular handles.
 *
 * A POPOVER, not a Menu. `FilterDropdown` next to it is a `Menu.RadioGroup`,
 * which is right for "one option out of N" and wrong here — this panel holds a
 * slider and two text inputs, and Menu's own arrow-key handling would fight the
 * slider's. Popover is the same Base UI family, so it still brings pointer,
 * touch, keyboard, Escape, outside-click and collision-aware positioning, which
 * is what CLAUDE.md §10.25 says never to hand-roll again.
 *
 * No `openOnHover`, unlike the sibling chips. A menu you can point at is
 * convenient; a panel with inputs that opens as you reach past it toward Colour
 * is not.
 *
 * The bars are the reason Tina wanted this shape. They are the only part of a
 * price filter that says where the catalogue actually IS before you drag
 * anything — on /modest-hijabs the median is $21 against a $243 maximum, and
 * nothing else on the page tells you that.
 */
export default function PriceRange({
  bounds,
  value,
  onChange,
  currency,
  histogram,
}: {
  bounds: PriceBounds;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  currency: string;
  histogram: number[];
}) {
  /**
   * While a pill is being typed in, its text is held here and the committed
   * range is left alone. Without it, every keystroke would re-filter the grid
   * and "1" on the way to "100" would empty the page under the visitor's hands.
   */
  const [draft, setDraft] = useState<{ i: 0 | 1; text: string } | null>(null);

  if (!bounds.usable) return null;

  const atTop = value[1] >= bounds.max;
  const openEnded = bounds.openTop && atTop;
  const touched = value[0] > bounds.min || value[1] < bounds.max;
  const money = (n: number, plus = false) => formatPrice(n, currency) + (plus ? '+' : '');
  const label = touched
    ? `${money(value[0])} — ${money(value[1], openEnded)}`
    : 'Price';

  /** Commit a typed pill: keep the digits, clamp, and never let the handles cross. */
  const commit = (i: 0 | 1, text: string) => {
    setDraft(null);
    const n = Number(text.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n) || text.trim() === '') return;
    const clamped = Math.min(Math.max(n, bounds.min), bounds.max);
    onChange(i === 0
      ? [Math.min(clamped, value[1]), value[1]]
      : [value[0], Math.max(clamped, value[0])]);
  };

  const tallest = Math.max(1, ...histogram);

  return (
    <Popover.Root>
      {/* .chip and the caret match FilterDropdown exactly, so this reads as the
          fifth member of the row rather than a control from somewhere else. */}
      <Popover.Trigger
        // ml-auto pushes it to the far right of IndexPanel's flex row, which
        // is what Tina asked for. On a phone the row wraps and ml-auto simply
        // right-aligns it on its own line, which is harmless.
        className="chip inline-flex items-center gap-1.5 ml-auto"
        data-active={touched}
      >
        {label}
        {/* Phosphor, not the ▾ character (CLAUDE.md §6). */}
        <CaretDown size={11} weight="bold" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          sideOffset={8}
          align="end"
          collisionPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
          className="z-50"
        >
          <Popover.Popup
            className="rounded-xl border p-4 w-[320px] max-w-[var(--available-width)] origin-[var(--transform-origin)] transition-[opacity,transform] duration-100 ease-out data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0"
            style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
          >
            {/* BARS. aria-hidden because they restate, imprecisely, what the two
                sliders below already announce properly — a screen reader gets
                the min and max and their real values, not 32 unlabelled counts. */}
            <div aria-hidden="true" className="flex items-end gap-px h-14 mb-[-6px] px-3">
              {histogram.map((n, i) => {
                const width = (bounds.max - bounds.min) / histogram.length;
                const lo = bounds.min + i * width;
                const hi = lo + width;
                // A bar counts as in-range when it OVERLAPS the selection, not
                // when its midpoint sits inside it: at 32 bins a bar is several
                // dollars wide, and midpoint-testing makes the end bars flip a
                // beat before or after the handle passes them, which reads as
                // the control lagging.
                const inRange = hi >= value[0] && (lo <= value[1] || openEnded);
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-[1px]"
                    style={{
                      height: n === 0 ? 0 : `${Math.max(6, (n / tallest) * 100)}%`,
                      backgroundColor: inRange ? 'var(--aubergine)' : 'var(--hairline)',
                    }}
                  />
                );
              })}
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
                <Slider.Track className="h-[3px] w-full rounded-full" style={{ backgroundColor: 'var(--hairline)' }}>
                  <Slider.Indicator className="rounded-full" style={{ backgroundColor: 'var(--aubergine)' }} />
                  {/* size-6 is 24px — the VISIBLE white circle and the hit area
                      are now the same element, which is what WCAG 2.2 §2.5.8 and
                      scripts/mobile-audit.mjs's smallTargets floor both measure.
                      Its fill, border and shadow live in .price-thumb, because
                      the focus ring has to be a :has() rule there; see the note
                      in globals.css. */}
                  <Slider.Thumb index={0} getAriaLabel={() => 'Minimum price'} className="price-thumb size-6 rounded-full outline-none" />
                  <Slider.Thumb index={1} getAriaLabel={() => 'Maximum price'} className="price-thumb size-6 rounded-full outline-none" />
                </Slider.Track>
              </Slider.Control>
            </Slider.Root>

            <div className="flex items-end gap-3 mt-4">
              {([0, 1] as const).map((i) => (
                <label key={i} className="flex-1 flex flex-col gap-1.5">
                  <span className="eyebrow" style={{ color: 'var(--muted)' }}>
                    {i === 0 ? 'Minimum' : 'Maximum'}
                  </span>
                  <input
                    // inputMode numeric brings up a phone's number pad without
                    // type="number", whose spinners and locale-specific parsing
                    // both fight a formatted currency string.
                    inputMode="numeric"
                    value={draft?.i === i ? draft.text : money(value[i], i === 1 && openEnded)}
                    onChange={(e) => setDraft({ i, text: e.target.value })}
                    onFocus={() => setDraft({ i, text: String(value[i]) })}
                    onBlur={(e) => commit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { commit(i, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); }
                      if (e.key === 'Escape') setDraft(null);
                    }}
                    className="w-full rounded-full border px-3 py-2 text-[14px] outline-none"
                    style={{ borderColor: 'var(--hairline)', color: 'var(--ink)', background: '#fff' }}
                  />
                </label>
              ))}
            </div>

            {touched && (
              <button
                type="button"
                onClick={() => onChange([bounds.min, bounds.max])}
                // Its own row and full width, so it clears the 24px target floor
                // without competing with the two pills above it.
                className="mt-3 w-full min-h-[24px] py-1 text-[13px] underline underline-offset-2"
                style={{ color: 'var(--muted)' }}
              >
                Reset price
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
