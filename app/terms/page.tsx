import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegalDoc } from '@/lib/legal';
import { LegalPage } from '../legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | The Modesty House',
  description: 'The terms that apply when you use The Modesty House.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  const doc = getLegalDoc('terms');
  if (!doc) notFound();
  return <LegalPage doc={doc} />;
}
