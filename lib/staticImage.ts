/**
 * Responsive variants for the local editorial photographs in `public/editorial/`.
 *
 * These are shipped with the repo rather than hotlinked, so there is no CDN to
 * ask for a size — the variants are generated ahead of time by
 * `node scripts/optimise-images.mjs`, which writes `<name>-<width>.webp` beside
 * each original. Measured 2026-08-07: /editorial/outfit-crop.jpg was 78KB filling
 * an 84px-wide thumbnail on the homepage.
 *
 * The naming convention is the contract between that script and this function.
 * It is enforced by `lib/staticImage.test.ts`, which asserts on disk that every
 * original has every width — so adding a photograph without re-running the
 * script fails the suite instead of 404-ing in a browser.
 */

/** Widths written by scripts/optimise-images.mjs for the `editorial` job. */
export const EDITORIAL_WIDTHS = [400, 900] as const;

const EDITORIAL = /^\/editorial\/([a-z0-9-]+)\.jpe?g$/i;

/** The `-<width>.webp` variant path, or undefined if `src` is not one of ours. */
export function editorialVariant(src: string | undefined, width: number): string | undefined {
  const m = src?.match(EDITORIAL);
  return m ? `/editorial/${m[1]}-${width}.webp` : undefined;
}

/**
 * A `srcset` for a local editorial image, or undefined for anything else —
 * a remote URL, an already-converted `.webp`, or a path in another folder.
 * Undefined is what React needs in order to omit the attribute entirely.
 */
export function editorialSrcSet(
  src: string | undefined,
  widths: readonly number[] = EDITORIAL_WIDTHS
): string | undefined {
  if (!src || !EDITORIAL.test(src)) return undefined;
  return widths.map((w) => `${editorialVariant(src, w)} ${w}w`).join(', ');
}
