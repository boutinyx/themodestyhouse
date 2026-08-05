import Link from 'next/link';
import React from 'react';

// minimal markdown: ## headings, paragraphs, **bold**, *italic*, [text](url)
function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    let m: RegExpMatchArray | null;
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
        if (t.startsWith('## ')) {
          return (
            <h2 key={i} className="serif" style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: 'var(--ink)', lineHeight: 1.15, margin: '38px 0 14px' }}>
              {inline(t.slice(3))}
            </h2>
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
