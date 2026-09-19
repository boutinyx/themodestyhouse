/**
 * Responsive variants for images stored in Ghost.
 *
 * Ghost resizes on request at `/content/images/size/w<width>/…`, and serves
 * WebP when the path carries `/format/webp/` (it is a path segment, never
 * negotiated). Only widths the active theme declares are safe: an undeclared
 * width 302s to the full-size original instead of 404ing, so the page gets
 * heavier and nothing reports it. `lib/ghostImage.test.ts` pins the widths to
 * `ghost-theme/package.json`.
 */
export const GHOST_IMAGE_WIDTHS = [400, 900, 1440] as const;

const IMAGES = '/content/images/';

function ghostHost(): string {
  return new URL(process.env.GHOST_URL ?? 'https://cms.themodestyhouse.com').host;
}

export function ghostImageVariant(src: string | undefined, width: number): string | undefined {
  if (!src || !(GHOST_IMAGE_WIDTHS as readonly number[]).includes(width)) return undefined;
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return undefined;
  }
  if (u.host !== ghostHost() || !u.pathname.startsWith(IMAGES)) return undefined;
  const rest = u.pathname.slice(IMAGES.length);
  return `${u.origin}${IMAGES}size/w${width}/format/webp/${rest}`;
}

export function ghostImageSrcSet(src: string | undefined): string | undefined {
  if (!ghostImageVariant(src, GHOST_IMAGE_WIDTHS[0])) return undefined;
  return GHOST_IMAGE_WIDTHS.map((w) => `${ghostImageVariant(src, w)} ${w}w`).join(', ');
}
