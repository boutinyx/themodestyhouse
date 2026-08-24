# Fina — session handoff (2026-08-14)

Read this first after a context reset. It's the complete current state — what works, what
doesn't, and exactly how to keep going. Everything here is also spread across the other
files in `docs/fina/`, but this is the one-stop version.

---

## What Fina is

A named, consistent AI character for a recurring **Pinterest outfit-inspo content series**
— influencer-style photos of her in different outfits/settings, elegant-but-can-go-
maximalist, hijab styled loosely (neck slightly visible — a deliberate Fina-only choice,
does NOT apply to the site's real product photography, which stays fully covered).
Separate from `docs/ai-content-production-playbook.md` (the site's own editorial work) —
same underlying identity-lock technique, different persona/rules/workflow.

## Current status: working end-to-end

Two scripts, both proven with real generations, not just written:

```
./.venv-style/bin/python scripts/fina_generate.py \
    --outfit "<exact clothing description>" \
    --hijab-color "<color>" \
    --scene cafe   # or "cinema", or free-text like "leaning on a railing at a park..." \
    --count 2 \
    --tag <short-name-for-filenames>
```
Saves to `public/hero-gen/fina/<tag>-N.png` + `<tag>-results.json`.

```
./.venv-style/bin/python scripts/fina_fix_coverage.py public/hero-gen/fina/<image>.png
```
Run this on any generation that shows skin it shouldn't (bare chest, midriff, waistband
gap, etc). Saves `<image>-fixed.png` alongside the original. Patches ONLY the exposure,
leaves face/pose/background/outfit/everything else untouched. This is the real fix for the
bodysuit-reliability problem — see "Known issues" below, don't waste time re-litigating it.

**One-time machine setup** (already done on this machine, shouldn't need repeating unless
the OAuth token expires):
```
npx --yes -p @higgsfield/cli higgsfield auth login       # opens browser
npx --yes -p @higgsfield/cli higgsfield workspace set a3b27161-5027-49f9-bcaa-1b63c031c24d
```
Credentials used: `HIGGSFIELD_API_KEY2` / `HIGGSFIELD_API_SECRET2` in `.env` (there's also
an unused KEY1/SECRET1 pair — pair 2 is the account Fina's character lives on).

## Fina's identity
- Character name in Higgsfield: **"Serene Guardian"**, `custom_reference_id =
  712ea516-8fb9-4a7a-ac16-f67e45aae9c5`, trained by Tina on higgsfield.ai's web UI from the
  28-image Krea reference set at `/Users/tina/Krea`. Hardcoded in `fina_generate.py`.
- Face/body verified against those real photos: oval face, dark brows, **dark brown eyes**
  (overridden from the training photos' actual hazel-olive — Tina's explicit ask, it's a
  prompt override each generation, not a retrain), slim build, subtle hourglass, B-cup.
- A `style_id` (Soul Style preset) also exists from the web app but is NOT usable via the
  API/CLI (`"Provided Soul style not found"` — different resource namespace than
  `custom_reference_id`, which IS shared). Don't bother trying it again.

## Every standing rule currently baked into `fina_generate.py`
(Full text and rationale for each lives in `docs/fina/style-rules.md` — this is just the list)
1. **Bodysuit under every outfit** — opaque nude mock-neck long-sleeve base layer, always.
   Unreliable at generation time on deep-V/open-front tops (~2-3 of 11+ held) — **the fix is
   `fina_fix_coverage.py` as a follow-up pass, not more prompt rewording.**
2. **Awrah conditional mini-layer** — if a top is cropped short enough to risk exposing the
   groin/pelvic area, adds a tight short mini-layer underneath. Conditional, not always-on.
3. **Skin/makeup** — always glowy/dewy, visible pores/texture (not airbrushed), rose
   cheeks matching lip tone, defined mascara, minimal otherwise.
4. **Film look** — subtle grain, imperfect warm color grade, slight background lens falloff
   while keeping the background busy/detailed (not smooth blur). Added after reviewing
   another AI's realism critique (see pipeline.md) — took the generalizable parts (grain,
   depth of field, the flash-vs-ambient mismatch mechanism), rejected the non-generalizable
   one ("always use night+flash", which contradicted Tina's own daylight/glowy preference).
5. **Pose** — weight on one hip, hands doing different things, not symmetrical/centered,
   caught mid-moment. Keep this SHORT — verbose pose language was empirically linked to the
   scene/background dropping out entirely (see Known issues).
6. **Framing** — camera further back, candid/amateur snapshot feel, never a plain studio
   wall.
7. **Setting independent of outfit color** — background keeps its own palette, doesn't
   color-match the outfit.
8. **Lighting matches the scene** — daylight (soft, no flash) for daytime/outdoor settings;
   flash+warm-ambient mismatch (two distinct light sources, cool/hard on her vs warm/soft
   behind) for evening/event settings. This is NOT the same as "always add flash" — daytime
   scenes should stay flash-free.
9. **Hijab** — loose drape, neck slightly visible, hair/hairline/ears covered, color is
   asked every single time (never assume/default).
10. **Garment detail** — render embroidery/beading/texture/trim precisely, don't flatten.

## Known issues — don't re-discover these, they're already characterized
1. **Bodysuit/awrah coverage is unreliable at generation time on deep-V or open-front
   tops.** Tried 5+ different prompt wordings/orderings, success rate stayed ~20-30%. The
   actual fix is the two-pass approach: generate, then run `fina_fix_coverage.py` on
   anything that shows skin. Don't sink more time into single-shot prompt wording for this.
2. **Some colors don't reliably render, especially on outerwear/hijab** — light grey trench
   coat rendered beige in 6+ consecutive attempts (never fixed); sage green and light-grey
   hijab both defaulted to beige/taupe. **Burgundy and deep colors held correctly every
   time.** Hypothesis: bias toward the beige/neutral training-photo palette, worse for pale/
   pastel target colors. If a color isn't landing, try a more saturated/distinct shade
   before concluding the wording is wrong.
3. **The scene/background can vanish entirely (plain white studio backdrop instead of the
   described setting), and this correlates with how much OTHER instruction detail is in the
   prompt** — it happened right after pose/film-look wording was made more verbose, and
   fixing it was as simple as trimming those blocks back down. Keep prompt clauses tight;
   if the scene stops appearing, look at what got LONGER recently before adding more fixes.
4. **The vendored Python `higgsfield_client` SDK cannot see web-trained Soul IDs**
   (`character_not_found`) even with the correct account's API key/secret — this is why
   `fina_generate.py` shells out to the official `higgsfield` CLI (OAuth-authenticated)
   instead of using the SDK directly. Don't try to "fix" this by going back to the SDK.
5. **`soul_standard`/SDK path is now dead code for Fina** — `scripts/soul_standard_*.py` and
   `scripts/soul_reference_test.py` were exploratory/superseded, kept only for the
   historical record in `docs/log/`. `fina_generate.py` is the only script that matters now.

## Loose ends NOT related to Fina (lower priority, mentioned for completeness)
- **Krea Character LoRA path was never finished.** Tina was going to compare a Krea-trained
  LoRA against the Higgsfield Soul ID "for comparison," but once Higgsfield's CLI path
  started working well, this wasn't pursued further. Krea MCP OAuth was started (task in
  this session) but not completed. Only worth resuming if Tina explicitly asks — the
  Higgsfield path is the one actually in production use.
- **Higgsfield's plain upload endpoint (`/files/generate-upload-url`) was broken all
  session** (`SignatureDoesNotMatch` on every attempt, confirmed via 3 independent HTTP
  clients — a real bug on their end, not ours). This blocked `soul/reference` entirely, which
  is why the CLI's `custom_reference_id` path was the one that ended up mattering. Worth
  re-testing occasionally, but not blocking anything currently.

## Workflow going forward (per `docs/fina/workflow.md`)
1. Tina gives the exact outfit brief.
2. Ask hijab color (always — no default).
3. Ask setting only if she didn't specify one; otherwise pick/vary within
   `scene-bank.md`'s territory.
4. Generate (default 2 images).
5. QA visually against the rules above — especially coverage on any deep-V/open piece.
6. Run `fina_fix_coverage.py` on anything that fails coverage, rather than re-rolling blind.
7. Show her the results (inline images, or the `fina-test.html` contact-sheet pattern used
   throughout this session — Write the HTML, `open` it).

## File map
```
scripts/fina_generate.py       the generator (CLI-based, working)
scripts/fina_fix_coverage.py   the coverage-fix edit pass (working)
scripts/soul_*.py               superseded/exploratory, historical only
docs/fina/README.md            index
docs/fina/HANDOFF.md           this file
docs/fina/character.md         identity, custom_reference_id, hijab/eye overrides
docs/fina/style-rules.md       every rule + full rationale/history
docs/fina/scene-bank.md        setting ideas
docs/fina/workflow.md          per-post process + intake checklist
docs/fina/pipeline.md          full technical history (SDK vs CLI, bodysuit saga, edit-pass fix)
docs/log/2026-08-14-*.md       session log entries, chronological
public/hero-gen/fina/          all generated images + results.json per run
```
