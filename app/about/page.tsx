import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | The Modesty House',
  description: 'The archive for everything modest — curated by The Tina Aesthetic.',
};

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto px-5 pt-32 pb-24 text-center">
      <h1 className="section-heading text-3xl md:text-4xl mt-3">The archive for everything modest</h1>
      <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
        The Modesty House is a curated index of modest fashion — brand by brand, piece by piece.
        A curator, not a catalogue: we frame the fashion and point you to where it&rsquo;s sold.
      </p>
    </main>
  );
}
