'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';

export default function CuratePage() {
  const [items, setItems] = useState<Product[]>([]);
  const [decided, setDecided] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/curate/list')
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items);
        setDecided(d.decisions);
      });
  }, []);

  async function decide(id: string, decision: 'keep' | 'cut') {
    setDecided((prev) => ({ ...prev, [id]: decision }));
    await fetch('/api/curate', { method: 'POST', body: JSON.stringify({ id, decision }) });
  }

  const pending = items.filter((p) => !decided[p.id]);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-2">Curate — tap ✕ to cut, ✓ to keep</h1>
      <p className="mb-4 text-sm text-gray-500">{pending.length} pending / {items.length} total</p>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {pending.slice(0, 120).map((p) => (
          <div key={p.id} className="border rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.image} alt={p.title} className="w-full aspect-[3/4] object-cover" />
            <div className="p-1 text-xs truncate">{p.title}</div>
            <div className="flex">
              <button onClick={() => decide(p.id, 'cut')} className="flex-1 bg-red-100 py-1">✕</button>
              <button onClick={() => decide(p.id, 'keep')} className="flex-1 bg-green-100 py-1">✓</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
