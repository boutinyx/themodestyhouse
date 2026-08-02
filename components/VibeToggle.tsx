'use client';
import { useState } from 'react';

const VIBES = [
  { k: 'Refined', c: '#5a2c54' },
  { k: 'Street', c: '#4a4048' },
  { k: 'Maximalist', c: '#7e2e5e' },
];

export function VibeToggle() {
  const [active, setActive] = useState('Refined');
  function pick(v: { k: string; c: string }) {
    setActive(v.k);
    document.documentElement.style.setProperty('--vibe-accent', v.c);
  }
  return (
    <div className="flex gap-1 p-1 rounded-full bg-sand" style={{ boxShadow: '0 1px 3px rgba(43,38,34,0.08)' }}>
      {VIBES.map((v) => (
        <button
          key={v.k}
          onClick={() => pick(v)}
          data-active={active === v.k}
          className="px-3 py-1 rounded-full text-[11px] tracking-wide uppercase transition data-[active=true]:text-white"
          style={active === v.k ? { background: v.c } : { color: 'var(--taupe)' }}
        >
          {v.k}
        </button>
      ))}
    </div>
  );
}
