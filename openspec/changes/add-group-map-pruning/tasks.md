## 1. Script

- [x] 1.1 Schedule `reclaimGroups({ prune: true })` once, 60 seconds after start,
      under `guarded()`
- [x] 1.2 Version bump (header, constant, README literal)

## 2. Verification

- [x] 2.1 `scripts/verify.ps1` passes (anchor the new requirement)
- [ ] 2.2 In a running Zen: after a restart with groups, wait past the prune and
      confirm restored groups are still recognized and dead ids left the map
      (`zen.stg.groups` in about:config) — user confirms
