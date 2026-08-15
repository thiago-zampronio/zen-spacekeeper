## Why

Tabs restored by the session sit unloaded on a blank page until activated, so key
derivation sees nothing and they stay loose — invisible before, glaring now that
the update flow's clean reset dissolves every group: only the active Space
regroups, and every other Space wakes up as a wall of loose tabs that not even the
manual regroup can organize. The reset dialog promises "the new version regroups
everything from scratch"; this makes the promise true.

## What Changes

- Key derivation falls back to the session's remembered URL for unloaded tabs, so
  grouping never requires loading a tab.
- Each Space gets organized on its first activation of the session (and the
  current Space in the startup passes), so restored Spaces regroup when visited —
  no mass loading, no background churn across all Spaces at once.

Out of scope:

- Loading any tab. Grouping is DOM membership; the tab stays unloaded.
- Changing when events organize loaded tabs (unchanged).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tab-grouping`: new requirement — unloaded restored tabs are groupable from
  their session URL, and a Space is organized on its first activation.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: lazy-URL fallback in `keyFromTab`
  (SessionStore), a first-activation pass per Space, startup pass for the current
  Space.
- verify anchor; version bump.
