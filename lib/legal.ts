import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Loader for the two legal documents rendered by /privacy and /terms.
 *
 * This used to substitute an `[OPERATOR NAME]` placeholder from
 * NEXT_PUBLIC_OPERATOR_NAME and render a "not ready to publish" banner while it
 * was unset. That machinery is gone: the GDPR data controller is now named
 * directly in the markdown (The Modesty House, based in the Netherlands), so
 * the env var was indirection around a constant — and because NEXT_PUBLIC_* is
 * inlined at BUILD time, forgetting to set it in Railway would have shipped the
 * banner to production.
 *
 * The guard it provided is not lost, it moved earlier: lib/legal.test.ts fails
 * if any document under content/legal/ still contains an unfilled placeholder.
 * That breaks CI instead of a visitor's screen.
 */

export interface LegalDoc {
  title: string;
  body: string;
}

export function getLegalDoc(slug: 'privacy' | 'terms'): LegalDoc | null {
  const file = path.join(process.cwd(), 'content', 'legal', `${slug}.md`);
  if (!existsSync(file)) return null;

  return {
    title: slug === 'privacy' ? 'Privacy Policy' : 'Terms of Service',
    body: readFileSync(file, 'utf8'),
  };
}

/** Shown as the "Last updated" date. Sourced from the file's own git-tracked
 *  content rather than build time, so it doesn't churn on every deploy.
 *  Bump this whenever content/legal/*.md changes in a way a reader would care
 *  about. */
export const LEGAL_LAST_UPDATED = '6 August 2026';
