// Renders a refresh report as GitHub job-summary markdown.
//
// Separate from scripts/refresh-summary.mjs (which is just `print(format(read()))`)
// so the formatting is unit-testable. The summary is the ONLY part of a nightly
// run anyone actually reads, so "did it crash on an odd report" matters.

export interface BrandReportLike {
  brandSlug: string;
  complete?: boolean;
  fetched?: number;
  added?: string[];
  updated?: number;
  delisted?: number;
  filtered?: { title: string; reason: string }[];
  returned?: number;
  error?: string;
}

export interface ReportLike {
  date?: string;
  totals?: Record<string, number>;
  brands?: BrandReportLike[];
}

const n = (v: number | undefined) => (v ?? 0).toLocaleString('en-GB');

export function formatSummary(report: ReportLike): string {
  const t = report.totals ?? {};
  const brands = report.brands ?? [];
  const out: string[] = [];

  out.push(`## Catalogue refresh — ${report.date ?? 'unknown date'}`);
  out.push('');
  out.push('| | |');
  out.push('|---|---:|');
  out.push(`| New arrivals | ${n(t.added)} |`);
  out.push(`| Delisted by brands | ${n(t.delisted)} |`);
  out.push(`| Re-derived | ${n(t.updated)} |`);
  out.push(`| Returned to sale | ${n(t.returned)} |`);
  out.push(`| **Dropped by our own filters** | **${n(t.filtered)}** |`);
  out.push('');

  // The single most diagnostic number in the run: brand churn is expected, our
  // own filters dropping live products is not.
  if ((t.filtered ?? 0) > 0) {
    out.push(
      `> **${n(t.filtered)} products that the brands still sell were dropped by our own ` +
      `filters.** A handful is normal churn; a large number means a classifier regression ` +
      `in \`lib/tag.ts\` or \`lib/normalize.ts\`, not merchants clearing stock. ` +
      `See \`data/refresh-report.json\`.`,
    );
    out.push('');
  } else {
    out.push('> No products were dropped by our own filters — no classifier regression.');
    out.push('');
  }

  const failed = brands.filter((b) => b.error);
  if (failed.length) {
    out.push(`### ${failed.length} brand(s) failed outright`);
    for (const b of failed) out.push(`- \`${b.brandSlug}\` — ${b.error}`);
    out.push('');
  }

  // An incomplete fetch is not an error, but it silently suspends delisting for
  // that brand — so it must be visible or a brand could quietly stop being
  // maintained for weeks.
  const incomplete = brands.filter((b) => !b.error && b.complete === false);
  if (incomplete.length) {
    out.push(`### ${incomplete.length} incomplete fetch(es) — nothing was delisted for these`);
    for (const b of incomplete) out.push(`- \`${b.brandSlug}\` (${n(b.fetched)} fetched)`);
    out.push('');
  }

  const arrivals = brands.flatMap((b) => (b.added ?? []).map((title) => `${b.brandSlug}: ${title}`));
  if (arrivals.length) {
    out.push(`<details><summary>${arrivals.length} new arrival(s) now live</summary>`);
    out.push('');
    for (const a of arrivals.slice(0, 100)) out.push(`- ${a}`);
    if (arrivals.length > 100) out.push(`- …and ${arrivals.length - 100} more`);
    out.push('');
    out.push('</details>');
    out.push('');
  }

  const changed = brands.filter((b) => !b.error && ((b.added?.length ?? 0) || b.delisted || (b.filtered?.length ?? 0)));
  if (changed.length) {
    out.push('<details><summary>Per-brand changes</summary>');
    out.push('');
    out.push('| Brand | Fetched | New | Delisted | Filtered | Returned |');
    out.push('|---|---:|---:|---:|---:|---:|');
    for (const b of changed) {
      out.push(
        `| \`${b.brandSlug}\` | ${n(b.fetched)} | ${n(b.added?.length)} | ` +
        `${n(b.delisted)} | ${n(b.filtered?.length)} | ${n(b.returned)} |`,
      );
    }
    out.push('');
    out.push('</details>');
  }

  return out.join('\n');
}
