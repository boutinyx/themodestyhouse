'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CATEGORY_LANES } from '@/lib/lanes';
import { VIBES } from '@/lib/vibes';

function ChipDropdown({ label, active, items }: { label: string; active?: boolean; items: { href: string; label: string }[] }) {
  return (
    <div className="relative group">
      <button type="button" className="chip" data-active={active}>{label} ▾</button>
      <div className="absolute left-0 top-full pt-2 hidden group-hover:block z-40">
        <div
          className="rounded-xl border p-2 min-w-[190px]"
          style={{ background: '#fff', borderColor: 'var(--hairline)', boxShadow: '0 8px 30px rgba(43,38,34,0.14)' }}
        >
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="block nav-link py-2 px-3 whitespace-nowrap">{it.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IndexBar() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push('/directory');
  }

  return (
    <div className="max-w-5xl mx-auto px-5">
      <div
        style={{
          background: 'var(--bone)',
          border: '1px solid var(--hairline)',
          borderRadius: 8,
          boxShadow: '0 30px 70px -40px rgba(42,18,38,.5)',
          padding: '22px 26px',
        }}
      >
        <form onSubmit={submit} className="flex flex-col md:flex-row md:items-center gap-3">
          <span className="serif italic text-lg whitespace-nowrap" style={{ color: 'var(--ink)' }}>Search the index</span>
          <input
            aria-label="Search houses, designers, cities"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search houses, designers, cities…"
            className="flex-1"
            style={{ background: 'var(--parchment)', border: '1px solid var(--hairline)', borderRadius: 40, padding: '12px 20px', fontSize: 15 }}
          />
          <button type="submit" className="btn-pill" style={{ background: 'var(--brass)', color: 'var(--ink)' }}>Search</button>
        </form>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="eyebrow mr-1">Refine</span>
          <ChipDropdown label="Category" active items={CATEGORY_LANES.map((l) => ({ href: `/${l.slug}`, label: l.title }))} />
          <ChipDropdown label="Aesthetic" items={VIBES.map((v) => ({ href: `/style/${v.slug}`, label: v.title }))} />
          <Link href="/modest-wedding-guest" className="chip">Occasion</Link>
          <Link href="/directory" className="chip">Newly verified</Link>
        </div>
      </div>
    </div>
  );
}
