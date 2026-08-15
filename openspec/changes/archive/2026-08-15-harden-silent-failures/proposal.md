## Why

A global review of the repo converged on one theme: the expensive failures here are
the silent ones. If Zen renames an internal the whole product turns off without a
line in the console; the debug log dies on its first write failure and stays dead;
the log records full addresses while the docs say "the site"; and text typed into a
panel list field is lost if the page closes before the field loses focus.

## What Changes

- A startup canary: after initialization, the script probes every Zen internal it
  depends on and reports loudly — naming the missing piece — when the contract is
  broken, instead of degrading feature by feature in silence.
- The debug log records the host of the address involved, never the full address
  with path and query, matching what the documentation already claims.
- A failed log write no longer disables logging forever: toggling the logging
  preference gives it a fresh chance.
- The panel commits a pending edit when the page is closed or hidden, so text typed
  into a field is not lost for never having blurred.
- The `about:spacekeeper` registration is actually undone when the last window
  closes — the spec already requires it; the code had the routine and never called it.

Out of scope:

- Any change to grouping behavior, key derivation or the installers.
- Detecting the loader deletion by a Zen update (a separate, OS-level change).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagnostics`: new requirement — a startup canary that names each missing point of
  the Zen contract instead of failing silently.
- `configuration`: new requirements — the diagnostic log records sites (hosts), not
  full addresses; and logging recovers when the preference is toggled after a write
  failure.
- `control-panel`: new requirement — a pending field edit is committed when the page
  closes; (the existing "Registration undone on close" requirement gains its actual
  implementation, no spec text change).

## Impact

- `src/zen-space-tab-groups.uc.mjs`: canary after `whenReady()`, host-only logging
  in the tab-switch event, `logUnavailable` reset in the pref observer, panel
  unregistration wired into unload, version bump.
- `src/resources/zstg-panel.html`: pagehide flush of the focused field.
- `openspec/specs/`: the three deltas above.
- `README.md`: version literal.
