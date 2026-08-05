# Style tagging (free, local — no API)

Tags every product photo with an aesthetic archetype (Elegant / Minimal / Maximalist / Streetwear / Boho)
using an open-source CLIP model that runs on this Mac. No API key, no cost.

## One-time setup

```bash
cd ~/modest-house
python3 -m venv .venv-style
source .venv-style/bin/activate
pip install -r scripts/requirements-style.txt
```

(First real run downloads the CLIP weights, ~600 MB, cached forever.)

## Run

```bash
source .venv-style/bin/activate

# 1. Calibration — the 20 hand-labelled products, prints a table (compare to Style-Tagging-Test-Results)
python scripts/tag_style.py --test20

# 2. Quick sanity run — first 100 products
python scripts/tag_style.py --limit 100

# 3. Full run (resumable; images are cached in .cache/style-imgs/)
python scripts/tag_style.py --resume
```

## Output

- `data/archetypes.json` — the tags the site reads: `{ productId: {primary, secondary, confidence, source} }`
- `data/archetypes.debug.json` — every product + all class scores (for tuning)

`source` is `"clip"` (auto) or `"eye"` (hand-tagged override). Below the `--gate` (default 0.60)
a product is left untagged. Tune with `--gate`, `--temp`, `--model ViT-L-14`.
