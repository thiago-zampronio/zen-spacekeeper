## 1. Script

- [x] 1.1 `keyFromTab`: SessionStore lazy-URL fallback when `currentURI` yields no key
- [x] 1.2 First-activation pass per Space (session-scoped set, hooked on TabSelect;
      startup passes seed the current Space): organize ungrouped eligible tabs,
      then nest fix and settle
- [x] 1.3 Debug-log the pass (space, tabs organized)

## 2. Verification

- [x] 2.1 verify.ps1 anchor; eslint/node; EVERYTHING IN SYNC
- [ ] 2.2 In a running Zen: after an update reset, switching to a restored Space
      regroups it without loading tabs; manual regroup reaches unloaded tabs —
      user confirms
