## 1. Script

- [x] 1.1 `fixNestedGroups(spaceId)`: parent-chain detection; native group move
      first, recreate-with-original-key fallback; debug-log per correction
- [x] 1.2 TabMove listener, debounced, running the nest fix and the loose settle
      under guarded(); removed on unload
- [x] 1.3 Run the nest fix in the existing organization passes too (regroup,
      reclaim)

## 2. Verification

- [x] 2.1 verify.ps1 anchor; eslint and node checks; EVERYTHING IN SYNC
- [x] 2.2 In a running Zen: drag a Spacekeeper group into another group — it pops
      back out as a sibling within moments, same label/color/tabs; a manual group
      nested in a manual group stays put — user confirms
