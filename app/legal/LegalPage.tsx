import { Markdown } from '@/components/Markdown';
import { LEGAL_LAST_UPDATED, type LegalDoc } from '@/lib/legal';

/** Shared shell for /privacy and /terms so the two can never drift apart. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <main className="max-w-[720px] mx-auto px-6 pt-32 pb-24">
      <div className="eyebrow">The House</div>
      <h1 className="serif mt-3" style={{ fontSize: 'clamp(32px,5.2vw,54px)', lineHeight: 1.03, color: 'var(--ink)' }}>
        {doc.title}
      </h1>
      <div className="eyebrow mt-4" style={{ color: 'var(--muted)' }}>
        Last updated {LEGAL_LAST_UPDATED}
      </div>

      <hr style={{ border: 0, borderTop: '1px solid var(--hairline)', margin: '32px 0' }} />

      <Markdown body={doc.body} />
    </main>
  );
}
