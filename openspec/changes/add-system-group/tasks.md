## 1. Core

- [ ] 1.1 `keyFromParts`: system schemes (`about:`, `chrome:`), `about:blank`
      excluded, gated by a `systemGroup` config field; key `system:`
- [ ] 1.2 Derivation tests: grouped when enabled, blank excluded, disabled restores
      non-groupable, file: stays out

## 2. Script and panel

- [ ] 2.1 Pref `zen.stg.systemGroup` (default true) in DEFAULTS and cfg()
- [ ] 2.2 Wrapper resolves the System label from the catalog
- [ ] 2.3 Panel toggle in the Grouping section; `group.system` + toggle strings in
      three languages
- [ ] 2.4 README pref table row; version bump

## 3. Verification

- [ ] 3.1 verify.ps1 anchors; node tests pass; EVERYTHING IN SYNC
- [ ] 3.2 In a running Zen: about:config and about:spacekeeper join one System
      group per Space; about:blank stays out; toggle off restores loose — user
      confirms
