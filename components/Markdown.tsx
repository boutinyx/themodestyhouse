import Link from 'next/link';
import React from 'react';

// minimal markdown: ## / ### headings, paragraphs, - bullet lists, --- rules,
// **bold**, *italic*, [text](url). Deliberately small — extended only as real
// content needed it (the legal pages added lists and rules).
function inline(text: string): React.ReactNode[] {
  // `code` is in this list because content/legal/privacy.md uses it — for the
  // favourites localStorage key and the Shopify CDN host — and without a rule
  // for it the backticks rendered as literal backticks on the live page.
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    let m: RegExpMatchArray | null;
    if ((m = p.match(/^`([^`]+)`$/))) {
      return (
        <code
          key={i}
          style={{
            // No mono token exists in this house, and introducing a fourth
            // typeface for two spans on one page is not worth it. The UI font a
            // size down on a tinted chip reads as "a literal value" without
            // changing the voice.
            fontFamily: 'var(--font-ui-stack)',
            fontSize: '0.88em',
            background: 'var(--bone)',
            border: '1px solid var(--hairline)',
            borderRadius: 4,
            padding: '1px 5px',
            wordBreak: 'break-word',
          }}
        >
          {m[1]}
        </code>
      );
    }
    if ((m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) {
      const label = m[1];
      const url = m[2];
      const style = { color: 'var(--aubergine)', textDecoration: 'underline', textUnderlineOffset: '2px' };
      return url.startsWith('/')
        ? <Link key={i} href={url} style={style}>{label}</Link>
        : <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={style}>{label}</a>;
    }
    if ((m = p.match(/^\*\*([^*]+)\*\*$/))) return <strong key={i}>{m[1]}</strong>;
    if ((m = p.match(/^\*([^*]+)\*$/))) return <em key={i} style={{ fontStyle: 'italic' }}>{m[1]}</em>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

export function Markdown({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/);
  return (
    <div>
      {blocks.map((b, i) => {
        const t = b.trim();
        if (!t) return null;
        if (t === '---') {
          return <hr key={i} style={{ border: 0, borderTop: '1px solid var(--hairline)', margin: '34px 0' }} />;
        }
        if (t.startsWith('### ')) {
          return (
            <h3 key={i} className="serif" style={{ fontSize: 'clamp(18px,2vw,22px)', color: 'var(--ink)', lineHeight: 1.2, margin: '30px 0 10px' }}>
              {inline(t.slice(4))}
            </h3>
          );
        }
        if (t.startsWith('## ')) {
          return (
            <h2 key={i} className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15, margin: '38px 0 14px' }}>
              {inline(t.slice(3))}
            </h2>
          );
        }
        // Bullet list — a block whose every line starts with "- ".
        const lines = t.split('\n');
        if (lines.length > 0 && lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i} style={{ margin: '0 0 20px', paddingLeft: 22, listStyle: 'disc' }}>
              {lines.map((l, j) => (
                <li key={j} style={{ margin: '0 0 8px', color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>
                  {inline(l.trim().slice(2))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ margin: '0 0 20px', color: '#4c4048', fontSize: 17, lineHeight: 1.72 }}>
            {inline(t)}
          </p>
        );
      })}
    </div>
  );
}
