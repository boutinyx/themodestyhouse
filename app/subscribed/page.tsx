import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Where Ghost sends a reader after they click the confirmation link in the sign-up email
 * (the free tier's "welcome page"; the only cross-origin landing Ghost honours). Ghost
 * appends a slash, so `/subscribed/` 308s here.
 *
 * Nothing to index: it exists for one reader, once. The confirmation line is the pill's
 * own (components/NewsletterSignup.tsx) rather than new copy (CLAUDE.md §10.18), and the
 * link label is the plainest one there is.
 */
export const metadata: Metadata = {
  title: 'Subscribed',
  robots: { index: false, follow: false },
};

export default function SubscribedPage() {
  return (
    <main className="max-w-[720px] mx-auto px-8 pt-24 pb-32 text-center">
      <p className="serif" style={{ fontSize: 'clamp(24px,3.2vw,34px)', lineHeight: 1.15, color: 'var(--ink)' }}>
        Thank you — you&rsquo;re on the list.
      </p>
      <Link href="/" className="btn-pill inline-block mt-8">
        Home
      </Link>
    </main>
  );
}
