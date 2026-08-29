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

/** Colour read off the PHOTOGRAPHS by scripts/colour_from_images_clip.py.
 *
 *  Optional — if the file is absent the page behaves exactly as before. When it
 *  is present, a term with a STRONG reading (>=60% of >=4 photos agreeing)
 *  arrives pre-answered, because measured against 60 colour names whose answer
 *  we already knew that slice was right 86% of the time. A weak reading is
 *  shown as a hint and answers nothing: it measured 58.8%, which is not good
 *  enough to put in Tina's file on her behalf.
 *
 *  Nothing here writes data/colour-overrides.json. A suggestion is a starting
 *  point she overrides with one click, which is the difference between "I did
 *  it for you" and "I decided for you". */
let PROPOSALS = {};
try {
  const raw = JSON.parse(readFileSync(root('data/colour-proposals.json'), 'utf8'));
  for (const r of raw) {
    if (!r.family) continue;
    // THREE TIERS, because the evidence behind a reading varies enormously and
    // pretending otherwise would be the dishonest part.
    //
    //   strong — >=60% of >=4 photos agreed. Measured 91.3% against 60 colour
    //            names whose answer was already known.
    //   photo  — a reading from one to three photos. Measured 74.0% per photo
    //            over 200 products whose title states the colour, and the
    //            misses are overwhelmingly adjacent (brown/beige, blue/grey,
    //            white/cream). Pre-filled anyway: correcting one in four beats
    //            authoring all four, and these terms carry 1-3 products each.
    //   hint   — shown, never pre-filled.
    //
    // `multi` is always a hint however strong the vote. On the first run all
    // three strong multi readings were terms that are not colours at all —
    // "final sale", "luxury chiffon hijab", "pleated abaya". Asked what colour
    // a garment is, the model answers "patterned", which is true of the
    // photographs and false of the question.
    const tier = r.family === 'multi' ? 'hint' : r.strong ? 'strong' : 'photo';
    PROPOSALS[r.term] = { ...r, tier };
  }
} catch { /* not generated yet — the page is fully usable without it */ }

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
  <section class="term" data-key="${esc(g.key)}" data-kind="${g.kind}"${
    PROPOSALS[g.key]
      ? ` data-suggest="${esc(PROPOSALS[g.key].family)}" data-suggest-tier="${PROPOSALS[g.key].tier}"`
      : ''
  }>
    <header>
      <h2>${esc(g.key)}</h2>
      <span class="meta">${g.rows} product${g.rows === 1 ? '' : 's'} · ${WHY[g.kind]}${
        g.candidates && g.candidates.length > 1
          ? ` · matched ${esc(g.candidates.join(' + '))}, currently filed as ${esc(g.candidates[0])}`
          : ''
      }${g.kind === 'weak' ? ` · currently ${esc(g.proposed)}` : ''}</span>
      ${
        PROPOSALS[g.key]
          ? `<span class="sugg-note ${PROPOSALS[g.key].tier === 'strong' ? 'strong' : 'faint'}">read from the ${
              PROPOSALS[g.key].read === 1 ? 'photo' : PROPOSALS[g.key].read + ' photos'
            }: <b>${esc(COLOUR_FAMILY_LABELS[PROPOSALS[g.key].family] || PROPOSALS[g.key].family)}</b>${
              PROPOSALS[g.key].read > 1 ? ` (${PROPOSALS[g.key].votes} of ${PROPOSALS[g.key].read} agreed)` : ''
            }${PROPOSALS[g.key].tier === 'hint' ? ' — a hint only, prints are not a colour' : ''}</span>`
          : ''
      }
    </header>
    <div class="shots">${g.examples
      .map(
        (e) =>
          `<figure><img loading="lazy" src="${esc(thumb(e.image))}" alt="${esc(e.title)}"><figcaption>${esc(e.title)}</figcaption></figure>`,
      )
      .join('')}</div>
    <div class="type">
      <input class="tin" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
             placeholder="type a colour — add as many as fit"
             aria-label="Type a colour for ${esc(g.key)}. Add as many as fit; press Enter on an empty box to move on.">
      <ul class="sugg" hidden></ul>
    </div>
    <div class="picks">
      ${FAMILIES.map((f) => `<button class="pick" data-v="${f.k}"><i style="background:${f.hex}"></i>${esc(f.label)}</button>`).join('')}
      <button class="pick none" data-v="__null">Not a colour</button>
      <button class="pick skip" data-v="__skip">Skip — not sure</button>
    </div>
    <label class="notewrap">
      <span>tell me why, in your own words — I read these</span>
      <textarea class="note-in" rows="1" placeholder="e.g. this is a fabric, not a colour"
                aria-label="Note about ${esc(g.key)}"></textarea>
    </label>
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
 .lede{color:#6b6b6b;max-width:70ch;margin:0 0 14px}
 /* Three mutually exclusive versions of the persistence promise. The WARNING is
    the one the markup shows by default, so a browser that never runs the probe —
    or never runs any script at all — cannot end up displaying a promise nobody
    checked. Only a passing probe adds .store-ok and swaps it. */
 .note{max-width:70ch;margin:0 0 24px;color:#6b6b6b}
 .note.bad{color:#6d1d16;background:#fff2ee;border:2px solid #c2402c;border-radius:10px;padding:12px 14px}
 #persist-ok,#persist-lost,#restore-note{display:none}
 .store-ok #persist-off{display:none}
 .store-ok #persist-ok{display:block}
 .store-lost #persist-off,.store-lost #persist-ok{display:none}
 .store-lost #persist-lost{display:block}
 .store-stale #restore-note{display:block}
 .store-lost #bar{background:#c2402c}
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
 .notewrap{display:block;margin-top:10px}
 .notewrap span{display:block;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#8a7d6b;margin-bottom:4px}
 .note-in{width:100%;font:inherit;font-size:14px;line-height:1.45;padding:8px 10px;border:1px solid var(--hairline);border-radius:8px;background:#fff;color:var(--ink);resize:vertical;min-height:38px}
 .note-in:focus{outline:none;border-color:var(--aubergine);box-shadow:0 0 0 3px rgba(68,25,67,.10)}
 .term[data-noted="1"] .note-in{border-color:var(--brass);background:#fffdf7}
 .sugg-note{display:block;font-size:12px;margin-top:4px;color:#8a7d6b}
 .sugg-note.strong{color:var(--aubergine)}
 .sugg-note b{font-weight:600}
 /* A machine answer must never look like one Tina made. Pressed-by-suggestion
    is outlined; pressed-by-her is solid. */
 .term[data-mine="0"] .pick[aria-pressed="true"]{background:#fff;color:var(--aubergine);border:1px dashed var(--aubergine)}
 .term[data-mine="0"][data-suggest-tier="photo"] .pick[aria-pressed="true"]{border-style:dotted;color:#8a7d6b;border-color:#b9ab97}
 .type{position:relative;margin:0 0 10px}
 .tin{width:min(360px,100%);font:inherit;font-size:14px;padding:9px 12px;border:1px solid var(--hairline);border-radius:8px;background:#fff;color:var(--ink)}
 .tin:focus{outline:none;border-color:var(--aubergine);box-shadow:0 0 0 3px rgba(68,25,67,.10)}
 .sugg{position:absolute;z-index:5;left:0;top:calc(100% + 4px);width:min(360px,100%);margin:0;padding:4px;list-style:none;background:#fff;border:1px solid var(--hairline);border-radius:10px;box-shadow:0 8px 24px rgba(36,27,36,.13);max-height:260px;overflow:auto}
 .sugg li{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:14px}
 .sugg li[data-hi="1"]{background:var(--aubergine);color:#fff}
 .sugg li i{width:11px;height:11px;border-radius:999px;border:1px solid rgba(0,0,0,.15);flex:0 0 auto}
 .sugg li.no-match{cursor:default;color:#8a7d6b}
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
<script>
 // STORAGE PROBE — runs before the lede is painted, so the page never shows a
 // persistence promise it has not checked, not even for a frame.
 //
 // A bare "typeof localStorage !== 'undefined'" is NOT this test. The failure
 // modes are a THROW at write time (Safari refuses storage outright on file://; a privacy
 // setting or a full quota throws QuotaExceededError) and, on some browsers, a
 // write that is accepted and then silently discarded. Write, read back, delete:
 // "it threw", "it was absent" and "it came back different" are one negative
 // answer, and everything downstream reads the single boolean this returns.
 window.__tmhStore = (function () {
   var key = 'tmh-colour-review';
   var ok = false;
   try {
     localStorage.setItem(key + ':probe', 'ok');
     ok = localStorage.getItem(key + ':probe') === 'ok';
     localStorage.removeItem(key + ':probe');
   } catch (e) {
     ok = false;
   }
   document.documentElement.classList.toggle('store-ok', ok);
   return { key: key, ok: ok };
 })();
</script>
<h1>Colour review</h1>
<p class="lede">Each block is one colourway <em>name</em>, not one product — your answer applies to every
piece any house ever names that way, including ones not scraped yet. Look at the photographs, not the word.
<strong>Pick as many colours as fit</strong> — a name like <em>black x red</em> is both, and those pieces
then show under Black <em>and</em> under Red. Click a colour again to unpick it. If you would rather type:
each word you enter <em>adds</em> a colour, and pressing <kbd>Enter</kbd> in an <em>empty</em> box moves you
down to the next one.
<strong>Skip anything you are not sure about</strong>; a skipped term simply stays unclassified, which is
better than a wrong chip.</p>
<p class="note" id="persist-ok">Your answers are remembered in this browser, so you can close the page and
come back. When you are done, press <strong>Copy colour-overrides.json</strong> at the bottom and paste it
over <code>data/colour-overrides.json</code>.</p>
<p class="note bad" id="persist-off"><strong>This browser is not saving your answers.</strong> If you close
this tab or reload the page, everything you have answered will be gone. Answer as many as you like, then
press <strong>Copy colour-overrides.json</strong> at the bottom <strong>before you close the tab</strong>,
and paste it over <code>data/colour-overrides.json</code>. Opening the file by double-clicking it is the
usual cause — ask Claude to serve the page for you instead.</p>
<p class="note bad" id="persist-lost"><strong>Saving has stopped working.</strong> Nothing you have answered
so far is lost, but it will be if you close this tab or reload. Press <strong>Copy
colour-overrides.json</strong> at the bottom <strong>now</strong>, and paste it over
<code>data/colour-overrides.json</code>.</p>
<p class="note bad" id="restore-note">Answers saved in this browser earlier could not be read, so this page
has started from scratch. Anything already in <code>data/colour-overrides.json</code> is still here.</p>
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
 // Injected rather than re-listed: the type-ahead and the buttons must offer
 // exactly the same set, and FAMILIES is a Node-side constant.
 const FAMILIES = ${inline(FAMILIES)};
 // The probe above already decided this, and it is the only thing that decides
 // it — nothing here re-tests storage or second-guesses the answer. The default
 // if the probe block somehow did not run is "no storage", i.e. the promise is
 // withheld rather than made.
 const PROBE = window.__tmhStore || { key: 'tmh-colour-review', ok: false };
 const STORE = PROBE.key;
 const decided = { terms: {}, weakWords: {} };
 let skipped = {};
 // Tina, 2026-08-29: "i want to be able to write to send to you so you will
 // understand next time." A note is NOT an answer — it never sets a colour and
 // never counts towards the total. It rides out with the export so the reasoning
 // reaches whoever fixes the vocabulary next, which a bare null cannot carry.
 let notes = {};

 /** Switch the page over to a warning, permanently, for the rest of the
  *  session. Used when saving worked at load and then stopped. */
 const storageLost = () => {
   if (document.documentElement.classList.contains('store-lost')) return;
   document.documentElement.classList.add('store-lost');
   // The banner at the top is the full explanation, but she may be 400 terms
   // down the page by now and it is the bottom bar that is always on screen —
   // so that is what has to change colour and carry the instruction.
   document.getElementById('said').textContent =
     'Saving stopped working — press Copy now, before you close this tab.';
 };

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
 if (PROBE.ok) {
   try {
     const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
     if (saved && saved.terms) {
       for (const [k, v] of Object.entries(saved.terms)) if (!(k in BASE.terms)) decided.terms[k] = v;
       for (const [k, v] of Object.entries(saved.weakWords || {})) if (!(k in BASE.weakWords)) decided.weakWords[k] = v;
       skipped = saved.skipped || {};
       notes = saved.notes || {};
     }
   } catch (e) {
     // A corrupt entry is not worth failing the page for — but it is worth
     // SAYING, because from the outside "restored nothing" and "there was
     // nothing to restore" look identical, and only one of them means an
     // earlier sitting has just been lost.
     document.documentElement.classList.add('store-stale');
   }
 }

 // Storage is a convenience, never a requirement: the clipboard export is the
 // real artefact and is built from the in-memory decision map. So a failed
 // save costs nothing that is already on screen — it only means closing the tab would.
 // That is exactly why it may not be swallowed.
 const save = () => {
   if (!PROBE.ok) return;                              // already said so in the lede
   try {
     localStorage.setItem(STORE, JSON.stringify({ ...decided, skipped, notes }));
   } catch (e) {
     // The probe wrote two bytes and this writes the whole session, so a quota
     // can be reached mid-sitting even though the probe passed.
     storageLost();
   }
 };
 const countEl = document.getElementById('count');
 const total = document.querySelectorAll('.term').length;
 const recount = () => {
   const n = Object.keys(decided.terms).length + Object.keys(decided.weakWords).length;
   const nn = Object.keys(notes).length;
   countEl.textContent = n + ' decided of ' + total + (nn ? '  ·  ' + nn + ' note' + (nn === 1 ? '' : 's') : '');
 };

 // Every choosable value, for the type-ahead. Built from the same FAMILIES the
 // buttons render, so the two can never offer different answers.
 const OPTIONS = FAMILIES.map(function (f) { return { v: f.k, label: f.label, hex: f.hex }; })
   .concat([{ v: '__null', label: 'Not a colour', hex: null, alt: 'none no' },
            { v: '__skip', label: 'Skip — not sure', hex: null, alt: 'unsure dunno' }]);

 // Prefix matches first, then substring — so typing "gre" offers Green before
 // Grey only if Green's label starts with it; both rank above a mid-word hit.
 function match(q) {
   var s = q.trim().toLowerCase();
   if (!s) return [];
   var pre = [], sub = [];
   for (var i = 0; i < OPTIONS.length; i++) {
     var o = OPTIONS[i];
     var hay = (o.label + ' ' + o.v + ' ' + (o.alt || '')).toLowerCase();
     var starts = o.label.toLowerCase().indexOf(s) === 0 || o.v.toLowerCase().indexOf(s) === 0;
     if (starts) pre.push(o); else if (hay.indexOf(s) !== -1) sub.push(o);
   }
   return pre.concat(sub);
 }

 var sections = [].slice.call(document.querySelectorAll('.term'));
 var strongCount = 0, photoCount = 0;

 sections.forEach(function (sec, idx) {
   var key = sec.dataset.key, weak = sec.dataset.kind === 'weak';
   var bucket = weak ? decided.weakWords : decided.terms;
   var input = sec.querySelector('.tin');
   var noteEl = sec.querySelector('.note-in');
   var list = sec.querySelector('.sugg');
   var hi = 0, shown = [];

   // THE ANSWER FOR THIS TERM, in two halves that can never both be set.
   //
   // Tina, 2026-08-29: "and i want to able to choose 2 colors or more". So a
   // term holds a LIST of families, in the order she picked them, rather than
   // one value. "Not a colour" and "Skip" are not colours and cannot be part of
   // a list, so they live in their own slot and each clears the other side.
   //
   //   sel = ['black','red'], excl = null   -> both chips
   //   sel = [],  excl = '__null'           -> a recorded "not a colour"
   //   sel = [],  excl = '__skip'           -> skipped, still on the review list
   //   sel = [],  excl = null               -> unanswered, which is what
   //                                           unpicking the last colour leaves
   var sel = [], excl = null;

   function paint() {
     sec.querySelectorAll('.pick').forEach(function (b) {
       var on = b.dataset.v === excl || sel.indexOf(b.dataset.v) !== -1;
       b.setAttribute('aria-pressed', String(on));
     });
   }

   // Write the current state out. ONE FAMILY EXPORTS AS A PLAIN STRING and only
   // two or more become a list — data/colour-overrides.json is full of
   // single-family answers and turning every one of them into a one-element
   // array would rewrite the whole file for nothing.
   function commit(mine) {
     var skipKey = (weak ? 'w:' : 't:') + key;
     if (excl === '__skip') { delete bucket[key]; skipped[skipKey] = 1; sec.removeAttribute('data-done'); }
     else if (excl === '__null') { bucket[key] = null; delete skipped[skipKey]; sec.dataset.done = '1'; }
     else if (sel.length) {
       bucket[key] = sel.length === 1 ? sel[0] : sel.slice();
       delete skipped[skipKey];
       sec.dataset.done = '1';
     } else { delete bucket[key]; delete skipped[skipKey]; sec.removeAttribute('data-done'); }
     if (mine) sec.dataset.mine = '1';
     paint(); recount(); save();
   }
   if (noteEl) {
     var nk = (weak ? 'w:' : 't:') + key;
     if (notes[nk]) { noteEl.value = notes[nk]; sec.dataset.noted = '1'; }
     var t = null;
     noteEl.addEventListener('input', function () {
       // Debounced: she is typing a sentence, not pressing a button, and this
       // page can hold 858 of these.
       if (t) clearTimeout(t);
       t = setTimeout(function () {
         var v = noteEl.value.trim();
         if (v) { notes[nk] = v; sec.dataset.noted = '1'; }
         else { delete notes[nk]; sec.removeAttribute('data-noted'); }
         recount(); save();
       }, 400);
     });
     // Enter inside a note must not submit or jump — it is prose.
     noteEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') noteEl.blur(); });
   }
   // Restoring an answer, from data/colour-overrides.json or from an earlier
   // sitting in this browser. A value is a string, a LIST of strings, or null —
   // all three shapes are read here, so a file hand-edited to
   // ["black","red"] comes back with both chips lit.
   if (key in bucket) {
     var stored = bucket[key];
     if (stored === null) excl = '__null';
     else sel = Array.isArray(stored) ? stored.slice() : [stored];
     sec.dataset.done = '1'; sec.dataset.mine = '1'; paint();
   }
   else if (skipped[(weak ? 'w:' : 't:') + key]) { excl = '__skip'; sec.dataset.mine = '1'; paint(); }
   else if (sec.dataset.suggest && sec.dataset.suggestTier !== 'hint') {
     // A strong photo reading arrives pre-answered and DOES count towards the
     // export — that is the point of it. It is ONE family, and it is marked
     // data-mine="0" so the button renders outlined rather than solid; adding a
     // second colour, or any other touch, makes the block hers.
     sel = [sec.dataset.suggest];
     bucket[key] = sec.dataset.suggest;
     sec.dataset.done = '1';
     sec.dataset.mine = '0';
     suggestedCount++;
     paint();
   }

   // Jump to the next term that has no answer yet. With 858 of them, this is
   // the difference between typing and hunting. It is no longer bound to
   // choosing a colour — choosing one now leaves her where she is, so she can
   // add a second — and is reached by pressing Enter on an EMPTY box.
   function advance() {
     for (var j = idx + 1; j < sections.length; j++) {
       if (!sections[j].hasAttribute('data-done')) {
         var nx = sections[j].querySelector('.tin');
         sections[j].scrollIntoView({ block: 'center', behavior: 'smooth' });
         if (nx) nx.focus();
         break;
       }
     }
   }

   // A BUTTON TOGGLES. Clicking a lit colour puts it out; putting the last one
   // out leaves the term unanswered, which is the same state it started in and
   // is honest — better than a colour she has just rejected staying recorded.
   function toggle(v) {
     if (v === '__null' || v === '__skip') { excl = excl === v ? null : v; sel = []; }
     else {
       excl = null;                                  // a colour is not "not a colour"
       var i = sel.indexOf(v);
       if (i === -1) sel.push(v); else sel.splice(i, 1);
     }
     commit(true);
   }

   // THE TYPE-AHEAD ADDS, it does not replace. Typing "bl" then Enter used to
   // answer and jump; it now lights Black, empties the box and stays put, so
   // "bl<enter>re<enter>" is black and red. A family already lit is left alone
   // rather than toggled off — typing it twice should not be a way to lose it.
   function add(v) {
     if (v === '__null' || v === '__skip') { excl = v; sel = []; }
     else { excl = null; if (sel.indexOf(v) === -1) sel.push(v); }
     commit(true);
     close();
     if (input) { input.value = ''; input.focus(); }
   }

   sec.querySelectorAll('.pick').forEach(function (btn) {
     btn.addEventListener('click', function () { toggle(btn.dataset.v); });
   });

   function close() { if (list) { list.hidden = true; list.innerHTML = ''; } shown = []; hi = 0; }

   function render() {
     if (!list) return;
     shown = match(input.value);
     if (!shown.length) {
       if (!input.value.trim()) { close(); return; }
       list.innerHTML = '<li class="no-match">no colour matches that</li>';
       list.hidden = false;
       return;
     }
     if (hi >= shown.length) hi = 0;
     var html = '';
     for (var i = 0; i < shown.length; i++) {
       var o = shown[i];
       html += '<li data-i="' + i + '" data-hi="' + (i === hi ? '1' : '0') + '">'
             + (o.hex ? '<i style="background:' + o.hex + '"></i>' : '<i style="background:transparent;border-style:dashed"></i>')
             + o.label + '</li>';
     }
     list.innerHTML = html;
     list.hidden = false;
   }

   if (input) {
     input.addEventListener('input', function () { hi = 0; render(); });
     input.addEventListener('keydown', function (e) {
       if (e.key === 'Escape') { input.value = ''; close(); return; }
       // Enter is handled BEFORE the shown.length guard, because the empty box
       // is exactly the case with nothing shown and is now what moves her on.
       if (e.key === 'Enter') {
         e.preventDefault();
         if (!input.value.trim()) { close(); advance(); return; }
         if (shown.length) add(shown[hi].v);
         return;
       }
       if (!shown.length) return;
       if (e.key === 'ArrowDown') { e.preventDefault(); hi = (hi + 1) % shown.length; render(); }
       else if (e.key === 'ArrowUp') { e.preventDefault(); hi = (hi - 1 + shown.length) % shown.length; render(); }
     });
     input.addEventListener('blur', function () { setTimeout(close, 150); });
   }
   if (list) {
     list.addEventListener('mousedown', function (e) {
       var li = e.target.closest('li[data-i]');
       if (li) { e.preventDefault(); add(shown[+li.dataset.i].v); }
     });
   }
 });
 recount();

 // Say plainly what arrived pre-answered and how much to trust it. A number she
 // can act on beats a reassurance she cannot check.
 if (strongCount + photoCount) {
   var b = document.createElement('p');
   b.className = 'note';
   b.style.borderLeft = '3px solid var(--aubergine)';
   b.style.paddingLeft = '10px';
   b.innerHTML = '<b>' + (strongCount + photoCount) + ' of these arrive already answered</b>, read off the '
     + 'product photographs by a model trained on fashion catalogues. They are outlined rather than filled '
     + 'in, so you can always tell them from your own.<br>'
     + '<b>' + strongCount + '</b> came from four or more photos agreeing — those measured <b>91%</b> right. '
     + 'The other <b>' + photoCount + '</b> came from one to three photos, which measured <b>74%</b>, so about '
     + 'one in four needs you. Nearly every mistake is a neighbour: brown for beige, blue for grey, white for '
     + 'cream. Skim, fix those, and press Copy.';
   var lede = document.querySelector('.lede');
   if (lede && lede.parentNode) lede.parentNode.insertBefore(b, lede.nextSibling);
 }

 // Spread BASE first so that EVERY key it carries survives — including the
 // three "//" documentation keys. Naming them one by one, as an earlier draft
 // did, silently deleted "//terms" and "//weakWords" the first time the export
 // was pasted back.
 const buildJson = () => {
   // Notes travel under their own key, keyed the same way the buckets are
   // ("t:" for a colourway suffix, "w:" for a word found mid-title), so a note
   // can always be traced back to the exact thing it is about. lib/colour.ts
   // reads only terms and weakWords, so this key is inert to the site and
   // exists purely to carry her reasoning back.
   const out = {
     ...BASE,
     terms: { ...BASE.terms, ...decided.terms },
     weakWords: { ...BASE.weakWords, ...decided.weakWords },
   };
   const merged = { ...(BASE.notes || {}), ...notes };
   if (Object.keys(merged).length) out.notes = merged;
   return JSON.stringify(out, null, 2) + '\\n';
 };

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
