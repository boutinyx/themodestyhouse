// Builds colour-review.html — every colour the classifier is unsure about, with
// real product photographs and a one-click family picker.
//
//   npx tsx scripts/colour-review.mjs          # unknown + ambiguous, top 150 terms
//   npx tsx scripts/colour-review.mjs 400      # a longer tail
//   npx tsx scripts/colour-review.mjs 400 weak # include the weak-word section
//   npx tsx scripts/colour-review.mjs all      # every term, no cap
//
// MUST run under tsx — it imports .ts (Invariant 7).
//
// WHY A PAGE AND NOT A LIST. Tina asked for "a list and i will see if its
// correct or ill change it". A list of words cannot be checked: nobody knows
// whether "çağla" is green without looking at the clothes. The page groups by
// TERM, not by product, so one decision covers every row that term names — and
// every row any brand ever names that way in future, including ones the nightly
// refresh has not scraped yet. That grouping is what makes the review finite:
// measured 2026-08-29 over the 18,917 published rows, 1,899 undecided rows
// collapse to 858 terms, and the top 150 of those cover 1,058 of the rows.
//
// The page's export is the COMPLETE overrides file, with the current contents
// of data/colour-overrides.json already inlined, so reviewing a subset can
// never drop an earlier decision. It writes NOTHING itself — Invariant 2 — it
// only puts text on the clipboard for Tina to paste.
import { readFileSync, writeFileSync } from 'node:fs';
import { classifyColour, COLOUR_FAMILY_LABELS, COLOUR_FAMILY_SWATCH } from '../lib/colour.ts';
import { shopifyImage } from '../lib/shopifyImage.ts';

const args = process.argv.slice(2);
const NUM = args.find((a) => /^\d+$/.test(a));
const LIMIT = args.includes('all') ? Infinity : Number(NUM ?? 150);
const INCLUDE_WEAK = args.includes('weak');
const root = (p) => new URL(`../${p}`, import.meta.url);

const products = JSON.parse(readFileSync(root('data/products.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(root('data/colour-overrides.json'), 'utf8'));

// Group by term. `examples` is capped at 6 — enough to judge a colour, few
// enough that an 850-term page still loads.
const groups = new Map();
const weakWords = new Map();
for (const p of products) {
  const v = classifyColour(p.title);
  if (v.confidence === 'override') continue;          // already decided
  if (v.confidence === 'weak') {
    if (!v.matchedWord) continue;
    const k = v.matchedWord.toLowerCase();
    if (!weakWords.has(k)) weakWords.set(k, { key: k, kind: 'weak', proposed: v.family, rows: 0, examples: [] });
    const g = weakWords.get(k);
    g.rows++;
    if (g.examples.length < 6) g.examples.push({ image: p.image, title: p.title });
    continue;
  }
  if (!v.term) continue;                              // no suffix: nothing to key on
  const ambiguous = v.candidates.length > 1;
  if (v.family && !ambiguous) continue;               // confident, nothing to ask
  if (!groups.has(v.term)) {
    groups.set(v.term, {
      key: v.term,
      kind: ambiguous ? 'ambiguous' : 'unknown',
      proposed: v.family,
      candidates: v.candidates,
      rows: 0,
      examples: [],
    });
  }
  const g = groups.get(v.term);
  g.rows++;
  if (g.examples.length < 6) g.examples.push({ image: p.image, title: p.title });
}

// Row count descending, so the most valuable decisions are the ones she reaches
// first and `--limit` slices off a useful top rather than an arbitrary one. The
// term itself is the tie-break, so two runs over the same data produce the same
// page (Map iteration order would otherwise carry the catalogue's row order in).
const rank = (a, b) => b.rows - a.rows || a.key.localeCompare(b.key);
const items = [...groups.values()].sort(rank).slice(0, LIMIT);
const weak = INCLUDE_WEAK ? [...weakWords.values()].sort(rank).slice(0, LIMIT) : [];

/**
 * Product titles are third-party text and do contain `&`, `<` and quotes
 * ("Abaya & Dress Set", `5"` cuffs). Interpolating one raw would break the
 * markup around it, and a broken `data-key` attribute would silently export the
 * decision under the wrong term — which is exactly the failure this page cannot
 * have.
 */
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A 200px thumbnail rather than a 1.5MB original, or an 850-term page is
// hundreds of megabytes of downloads. `shopifyImage` is the site's own helper
// (lib/shopifyImage.ts): it edits the URL through `URLSearchParams`, so it
// cannot produce the malformed `?width=` / `&width=` that a hand-rolled ternary
// can, and it returns every non-Shopify URL untouched. 622 of the 18,917 rows
// are WooCommerce images on the brand's own host and must not be rewritten.
const thumb = (u) => shopifyImage(u, 200);

const FAMILIES = Object.entries(COLOUR_FAMILY_LABELS).map(([k, label]) => ({ k, label, hex: COLOUR_FAMILY_SWATCH[k] }));

/** Plain English for the header. "unknown"/"ambiguous"/"weak" are our words,
 *  not hers, and the whole page is for a non-programmer. */
const WHY = {
  unknown: 'we do not recognise this word as a colour',
  ambiguous: 'this word matched more than one colour',
  weak: 'found in the middle of the title, not in the colour slot',
};

const card = (g) => `
  <section class="term" data-key="${esc(g.key)}" data-kind="${g.kind}">
    <header>
      <h2>${esc(g.key)}</h2>
      <span class="meta">${g.rows} product${g.rows === 1 ? '' : 's'} · ${WHY[g.kind]}${
        g.candidates && g.candidates.length > 1
          ? ` · matched ${esc(g.candidates.join(' + '))}, currently filed as ${esc(g.candidates[0])}`
          : ''
      }${g.kind === 'weak' ? ` · currently ${esc(g.proposed)}` : ''}</span>
    </header>
    <div class="shots">${g.examples
      .map(
        (e) =>
          `<figure><img loading="lazy" src="${esc(thumb(e.image))}" alt="${esc(e.title)}"><figcaption>${esc(e.title)}</figcaption></figure>`,
      )
      .join('')}</div>
    <div class="picks">
      ${FAMILIES.map((f) => `<button class="pick" data-v="${f.k}"><i style="background:${f.hex}"></i>${esc(f.label)}</button>`).join('')}
      <button class="pick none" data-v="__null">Not a colour</button>
      <button class="pick skip" data-v="__skip">Skip — not sure</button>
    </div>
  </section>`;

// `</script>` inside a JSON string would close the block early; `<` is escaped
// so it cannot.
const inline = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

const html = `<!doctype html><meta charset="utf-8"><title>Colour review — The Modesty House</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
 :root{--aubergine:#441943;--parchment:#faf7f1;--ink:#241b24;--hairline:#e4ddcf;--brass:#a98a5b}
 body{margin:0;padding:24px 24px 140px;background:var(--parchment);color:var(--ink);font:15px/1.5 -apple-system,system-ui,sans-serif}
 h1{font-weight:600;margin:0 0 4px}
 .lede{color:#6b6b6b;max-width:70ch;margin:0 0 24px}
 .term{background:#fff;border:1px solid var(--hairline);border-radius:12px;padding:16px;margin:0 0 14px}
 .term[data-done]{opacity:.42}
 .term[data-done]:hover{opacity:1}
 header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
 h2{margin:0;font-size:19px;text-transform:capitalize}
 .meta{color:#8a7d6b;font-size:13px}
 .shots{display:flex;gap:8px;margin:12px 0;overflow-x:auto}
 figure{margin:0;width:118px;flex:0 0 auto}
 img{width:118px;height:148px;object-fit:cover;border-radius:8px;background:#eee;display:block;font-size:9px;color:#8a7d6b}
 figcaption{font-size:10px;color:#8a7d6b;margin-top:4px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
 .picks{display:flex;flex-wrap:wrap;gap:6px}
 .pick{display:flex;align-items:center;gap:6px;border:1px solid var(--hairline);background:#fff;border-radius:999px;padding:6px 11px;font:inherit;font-size:13px;cursor:pointer}
 .pick:hover{border-color:var(--aubergine)}
 .pick[aria-pressed=true]{background:var(--aubergine);color:#fff;border-color:var(--aubergine)}
 .pick i{width:11px;height:11px;border-radius:999px;border:1px solid rgba(0,0,0,.15);display:inline-block}
 .none{color:#a33}.skip{color:#8a7d6b}
 #bar{position:fixed;left:0;right:0;bottom:0;background:var(--aubergine);color:#fff;padding:14px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
 #bar button{font:inherit;padding:8px 16px;border-radius:999px;border:0;background:var(--brass);color:#fff;cursor:pointer}
 #said{font-size:13px}
 #fallback{display:none;position:fixed;inset:5vh 5vw auto;height:70vh;z-index:9}
 #fallback textarea{width:100%;height:100%;font:12px/1.4 ui-monospace,monospace;border:2px solid var(--aubergine);border-radius:10px;padding:10px;box-sizing:border-box}
</style>
<h1>Colour review</h1>
<p class="lede">Each block is one colourway <em>name</em>, not one product — your answer applies to every
piece any house ever names that way, including ones not scraped yet. Look at the photographs, not the word.
<strong>Skip anything you are not sure about</strong>; a skipped term simply stays unclassified, which is
better than a wrong chip. Your answers are remembered in this browser, so you can close the page and come
back. When you are done, press Copy and paste over <code>data/colour-overrides.json</code>.</p>
${items.map(card).join('')}
${
  weak.length
    ? `<h1 style="margin-top:40px">Weak matches</h1>
<p class="lede">These have no colourway suffix — the colour was found in the middle of the title, where it is
as likely to be a style name. Answering here changes how that WORD behaves in a title body only; it never
affects a proper colourway suffix.</p>${weak.map(card).join('')}`
    : ''
}
<div id="bar"><span id="count">0 decided</span><button id="copy">Copy colour-overrides.json</button><span id="said"></span></div>
<div id="fallback"><textarea readonly></textarea></div>
<script>
 const BASE = ${inline(overrides)};
 const STORE = 'tmh-colour-review';
 const decided = { terms: {}, weakWords: {} };
 let skipped = {};

 // Remembered in this browser only. An hour of answers must survive a closed
 // tab; it is never written to any file, and the clipboard export is still the
 // only way anything reaches data/colour-overrides.json.
 //
 // THE FILE OUTRANKS THE BROWSER. A key already in BASE has been exported and
 // pasted, so data/colour-overrides.json is now the record for it — and it is a
 // file Tina is told she may hand-edit. Replaying a months-old browser answer
 // over a fresh hand-edit would silently undo it, which is the one way this
 // page could destroy a decision instead of collecting one. So a stored answer
 // is kept only for a term the file does not already carry.
 try {
   const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
   if (saved && saved.terms) {
     for (const [k, v] of Object.entries(saved.terms)) if (!(k in BASE.terms)) decided.terms[k] = v;
     for (const [k, v] of Object.entries(saved.weakWords || {})) if (!(k in BASE.weakWords)) decided.weakWords[k] = v;
     skipped = saved.skipped || {};
   }
 } catch (e) { /* a corrupt entry is not worth failing the page for */ }

 const save = () => { try { localStorage.setItem(STORE, JSON.stringify({ ...decided, skipped })); } catch (e) {} };
 const countEl = document.getElementById('count');
 const total = document.querySelectorAll('.term').length;
 const recount = () => {
   const n = Object.keys(decided.terms).length + Object.keys(decided.weakWords).length;
   countEl.textContent = n + ' decided of ' + total;
 };

 document.querySelectorAll('.term').forEach(sec => {
   const key = sec.dataset.key, weak = sec.dataset.kind === 'weak';
   const bucket = weak ? decided.weakWords : decided.terms;
   const press = (v) => sec.querySelectorAll('.pick').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
   // Restore whatever this browser already holds for the term.
   if (key in bucket) { press(bucket[key] === null ? '__null' : bucket[key]); sec.dataset.done = '1'; }
   else if (skipped[(weak ? 'w:' : 't:') + key]) { press('__skip'); }
   sec.querySelectorAll('.pick').forEach(btn => btn.addEventListener('click', () => {
     const v = btn.dataset.v;
     press(v);
     const skipKey = (weak ? 'w:' : 't:') + key;
     if (v === '__skip') { delete bucket[key]; skipped[skipKey] = 1; sec.removeAttribute('data-done'); }
     else { bucket[key] = v === '__null' ? null : v; delete skipped[skipKey]; sec.dataset.done = '1'; }
     recount(); save();
   }));
 });
 recount();

 // Spread BASE first so that EVERY key it carries survives — including the
 // three "//" documentation keys. Naming them one by one, as an earlier draft
 // did, silently deleted "//terms" and "//weakWords" the first time the export
 // was pasted back.
 const buildJson = () => JSON.stringify({
   ...BASE,
   terms: { ...BASE.terms, ...decided.terms },
   weakWords: { ...BASE.weakWords, ...decided.weakWords },
 }, null, 2) + '\\n';

 document.getElementById('copy').addEventListener('click', async () => {
   const text = buildJson();
   const said = document.getElementById('said');
   try {
     await navigator.clipboard.writeText(text);
     said.textContent = 'Copied — paste over data/colour-overrides.json';
   } catch (e) {
     // navigator.clipboard needs a secure context and a user gesture, and a
     // page opened from file:// does not always qualify. Failing silently here
     // would lose the whole session, so the JSON is shown ready to select.
     const box = document.getElementById('fallback');
     box.style.display = 'block';
     const ta = box.querySelector('textarea');
     ta.value = text; ta.focus(); ta.select();
     said.textContent = 'Could not reach the clipboard — the JSON is on screen, press Cmd-C';
   }
 });
</script>`;

writeFileSync(root('colour-review.html'), html);
console.log(`colour-review.html — ${items.length} terms to review` + (weak.length ? `, ${weak.length} weak words` : ''));
console.log(`  unknown  : ${items.filter((i) => i.kind === 'unknown').length} of ${[...groups.values()].filter((i) => i.kind === 'unknown').length}`);
console.log(`  ambiguous: ${items.filter((i) => i.kind === 'ambiguous').length} of ${[...groups.values()].filter((i) => i.kind === 'ambiguous').length}`);
console.log(`  weak     : ${weak.length} of ${weakWords.size}${INCLUDE_WEAK ? '' : ' (pass "weak" to include them)'}`);
console.log('Open it with:  open colour-review.html');
