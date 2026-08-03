import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Editorial | The Modesty House',
  description: 'Stories, edits and styling from The Modesty House.',
};

export default function EditorialPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 py-24 text-center">
      <div className="eyebrow">Editorial</div>
      <h1 className="section-heading text-3xl md:text-4xl mt-3">Coming soon</h1>
      <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
        Stories, edits and styling from The Modesty House.
      </p>
    </main>
  );
}
