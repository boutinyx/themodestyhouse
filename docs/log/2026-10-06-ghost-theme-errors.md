# Ghost Admin "Your theme has errors": 15 missing card classes
**Date:** 2026-10-06 · **Status:** partial (fix built and committed; upload to Ghost still owed)

## Goal
Inoma Digital reported Ghost Admin showing "Your theme has errors — some functionality on your site may be
limited", and asked that fixing it change no URL, SEO metadata, schema or design.

## Cause
`npx gscan ghost-theme` on the theme as installed (v1.0.0):

```
Your theme has 15 errors and 92 warnings!
- Error: The .kg-width-wide CSS class is required to appear styled in your theme
- Error: The .kg-width-full ...
- Error: The .kg-gallery-container / -row / -image ...
- Error: The .kg-bookmark-card / -container / -content / -title / -description / -metadata / -icon
         / -author / -publisher / -thumbnail ...
```

The theme is redirect-only and shipped with no stylesheet at all, so every editor-card class Ghost requires a
theme to declare was absent. The 2026-09-19 log recorded only `gscan --fatal` ("no fatal compatibility
issues"), which does not report this level. None of it is a code fault and none of it reaches a visitor:
Ghost renders no page anyone reads; themodestyhouse.com draws `/editorial/*` itself.

## What changed
- `ghost-theme/assets/css/cards.css` (new): one rule per required class. No template links it.
- `ghost-theme/package.json`: version 1.0.0 -> 1.0.1. `config.image_sizes` untouched (`lib/ghostImage.ts`
  depends on those widths).
- No `.hbs` file, `routes.yaml`, `robots.txt` or `sitemap.xml` changed, so the noindex and the redirects on the
  Ghost host are byte-identical.

## Verification
```
$ npx gscan ghost-theme
Your theme has 92 warnings!          # 0 errors
$ npx gscan -z /tmp/tmh-theme/modesty-house-headless.zip
Your theme has 92 warnings!          # the upload artefact itself, built without routes.yaml
```

NOT yet verified: the banner in Ghost Admin. It clears only once the zip is uploaded and activated, which
needs a logged-in staff session (integration keys get 403 on themes, see 2026-09-19). The Chrome extension
was not connected this session, so the upload was not done. After upload, run `node scripts/ghost-theme.mjs`
to re-assert noindex + redirects on the Ghost host.

## Notes / follow-ups
- The 92 warnings are left on purpose. 89 are optional card classes; the other three are `{{ghost_head}}`,
  `{{ghost_foot}}` and a page-title setting. Adding `ghost_head` would make the Ghost host emit its own
  canonical, meta and schema for every post, which is exactly what the redirect theme exists to prevent.
- The same message suggested migrating to WordPress long-term. Not acted on; that is Tina's decision.
  For the record: the site's URLs, metadata and schema come from the Next.js app, not from Ghost, so the CMS
  behind it does not limit SEO structure.
