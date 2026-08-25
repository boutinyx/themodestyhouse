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

/** Widths written by scripts/optimise-images.mjs for the `editorial` job.
 *
 *  1440 added 2026-08-25. Tina, on the abaya post's cover: "the best abaya
 *  brands picture is so blurry but i rememeber it being like pretty strong".
 *
 *  It was not the photograph — the source was 3344x1880. It was THIS CEILING.
 *  Measured on the live page: the cover renders 656 CSS px wide, so a 2x
 *  desktop display needs 1312 physical pixels and the largest variant that
 *  existed was 900. The browser was upscaling 1.46x, which is exactly what
 *  "blurry" looks like. A phone at 3x wanted 978 and got the same 900.
 *
 *  Safe for every original: the smallest editorial photograph is 1696px wide,
 *  and optimise-images never upscales, so a width above a source would silently
 *  write no file and leave a 404 inside the srcset. lib/staticImage.test.ts
 *  asserts every original has every width, which is what would catch that. */
export const EDITORIAL_WIDTHS = [400, 900, 1440] as const;

/**
 * Widths for the `about` job. Larger than editorial because band 2 of /about is
 * full-bleed: a 900px source on a 1440px display is visibly soft. Same set as
 * the homepage hero, which has the same job.
 */
export const ABOUT_WIDTHS = [640, 1024, 1440, 1920] as const;

type LocalDir = 'editorial' | 'about';

/**
 * The `-<width>.webp` variant for an original in `dir`, or undefined if `src`
 * is not one of ours. The pattern is built per-dir so an editorial path can
 * never resolve to an about variant — the two folders are generated at
 * different widths, so a cross-folder match would emit a URL that 404s.
 */
function variantIn(dir: LocalDir, src: string | undefined, width: number): string | undefined {
  const m = src?.match(new RegExp(`^/${dir}/([a-z0-9-]+)\\.jpe?g$`, 'i'));
  return m ? `/${dir}/${m[1]}-${width}.webp` : undefined;
}

function srcSetIn(
  dir: LocalDir,
  src: string | undefined,
  widths: readonly number[]
): string | undefined {
  if (!variantIn(dir, src, widths[0])) return undefined;
  return widths.map((w) => `${variantIn(dir, src, w)} ${w}w`).join(', ');
}

/** The `-<width>.webp` variant path, or undefined if `src` is not one of ours. */
export function editorialVariant(src: string | undefined, width: number): string | undefined {
  return variantIn('editorial', src, width);
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
  return srcSetIn('editorial', src, widths);
}

/** As `editorialVariant`, for the full-bleed photography in `public/about/`. */
export function aboutVariant(src: string | undefined, width: number): string | undefined {
  return variantIn('about', src, width);
}

/** As `editorialSrcSet`, for the full-bleed photography in `public/about/`. */
export function aboutSrcSet(
  src: string | undefined,
  widths: readonly number[] = ABOUT_WIDTHS
): string | undefined {
  return srcSetIn('about', src, widths);
}
