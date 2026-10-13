
## Standard-access upgrade form (checked 2026-10-13)
Opened https://developers.pinterest.com/apps/1611152/upgrade/ in Tina's Chrome. Nothing submitted.
- Prefilled already: website `http://themodestyhouse.com/`, privacy `https://themodestyhouse.com/privacy`,
  app purpose ("Publishes pins from our product catalogue to our own boards...").
- Empty: app name, company name, use cases, audience.
- **Blocker: a demo video (.mp4) is required.** It has to show the app authenticating a Pinterest user
  (OAuth) and the main Pinterest features it uses. We have no such flow: the token was generated in the
  portal. Possible route: a small local OAuth page + a pin created against the trial sandbox
  (api-sandbox.pinterest.com), screen-recorded. Waiting on Tina.
