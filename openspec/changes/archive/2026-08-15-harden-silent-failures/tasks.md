## 1. Script

- [x] 1.1 Canary after `whenReady()`: probe every Zen internal in use, one
      `console.error` naming each missing point, mirrored in the debug log
- [x] 1.2 `hostOnly()` helper; tab-switch event logs the host, never the full address
- [x] 1.3 Pref observer clears `logUnavailable` when `debugLog` changes
- [x] 1.4 Wire `unregisterPanel()` into unload, unregistering only from the window
      that holds the factory and only when it is the last browser window
- [x] 1.5 Record dropped re-entrant work: `guarded()` logs a debug event when it
      skips because another pass is running
- [x] 1.6 Version bump to 0.18.0 (header, constant, README literal)

## 2. Panel

- [x] 2.1 Commit the focused field on `pagehide` by blurring it, reusing the
      existing `change` path

## 3. Verification

- [x] 3.1 `node --check` on the script and the catalog; `scripts/verify.ps1` passes
- [x] 3.2 In a running Zen: canary silent on the current version; `ZSTG.selfTest()`
      passes; a field typed into and closed keeps its value (user confirms)
