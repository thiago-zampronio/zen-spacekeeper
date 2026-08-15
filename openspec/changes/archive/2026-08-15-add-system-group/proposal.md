## Why

Browser-internal pages — `about:config`, `about:spacekeeper`, `about:preferences` —
are non-groupable today, so they drift loose through the sidebar and get lost among
the groups. They have an obvious home: one special System group per Space.

## What Changes

- Internal pages (`about:` and `chrome:` schemes) join a **System group**, one per
  Space, following every rule real groups follow: Space isolation, reuse after
  restart, the commands. `about:blank` never joins — it is a transient placeholder,
  not a page anyone wants kept.
- The group's label comes from the text catalog, in the three languages; its
  identity is a fixed key, so renaming it never breaks the matching (same contract
  as every group).
- A preference (`zen.stg.systemGroup`, default on) turns it off, with a toggle in
  the panel — whoever prefers today's loose internal tabs keeps them.
- Local files (`file:`) stay non-groupable: they are the user's documents, not
  system pages.

Out of scope:

- Grouping `about:blank`, Zen's empty tabs, or anything eligibility already
  excludes (pinned, essential, folders, manual groups).
- Any change to how http/https keys are derived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tab-grouping`: the "Non-groupable URLs" requirement narrows to files and blank
  placeholders; a new requirement gives internal pages the System group, gated by
  the preference.

## Impact

- `src/resources/zstg-core.mjs`: `keyFromParts` learns the system schemes and the
  `systemGroup` config field; derivation tests cover it.
- `src/zen-space-tab-groups.uc.mjs`: pref default + config; the wrapper resolves
  the group's display label from the catalog.
- `src/resources/zstg-i18n.mjs` and the panel: the label and the toggle, three
  languages.
- `README.md`: pref table row.
