'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';

const PAGE = 60;
type Filter = 'all' | 'keep' | 'cut' | 'undecided';

export default function CuratePage() {
  const [items, setItems] = useState<Product[]>([]);
  const [decided, setDecided] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/curate/list')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items || []);
        setDecided(d.decisions || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function decide(id: string, decision: 'keep' | 'cut') {
    setDecided((prev) => ({ ...prev, [id]: decision }));
    await fetch('/api/curate', { method: 'POST', body: JSON.stringify({ id, decision }) });
  }

  const filtered = items.filter((p) => {
    const d = decided[p.id];
    if (filter === 'all') return true;
    if (filter === 'undecided') return !d;
    return d === filter;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const clampedPage = Math.min(page, pages - 1);
  const slice = filtered.slice(clampedPage * PAGE, (clampedPage + 1) * PAGE);

  const counts = {
    keep: Object.values(decided).filter((d) => d === 'keep').length,
    cut: Object.values(decided).filter((d) => d === 'cut').length,
  };

  if (loading) return <main className="p-6">Loading products…</main>;
  if (items.length === 0)
    return <main className="p-6">No products found. Run <code>npm run scrape</code> first.</main>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Curate — tap ✕ to cut, ✓ to keep</h1>
      <p className="mb-3 text-sm text-gray-500">
        {items.length} total · {counts.keep} kept · {counts.cut} cut
      </p>
      <div className="flex gap-2 mb-4 text-sm">
        {(['all', 'undecided', 'keep', 'cut'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className={`px-3 py-1 rounded border ${filter === f ? 'bg-black text-white' : 'bg-white'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slice.map((p) => {
          const d = decided[p.id];
          return (
            <div
              key={p.id}
              className={`border rounded overflow-hidden ${d === 'cut' ? 'opacity-30' : d === 'keep' ? 'ring-2 ring-green-400' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.title} className="w-full aspect-[3/4] object-cover" />
              <div className="p-1 text-[10px] text-gray-500 truncate">{p.brandName}</div>
              <div className="px-1 text-xs truncate">{p.title}</div>
              <div className="flex">
                <button onClick={() => decide(p.id, 'cut')} className="flex-1 bg-red-100 py-1">✕</button>
                <button onClick={() => decide(p.id, 'keep')} className="flex-1 bg-green-100 py-1">✓</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-6 text-sm">
        <button disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)} className="px-3 py-1 border rounded disabled:opacity-40">← Prev</button>
        <span>Page {clampedPage + 1} / {pages} ({filtered.length} items)</span>
        <button disabled={clampedPage >= pages - 1} onClick={() => setPage(clampedPage + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next →</button>
      </div>
    </main>
  );
}
