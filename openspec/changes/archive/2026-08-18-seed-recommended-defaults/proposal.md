# Seed the recommended experience on first run

## Why

The owner's daily configuration — focus mode with the idle strategy, open
groups on top with the slide, the fold motion, Google split by subdomain with
short labels — is the experience new users should meet, not something they
must discover pref by pref. Today a fresh installation starts with everything
conservative and off.

## What Changes

- On the very first run in a profile, the system seeds a recommended
  configuration as EXPLICIT preferences: `focusMode=true`,
  `focusStrategy=idle`, `focusReorder=true`, `focusKeep=10`,
  `collapseMotion=fold`, `subdomainDomains=google.com`, `subdomainLabel=sub`.
- Seeding happens at most once, recorded by a new marker pref
  (`zen.stg.seeded`), and ONLY when the profile shows no trace of prior use
  (no `zen.stg.groups` pref). Existing profiles are never touched.
- The raw `DEFAULTS` fallbacks in the code do NOT change. This is the load-
  bearing safety decision: changing the `subdomainDomains` fallback would
  re-derive group keys for every existing user who never set it, orphaning
  the Google groups already on their screen — the exact breakage this project
  promises never to ship — and `focusMode` silently flipping on update would
  start collapsing strips nobody asked to collapse.
- The `group-presentation` promise that the reorder option is "off by
  default" is rewritten: off as the raw fallback and for pre-existing
  profiles; enabled by the first-run seed on fresh profiles.

Out of scope:

- Any change to raw `DEFAULTS` values.
- Re-seeding, "reset to recommended" buttons, or panel UI for the seed.
- `debugLog` (stays off — it records browsing), `colors`, `groups`,
  `updateCheck`, locale, or any identity/diagnostic pref.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `configuration`: gains the first-run seeding requirement — when it fires,
  what it writes, what marks it done, and what it must never touch.
- `group-presentation`: the "Open groups sit above collapsed ones"
  requirement's default clause changes from a flat "off by default" to the
  seeded-experience story.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: a seeding step at startup, before the
  first organization pass; one new pref name (`zen.stg.seeded` — added, never
  to be renamed, like every stored name).
- `docs/MANUAL.md`: the pref table gains `zen.stg.seeded` and the pref rows
  gain a "seeded on new installs" note where applicable.
- The verify script gains an anchor for the new requirement.
- No i18n strings, no panel changes, no installer changes.
