## Why

The group-to-key binding map (`zen.stg.groups`) gains an entry for every group ever
created and loses one only when the user happens to run the manual regroup command —
someone who never runs it accumulates dead ids indefinitely. Housekeeping should not
depend on a command that exists for another purpose.

## What Changes

- The system prunes dead entries from the group binding map on its own, once per
  session, at a moment when session restore is safely finished — never during
  startup, where pruning once erased the very map that makes restored groups
  recognizable.
- The color memory (`zen.stg.colors`) is explicitly NOT pruned: a color must
  survive the user closing every tab of a domain, by requirement.

Out of scope:

- Any change to how bindings are created, or to the manual regroup command's
  existing prune.
- Bounding or expiring the color map.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tab-grouping`: new requirement — the binding map is pruned automatically at a
  restore-safe moment, complementing "Group binding survives restore" (which stays
  as the guard on WHEN pruning must not happen).

## Impact

- `src/zen-space-tab-groups.uc.mjs`: one scheduled `reclaimGroups({ prune: true })`
  in `start()`, well after the delayed recognition passes.
- `openspec/specs/tab-grouping/spec.md`: the delta above.
- Residual risk to document in design: a window restored later than the chosen
  delay would lose its entry and produce a duplicate group on the next tab.
