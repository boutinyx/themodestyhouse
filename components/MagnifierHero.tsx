'use client';

import Link from 'next/link';
import { useRef } from 'react';

// natural size of /hero-archive.jpg
const IW = 2400;
const IH = 2160;
const D = 200;       // lens diameter
const R = D / 2;
const Z = 2;         // magnification

export default function MagnifierHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);

  const move = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    const lens = lensRef.current;
    if (!wrap || !lens) return;
    const rect = wrap.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    // cover math (background-size:cover, position:center)
    const s = Math.max(W / IW, H / IH);
    const rw = IW * s, rh = IH * s;
    const ox = (W - rw) / 2, oy = (H - rh) / 2;
    lens.style.left = `${cx - R}px`;
    lens.style.top = `${cy - R}px`;
    lens.style.backgroundSize = `${rw * Z}px ${rh * Z}px`;
    lens.style.backgroundPosition = `${R - (cx - ox) * Z}px ${R - (cy - oy) * Z}px`;
    lens.style.opacity = '1';
  };

  return (
    <section>
      <div
        ref={wrapRef}
        className="mag-hero"
        onMouseMove={(e) => move(e.clientX, e.clientY)}
        onMouseLeave={() => { if (lensRef.current) lensRef.current.style.opacity = '0'; }}
      >
        {/* dim archive base */}
        <div className="mag-base" />
        <div className="mag-tint" />

        {/* the lens */}
        <div ref={lensRef} className="mag-lens" aria-hidden>
          <span className="mag-handle" />
        </div>

        {/* copy */}
        <div className="mag-copy">
          <div className="eyebrow" style={{ color: 'var(--parchment)', letterSpacing: '.3em' }}>Look closer</div>
          <h1 className="serif mag-h">
            The archive for
            <br />
            <span className="italic">everything</span> modest.
          </h1>
          <p className="mag-hint">Move your cursor to look inside &mdash; 8,000 pieces, 40 houses.</p>
          <Link href="/directory" className="btn-pill mag-cta">Explore the directory</Link>
        </div>
      </div>

      <style>{`
        .mag-hero{position:relative;height:100vh;min-height:560px;overflow:hidden;background:var(--aubergine);cursor:crosshair}
        .mag-base{position:absolute;inset:0;background:url('/hero-archive.jpg') center/cover;filter:blur(3px) brightness(.62) saturate(.9);transform:scale(1.06)}
        .mag-tint{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 50%, rgba(36,27,36,.35), rgba(36,27,36,.66) 90%)}

        .mag-lens{
          position:absolute;width:${D}px;height:${D}px;border-radius:50%;
          background-image:url('/hero-archive.jpg');background-repeat:no-repeat;
          pointer-events:none;opacity:0;transition:opacity .2s;
          border:5px solid var(--parchment);
          box-shadow:0 14px 34px rgba(0,0,0,.45), inset 0 0 24px rgba(0,0,0,.28), 0 0 0 2px rgba(169,138,91,.6);
          z-index:3;
        }
        .mag-lens::after{content:'';position:absolute;inset:0;border-radius:50%;
          background:radial-gradient(circle at 32% 28%, rgba(255,255,255,.28), rgba(255,255,255,0) 42%)}
        .mag-handle{position:absolute;right:-16px;bottom:-16px;width:34px;height:12px;border-radius:8px;
          background:var(--brass);transform:rotate(45deg);box-shadow:0 3px 8px rgba(0,0,0,.4)}

        .mag-copy{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 20px;pointer-events:none}
        .mag-copy .btn-pill, .mag-copy a{pointer-events:auto}
        .mag-h{color:var(--parchment);font-size:clamp(40px,7vw,84px);line-height:1.02;margin-top:14px;text-shadow:0 2px 34px rgba(0,0,0,.5)}
        .mag-hint{color:#e7dccf;font-size:13px;letter-spacing:.02em;margin-top:20px;text-shadow:0 1px 10px rgba(0,0,0,.5)}
        .mag-cta{background:var(--parchment);color:var(--aubergine);margin-top:26px}

        @media (hover:none){ .mag-hero{cursor:default} .mag-hint{display:none} }
      `}</style>
    </section>
  );
}
