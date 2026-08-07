import type { House } from '@/lib/houses';

/**
 * The 3D wall of houses on /designers — the brands that are not among the six
 * featured above it, drifting past in tilted vertical columns.
 *
 * NOT the shadcn/ReUI version this was adapted from. That wanted `cn`,
 * `@radix-ui/react-avatar`, `tw-animate-css`, a Card primitive and the
 * `bg-card` / `from-background` / `text-muted-foreground` token layer — none of
 * which exist here. The animation is two keyframes in globals.css and the cards
 * are plain markup with house tokens, so this adds ZERO dependencies.
 *
 * It is a SERVER component: nothing here is interactive, the motion is pure CSS,
 * and the brand list is known at build time. Making it a client component would
 * have serialised every brand into the RSC payload for no reason (§8).
 *
 * Motion stops entirely under prefers-reduced-motion — see globals.css.
 */
export function BrandMarquee({ houses, columns = 4 }: { houses: House[]; columns?: number }) {
  if (!houses.length) return null;

  // Deal the houses round-robin into columns, so each column gets a spread of
  // the catalogue rather than one alphabetical block.
  const cols: House[][] = Array.from({ length: columns }, () => []);
  houses.forEach((h, i) => cols[i % columns].push(h));

  return (
    <div
      className="marquee relative flex justify-center overflow-hidden"
      style={{ height: 560, perspective: '360px', borderRadius: 8 }}
      aria-label="More houses in the index"
    >
      <div
        className="flex gap-4"
        style={{ transform: 'translateZ(-90px) rotateX(14deg) rotateY(-8deg) rotateZ(12deg)' }}
      >
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-4" style={{ ['--gap' as string]: '1rem' }}>
            {/* Rendered TWICE. The keyframes travel exactly one copy's height
                (-100% - gap), so the second copy is what sits under the seam at
                the moment it resets — that is what makes the loop invisible. */}
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="marquee-col flex shrink-0 flex-col gap-4"
                data-reverse={i % 2 === 1 ? 'true' : 'false'}
                style={{ ['--duration' as string]: `${52 + i * 7}s` }}
                aria-hidden={copy === 1}
              >
                {col.map((h) => (
                  <a
                    key={h.slug}
                    href={h.homepage}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="group relative block overflow-hidden shrink-0"
                    style={{
                      width: 176,
                      height: 220,
                      // Arched, matching the featured six above. Only the top is
                      // shaped, so the name sitting at the foot is untouched.
                      borderRadius: '999px 999px 4px 4px',
                      background: 'var(--bone)',
                      border: '1px solid var(--hairline)',
                    }}
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    {h.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.image}
                        alt={h.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(28,12,34,0) 44%, rgba(28,12,34,.30) 64%, rgba(28,12,34,.82))',
                      }}
                    />
                    <span
                      className="absolute left-0 right-0 bottom-0 px-3 pb-3 block"
                      style={{
                        fontFamily: 'var(--font-label-stack)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--track-label)',
                        fontSize: 10,
                        color: 'var(--parchment)',
                      }}
                    >
                      {h.name}
                    </span>
                  </a>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Fades on all four edges so the columns emerge and dissolve rather than
          being cut off by the container. */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: '22%', background: 'linear-gradient(to bottom, var(--parchment), transparent)' }}
      />
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: '22%', background: 'linear-gradient(to top, var(--parchment), transparent)' }}
      />
      <span
        className="pointer-events-none absolute inset-y-0 left-0"
        style={{ width: '16%', background: 'linear-gradient(to right, var(--parchment), transparent)' }}
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-0"
        style={{ width: '16%', background: 'linear-gradient(to left, var(--parchment), transparent)' }}
      />
    </div>
  );
}
