## 1. Core

- [x] 1.1 `keyFromParts`: system schemes (`about:`, `chrome:`), `about:blank`
      excluded, gated by a `systemGroup` config field; key `system:`
- [x] 1.2 Derivation tests: grouped when enabled, blank excluded, disabled restores
      non-groupable, file: stays out

## 2. Script and panel

- [x] 2.1 Pref `zen.stg.systemGroup` (default true) in DEFAULTS and cfg()
- [x] 2.2 Wrapper resolves the System label from the catalog
- [x] 2.3 Panel toggle in the Grouping section; `group.system` + toggle strings in
      three languages
- [x] 2.4 README pref table row; version bump

## 3. Verification

- [x] 3.1 verify.ps1 anchors; node tests pass; EVERYTHING IN SYNC
- [ ] 3.2 In a running Zen: about:config and about:spacekeeper join one System
      group per Space; about:blank stays out; toggle off restores loose — user
      confirms
