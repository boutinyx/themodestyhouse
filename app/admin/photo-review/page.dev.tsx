import { notFound } from 'next/navigation';
import { IS_LOCAL_DEV } from '@/lib/devOnly';
import PhotoReviewClient from './PhotoReviewClient.dev';

// LOCAL-ONLY. See app/admin/curate/page.dev.tsx for why this file is named
// .dev.tsx and why notFound() (not force-dynamic) is the right call here.
export default function PhotoReviewPage() {
  if (!IS_LOCAL_DEV) notFound();
  return <PhotoReviewClient />;
}
