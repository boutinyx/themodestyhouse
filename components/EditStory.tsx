import Link from 'next/link';
import type { Edit } from '@/lib/edits';
import { EditStoryRail } from './EditStoryRail';

/**
 * Renders `[label](/path)` inside a styling paragraph as a real internal link.
 *
 * A deliberately tiny subset of markdown — links only, internal only. The copy
 * lives in lib/edits.ts as plain strings and Tina writes it there; asking her
 * to hand-write JSX to link a word would be the wrong trade. Nothing else is
 * parsed, so a stray bracket renders as a bracket rather than as broken markup.
 *
 * Internal only is a rule, not an oversight: an outbound link from body copy
 * would need rel="sponsored" (§6/FTC) and that decision belongs at the link,
 * not hidden in a text parser.
 */
const LINK = /\[([^\]]+)\]\((\/[^)]*)\)/g;
function withLinks(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(
      <Link
        key={`${m[2]}-${m.index}`}
        href={m[2]}
        style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 3 }}
      >
        {m[1]}
      </Link>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * The styling text for an edit, plus the street photographs that go with it.
 *
 * Rendered INSIDE the product grid, after the first row — Tina, 2026-08-24:
 * "i want the text of the lace story to be after the first row". See
 * `FilterableGrid`'s `afterFirstRow` prop for how a full-width block is placed
 * between grid rows at two different column counts.
 *
 * Server component; `Edit` is a type-only import (Invariant 10).
 */
export function EditStory({ edit }: { edit: Edit }) {
  const webp = (src: string, w: number) => src.replace(/\.jpg$/, `-${w}.webp`);
  return (
    <section
      className="edit-story"
      style={{ borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}
      aria-label={edit.styling.h2}
    >
      <div className="py-12 md:py-16">
        <h2
          className="serif max-w-2xl"
          style={{ fontSize: 'clamp(24px,3vw,34px)', color: 'var(--ink)', lineHeight: 1.12 }}
        >
          {edit.styling.h2}
        </h2>
        <div className="mt-6 grid gap-x-12 gap-y-4 md:grid-cols-2 max-w-4xl">
          {edit.styling.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.7 }}>
              {withLinks(p)}
            </p>
          ))}
        </div>

        {edit.storyImages && edit.storyImages.length > 0 && (
          <EditStoryRail>
            {edit.storyImages.map((img) => (
              <li key={img.src} className="edit-rail-item flex-shrink-0">
                <picture>
                  <source
                    srcSet={`${webp(img.src, 400)} 400w, ${webp(img.src, 800)} 800w, ${webp(img.src, 1200)} 1200w`}
                    sizes="(max-width: 767px) 46vw, 280px"
                    type="image/webp"
                  />
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="w-full"
                    style={{ aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-card)' }}
                  />
                </picture>
                {/* Credit only where there IS one. An empty line would look like
                    a rendering fault; a made-up handle would be worse. */}
                {img.credit && (
                  <a
                    href={`https://instagram.com/${img.credit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eyebrow mt-3 inline-block"
                    style={{ color: 'var(--muted)' }}
                  >
                    @{img.credit}
                  </a>
                )}
              </li>
            ))}
          </EditStoryRail>
        )}

        {/* The paragraphs Tina moved under the photographs. Same two-column
            measure as the ones above, so the block reads as one piece split by
            the pictures rather than as two different sections. */}
        {edit.styling.paragraphsBelow && edit.styling.paragraphsBelow.length > 0 && (
          <div className="mt-10 grid gap-x-12 gap-y-4 md:grid-cols-2 max-w-4xl">
            {edit.styling.paragraphsBelow.map((p) => (
              <p key={p.slice(0, 40)} style={{ color: '#4c4048', fontSize: 16, lineHeight: 1.7 }}>
                {withLinks(p)}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
