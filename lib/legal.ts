import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/** The one field only the site owner can supply — the natural person named as
 *  GDPR data controller. Set NEXT_PUBLIC_OPERATOR_NAME (or fill it here) before
 *  launch; until then the pages render a visible warning rather than publishing
 *  a legal document with a placeholder in it. */
export const OPERATOR_PLACEHOLDER = '[OPERATOR NAME]';

export interface LegalDoc {
  title: string;
  body: string;
  /** True when [OPERATOR NAME] is still unfilled — blocks a clean launch. */
  incomplete: boolean;
}

export function getLegalDoc(slug: 'privacy' | 'terms'): LegalDoc | null {
  const file = path.join(process.cwd(), 'content', 'legal', `${slug}.md`);
  if (!existsSync(file)) return null;
  let body = readFileSync(file, 'utf8');

  const operator = process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim();
  const incomplete = !operator && body.includes(OPERATOR_PLACEHOLDER);
  if (operator) body = body.split(OPERATOR_PLACEHOLDER).join(operator);

  return {
    title: slug === 'privacy' ? 'Privacy Policy' : 'Terms of Service',
    body,
    incomplete,
  };
}

/** Shown as the "Last updated" date. Sourced from the file's own git-tracked
 *  content rather than build time, so it doesn't churn on every deploy. */
export const LEGAL_LAST_UPDATED = '5 August 2026';
