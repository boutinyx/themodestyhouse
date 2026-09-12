import Link from 'next/link';
import { SITE_SECTIONS, type SiteSection } from '@/lib/siteSections';
import { MARKDOWN_HOME_PATH } from '@/lib/agentPaths';

/**
 * The 404 page. Until 2026-09-13 there was none, so an unknown path rendered
 * Next's default "This page could not be found." inside the layout: a real 404
 * status, but nowhere to go from it except the header.
 *
 * It lists the site's top-level sections (lib/siteSections.ts, so a new lane
 * appears here automatically), the sitemap, and the two plain-text files an
 * agent reads. An agent-readiness scan (orank) asks a 404 for exactly this, so
 * an agent that guessed a URL can recover.
 *
 * Labels only, no composed copy (§10.18): the heading says what happened and
 * every link is named by its own page title.
 */
export default function NotFound() {
  // Categories are the long tail; the index pages are what someone lost wants first.
  const first = ['new-in', 'designers', 'editorial'];
  const sections = [
    ...first.map((slug) => SITE_SECTIONS.find((s) => s.slug === slug)).filter((s): s is SiteSection => s !== undefined),
    ...SITE_SECTIONS.filter((s) => !first.includes(s.slug) && s.slug !== 'about'),
  ];

  return (
    <main className="max-w-[760px] mx-auto px-8 pt-12 md:pt-16 pb-24">
      <h1 className="section-heading text-3xl md:text-4xl">Page not found</h1>
      <nav aria-label="Site sections" className="mt-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {sections.map((s) => (
            <li key={s.slug}>
              <Link href={`/${s.slug}`} style={{ color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Plain <a>, not <Link>: these are files, not app routes, and
          prefetching them as RSC would request something that does not exist. */}
      <p className="mt-10 text-sm" style={{ color: 'var(--muted)' }}>
        <a href="/sitemap.xml" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>sitemap.xml</a>
        {' · '}
        <a href="/llms.txt" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>llms.txt</a>
        {' · '}
        <a href={MARKDOWN_HOME_PATH} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}>index.md</a>
      </p>
    </main>
  );
}
