import Link from 'next/link';

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
          <Link className="tmh-link" href="/designers">All designers &rarr;</Link>
        </div>

        {/* RIGHT: fanned cards */}
        <div className="tmh-stage">
          {list.map((h, i) => {
            const verified = i === list.length - 1;
            const bg = h.image
              ? `${OVERLAY}, url("${h.image}")`
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
        .tmh-link{display:inline-block;margin-top:26px;font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.18em;font-size:12px;color:var(--aubergine);border-bottom:1px solid var(--aubergine);padding-bottom:3px}

        .tmh-stage{position:relative;height:500px;max-width:560px}
        .tmh-card{
          position:absolute;width:238px;aspect-ratio:3/4;border-radius:16px;overflow:hidden;
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
          .tmh-stage{height:auto;display:flex;gap:16px;overflow-x:auto;padding:8px 2px 16px}
          .tmh-card{position:static;flex:0 0 auto;transform:none;--rot:0deg}
          .tmh-card:hover{transform:translateY(-6px)}
        }
      `}</style>
    </section>
  );
}
