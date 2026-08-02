import Link from 'next/link';
import { LANES } from '@/lib/lanes';

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-semibold mb-2">The Modest House</h1>
      <p className="text-gray-600 mb-8">Modest fashion, curated. Find your edit.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {LANES.map((l) => (
          <Link key={l.slug} href={`/${l.slug}`} className="border rounded-lg p-6 hover:shadow-md">
            <div className="text-lg font-medium">{l.title}</div>
            <div className="text-sm text-gray-500 mt-1">{l.intro}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
