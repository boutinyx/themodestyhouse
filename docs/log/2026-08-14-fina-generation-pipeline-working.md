# Fina — generation pipeline working end-to-end
**Date:** 2026-08-14 · **Status:** done

## Goal
Get `scripts/fina_generate.py` actually generating identity-locked Fina posts, per the plan
in `docs/fina/`.

## What changed
- Diagnosed why the Python SDK path (`higgsfield_client`, static API key/secret) failed on
  Tina's real `custom_reference_id` (`character_not_found`, and `"Provided Soul style not
  found"` for the accompanying `style_id`): the static API-key auth used by the vendored SDK
  does not have visibility into Soul IDs trained via the web app, even for the correct
  account. Confirmed by installing the official `@higgsfield/cli` (npm), OAuth-authenticating
  (`higgsfield auth login`), and running `higgsfield soul-id list` — it showed the exact same
  ID (`712ea516-8fb9-4a7a-ac16-f67e45aae9c5`, "Serene Guardian") instantly. Same resource,
  different auth path's visibility into it.
- Rewrote `scripts/fina_generate.py` to shell out to the CLI
  (`npx --yes -p @higgsfield/cli higgsfield generate create text2image_soul_v2 ...`) instead
  of the SDK. Kept the same prompt-assembly logic (character identity, hijab styling, skin/
  makeup, per-scene lighting, garment detail, setting-independent-of-outfit-color).
- Updated `docs/fina/pipeline.md` and `character.md` with the real ID, the CLI setup steps,
  and the model's actual parameter list (`aspect_ratio`, `quality`, etc., from
  `higgsfield model get text2image_soul_v2`).

## Verification
- `./.venv-style/bin/python scripts/fina_generate.py --scene cinema ...` → exit 0,
  `public/hero-gen/fina/cli-test1.png` saved. Visually confirmed: correct face (matches the
  trained character), correct outfit (brown leather jacket, white ruffled skirt, black bag/
  heels), correct setting (cinema staircase, 3/4 front), flash-lit per the scene's lighting
  rule.
- `./.venv-style/bin/python scripts/fina_generate.py --scene cafe ...` → exit 0,
  `public/hero-gen/fina/verify1-1.png` saved. Visually confirmed: overhead matcha framing as
  briefed, daylight (no flash) per the scene's lighting rule, background stayed neutral
  (gray table/wood chairs) rather than pulling color from the brown/cream outfit, hijab loose
  with neck visible, skin glowy with rose lip/cheek match.
- Both runs used real prompts assembled by the script itself, not hand-written test prompts
  — this is the actual production path, not a mocked demo.

## Notes / follow-ups
- One-time CLI auth (`higgsfield auth login` + `workspace set`) is already done on this
  machine and cached locally by the CLI; shouldn't need repeating unless the token expires.
- `style_id` (the web app's separate "Soul Style" preset) is not used — same auth-scope
  limitation, and not worth chasing unless a real need shows up later.
- Next real step is production use: Tina gives outfit briefs per `docs/fina/workflow.md`'s
  intake checklist, script generates, results get reviewed against `docs/fina/style-rules.md`.
