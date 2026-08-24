# Higgsfield Soul ID/reference exploration — upload endpoint found broken, text-only fallback used
**Date:** 2026-08-14 · **Status:** partial

## Goal
Tina wants a consistent AI "character" (face) that stays the same across generations,
starting from 28 reference photos she generated in Krea at `/Users/tina/Krea`. Explored
Higgsfield's Soul ID / Soul reference features as one path, in parallel with the
already-documented Krea Character LoRA pipeline (`docs/ai-content-production-playbook.md`).

## What changed
- `scripts/soul_reference_test.py` — prototype for `higgsfield-ai/soul/reference`
  (one uploaded reference image + prompt, no training needed). Includes a workaround for
  a bug in the vendored `higgsfield_client` SDK: `upload_file()`'s PUT to the presigned S3
  URL omits the `x-amz-tagging` header that the presign's `SignedHeaders` requires.
- `scripts/soul_standard_2shots.py`, `scripts/soul_standard_tina_prompt.py` — fallback
  generations via `higgsfield-ai/soul/standard` (pure text-to-image, no upload dependency),
  used once the upload path was confirmed broken. Produced
  `public/hero-gen/soul-standard-tina/tina-{1,2}.jpg` from Tina's own prompt.

## Verification
- Confirmed via `docs.higgsfield.ai/docs/openapi.json`: Soul ID **training** has no API —
  it's web-UI only (higgsfield.ai → Soul → Train new character). Generation from a trained
  ID is scriptable via `POST /higgsfield-ai/soul/character` (needs a `custom_reference_id`
  UUID obtained from that web UI training flow). `POST /higgsfield-ai/soul/reference` needs
  no training, just an uploaded `image_reference_url` per call.
- The upload step itself (`POST /files/generate-upload-url` → presigned S3 PUT) is broken
  on Higgsfield's side: every attempt 403s `SignatureDoesNotMatch`. Reproduced 6+ times
  with fresh credentials, confirmed NOT a client bug by sending byte-identical requests via
  three independent HTTP clients (the SDK's own httpx call, a manual httpx call, and raw
  curl) — all fail identically, and the canonical request S3 recomputes matches exactly
  what should have been signed. Ruled out a clock-skew theory: a later retest's
  `X-Amz-Date` correctly read the current date and still failed the same way.
- Plain text-to-image (`soul/standard`, no upload) works fine — confirmed the break is
  isolated to the upload/presign path, not a wider outage.
- `./.venv-style/bin/python scripts/soul_standard_tina_prompt.py` → exit 0, two images
  saved, reviewed visually against Tina's prompt spec (colors, styling, era-accurate
  candid-flash look) — matched.

## Notes / follow-ups
- True identity-lock to the real Krea photos (via `soul/reference` or a trained
  `soul/character`) is still blocked on Higgsfield fixing their upload endpoint. Not
  fixable from this side — needs their infra team.
- The Krea Character LoRA path (`docs/ai-content-production-playbook.md` §5.1) remains
  untouched by this bug and is the other in-flight option; Krea MCP auth was started this
  session but not completed.
- If Higgsfield's upload starts working, `scripts/soul_reference_test.py` is ready to run
  as-is — no further code changes needed, just re-run it.
