// Prints the last refresh report as GitHub job-summary markdown.
// Formatting lives in lib/refreshSummary.ts so it is unit-tested.
// Imports .ts — run under tsx.
import { readFileSync, existsSync } from 'node:fs';
import { formatSummary } from '../lib/refreshSummary.ts';

const file = new URL('../data/refresh-report.json', import.meta.url);
if (!existsSync(file)) {
  console.log('No `data/refresh-report.json` — the refresh did not get far enough to write one.');
  process.exit(0);
}
console.log(formatSummary(JSON.parse(readFileSync(file, 'utf8'))));
