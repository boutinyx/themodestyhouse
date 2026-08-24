import type { Edit } from '@/lib/edits';

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
              {p}
            </p>
          ))}
        </div>

        {edit.storyImages && edit.storyImages.length > 0 && (
          <>
            {/* A rail, not a grid: five portrait photographs at four different
                source resolutions would make a grid row of uneven quality, and
                on a phone a five-across grid is unreadable. `no-scrollbar` and
                the negative margin are the same treatment the other full-bleed
                rails on the site use. */}
            <ul className="edit-story-rail no-scrollbar mt-10 flex gap-4 overflow-x-auto" role="list">
              {edit.storyImages.map((img) => (
                <li key={img.src} className="flex-shrink-0" style={{ width: 'clamp(200px, 46vw, 280px)' }}>
                  <picture>
                    <source
                      srcSet={`${webp(img.src, 400)} 400w, ${webp(img.src, 800)} 800w, ${webp(img.src, 1200)} 1200w`}
                      sizes="(max-width: 767px) 46vw, 280px"
                      type="image/webp"
                    />
                    {/* No eslint-disable: the rule does not fire on an <img>
                        inside a <picture>, and lint runs --max-warnings 0. */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      className="w-full"
                      style={{ aspectRatio: '3 / 4', objectFit: 'cover', borderRadius: 'var(--radius-card)' }}
                    />
                  </picture>
                  {/* Credit only where there IS one. An empty line would look
                      like a rendering fault; a made-up handle would be worse. */}
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
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
