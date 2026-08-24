# Fina — character definition

## Identity
Name: **Fina**. Same physical identity as the anchor sheet in
`docs/ai-content-production-playbook.md` §1, verified against the real reference photos in
`/Users/tina/Krea` (28-image Krea round-1 set):

```
A young Middle Eastern/South Asian woman, mid-20s. Oval face, defined straight-to-arched
dark brows, hazel-olive eyes, straight nose, full lips with a neutral resting expression,
warm medium olive skin tone with a natural sheen. Slim build with a subtle hourglass shape —
a little bit of hip curve, not exaggerated, B-cup bust.
```

Body notes added 2026-08-14 per Tina — slim, subtle hourglass (not exaggerated hips), B cup.
Keep this in sync with the shared anchor block in
`docs/ai-content-production-playbook.md` §1 if either changes.

## Identity-lock mechanism
Primary: **Higgsfield Soul ID**, trained by Tina directly on higgsfield.ai's web UI (Soul →
Train new character) using the front/3-4-profile Krea image set — this bypasses the broken
`/files/generate-upload-url` endpoint entirely, since the ID comes from their web app, not
our API calls (see `docs/log/2026-08-14-higgsfield-soul-reference-upload-broken.md`).

**`custom_reference_id`: `712ea516-8fb9-4a7a-ac16-f67e45aae9c5`** (found via DevTools Network
→ `text2image_soul_v2` request payload, 2026-08-14). Credentials: `HIGGSFIELD_API_KEY2` /
`HIGGSFIELD_API_SECRET2` in `.env` (Tina confirmed pair 2 is the account this character was
trained on).

Also present in that same payload — a saved **Soul Style** preset, `style_id:
"3db34ab5-3439-4317-9e03-08dc30852e69"`, `style_strength: 1`. Optional but worth reusing for
a consistent photographic look across posts, separate from the character/face lock.

Fallback (text-only, no image lock): the anchor text block above, used with
`higgsfield-ai/soul/standard` when needed — weaker identity consistency, but doesn't depend
on any upload/character-ID step at all.

## Eye color (Fina-only override, 2026-08-14)
Tina wants **dark brown eyes** for Fina in generated posts, overriding the real reference
photos' hazel-olive (the trained Soul ID's actual eye color, baked in from the Krea training
set). This is a per-generation prompt override, not a retrain — `scripts/fina_generate.py`'s
`FINA_IDENTITY` block explicitly asks for dark brown eyes each time. Keep this in mind if
identity consistency ever seems slightly off around the eyes specifically — it's an
intentional fight against the trained default, not a bug.

## Hijab styling (Fina-only — does NOT apply to the site's product photography)
- Loose drape, not tight around the neck — **neck slightly visible**.
- Hair, hairline, and ears still fully covered.
- **Color varies per post — always ask Tina which color for that post** (see
  `workflow.md`'s intake checklist). No fixed default.

This is a deliberate exception to `docs/ai-content-production-playbook.md` §6's hijab QA
rule (hair/hairline/ears/**neck** fully covered), which stays strict as-is for real product
photography — that rule is about garment/modesty accuracy for actual items sold on the site,
not this character's styling choice.
