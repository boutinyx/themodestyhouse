'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';

const PAGE = 60;
type Filter = 'all' | 'undecided' | 'keep' | 'cut';

export function StaffCurateClient() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [decided, setDecided] = useState<Record<string, 'keep' | 'cut'>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/staff/curate/list')
      .then((r) => {
        if (r.status === 401) { router.push('/staff/login'); throw new Error('unauthorized'); }
        return r.json();
      })
      .then((d) => {
        setItems(d.items || []);
        setDecided(d.decisions || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function decide(id: string, decision: 'keep' | 'cut') {
    const prev = decided[id];
    setDecided((cur) => ({ ...cur, [id]: decision }));
    const res = await fetch('/api/staff/curate/decide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, decision }),
    });
    if (!res.ok) {
      // Revert on failure rather than leaving the UI claiming a save that
      // didn't happen — a silently-lost cut is worse than an obvious one.
      setDecided((cur) => ({ ...cur, [id]: prev as 'keep' | 'cut' }));
    }
  }

  async function logout() {
    await fetch('/api/staff/logout', { method: 'POST' });
    router.push('/staff/login');
  }

  const brands = useMemo(
    () => [...new Set(items.map((p) => p.brandSlug))].sort(),
    [items],
  );

  const filtered = useMemo(() => items.filter((p) => {
    if (brandFilter !== 'all' && p.brandSlug !== brandFilter) return false;
    const d = decided[p.id];
    if (filter === 'undecided' && d) return false;
    if ((filter === 'keep' || filter === 'cut') && d !== filter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.brandName.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, decided, filter, brandFilter, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const clampedPage = Math.min(page, pages - 1);
  const slice = filtered.slice(clampedPage * PAGE, (clampedPage + 1) * PAGE);

  const counts = {
    keep: Object.values(decided).filter((d) => d === 'keep').length,
    cut: Object.values(decided).filter((d) => d === 'cut').length,
  };

  if (loading) return <main className="p-6">Loading products…</main>;

  return (
    <main className="p-6" style={{ background: 'var(--parchment)', minHeight: '100vh' }}>
      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="serif text-xl" style={{ color: 'var(--ink)' }}>
            Curate — tap ✕ to cut, ✓ to keep
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {items.length} live products · {counts.keep} kept · {counts.cut} cut this session
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page nav */}
          <a
            href="/api/staff/curate/export"
            className="px-3 py-1 rounded border"
            style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}
          >
            Download cuts (for repo sync)
          </a>
          <button onClick={logout} className="px-3 py-1 rounded border" style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}>
            Sign out
          </button>
        </div>
      </div>

      {counts.cut > 0 && (
        <p className="text-xs mb-4 px-3 py-2 rounded" style={{ background: '#fdf1e8', color: '#7a4a1f' }}>
          Cuts here are live on the site immediately, but only exist on this server.
          Download the file above and hand it to a session that can run
          <code className="mx-1">scripts/merge-live-cuts.mjs</code>
          so they survive the next deploy.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4 text-sm items-center">
        {(['all', 'undecided', 'keep', 'cut'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className="px-3 py-1 rounded border"
            style={filter === f
              ? { background: 'var(--aubergine)', color: 'var(--parchment)', borderColor: 'var(--aubergine)' }
              : { background: 'var(--bone)', borderColor: 'var(--hairline)' }}
          >
            {f}
          </button>
        ))}
        <select
          value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setPage(0); }}
          className="px-2 py-1 rounded border text-sm"
          style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}
        >
          <option value="all">All brands</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0); }}
          placeholder="Search title/brand…"
          className="px-2 py-1 rounded border text-sm flex-1 min-w-[160px]"
          style={{ borderColor: 'var(--hairline)', background: 'var(--bone)' }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slice.map((p) => {
          const d = decided[p.id];
          return (
            <div
              key={p.id}
              className="rounded overflow-hidden"
              style={{
                border: '1px solid var(--hairline)',
                opacity: d === 'cut' ? 0.35 : 1,
                boxShadow: d === 'keep' ? '0 0 0 2px #4a8a5a' : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.title} className="w-full aspect-[3/4] object-cover" loading="lazy" />
              <div className="p-1 text-[10px] truncate" style={{ color: 'var(--muted)' }}>{p.brandName}</div>
              <div className="px-1 text-xs truncate" style={{ color: 'var(--ink)' }}>{p.title}</div>
              <div className="flex">
                <button onClick={() => decide(p.id, 'cut')} className="flex-1 py-1" style={{ background: '#fbe4e4' }}>✕</button>
                <button onClick={() => decide(p.id, 'keep')} className="flex-1 py-1" style={{ background: '#e3f0e6' }}>✓</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-6 text-sm">
        <button
          disabled={clampedPage === 0}
          onClick={() => setPage(clampedPage - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
          style={{ borderColor: 'var(--hairline)' }}
        >
          ← Prev
        </button>
        <span style={{ color: 'var(--muted)' }}>Page {clampedPage + 1} / {pages} ({filtered.length} items)</span>
        <button
          disabled={clampedPage >= pages - 1}
          onClick={() => setPage(clampedPage + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40"
          style={{ borderColor: 'var(--hairline)' }}
        >
          Next →
        </button>
      </div>
    </main>
  );
}
