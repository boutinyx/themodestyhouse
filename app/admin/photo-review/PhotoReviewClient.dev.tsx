'use client';
import { useEffect, useState } from 'react';

type ReviewEntry = { id: string; title: string; url: string; image: string; tag: string };

export default function PhotoReviewClient() {
  const [items, setItems] = useState<ReviewEntry[]>([]);
  const [resolved, setResolved] = useState<Record<string, 'dismiss' | 'exclude'>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/photo-review/list')
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function act(id: string, action: 'dismiss' | 'exclude') {
    setResolved((prev) => ({ ...prev, [id]: action }));
    await fetch('/api/admin/photo-review', {
      method: 'POST', body: JSON.stringify({ id, action }),
    });
  }

  if (loading) return <main className="p-6">Loading flagged photos…</main>;
  const pending = items.filter((it) => !resolved[it.id]);
  if (items.length === 0) return <main className="p-6">No brand-flagged photos to review.</main>;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-1">Photo review — {pending.length} pending / {items.length} total</h1>
      <p className="mb-4 text-sm text-gray-500">
        Products whose own brand tagged them as needing new photos (e.g. &quot;retakephotos&quot;).
        Look at the image — most are fine, but this is where a real problem (like a broken CDN
        image) gets caught before it ships.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((it) => {
          const action = resolved[it.id];
          return (
            <div key={it.id} className={`border rounded overflow-hidden ${action ? 'opacity-30' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt={it.title} className="w-full aspect-[3/4] object-cover" />
              <div className="p-2">
                <div className="text-xs text-gray-500">{it.tag}</div>
                <a href={it.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline block truncate">
                  {it.title}
                </a>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => act(it.id, 'dismiss')}
                    className="flex-1 bg-green-100 py-1 text-sm rounded"
                    disabled={!!action}
                  >
                    Looks fine
                  </button>
                  <button
                    onClick={() => act(it.id, 'exclude')}
                    className="flex-1 bg-red-100 py-1 text-sm rounded"
                    disabled={!!action}
                  >
                    Broken — remove
                  </button>
                </div>
                {action && <div className="text-xs mt-1 text-gray-500">{action === 'dismiss' ? 'Marked fine' : 'Removed'}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
