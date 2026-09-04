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

export interface FrozenBrandLike {
  brandSlug: string;
  prev: number;
  next: number;
  pct: number;
}

export interface ReportLike {
  date?: string;
  totals?: Record<string, number>;
  brands?: BrandReportLike[];
  /** Brands the collapse guard froze at their previous published state this
   *  run, instead of blocking the whole publish — see
   *  lib/lifecycle.ts::freezeCollapsedBrands and
   *  docs/log/2026-08-20-refresh-failure-abadia-price-collapse.md. Written by
   *  scripts/build-data.mjs, appended onto the same report scripts/refresh.mjs
   *  already wrote. */
  frozenBrands?: FrozenBrandLike[];
  /** Published rows in a `data/translate-brands.json` brand whose feed title is
   *  not in `data/title-translations.json`, so they publish in their source
   *  language. Written by scripts/build-data.mjs, which has always printed this
   *  number and had it read by nobody: on 2026-09-04 Tina found 186 titles live
   *  in Turkish, Dutch, French and German. Surfaced here so a translator step
   *  that silently stops working cannot go unnoticed for weeks. */
  untranslatedTitles?: number;
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

  // The loudest thing in this summary on purpose: a frozen brand is not being
  // maintained at all this run, and — unlike an incomplete fetch — the run
  // SUCCEEDS, so this is the only place that fact is visible.
  const frozen = report.frozenBrands ?? [];
  if (frozen.length) {
    out.push(
      `> ⚠️ **${frozen.length} brand(s) collapsed and were frozen at their previous published ` +
      `state, not updated this run:**`,
    );
    for (const f of frozen) {
      out.push(`> - \`${f.brandSlug}\`: ${n(f.prev)} → ${n(f.next)} (-${Math.round(f.pct * 100)}%), frozen at ${n(f.prev)}`);
    }
    out.push(
      `> Review \`data/rejected.json\` and \`data/refresh-report.json\`. Re-run with ` +
      `\`ALLOW_LARGE_DIFF=1\` to accept the new (collapsed) state instead of freezing.`,
    );
    out.push('');
  }

  // A title that publishes in Dutch or Turkish is visible to every visitor and
  // to nothing else — no test can assert it, because a foreign title is not
  // malformed, just wrong for this site. This line is the only alarm there is.
  const untranslated = report.untranslatedTitles ?? 0;
  if (untranslated > 0) {
    out.push(
      `> ⚠️ **${n(untranslated)} published product title(s) are still in their source ` +
      `language** — the cache did not cover them, so visitors see Dutch, French, German or ` +
      `Turkish. Run \`python3 scripts/translate_titles.py\` (it populates ` +
      `\`data/title-translations.json\` and republishes). If this number is non-zero on ` +
      `consecutive nights the workflow's translate step is failing, not just lagging.`,
    );
    out.push('');
  }

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
