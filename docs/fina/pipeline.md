# Fina — technical pipeline

## Status: working (2026-08-14)
`scripts/fina_generate.py` is built and verified end-to-end (both seed scenes, cafe/daylight
and cinema/flash, both produced correct identity-locked, on-brief results).

## The real story: SDK vs CLI
The vendored Python `higgsfield_client` SDK (static `HIGGSFIELD_API_KEY`/`SECRET` pair auth)
**cannot see Soul IDs trained via the web app** — every attempt with the real
`custom_reference_id` failed `character_not_found`, even with the correct account's key
pair. Confirmed this is an auth-scope issue, not a missing/wrong resource: installed the
official `higgsfield` CLI (`@higgsfield/cli` on npm, OAuth-authenticated via
`higgsfield auth login`), and `higgsfield soul-id list` showed the exact same ID instantly.
Static API-key auth and OAuth user auth apparently have different visibility into
account resources on Higgsfield's side.

**The working path is the CLI, not the SDK.** `scripts/fina_generate.py` shells out to
`npx --yes -p @higgsfield/cli higgsfield generate create text2image_soul_v2` with
`--custom_reference_id`, `--prompt`, `--aspect_ratio`, `--quality`, `--wait`.

## One-time machine setup
```
npx --yes -p @higgsfield/cli higgsfield auth login      # opens browser, same Higgsfield account
npx --yes -p @higgsfield/cli higgsfield workspace list   # find the workspace id
npx --yes -p @higgsfield/cli higgsfield workspace set <workspace_id>
```
Credentials are cached locally by the CLI after login — shouldn't need to repeat this
unless the token expires or a new machine/session needs it.

## Model params (from `higgsfield model get text2image_soul_v2`)
- `prompt` (required)
- `custom_reference_id` — Fina's ID, `712ea516-8fb9-4a7a-ac16-f67e45aae9c5` ("Serene
  Guardian"), hardcoded in the script
- `aspect_ratio` — `1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3` — script defaults to `2:3`
  (Pinterest's native ratio)
- `quality` — `1.5k, 2k` — script defaults to `2k`
- `seed` — left unset, so each call varies naturally
- constraint: at most one image reference allowed (not used here — identity comes from
  `custom_reference_id`, not an uploaded image)

Note: the web app's payload also included a `style_id` (Soul Style preset) — tried it first,
got `"Provided Soul style not found"` for the same auth-scope reason. Dropped; not part of
the CLI's documented params for this model either. Not worth chasing further unless a real
need for it shows up.

## Bodysuit reliability fix: two-pass generate-then-edit (2026-08-14)
Prompt-only bodysuit compliance was unreliable on deep-V/open-front tops (5 wording/ordering
attempts, roughly 2-3 out of 11+ generations actually held coverage — see the mistakes/
findings below). Real fix, found by researching what Higgsfield's toolset actually offers
rather than continuing to reword the same single-shot prompt: **`nano_banana_pro`**, an
image-EDITING model (Google's Gemini image-edit family) available through the same CLI.
It takes an existing image + a natural-language edit instruction and modifies only what's
asked, leaving everything else untouched — a fundamentally more reliable mechanism than
hoping one giant text-to-image prompt gets every clause right at once.

**Workflow when a generation shows exposed skin:**
```
npx --yes -p @higgsfield/cli higgsfield generate create nano_banana_pro \
  --image-references "<path-to-the-flawed-image>" \
  --prompt "Edit this photo: add an opaque nude/light-tan mock-neck long-sleeve bodysuit \
layer underneath her top, visible filling the open V-gap/exposed area, matching her skin \
tone closely but clearly a fabric layer with subtle texture, rising to a high mock-neck \
collar at her throat. Do not show any bare chest, cleavage, or stomach skin. Keep \
everything else in the image exactly the same -- her face, pose, the rest of the outfit, \
the hijab, the background, the lighting -- unchanged." \
  --aspect_ratio "3:4" --resolution "2k" --wait --wait-timeout 3m
```
Verified once (2026-08-14) on `y2k-original-2.png`, the worst offender that round (fully
bare midriff + chest) → `edit-test1.png`: coverage fixed cleanly, face/hijab/pose/
background/jewelry/bag all identical to the source. Not yet wired into
`scripts/fina_generate.py` as an automatic step — still a manual follow-up run when QA
catches an exposure miss. `nano_banana_pro` params (from `higgsfield model get
nano_banana_pro`): `prompt` (required unless image given), `image_references` (up to 14),
`aspect_ratio`, `resolution` (1k/2k/4k).

## Verified 2026-08-14
- `--scene cinema` (flash lighting, brown jacket/white ruffled skirt outfit) →
  `public/hero-gen/fina/cli-test1.png` — correct face, correct outfit, correct setting.
- `--scene cafe` (daylight, cream sweater vest/white shirt/brown skirt, sage hijab) →
  `public/hero-gen/fina/verify1-1.png` — overhead matcha framing exactly as briefed,
  background stayed neutral (not color-pulled from the brown/cream outfit).

## Plan for `scripts/fina_generate.py`
Modeled on the existing `scripts/soul_standard_tina_prompt.py` / `scripts/gen_hero.py`
pattern (`.env` credential loading via `HIGGSFIELD_API_KEY`/`HIGGSFIELD_API_SECRET`,
`higgsfield_client.subscribe(...)`, download-and-save loop, `results.json` log).

Inputs per run: outfit/clothing brief (from Tina, verbatim), hijab color (from the intake
checklist in `workflow.md`), scene (from Tina or picked per `scene-bank.md`).

Prompt assembly, in order:
1. Fina identity note — short, since the image-based Soul ID reference carries most of the
   identity-lock; full text anchor from `character.md` only needed if falling back to
   `soul/standard`.
2. Hijab styling note (loose, neck visible, this post's color).
3. Styling register (Rule 0 + Fina's maximalist-on-request clarification from
   `style-rules.md`).
4. Lighting, judged per scene (daylight vs. flash+night, per `style-rules.md`).
5. Setting/pose description (from the chosen scene).
6. Setting-independent-of-outfit-color instruction.
7. Garment detail rule (playbook Rule 4) applied to the exact clothing brief.

API call: `POST /higgsfield-ai/soul/character` via
`higgsfield_client.subscribe("higgsfield-ai/soul/character", {...})` with:
- `prompt` — assembled as above
- `custom_reference_id` — Fina's trained character UUID
- `custom_reference_strength` — start ~0.85, tune based on results
- `resolution` — 1080p
- `aspect_ratio` — **to verify against the real OpenAPI schema before hardcoding**;
  Pinterest's native ratio is 2:3, need to confirm that's an accepted value for this
  endpoint (other scripts in this repo have only used 16:9/9:16/4:3/1:1 so far)
- `batch_size` or repeat calls — default to 2 images per run

Output: `public/hero-gen/fina/` with a per-post naming scheme, same `results.json` pattern
as existing scripts.

## When this gets built
As soon as Tina pastes the `custom_reference_id`. First test run: her two seed scenes from
`scene-bank.md`, with a placeholder or real outfit brief, verified visually against
`style-rules.md` and `character.md` before treating the pipeline as working.
