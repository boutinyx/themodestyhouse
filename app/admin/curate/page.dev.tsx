import { notFound } from 'next/navigation';
import { IS_LOCAL_DEV } from '@/lib/devOnly';
import CurateClient from './CurateClient.dev';

// LOCAL-ONLY. Registered as a route only under `next dev`.
//
// Deliberately NOT `force-dynamic`: if this file ever does get built,
// notFound() is evaluated during static prerender and the route is baked as a
// 404 into the deployment (the build emits .next/server/app/<route>.meta with
// "status": 404), served from the CDN with no function invocation.
//
// The client component is named CurateClient.dev.tsx rather than
// CurateClient.tsx on purpose. pageExtensions does not gate non-route files, so
// if this page is ever built, its client chunk is emitted to /_next/static and
// served publicly — a path no proxy matcher covers. The `.dev.` name marks it
// so nobody "speeds up the admin page" by importing curation data into it.
export default function CuratePage() {
  if (!IS_LOCAL_DEV) notFound();
  return <CurateClient />;
}
