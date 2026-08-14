# Removed 7 products (White Icy ×5, Vela, Nihan) per Tina's curation call
**Date:** 2026-08-14 · **Status:** done

## Goal
Tina pasted a curation payload (5 White Icy "Body" pieces, 1 Vela underdress, 1 Nihan
angora coat) and asked to remove them from the catalogue.

## What changed
- Added all 7 product ids to `data/exclusions.json`'s `ids` array (permanent removal list,
  per Invariant 3 — never `decisions.json`, which gets silently overwritten back to `keep`
  on the next ingest of that brand).
- Ran `npm run build:data` to republish. Postbuild translate hook ran too (venv present).

## Verification
```
$ python3 -c "import json; json.load(open('data/exclusions.json')); print('valid JSON')"
valid JSON

$ npm run build:data
Published 21877 products (mixed across 110 brands) | rejected 4887 | review 184 | delisted-by-brand 312

$ python3 -c "... check the 7 ids against data/products.json ..."
still present: []
total products: 21877
```
All 7 confirmed absent from the published catalogue.

## Notes / follow-ups
- Not committed or pushed — local working tree only, per standing practice of not
  committing without being asked.
- This session also noticed a concurrent Claude Code session is active in this same
  working tree (docs/fina/, docs/log/2026-08-14-fina-*.md, and edits to
  `docs/ai-content-production-playbook.md` this session didn't make). No overlap with this
  change — only `data/exclusions.json` and `data/products.json` were touched here.
