import Link from 'next/link';
// ssr entrypoint: this is a server component (CLAUDE.md §6).
import { ArrowRight } from '@phosphor-icons/react/dist/ssr';
import { shopifyImage } from '@/lib/shopifyImage';

type House = {
  slug: string;
  name: string;
  image?: string;
  homepage: string;
  category: string;
  city: string;
};

const POS = ['p1', 'p2', 'p4', 'p3']; // p3 (last) is the front / verified card
const FALLBACK = [
  'linear-gradient(160deg,#c9cbb0,#8f9670)',
  'linear-gradient(160deg,#efe7dc,#d8c9b4)',
  'linear-gradient(160deg,#bfc6cf,#8793a1)',
  'linear-gradient(160deg,#e7d7d0,#b98f88)',
];
const OVERLAY = 'linear-gradient(180deg,transparent 42%,rgba(28,12,34,.86))';

export default function VerifiedSpotlight({ houses }: { houses: House[] }) {
  const list = houses.slice(0, 4);
  if (list.length === 0) return null;

  return (
    <section className="tmh-verified-sec">
      <div className="tmh-vin">
        {/* LEFT: text */}
        <div className="tmh-vtext">
          <h2 className="tmh-title">Houses that just<br />earned the <em>seal</em>.</h2>
          <p className="tmh-copy">
            Every label here has passed our review for craft, sizing and ethics, freshly
            stamped and added to the house.
          </p>
          {/* Phosphor, not &rarr; (CLAUDE.md §6). The underline is on the link
              itself, so the icon has to sit inside it to be underlined too. */}
          <Link className="tmh-link" href="/designers">
            All designers <ArrowRight size={13} weight="bold" />
          </Link>
        </div>

        {/* RIGHT: fanned cards */}
        <div className="tmh-stage">
          {list.map((h, i) => {
            const verified = i === list.length - 1;
            // A CSS background cannot carry srcset, so the width is requested
            // directly. The card renders ~228px wide; 460 covers it at 2x. One
            // of these was measured at 155KB before.
            const bg = h.image
              ? `${OVERLAY}, url("${shopifyImage(h.image, 460)}")`
              : `${OVERLAY}, ${FALLBACK[i % FALLBACK.length]}`;
            return (
              <a
                key={h.slug}
                href={h.homepage}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={`tmh-card ${POS[i] || 'p1'}`}
                style={{ backgroundImage: bg }}
              >
                {verified && <span className="tmh-badge">&#10022; Verified</span>}
                <div className="tmh-cap">
                  <h3>{h.name}</h3>
                  <p>{h.category} &middot; {h.city}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <style>{`
        .tmh-verified-sec{padding:80px 32px}
        .tmh-vin{max-width:1220px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
        .tmh-stage{order:1}
        .tmh-vtext{order:2}

        .tmh-eyebrow{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.3em;font-size:12px;color:var(--brass);margin-bottom:18px}
        .tmh-title{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(40px,5.6vw,64px);line-height:1.02;color:var(--ink)}
        .tmh-title em{font-style:italic;color:var(--plum)}
        .tmh-copy{color:#6f6353;font-size:17px;line-height:1.6;max-width:42ch;margin-top:22px}
        .tmh-link{display:inline-flex;align-items:center;gap:6px;min-height:32px;margin-top:26px;font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--aubergine);border-bottom:1px solid var(--aubergine);padding-bottom:3px}

        /* PROPORTIONAL, not fixed. The fan used to be a 560x500 stage holding
           238px cards, which is why it could not shrink and why the phone had to
           throw it away for a flat scrolling row. Expressed as an aspect-ratio
           box with a percentage-width card, the WHOLE fan scales with whatever
           width it is given — the p1–p4 offsets are already percentages, so they
           follow for free.

           At desktop this is a no-op: the column is 586px, max-width caps the
           stage at 560, 560 x 500/560 = 500px tall, and 42.5% of 560 = 238px.
           Identical to the numbers it replaces. It also fixes a latent bug
           between 820 and 1220px, where the two-column grid gave the stage less
           than 560px but the cards stayed 238px and the fan spilled out. */
        .tmh-stage{position:relative;width:100%;max-width:560px;aspect-ratio:560/500}
        .tmh-card{
          position:absolute;width:42.5%;aspect-ratio:3/4;border-radius:16px;overflow:hidden;
          border:6px solid var(--bone);
          background-size:cover;background-position:center;
          box-shadow:0 34px 60px -30px rgba(42,18,38,.55);
          transform:rotate(var(--rot));
          transition:transform .35s ease, box-shadow .35s ease;
        }
        .tmh-card:hover{transform:rotate(0) translateY(-10px) scale(1.02);box-shadow:0 44px 70px -30px rgba(42,18,38,.6);z-index:20}
        .p1{left:0%;  top:6%;  --rot:-8deg; z-index:3}
        .p2{left:24%; top:0;   --rot:5deg;  z-index:1}
        .p4{left:48%; top:4%;  --rot:9deg;  z-index:2}
        .p3{left:15%; top:22%; --rot:2deg;  z-index:5}

        .tmh-badge{
          position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:6px;
          background:var(--brass);color:var(--ink);border-radius:30px;padding:6px 14px;
          font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.14em;font-size:11px;
        }
        .tmh-cap{position:absolute;left:22px;bottom:22px;color:var(--parchment)}
        .tmh-cap h3{font-family:var(--font-display),serif;font-weight:500;font-size:28px;line-height:1}
        .tmh-cap p{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.16em;font-size:11px;margin-top:7px;opacity:.9}

        @media (prefers-reduced-motion:reduce){.tmh-card{transition:none}}
        @media (max-width:820px){
          .tmh-vin{grid-template-columns:1fr;gap:30px}
          .tmh-vtext{order:0}
          .tmh-stage{order:1}

          /* THE FAN IS KEPT ON A PHONE, just smaller — Tina's call, from the
             desktop rendering. It used to be replaced here by a horizontally
             scrolling row of upright cards, which lost the tilt, the overlap and
             the whole point of the composition.

             Nothing about the geometry is restated: .tmh-stage is an
             aspect-ratio box and .tmh-card is a percentage of it, so the fan
             simply redraws at whatever width the phone gives it. Only the things
             that do NOT scale with a percentage are adjusted below — type, border
             and inset are absolute lengths, and at ~40% of the desktop card they
             would otherwise swamp it.

             Tighter section padding buys the fan 32px of width, which is a whole
             card-width of ~9%. */
          .tmh-verified-sec{padding:56px 16px}

          /* The cards span 0%–90.5% of the stage (p4 sits at 48% and is 42.5%
             wide), so the leftover 9.5% is all on the right and the cluster
             reads left-of-centre. On desktop the stage sits in a wide column and
             it is invisible; in a 390px viewport it is a 34px gap against 16px.
             A transform, not a margin: it must not change the stage's layout box
             and push the page into horizontal scroll. */
          .tmh-stage{transform:translateX(17px)}

          /* The front / verified card centred. The three behind it span 0%–90.5%
             (p4 sits at 48% and cards are 42.5% wide), so the cluster's centre is
             45.25%; a 42.5%-wide card centres on that at left:24%. It was 15%,
             which put its centre at 36.25% — visibly left of the stack it sits in
             front of. Combined with the 12px nudge above, its centre lands within
             5px of the viewport centre at 390px.
             Mobile only: the desktop composition is the one Tina already signed
             off, and its asymmetry reads as deliberate at that size. */
          .p3{left:24%}

          .tmh-card{border-width:4px;box-shadow:0 18px 34px -20px rgba(42,18,38,.5)}
          /* No hover on a touch screen, and :hover sticks after a tap. */
          .tmh-card:hover{transform:rotate(var(--rot));box-shadow:0 18px 34px -20px rgba(42,18,38,.5)}

          .tmh-cap{left:12px;bottom:12px;right:10px}
          .tmh-cap h3{font-size:17px}
          .tmh-cap p{font-size:8px;letter-spacing:.1em;margin-top:4px}
          .tmh-badge{top:9px;left:9px;padding:4px 9px;font-size:8px;letter-spacing:.1em;gap:4px}
        }
      `}</style>
    </section>
  );
}
