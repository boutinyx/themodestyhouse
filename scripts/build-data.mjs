// Publish step: raw + decisions + exclusions -> data/products.json
//
// NOTE: this now imports lib/nonApparel.ts, so it MUST run under tsx
// (`npm run build:data`), not bare `node`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { isNonApparel } from '../lib/nonApparel.ts';
import { onlyLargeSizesLeft } from '../lib/sizeAvailability.ts';
import { isLifecycleLive, stripLifecycle, brandDropViolations, freezeCollapsedBrands } from '../lib/lifecycle.ts';
import { demoteGarment, interleaveByBrand } from '../lib/ordering.ts';
import { isSpecialty } from '../lib/specialty.ts';
import { stripRawSignals } from '../lib/normalize.ts';
import { publishTitle as resolvePublishTitle } from '../lib/publishTitle.ts';
import { resolveGarment } from '../lib/garmentReview.ts';
import { qualityFlagTag } from '../lib/qualityFlags.ts';
import { convert } from '../lib/fx.ts';
import { withheldIds } from '../lib/deadLinkLedger.ts';

const U = (f) => new URL(`../data/${f}`, import.meta.url);

const raw = JSON.parse(readFileSync(U('raw-products.json'), 'utf8'));
const decisions = existsSync(U('decisions.json')) ? JSON.parse(readFileSync(U('decisions.json'), 'utf8')) : {};
// Manual garment corrections from the /admin/review UI. Checked FIRST in the
// re-derivation below, and never written by any automated path — the same
// separation decisions.json already relies on (§10.13: automation must never
// silently revisit a human decision).
const garmentOverrides = existsSync(U('garment-overrides.json'))
  ? JSON.parse(readFileSync(U('garment-overrides.json'), 'utf8'))
  : {};
// Manual specialty-lane corrections (Modest Activewear, Layering Basics —
// the two lanes garmentOverrides above can't reach, since lib/specialty.ts
// classifies them from title text, not `garment`). Same
// never-written-by-automation guarantee as garmentOverrides. See
// docs/log/2026-08-12-lane-overrides.md.
const laneOverrides = existsSync(U('lane-overrides.json'))
  ? JSON.parse(readFileSync(U('lane-overrides.json'), 'utf8'))
  : {};
// Tina's hand-curated Modest Dresses sub-categories — Everyday / Occasion /
// Slip, 2026-08-26. Same never-written-by-automation guarantee as
// garmentOverrides and laneOverrides above, and for a stronger reason: there is
// no classifier underneath this one to fall back on, so a lost entry is a lost
// human judgement that cannot be re-derived. See lib/specialty.ts::dressSubtype
// and the DressSubtype doc comment in lib/types.ts.
const dressSubtypes = existsSync(U('dress-subtypes.json'))
  ? JSON.parse(readFileSync(U('dress-subtypes.json'), 'utf8'))
  : {};
// Tina's hand-picked card photograph, for the cases pickImage() cannot reason
// its way to. Same never-written-by-automation guarantee as the three maps
// above. It exists because pickImage() runs at SCRAPE time and raw rows are
// frozen (§8) — so a photograph chosen by hand and stored on the row would be
// silently reverted by the next `npm run refresh`. Applied here, at publish
// time, it survives every refresh. First case, 2026-08-27: Urban Modesty's
// Knit Sweater, whose six images are all 1086x1448 PNGs, so every signal
// pickImage has is a tie and it takes the first — which is the CROPPED version.
// Tina asked for the long one. See lib/imageOverrides.test.ts for the guards.
const imageOverrides = existsSync(U('image-overrides.json'))
  ? JSON.parse(readFileSync(U('image-overrides.json'), 'utf8'))
  : {};
// Ids reviewed via the /admin/photo-review UI and confirmed fine — stops a
// dismissed item from being pushed back into review on every publish.
// Never written by any automated path. An item found to actually be broken
// is removed via data/exclusions.json instead (verdict() catches it before
// this file is ever consulted), not tracked here.
const photoReviewDismissed = existsSync(U('photo-review-decisions.json'))
  ? JSON.parse(readFileSync(U('photo-review-decisions.json'), 'utf8'))
  : {};

// Persistent exclusion list (men's items, cut brands, pinned ids). This is a
// women's modest-fashion directory; see data/exclusions.json. Enforced here so a
// rebuild can never reintroduce excluded items.
const excl = JSON.parse(readFileSync(U('exclusions.json'), 'utf8'));

/* Title translation, applied HERE at publish time rather than by the Python
 * post-hook. This is the fix for a regression that ran for as long as the
 * nightly refresh has existed.
 *
 * What was wrong: `postbuild:data` / `postrefresh` call `npm run translate`,
 * which is guarded on `[ -x .venv-style/bin/python ]`. The GitHub runner in
 * .github/workflows/refresh.yml sets up Node and nothing else, so that guard is
 * always false in CI — the hook prints "skipped" and the refresh commits and
 * pushes untranslated titles. A local publish translated them, the next nightly
 * refresh reverted them, and neither left a mark. Measured 2026-08-10: 561
 * published rows carrying Dutch and French titles whose English versions were
 * sitting in the committed cache the whole time.
 *
 * Why applying the cache is enough, and why there is no network call here: the
 * cache is keyed by the ORIGINAL feed title and raw-products.json still holds
 * those originals, so a pure lookup translates everything the cache knows —
 * 2,238 rows as of today — deterministically, with no Python, no venv and no
 * HTTP. scripts/translate_titles.py keeps its job: it POPULATES the cache for
 * titles never seen before, which does need the network. That split means CI
 * can never again publish a title the project has already translated.
 *
 * The two files are read defensively. A missing translate-brands.json means "no
 * brand needs translating", which is the correct reading of an absent list, and
 * a missing cache means "nothing translated yet" — neither should fail a build
 * whose real job is publishing the catalogue.
 */
const translateBrands = existsSync(U('translate-brands.json'))
  ? JSON.parse(readFileSync(U('translate-brands.json'), 'utf8'))
  : {};
const titleCache = existsSync(U('title-translations.json'))
  ? JSON.parse(readFileSync(U('title-translations.json'), 'utf8'))
  : {};
const translationStats = { translated: 0, uncached: 0 };

/** The published title. The rule itself lives in lib/publishTitle.ts so that
 *  lib/titleTranslations.test.ts can assert against the REAL function rather
 *  than a copy of it, and so there is exactly one place that decides what a
 *  published title is. This wrapper only carries the counters.
 */
function publishTitle(p) {
  const r = resolvePublishTitle(p.title, p.brandSlug, translateBrands, titleCache);
  if (r.translated) translationStats.translated += 1;
  if (r.uncached) translationStats.uncached += 1;
  return r.title;
}
const titleRes = (excl.patterns || []).map((s) => new RegExp(s, 'i'));
const urlRes = (excl.urlPatterns || []).map((s) => new RegExp(s, 'i'));
const excludedIds = new Set(excl.ids || []);
const excludedBrands = new Set(excl.brands || []);
// Escape hatch: a reviewed keep that the non-apparel veto gets wrong.
const allowIds = new Set(excl.nonApparelAllowIds || []);
// Editorial pins — see exclusions.json's `_sizeFloorAllowIds`. Exempt from the
// size floor ONLY; every other reason a product can leave the catalogue still
// applies to a pinned id.
const sizeFloorPins = new Set(excl.sizeFloorAllowIds || []);
// Products whose outbound link is dead, from data/dead-links.json — written by
// the weekly sweep (.github/workflows/dead-links.yml, scripts/dead-links.mjs)
// and never by hand. Tina, 2026-09-15: "id rather not touch anything and
// everything will be automatic". Same shape as the size floor: evaluated at
// PUBLISH time, never written into decisions.json, so a product returns on the
// first publish after its link works again. lib/deadLinkLedger.ts holds the
// rules about what counts (a 404 once, a redirect twice, a brand-wide failure
// never).
const deadLinked = existsSync(U('dead-links.json'))
  ? withheldIds(JSON.parse(readFileSync(U('dead-links.json'), 'utf8')))
  : new Set();
// Brands that are legitimately accessory-heavy, so Guard 3 shouldn't fail on them.
const expectedHot = new Set(excl.brandNonApparelExpected || []);

const rejected = [];
const review = [];

// Price ceiling, Tina's explicit call 2026-08-13: nothing above $550
// USD-equivalent. Compared on the CONVERTED price (lib/fx.ts::convert(),
// the same math the site's own USD display already uses), never the raw
// `price` field — that field is in each brand's native currency, and 550
// means wildly different things across AED/TRY/GBP/etc. A product whose
// currency has no FX rate is let through uncapped rather than guessed at
// or silently dropped — `convert()` returns null for that case.
const PRICE_CEILING_USD = 550;
function exceedsPriceCeiling(p) {
  const usd = convert(p.price, p.currency, 'USD');
  return usd !== null && usd > PRICE_CEILING_USD;
}

/** Returns a rejection object, or null to keep. */
function verdict(p) {
  if (excludedBrands.has(p.brandSlug)) return { reason: 'brand-blacklist' };
  if (excludedIds.has(p.id)) return { reason: 'id-pin' };
  if (titleRes.some((re) => re.test(p.title || ''))) return { reason: 'title-pattern' };
  if (urlRes.some((re) => re.test(p.url || ''))) return { reason: 'url-pattern' };
  if (exceedsPriceCeiling(p)) {
    const usd = convert(p.price, p.currency, 'USD');
    return { reason: 'price-ceiling', evidence: `${p.price} ${p.currency} (~$${Math.round(usd)})` };
  }
  // Tina's rule, 2026-08-28: once the only sizes still in stock are XL or
  // bigger, the product stops being published. Evaluated fresh on every publish
  // rather than written into decisions.json, so a restocked S/M/L brings it
  // straight back with no human action — sizes move daily and a permanent cut
  // would be wrong within a week. Rows with no size data (WooCommerce brands,
  // one-size hijabs, 52-60 abaya sizing, and every row ingested before this
  // rule existed) are untouched by construction — see lib/sizeAvailability.ts.
  // A pinned product keeps its page even when only XL+ is left, because Tina
  // has published a link to it — see exclusions.json's `_sizeFloorAllowIds`.
  // Checked BEFORE the rule rather than after, so the pin actually overrides
  // it; placed here rather than at the top of verdict() so a pin can never
  // resurrect something a brand blacklist, an exclusion or the price ceiling
  // has already rejected.
  if (!sizeFloorPins.has(p.id) && onlyLargeSizesLeft(p.raw?.sizes)) {
    const left = p.raw.sizes.filter((s) => s.available).map((s) => s.label).join(', ');
    return { reason: 'only-large-sizes', evidence: `in stock: ${left}` };
  }
  // Checked after the size floor and before the non-apparel veto for the same
  // reason the size floor sits where it does: a pin must not resurrect a row
  // something earlier already rejected, and a dead link is a fact about the
  // destination rather than about the garment.
  if (deadLinked.has(p.id)) return { reason: 'dead-link', evidence: p.url };
  if (allowIds.has(p.id)) return null;
  const v = isNonApparel({ title: p.title, url: p.url, ...(p.raw || {}) });
  return v.rejected ? { reason: `non-apparel:${v.reason}`, tier: v.tier, evidence: v.evidence } : null;
  // NOTE: there is deliberately NO `garment === 'other'` rejection here. Those
  // rows were inspected and are real clothing the tagger simply could not name
  // (baju kurung, bisht, belted jacket). They go to review, never to deletion.
}

// Lifecycle counters, reported separately: `delisted` is the merchants' doing
// (ordinary churn), `filtered` is ours (possibly a classifier regression).
let delistedCount = 0;

const kept = raw.filter((p) => {
  if (decisions[p.id] !== 'keep' || !p.inStock) return false;
  // A product with no price is not a product a shopper can act on. Found when
  // the 2026-08-10 batch surfaced 12 rows priced 0 — İpekstil's "Kombin Kutusu"
  // (outfit-box) configurators and one Vivi Zubedi row, all of which list no
  // price in the feed at all. `lib/catalogue.test.ts` already treats price 0 as
  // an unpopulated required field, so the pipeline agreeing with it is the fix;
  // the alternative was 12 hand-written ids in exclusions.json that would say
  // nothing about the next feed that does this.
  if (!(p.price > 0)) {
    review.push({ id: p.id, title: p.title, url: p.url, why: 'no-price' });
    return false;
  }
  if (p.delistedAt) { delistedCount++; return false; }
  if (p.filteredAt) {
    // Actionable: the brand still sells this, our own rules dropped it.
    review.push({ id: p.id, title: p.title, url: p.url, why: `filtered:${p.filterReason || 'unknown'}` });
    return false;
  }
  if (!isLifecycleLive(p)) return false;
  const v = verdict(p);
  if (v) {
    rejected.push({ id: p.id, brandSlug: p.brandSlug, title: p.title, url: p.url, garmentWas: p.garment, ...v });
    return false;
  }
  const decision = resolveGarment(p, garmentOverrides);
  if (decision.status === 'held') {
    review.push({
      id: p.id, title: p.title, url: p.url, why: decision.why,
      titleGuess: decision.titleGuess, typeGuess: decision.typeGuess,
    });
    return false;
  }
  // Safe: `raw` was freshly parsed this run and nothing reads `p` before this
  // point in the pipeline — interleaveByBrand/demoteGarment/publishTitle all
  // run AFTER this filter, so they see the resolved value.
  p.garment = decision.garment;
  const laneOverride = laneOverrides[p.id];
  if (laneOverride) {
    p.forcedLane = laneOverride.lane;
    if (laneOverride.subtype && laneOverride.lane === 'layering-basics') {
      p.forcedLayeringSubtype = laneOverride.subtype;
    }
    if (laneOverride.subtype && laneOverride.lane === 'outerwear') {
      p.forcedOuterwearSubtype = laneOverride.subtype;
    }
  }
  // Stamped rather than looked up at render time so the 419-entry map never
  // enters a client-reachable module graph: lib/compactCatalogue.ts is imported
  // by components/FilterableGrid.tsx ('use client'), so a JSON import there
  // would ship the whole map to every browser on every grid page (Invariant 16).
  // Same mechanism laneOverrides above already uses, for the same reason.
  const dressSub = dressSubtypes[p.id];
  if (dressSub) p.curatedDressSubtype = dressSub;
  const imageOverride = imageOverrides[p.id];
  if (imageOverride) p.image = imageOverride;
  // Informational only — does NOT hold the item back. A merchant flagging
  // their own listing ("retakephotos" etc.) is usually still a fine photo
  // (measured: 9/10 for one brand's tag), not proof it's broken. This is
  // what should have caught the lameera-moda CDN-glitch listing before Tina
  // found it live — the tag was already there, nothing was reading it.
  const flag = p.raw && qualityFlagTag(p.raw.tags);
  if (flag && !photoReviewDismissed[p.id]) {
    review.push({ id: p.id, title: p.title, url: p.url, image: p.image, why: 'brand-flagged-photo-issue', tag: flag });
  }
  return true;
});

// ---- GUARD 1: SKU-family contamination -> review queue ---------------------
// Merchants encode category in the SKU prefix. If most of a family is vetoed,
// the survivors are suspect too — that is how an UNKNOWN new accessory category
// surfaces without anyone having written a regex for it.
const SKU = /\b([A-Z]{1,4})[-_ ]?\d{3,5}\b/;
const fam = new Map();
for (const p of raw) {
  const m = (p.title || '').match(SKU);
  if (!m) continue;
  const k = `${p.brandSlug}|${m[1]}`;
  if (!fam.has(k)) fam.set(k, { n: 0, bad: 0, survivors: [] });
  const f = fam.get(k);
  f.n++;
  if (isNonApparel({ title: p.title, ...(p.raw || {}) }).rejected) f.bad++;
  else f.survivors.push({ id: p.id, title: p.title, url: p.url });
}
for (const [k, f] of fam) {
  if (f.n >= 4 && f.bad / f.n >= 0.5) {
    for (const s of f.survivors) {
      review.push({ ...s, why: 'contaminated-sku-family', family: k, rate: +(f.bad / f.n).toFixed(2) });
    }
  }
}

// ---- GUARD 3: per-brand rate ceiling --------------------------------------
// Catches a rule that eats one brand alive.
// Counts ONLY non-apparel vetoes. A brand-blacklisted or id-pinned brand is
// 100% rejected by definition and would otherwise trip this guard forever.
const byBrand = {};
for (const r of rejected) {
  if (!String(r.reason).startsWith('non-apparel:')) continue;
  byBrand[r.brandSlug] = (byBrand[r.brandSlug] || 0) + 1;
}
for (const [b, n] of Object.entries(byBrand)) {
  const total = raw.filter((p) => p.brandSlug === b).length;
  if (n / total > 0.25 && !expectedHot.has(b)) {
    throw new Error(
      `Brand ${b} is ${(100 * n / total).toFixed(0)}% non-apparel (${n}/${total}). ` +
      `If intended, add it to exclusions.json.brandNonApparelExpected.`,
    );
  }
}

// ---- GUARD 2: per-brand collapse guard -------------------------------------
// Replaces the old global `Math.abs(published - prev) > 40` ratchet, which a
// real refresh would trip every single time (churn across 32 brands moves the
// total by hundreds) and which let losses cancel out against gains — a brand
// whose feed died could vanish entirely while the total barely moved.
const countByBrand = (rows) => rows.reduce((a, p) => ((a[p.brandSlug] = (a[p.brandSlug] || 0) + 1), a), {});
const prevRows = existsSync(U('products.json')) ? JSON.parse(readFileSync(U('products.json'), 'utf8')) : null;
// Brand round-robin first, then push abayas lower. Abayas are ~37% of the
// browsable catalogue and dominated the scroll; this thins them to ~15% over the
// first 100 and blends back to their natural share by ~300. Their order relative
// to each other is untouched, so /modest-abayas is unaffected (lib/ordering.ts).
// The predicate MUST match browseProducts() in lib/products.ts — that is the
// sequence the shopper sees, and capping against any other one moves abayas the
// wrong way (measured: 12% -> 21% when computed over the raw list).
const inMixedGrid = (p) => p.garment !== 'hijab' && !isSpecialty(p);
// Re-clean AND translate titles at PUBLISH time, not just at ingest. build-data
// never re-runs normalizeProduct, so rows scraped before a normalizeTitle change
// keep their old title forever — that is the "raw rows are frozen" landmine in
// CLAUDE.md §8. Doing it here fixes 141 titles showing a literal "&#8211;" and
// 460 SHOUTING titles across every brand, with no re-scrape — and, since
// 2026-08-10, applies the translation cache so CI cannot publish a title the
// project has already translated. See publishTitle() above.
const published = demoteGarment(interleaveByBrand(kept), 'abaya', inMixedGrid)
  .map((p) => ({ ...p, title: publishTitle(p) }));

// Write the audit trail BEFORE the guard can act on it — a frozen brand's
// warning tells the operator to review these files, so they have to exist by
// then either way.
writeFileSync(U('rejected.json'), JSON.stringify(rejected, null, 2));
writeFileSync(U('review.json'), JSON.stringify(review, null, 2));

// Most lifecycle bookkeeping is raw-side only and stripped here — lastSeen on
// ~23k rows would add real weight to this file AND to every RSC payload (§8's
// real scaling ceiling). firstSeen is the one exception: it's now a published
// field (stripLifecycle keeps it) so the Sort control's Newest/Oldest options
// have real data — see lib/lifecycle.ts and lib/compactCatalogue.ts.
const finalRows = published.map(stripLifecycle).map(stripRawSignals);

// GUARD 2 used to be a hard stop for the WHOLE catalogue: one brand collapsing
// meant products.json was never written at all, for any brand. Changed
// 2026-08-20 after Abadia's own price collapse (see
// docs/log/2026-08-20-refresh-failure-abadia-price-collapse.md) silently
// blocked ~120 OTHER brands' legitimate nightly updates, indefinitely, since
// the collapse wasn't transient — every subsequent run would have failed the
// same way forever. Now a collapsed brand is FROZEN at its previous published
// rows (freezeCollapsedBrands) while every other brand still publishes
// normally. ALLOW_LARGE_DIFF still bypasses this entirely and accepts the new
// (collapsed) state, same as before — that remains the way to say "this
// collapse is real, not a dead feed."
let rowsToWrite = finalRows;
let frozenBrands = [];
if (prevRows && !process.env.ALLOW_LARGE_DIFF) {
  // A slug in exclusions.json.brands is a human saying the drop is intended,
  // which is the one thing brandDropViolations cannot work out for itself.
  // Without it, cutting a brand needed ALLOW_LARGE_DIFF=1 — all-or-nothing,
  // and on 2026-09-04 that would have swept two unrelated collapsed brands
  // (107 rows) through alongside the 14 actually being cut.
  const drops = brandDropViolations(
    countByBrand(prevRows),
    countByBrand(finalRows),
    new Set(excl.brands ?? []),
  );
  if (drops.length) {
    frozenBrands = drops;
    rowsToWrite = freezeCollapsedBrands(prevRows, finalRows, drops);
    console.warn(
      `\n⚠️  ${drops.length} brand(s) collapsed and were FROZEN at their previous published ` +
      `state (every other brand still published normally):\n` +
      drops.map((d) => `  ${d.brandSlug}: ${d.prev} -> ${d.next} (-${(d.pct * 100).toFixed(0)}%), frozen at ${d.prev}`).join('\n') +
      `\nA dead feed or a broken filter looks exactly like this. Review data/rejected.json ` +
      `(${rejected.length} rows) and data/refresh-report.json. Re-run with ALLOW_LARGE_DIFF=1 to ` +
      `accept the new (collapsed) state instead of freezing.\n`,
    );
  }
}

// Surfaced in the GitHub Step Summary (lib/refreshSummary.ts) so a frozen
// brand is visible in the Actions UI even though the job now SUCCEEDS instead
// of failing — a silent freeze would be exactly the kind of "brand quietly
// stops being maintained for weeks" gap CLAUDE.md already warns about for
// incomplete fetches.
//
// `untranslatedTitles` rides along for the same reason. The publish has always
// PRINTED that count, and on 2026-09-04 Tina found 186 products reading in
// Turkish, Dutch, French and German — the number had been in the nightly's log
// every morning and nobody reads a log line. In the step summary it is a
// warning block next to the frozen brands, which is where someone looks.
if (existsSync(U('refresh-report.json'))) {
  const report = JSON.parse(readFileSync(U('refresh-report.json'), 'utf8'));
  writeFileSync(
    U('refresh-report.json'),
    JSON.stringify({ ...report, frozenBrands, untranslatedTitles: translationStats.uncached }, null, 2),
  );
}

writeFileSync(U('products.json'), JSON.stringify(rowsToWrite, null, 2));

const byReason = rejected.reduce((a, r) => ((a[r.reason] = (a[r.reason] || 0) + 1), a), {});
console.table(byReason);
console.log(
  `Published ${rowsToWrite.length} products (mixed across ${new Set(rowsToWrite.map((p) => p.brandSlug)).size} brands` +
  (frozenBrands.length ? `, ${frozenBrands.length} frozen` : '') + `) ` +
  `| rejected ${rejected.length} | review ${review.length} | delisted-by-brand ${delistedCount}`,
);
// Reported unconditionally, including the zeroes. The regression this replaced
// was invisible precisely because the skipped hook printed a cheerful
// "title-translation skipped" and nothing downstream ever counted the result.
console.log(
  `Titles: ${translationStats.translated} translated from cache` +
  (translationStats.uncached
    ? ` | ${translationStats.uncached} in non-English brands NOT in the cache ` +
      `— run scripts/translate_titles.py locally to fill them`
    : ' | cache covers every non-English title'),
);
