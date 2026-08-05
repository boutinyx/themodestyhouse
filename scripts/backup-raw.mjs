// Durable, off-laptop backup for data/raw-products.json.
//
// WHY THIS EXISTS: raw-products.json is the only input to build-data.mjs that
// cannot be regenerated. Rows for permanently-cut brands are unrecoverable —
// their slugs are gone from BRANDS, so no scrape will ever return them again.
// It is gitignored (correctly: 9.2 MB of churn would bloat every commit), which
// meant the one irreplaceable file in the project lived on exactly one disk.
// A destructive scrape has already destroyed products once for this reason.
//
// The compressed snapshot IS tracked, so pushing the repo backs it up. 0.8 MB
// per snapshot — small enough to keep, large enough to matter.
//
// Run after every ingest:  npm run backup:raw
// Restore with:            npm run restore:raw
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';

const RAW = new URL('../data/raw-products.json', import.meta.url);
const GZ = new URL('../data/raw-products.json.gz', import.meta.url);

const mode = process.argv[2] === 'restore' ? 'restore' : 'backup';

if (mode === 'restore') {
  if (!existsSync(GZ)) {
    console.error('No snapshot at data/raw-products.json.gz — nothing to restore.');
    process.exit(1);
  }
  const rows = JSON.parse(gunzipSync(readFileSync(GZ)).toString('utf8'));
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('Snapshot did not decompress to a non-empty array. Refusing to restore.');
    process.exit(1);
  }
  // Never clobber a larger local file without saying so — that is exactly the
  // failure mode this whole script exists to prevent.
  if (existsSync(RAW)) {
    const current = JSON.parse(readFileSync(RAW, 'utf8'));
    if (current.length > rows.length && !process.env.ALLOW_SHRINK) {
      console.error(
        `Refusing to restore: local file has ${current.length} rows, snapshot has ${rows.length}. ` +
        'Restoring would LOSE rows. Re-run with ALLOW_SHRINK=1 if that is genuinely intended.',
      );
      process.exit(1);
    }
  }
  writeFileSync(RAW, JSON.stringify(rows, null, 2));
  console.log(`Restored ${rows.length} rows to data/raw-products.json`);
  process.exit(0);
}

if (!existsSync(RAW)) {
  console.error('data/raw-products.json is absent — nothing to back up.');
  process.exit(1);
}

const text = readFileSync(RAW, 'utf8');
const rows = JSON.parse(text);
if (!Array.isArray(rows) || rows.length === 0) {
  console.error('raw-products.json is not a non-empty array. Refusing to write a bad snapshot.');
  process.exit(1);
}

// Guard against silently replacing a good snapshot with a truncated one — the
// same class of bug that caused the original data loss.
if (existsSync(GZ)) {
  const prev = JSON.parse(gunzipSync(readFileSync(GZ)).toString('utf8'));
  if (rows.length < prev.length && !process.env.ALLOW_SHRINK) {
    console.error(
      `Refusing to overwrite: snapshot has ${prev.length} rows, current file has ${rows.length}. ` +
      'That is a shrink. Re-run with ALLOW_SHRINK=1 if the rows were deliberately removed.',
    );
    process.exit(1);
  }
}

const gz = gzipSync(Buffer.from(text), { level: 9 });

// Prove the artifact is readable BEFORE it replaces the previous one. A backup
// that has never been decompressed is not a backup.
const roundTrip = JSON.parse(gunzipSync(gz).toString('utf8'));
if (roundTrip.length !== rows.length) {
  console.error('Round-trip verification FAILED. Snapshot not written.');
  process.exit(1);
}

writeFileSync(GZ, gz);
console.log(
  `Backed up ${rows.length} rows -> data/raw-products.json.gz ` +
  `(${(text.length / 1048576).toFixed(1)} MB -> ${(gz.length / 1048576).toFixed(2)} MB, round-trip verified)`,
);
