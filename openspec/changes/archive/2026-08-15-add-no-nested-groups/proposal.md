## Why

The browser lets a drag drop one tab group inside another, and the result is
broken on screen: the nested group's tabs render at the parent's level and the
sidebar turns into a mess. Groups should reorder when dragged, never nest.

## What Changes

- A group the system created SHALL never remain nested inside another group: when
  a drag leaves one there, the system restores it as a sibling at the next
  organization moment — same group identity, label, color and collapse intent,
  tabs untouched.
- Correction, not interception: the drop itself is browser-internal and cannot be
  cheaply prevented, so the promise is "undone within moments", riding the same
  passes that already settle loose tabs — plus a listener on tab moves, which is
  what a group drag fires.

Out of scope:

- Manual groups or Zen folders nested inside each other (the user's own
  structures stay untouched, as always).
- A manual group dragged INTO a system group — rarer, and pulling the user's own
  group around crosses the never-touch line; revisit if it shows up in practice.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `group-presentation`: new requirement — the system's groups are never left
  nested; a nesting drop is undone at the next organization moment.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: `fixNestedGroups()`, a TabMove listener
  (debounced) driving it together with the loose-tab settle, debug-log events.
- verify anchors; version bump. No new preference: there is no sane reading of a
  nested group, so there is nothing to opt into.
