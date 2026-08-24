import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import type { Edit } from '@/lib/edits';

/**
 * Full-bleed homepage banner for one /edits/[slug] — the campaign block that
 * sends people into an edit. Added 2026-08-24 (Tina: "put it on the hompage").
 *
 * SERVER component. It renders plain links over a photograph; nothing here
 * needs state, and `Edit` is a type-only import so this pulls no `node:fs`
 * module into a client boundary (Invariant 10).
 *
 * Shares the edit's OWN hero photograph rather than taking a separate image:
 * the banner and the page it links to should look like the same campaign, and
 * a second image would be a second thing to keep in sync. It reuses both crops
 * for the same reason the edit page does — the desktop file is 16:9 and the
 * phone file is a 5:8 portrait built around the model, so `object-cover` alone
 * would crop her out on a phone.
 *
 * NOT CROPPED. Tina, 2026-08-24: "no dont crop it". The first cut made this a
 * short fixed-height band (~414px at 1440) and let object-cover trim the
 * photograph to fit — which removed the model's head, and no object-position
 * value fixes that in general, it just moves which part gets thrown away.
 *
 * So the banner carries the same `.edit-hero` ratio rule as the edit page
 * itself: 16/9 above 768px, 5/8 below. The box is then exactly the shape of the
 * photograph in it, and object-cover has nothing left to crop. It is taller
 * than a banner would normally be — that is the cost of showing the whole
 * image, and it was the explicit instruction.
 */
export function EditBanner({ edit }: { edit: Edit }) {
  const webp = (src: string, w: number) => src.replace(/\.jpg$/, `-${w}.webp`);
  return (
    <section className="edit-hero relative overflow-hidden" style={{ background: 'var(--aubergine)' }}>
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={`${webp(edit.imageMobile, 390)} 390w, ${webp(edit.imageMobile, 588)} 588w`}
          sizes="100vw"
        />
        <source
          srcSet={`${webp(edit.image, 640)} 640w, ${webp(edit.image, 1024)} 1024w, ${webp(edit.image, 1440)} 1440w, ${webp(edit.image, 1672)} 1672w`}
          sizes="100vw"
        />
        {/* Below the fold on every viewport, so this one IS lazy — the opposite
            call from the same photograph on the edit page, where it is the LCP
            element and must not be. */}
        {/* No object-position needed: the box is the photograph's own ratio, so
            cover has nothing to trim. Kept as `cover` rather than `contain` only
            so a sub-pixel rounding difference cannot letterbox the edges. */}
        <img
          src={edit.image}
          alt={edit.imageAlt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </picture>
      {/* Two washes, because the copy sits in a different place at each width.
          Desktop: copy is on the LEFT beside the model, so the wash is weighted
          left. Phone: there is no "beside" — the model fills the frame — so the
          copy drops to the BOTTOM and the wash is weighted there instead.
          The first cut used the left-weighted wash at every width, and on a
          390px phone that put the title straight across the lace sash: unreadable,
          and it covered the one thing the banner exists to show. */}
      <div
        aria-hidden
        className="absolute inset-0 md:hidden"
        style={{
          background:
            'linear-gradient(to top, rgba(12,6,12,0.80) 0%, rgba(12,6,12,0.55) 38%, rgba(12,6,12,0.10) 70%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block"
        style={{
          background:
            'linear-gradient(to right, rgba(12,6,12,0.62) 0%, rgba(12,6,12,0.45) 45%, rgba(12,6,12,0.18) 100%)',
        }}
      />
      {/* absolute inset-0, not a min-height — the section's ratio owns the
          height now, and anything here declaring its own would fight it.
          justify-end on a phone puts the copy at the bottom, over the dark
          satin skirt, instead of across the lace sash the banner exists to
          show; centred from md up, where it sits left of her over the door. */}
      <div className="absolute inset-0 max-w-[1220px] mx-auto px-8 flex flex-col justify-end md:justify-center pb-12 md:pb-0">
        <p className="eyebrow" style={{ color: 'rgba(251,250,246,0.85)', letterSpacing: '0.22em' }}>
          {edit.eyebrow}
        </p>
        <h2
          className="serif mt-4"
          style={{
            color: 'var(--parchment)',
            fontSize: 'clamp(34px, 5.5vw, 64px)',
            lineHeight: 1.03,
            textShadow: '0 2px 24px rgba(0,0,0,0.45)',
            maxWidth: 620,
          }}
        >
          {edit.title}
        </h2>
        <p
          className="mt-4"
          style={{ color: 'rgba(251,250,246,0.9)', fontFamily: 'var(--font-ui)', fontSize: 17, maxWidth: 460 }}
        >
          {edit.dek}
        </p>
        <div className="mt-8">
          <Link
            href={`/edits/${edit.slug}`}
            className="btn-pill inline-flex items-center gap-2"
            style={{ background: 'var(--parchment)', color: 'var(--ink)' }}
          >
            Shop the edit
            <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
