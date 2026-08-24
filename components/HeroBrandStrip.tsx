import { BRANDS } from '@/data/brands';

/**
 * The scrolling line of real house names pinned to the top of the homepage
 * hero photo — added 2026-08-21 (Tina: "i want to add one of those moving
 * lines above everything modest finally in one place and then showing the
 * brand that we have"), then made transparent over the photo instead of a
 * solid band ("yeah but transparent" / "can you do transparent but under a
 * dark overlay but light").
 *
 * Briefly expanded to three rows 2026-08-22 on a misread of "i want 3 rows"
 * — she meant the HEADLINE should break across three lines, not this
 * strip. Reverted back to the single row here in the same session; see
 * app/page.tsx's <h1> for where the three-line request actually landed.
 *
 * Real names from `data/brands.ts`, not invented — the same honesty
 * standard the "100+ independent modest brands" subhead line was held to a
 * few revisions earlier in app/page.tsx. All 113 brands are used (not a
 * curated slice), duplicated once so the CSS loop is seamless.
 *
 * SERVER component, same reasoning as BrandMarquee: the list is known at
 * build time and the motion is pure CSS, so there's no reason to ship this
 * as a client component or serialise anything beyond plain strings.
 *
 * Positioned absolutely by the CALLER (app/page.tsx) at the top of the hero
 * — this component only owns the strip itself, not where it sits in the
 * hero stack, so it stays reusable if another page ever wants the same
 * strip in a different position.
 *
 * TWO TONES as of 2026-08-23. The strip came off the hero on 2026-08-21
 * ("can you get rid of the banner with the brands") and came back the same
 * week somewhere else: Tina, with a screenshot of the tall category icon row
 * under the hero, "i want this to be a skinny banner with the brands". So it
 * now also renders as a flat band on parchment, in that row's place.
 *
 *   tone="hero" (default) — unchanged: transparent over the photograph, with
 *     its own dark-to-clear wash, near-white text and a text-shadow. This is
 *     the version she signed off on over the hero; it is kept exactly as it
 *     was so putting it back there stays a one-line change.
 *   tone="band" — a flat bar of --aubergine-deep, "dark purple almost black"
 *     (Tina, 2026-08-23), with light text and no shadow. It went in on
 *     parchment first, the same day; she asked for the dark fill and for the
 *     band to move ABOVE the header in the same message. The hero tone's wash
 *     and text-shadow are not merely unnecessary here, they are wrong: both
 *     exist to hold text against an unpredictable PHOTOGRAPH, and a flat fill
 *     needs neither.
 *
 *     Fixed `--band-height`, not padding-derived, because `.hero-vh`
 *     subtracts it so the homepage photograph still ends at the fold. See the
 *     token's own comment in globals.css.
 *
 *     PHONE AND TABLET ONLY — `lg:hidden` ("do it only for tablet and phone
 *     desktop leave it out", same day). globals.css zeroes --band-height at
 *     the same 1024px breakpoint, which is the half that is easy to forget:
 *     hiding the band without zeroing the token leaves the desktop hero
 *     ending 40px short of the fold, for a band nobody can see.
 *
 * Everything else — the doubled list, the 260s duration, the edge mask, the
 * brass ✦ — is shared, because those are the parts she tuned by eye.
 */
export function HeroBrandStrip({ tone = 'hero' }: { tone?: 'hero' | 'band' }) {
  const names = BRANDS.map((b) => b.name);
  const doubled = [...names, ...names];
  const band = tone === 'band';

  return (
    <div
      className={`relative z-10 overflow-hidden${band ? ' lg:hidden' : ''}`}
      aria-label={`${names.length} houses in the directory`}
      style={{
        // Dark-to-clear wash behind JUST this strip — Tina explicitly asked
        // for transparent-over-the-photo, not a solid fill, but the text
        // still needs to read against whatever part of the photo is behind
        // it at any given scroll position. In `band` tone there is no photo
        // to read against, so it is a flat fill and needs no hairline: the
        // near-black against the header's parchment IS the separation.
        background: band
          ? 'var(--aubergine-deep)'
          : 'linear-gradient(to bottom, rgba(15,8,15,0.55) 0%, rgba(15,8,15,0.15) 100%)',
        // Height comes from the token, not from the row's padding — .hero-vh
        // subtracts exactly this number.
        ...(band ? { height: 'var(--band-height)', display: 'flex', alignItems: 'center' } : {}),
        // Fades the ticker's own left/right edges to transparent so names
        // scroll in and out rather than being cut off mid-word. NOT in band
        // tone — Tina, 2026-08-23: "get rid of the transparancy on the
        // beginning and end". On the hero it hid the join between the strip
        // and the photograph; on a flat bar that runs the full width there is
        // no join to hide, and the fade just made the first and last name
        // wash out against the fill.
        ...(band
          ? {}
          : {
              WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
              maskImage: 'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)',
            }),
      }}
    >
      {/* ONE row, both copies of the name list side by side inside it — see
          globals.css's comment on `.marquee-row`/`@keyframes
          marquee-horizontal` for why a horizontal loop needs this shape
          (one element, doubled content, -50% keyframe) rather than two
          independently-animated rows. `width: max-content` so the row is
          exactly twice the on-screen width of one copy. */}
      {/* Duration history: 48s -> 110s ("its too fast") -> 180s ("even
          slower") -> 260s ("even slower" again) -> 420s for the band tone
          ("slower", 2026-08-23) -> 650s ("can it be even slower", same day).
          Opacity: 0.85 -> 0.5 ("more transparent the letters"), same pass as
          the 260s bump.

          At 650s a name crosses a 390px phone in roughly a minute — closer to
          drifting than to scrolling, which is the direction every one of those
          six revisions has pushed.

          Per tone, not one shared number: the hero version's 260s is what she
          signed off on over the photograph, and the band sits at the very top
          of every page where the same speed reads as busier. */}
      <div
        className="marquee-row flex items-center"
        style={{ width: 'max-content', ['--duration' as string]: band ? '650s' : '260s' }}
      >
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            aria-hidden={i >= names.length}
            className="flex items-center gap-6 whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-label-stack)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--track-label)',
              fontSize: 12,
              // Held back from full parchment on purpose: 113 uppercase names
              // travelling past the eye at full contrast pull harder than the
              // header sitting right under them. Same reasoning as the hero
              // tone's 0.5, a little brighter because this fill is darker and
              // constant rather than whatever the photograph happens to be.
              color: band ? 'rgba(251,250,246,0.62)' : 'rgba(251,250,246,0.5)',
              ...(band ? {} : { textShadow: '0 1px 6px rgba(0,0,0,0.4)' }),
              // No vertical padding in band tone — the fixed --band-height and
              // `align-items: center` on the container place the row instead,
              // so padding here would fight the height rather than set it.
              padding: band ? '0 22px' : '13px 24px',
            }}
          >
            {name}
            {/* Brass on the hero, the same held-back white as the names in
                band tone — Tina, 2026-08-23: "can the dots be same white as
                the text". `inherit` rather than repeating the rgba, so the
                separator can never drift away from the text it separates. */}
            <span aria-hidden style={{ fontSize: 7, color: band ? 'inherit' : 'var(--brass)' }}>
              ✦
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
