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
  // Widths come from the EDIT, never hand-listed here. Hand-listing them is
  // exactly what broke on the v2 image swap: this component still asked for
  // -1672 and -588, widths that only existed for v1, so every source in the
  // srcset 404'd and the browser silently fell back to the full-size JPEG.
  // It looked completely fine on screen, which is why it was caught by
  // measuring naturalWidth (0) rather than by looking.
  const webp = (src: string, w: number) => src.replace(/\.jpg$/, `-${w}.webp`);
  const wash = edit.heroWash ?? 0.26;
  const washSm = edit.heroWashMobile ?? wash;
  const evenWash = edit.heroWashEven === true;
  const zoomSm = edit.heroZoomMobile ?? 1;
  const centred = edit.bannerAlign === 'center';
  return (
    <section
      className="edit-hero relative overflow-hidden"
      // The box takes the PHOTOGRAPH's shape, so object-cover has nothing to
      // crop — which is the whole requirement ("no dont crop it"). Inline,
      // because the value belongs to this edit, not to the stylesheet.
      style={{
        background: 'var(--aubergine)',
        ['--edit-ratio' as string]: String(edit.imageRatio),
        ['--edit-ratio-mobile' as string]: String(edit.imageMobileRatio),
        ['--edit-zoom-sm' as string]: String(zoomSm),
      }}
    >
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={edit.imageMobileWidths.map((w) => `${webp(edit.imageMobile, w)} ${w}w`).join(', ')}
          sizes="100vw"
        />
        <source
          srcSet={edit.imageWidths.map((w) => `${webp(edit.image, w)} ${w}w`).join(', ')}
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
      {/* Wash strength comes from the EDIT, exactly as on the edit page — same
          photograph, same campaign, so the two must not disagree.
          Its DIRECTION follows the copy: left-aligned copy gets a
          left-weighted gradient, centred copy a vertical one. A left-weighted
          wash under centred type darkens the wrong half of the picture. */}
      <div
        aria-hidden
        className="absolute inset-0 lg:hidden"
        style={{
          background: evenWash
              ? `rgba(12,6,12,${washSm})`
              : `linear-gradient(to top, rgba(12,6,12,${washSm}) 0%, rgba(12,6,12,${washSm * 0.5}) 45%, rgba(12,6,12,0.04) 80%)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden lg:block"
        style={{
          background: centred
            ? (evenWash ? `rgba(12,6,12,${wash})` : `linear-gradient(to top, rgba(12,6,12,${wash}) 0%, rgba(12,6,12,${wash * 0.7}) 50%, rgba(12,6,12,${wash * 0.5}) 100%)`)
            : evenWash
              ? `rgba(12,6,12,${wash})`
              : `linear-gradient(to right, rgba(12,6,12,${wash}) 0%, rgba(12,6,12,${wash * 0.46}) 48%, rgba(12,6,12,0.02) 100%)`,
        }}
      />
      {/* absolute inset-0, not a min-height — the section's ratio owns the
          height now, and anything here declaring its own would fight it.
          A CENTRED edit is centred at every width now, phone included — the
          block reads as one thing in the middle of the picture rather than
          drifting to the bottom on small screens.
          A left-aligned one keeps the phone copy low, which is not an arbitrary
          default: it is the fix for the lace hero, whose centred title landed
          on the pale yellow jacket and disappeared. Tied to the edit rather
          than removed globally. */}
      <div
        className={`absolute inset-0 max-w-[1220px] mx-auto px-8 flex flex-col ${
          centred
            ? 'justify-center items-center text-center'
            : 'justify-end md:justify-center pb-12 md:pb-0'
        }`}
      >
        {/* All three text sizes were raised on 2026-08-24 — Tina: "all words in
            the image can be bigger". The banner is a full-bleed, near-viewport-
            height photograph, and `.eyebrow`'s 10px default was set for a label
            sitting above a section of cards, not for type competing with an
            image this size. Each is a clamp so the jump holds from a 390px
            phone to a 1920px desktop rather than only at the width it was
            eyeballed on. */}
        <p
          className="eyebrow"
          style={{
            color: 'rgba(251,250,246,0.85)',
            letterSpacing: '0.22em',
            fontSize: 'clamp(12px, 1.15vw, 15px)',
          }}
        >
          {edit.eyebrow}
        </p>
        <h2
          className="serif mt-4"
          style={{
            color: 'var(--parchment)',
            fontSize: 'clamp(44px, 7.2vw, 88px)',
            lineHeight: 1.03,
            textShadow: '0 2px 24px rgba(0,0,0,0.45)',
            // Raised with the type. At 88px "Everyday Lace" is ~570px wide, so
            // the old 620 cap left almost no margin and the next slightly
            // longer title would have wrapped for no reason.
            maxWidth: 760,
          }}
        >
          {edit.title}
        </h2>
        {edit.dek && (
          <p
            className="mt-4"
            style={{ color: 'rgba(251,250,246,0.9)', fontFamily: 'var(--font-ui)', fontSize: 17, maxWidth: 460 }}
          >
            {edit.dek}
          </p>
        )}
        {/* An underlined link, not a pill. Tina, 2026-08-24: "i want this
            underlined instead of a border". `.btn-pill` is a filled, uppercase
            Marcellus button — the site's loudest control — and over a
            full-bleed campaign photograph it read as a form element pasted
            onto an image. The underline keeps the affordance without the box.

            The underline is on the TEXT span, not the <a>: the anchor is an
            inline-flex row with the arrow in it, so decorating the anchor would
            leave the rule running under the gap and stopping short of the icon
            (text-decoration does not draw across a replaced SVG child). */}
        <div className="mt-8">
          <Link
            href={`/edits/${edit.slug}`}
            className="inline-flex items-center gap-2"
            style={{
              color: 'var(--parchment)',
              fontFamily: 'var(--font-label-stack)',
              letterSpacing: 'var(--track-label)',
              textTransform: 'uppercase',
              fontSize: 'clamp(14px, 1.15vw, 17px)',
            }}
          >
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 6 }}>See our picks</span>
            {/* 15, not 13: the arrow is not a word, but leaving it at the old
                size next to a label that grew to 17px reads as a shrunken icon
                rather than a smaller one. */}
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
