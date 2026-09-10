import { describe, it, expect } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { withLinks } from './EditStory';
import { EDITS } from '../lib/edits';

// A React key is written into the page's RSC payload as a plain string. A key
// shaped like a path — "/modest-skirts-135" — gets read by Googlebot as a URL,
// crawled, and reported in Search Console as a 404 that no page ever linked to.
// docs/log/2026-09-10-gsc-request-indexing-subtypes.md, Addendum 2.
const elements = (nodes: ReactNode[]) =>
  nodes.filter((n): n is ReactElement<{ href?: string }> => isValidElement(n));

describe('withLinks — element keys never look like a URL', () => {
  it('keeps the href, but the key carries no slash', () => {
    const [link] = elements(withLinks('a satin [midi skirt](/modest-skirts) and more'));
    expect(link.props.href).toBe('/modest-skirts');
    expect(link.key).not.toContain('/');
  });

  it('keeps keys unique when one paragraph links the same page twice', () => {
    const keys = elements(withLinks('[one](/modest-skirts) then [two](/modest-skirts)')).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('holds for every paragraph of every real edit', () => {
    const paragraphs = EDITS.flatMap((e) => [...e.styling.paragraphs, ...(e.styling.paragraphsBelow ?? [])]);
    const linked = paragraphs.flatMap((p) => elements(withLinks(p)));
    expect(linked.length, 'no link or bold text in any edit, so this test checks nothing').toBeGreaterThan(0);
    for (const el of linked) expect(el.key, String(el.key)).not.toContain('/');
  });
});
