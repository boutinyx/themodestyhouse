import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegalDoc } from '@/lib/legal';
import { LegalPage } from '../legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How The Modesty House handles information about visitors.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const doc = getLegalDoc('privacy');
  if (!doc) notFound();
  return <LegalPage doc={doc} />;
}
