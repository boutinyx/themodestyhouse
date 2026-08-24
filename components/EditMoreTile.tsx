import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';

/**
 * Fills the empty slot at the end of an edit's grid with the obvious next step.
 *
 * A curated edit almost never divides evenly by the column count — 32 picks in
 * a 3-up grid leaves one hole, 24 in a 2-up leaves none, and it changes at every
 * breakpoint. Rather than trying to detect the gap, this is simply the last
 * child of the grid: it takes whichever slot is next, so it lands in the hole
 * when there is one and starts a short final row when there is not.
 *
 * Server component; it is a link and a heading.
 */
export function EditMoreTile({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center justify-center text-center"
      // aspect-[3/4] matches ProductCard's photo, so the tile lines up with the
      // cards beside it rather than collapsing to its own text height.
      style={{
        aspectRatio: '3 / 4',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-card)',
        background: 'var(--bone)',
        padding: 24,
      }}
    >
      <span
        className="serif"
        style={{ fontSize: 'clamp(20px,2.2vw,26px)', color: 'var(--ink)', lineHeight: 1.15 }}
      >
        Want more?
      </span>
      <span
        className="eyebrow mt-4 inline-flex items-center gap-1.5"
        style={{ color: 'var(--aubergine)' }}
      >
        {label}
        <ArrowRight
          size={12}
          weight="bold"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
