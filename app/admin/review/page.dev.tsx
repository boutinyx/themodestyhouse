import { notFound } from 'next/navigation';
import { IS_LOCAL_DEV } from '@/lib/devOnly';
import ReviewClient from './ReviewClient.dev';

// LOCAL-ONLY. See app/admin/curate/page.dev.tsx for why this file is named
// .dev.tsx and why notFound() (not force-dynamic) is the right call here.
export default function ReviewPage() {
  if (!IS_LOCAL_DEV) notFound();
  return <ReviewClient />;
}
