import Link from 'next/link';

export default function EditMagazine({ featureImage }: { featureImage?: string }) {
  return (
    <section className="max-w-[1220px] mx-auto px-8 py-20">
      <div className="edit-mag">
        {/* masthead */}
        <div className="edit-head">
          <span className="edit-meta">Autumn 2026</span>
          <span className="edit-mast">The Edit</span>
          <span className="edit-meta edit-right">N&deg;12</span>
        </div>

        {/* body */}
        <div className="edit-grid">
          {/* lead story */}
          <div className="edit-lead">
            <div className="eyebrow">The List</div>
            <h3 className="edit-h">The abaya houses defining quiet luxury.</h3>
            <div className="edit-cols">
              <p className="edit-body">
                A quiet movement is rewriting modest luxury, less spectacle, more craft. From
                London to Amman, a new generation of houses is trading logos for line and drape,
                and the results are the most confident modest fashion in years. We spent the
                season with the studios leading it, tracing how restraint became the loudest
                statement on the rail.
              </p>
            </div>
            <div className="edit-words">Words &mdash; The editorial desk</div>
          </div>

          {/* interview feature */}
          <Link
            href="/editorial"
            className="edit-feature"
            style={{
              backgroundImage: featureImage
                ? `linear-gradient(180deg,transparent 40%,rgba(28,12,34,.8)), url("${featureImage}")`
                : 'linear-gradient(160deg,#c9cbb0,#8f9670)',
            }}
          >
            <div className="edit-feat-cap">
              <div className="eyebrow" style={{ color: '#e7d3b6' }}>Interview</div>
              <div className="edit-feat-title">On craft, coverage and colour</div>
            </div>
          </Link>
        </div>
      </div>

      <style>{`
        .edit-head{
          display:grid;grid-template-columns:1fr auto 1fr;align-items:center;
          border-top:1px solid var(--ink);border-bottom:1px solid var(--hairline);
          padding:14px 0;margin-bottom:36px;
        }
        .edit-meta{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.24em;font-size:11px;color:var(--muted)}
        .edit-right{text-align:right}
        .edit-mast{font-family:var(--font-display),serif;font-weight:500;font-size:26px;letter-spacing:.04em;color:var(--ink);text-align:center}

        .edit-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;align-items:start}

        .edit-h{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(30px,3.6vw,46px);line-height:1.02;color:var(--ink);margin:14px 0 20px;max-width:14ch}
        .edit-cols{column-count:2;column-gap:32px}
        .edit-body{font-family:var(--font-display),serif;font-size:15px;line-height:1.62;color:#4c4048;margin:0}
        .edit-body::first-letter{
          float:left;font-family:var(--font-display),serif;font-weight:500;
          font-size:64px;line-height:.72;padding:6px 10px 0 0;color:var(--aubergine);
        }
        .edit-words{font-family:var(--font-label),serif;text-transform:uppercase;letter-spacing:.2em;font-size:10px;color:var(--muted);margin-top:26px}

        .edit-feature{
          position:relative;display:block;border-radius:8px;overflow:hidden;
          min-height:300px;background-size:cover;background-position:center;
          background-color:var(--aubergine);
        }
        .edit-feat-cap{position:absolute;left:22px;right:22px;bottom:20px}
        .edit-feat-title{font-family:var(--font-display),serif;font-weight:500;font-size:22px;color:var(--parchment);margin-top:6px;line-height:1.1}

        @media (max-width:820px){
          .edit-grid{grid-template-columns:1fr;gap:32px}
          .edit-cols{column-count:1}
          .edit-feature{min-height:260px}
        }
      `}</style>
    </section>
  );
}
