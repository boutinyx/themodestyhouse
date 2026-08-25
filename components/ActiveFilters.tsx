'use client';

import { X } from '@phosphor-icons/react';

/**
 * The row of removable chips showing what the grid is currently filtered by.
 *
 * Added 2026-08-26 at Tina's request, from a shadcn-style
 * `filter-chips-breadcrumb` snippet. **It is a rewrite, not a copy-paste**, and
 * the three deviations are all house rules rather than taste:
 *
 *  1. **Phosphor, not `lucide-react`.** CLAUDE.md §6: every icon on this site
 *     comes from Phosphor, no exceptions and no second icon set. The snippet's
 *     only dependency was lucide's `X`, so nothing was installed.
 *  2. **Tokens, not `bg-gray-100 dark:bg-zinc-900`.** Colour here is never a
 *     Tailwind class (§6, rule 3) — it is `var(--token)` in an inline style.
 *     The `dark:` half is moot besides: this site has no dark mode.
 *  3. **`components/`, not `components/ui/`.** That folder is a shadcn
 *     convention and this project is not a shadcn project — no `components.json`,
 *     no `lib/utils`, no `cn()`. Inventing the folder for one file would put the
 *     first two files of a structure nothing else follows into the tree.
 *
 * It also reuses the existing `.chip` class rather than restyling a pill from
 * scratch, so a filter chip matches every other chip on the site by
 * construction.
 *
 * WHAT COUNTS AS A FILTER. Brand, hijab fabric type, sub-category and the search
 * query. **Sort is deliberately absent**: 'featured' is a real sort order rather
 * than the absence of one (the comment on its dropdown in FilterableGrid makes
 * the same point), so a "Sort: Featured" chip with an X would imply you can
 * remove sorting, which you cannot.
 *
 * Renders NOTHING when nothing is filtered — an empty "Filters:" bar above every
 * unfiltered grid is furniture, not information.
 */
export type ActiveFilter = { id: string; name: string; value: string };

export function ActiveFilters({
  filters,
  onRemove,
  onClear,
  className,
}: {
  filters: ActiveFilter[];
  onRemove: (id: string) => void;
  /** Omitted when there is only one chip — "Clear all" next to a single
   *  removable chip is a second button for the same action. */
  onClear?: () => void;
  className?: string;
}) {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2${className ? ` ${className}` : ''}`}>
      <span className="brand-label" style={{ whiteSpace: 'nowrap' }}>
        Filtered by
      </span>
      {filters.map((f) => (
        <span
          key={f.id}
          className="chip inline-flex items-center gap-1.5"
          style={{ paddingRight: 8 }}
        >
          <span style={{ color: 'var(--muted)' }}>{f.name}:</span>
          <span>{f.value}</span>
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            /* 24px, not the snippet's 12-16px box. The site's own mobile audit
               fails anything under 24px as an undersized tap target, and this
               control sits inside a 12px chip where a 3px glyph would be the
               smallest hit area on the page. The chip's own padding absorbs it. */
            className="inline-flex items-center justify-center rounded-full shrink-0"
            style={{ width: 24, height: 24, marginRight: -4, color: 'var(--muted)' }}
            aria-label={`Remove the ${f.name.toLowerCase()} filter`}
          >
            <X size={12} weight="bold" />
          </button>
        </span>
      ))}
      {onClear && filters.length > 1 && (
        <button
          type="button"
          onClick={onClear}
          /* NOT `.nav-link`, however much it looks like the right class here. It
             sets `justify-content: center` for the horizontal header bar, and
             reusing it outside that bar is the leak CLAUDE.md §8 logs four
             separate times. This is a plain button with tokens. */
          style={{
            fontFamily: 'var(--font-ui), sans-serif',
            fontSize: 12,
            letterSpacing: '0.04em',
            textDecoration: 'underline',
            color: 'var(--muted)',
            whiteSpace: 'nowrap',
          }}
        >
          Clear all
        </button>
      )}
    </div>
  );
}
