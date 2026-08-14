## Why

An audit of the eight capabilities against the code found behavior that ships,
that the README documents, and that no requirement covers. The spec is supposed to
be the contract; where it is silent, nothing stops a future change from removing
these without anyone noticing they were promises.

Six gaps, none of them small:

- **How commands are invoked.** `grouping-commands` says "the user triggers a
  command" five times and never says through what. The context menu (in two
  places) and the hotkeys exist only in the code and the README.
- **The self-test.** `ZSTG.selfTest()` has a button in the panel, its own output
  format, and `verify.ps1` tells people to run it. It is a feature, unspecified.
- **The console API.** `window.ZSTG` is what the README teaches people to type.
  That makes it a compatibility surface, and renaming a function on it has already
  broken the documentation once.
- **Version identification.** The panel shows the running script's version, and
  flags when the page is not connected to a browser window. It is the first thing
  asked for when something goes wrong.
- **Bounded log growth.** The log is specified; the fact that it stops at a size
  and starts over is not. A diagnostic that grows without end is a different
  product from one that does not.
- **The nine-color limit.** The README calls it "a limitation inherited from the
  browser". `favicon-colors` requires deriving a color from the favicon without
  ever saying the result is snapped to a fixed palette — which is why derived
  colors look approximate, and why that is not a bug.

## What Changes

Requirements are added for behavior that already exists. No code changes, and no
behavior changes: if implementing this proposal requires editing anything under
`src/`, the requirement was written wrong and should be corrected to describe what
the code does.

A `diagnostics` capability is introduced for the surface people use to find out
what the mod is doing: the self-test, the console API, and version identification.
The existing `configuration` capability keeps owning the log file, since that is a
preference-driven behavior; only its bounded growth is added.

Command entry points join `grouping-commands`. The palette constraint joins
`favicon-colors`.

Out of scope: changing any of these behaviors, and the three capabilities already
specified in unarchived changes (`control-panel`, `languages`, `installation`) —
those merge into the living spec when their changes are archived, and duplicating
them here would create two sources for the same requirement.

## Capabilities

### New Capabilities

- `diagnostics`: the self-test, the console API and version identification — how a
  user or a maintainer finds out what the mod is doing and whether it is healthy.

### Modified Capabilities

- `grouping-commands`: adds the entry points through which commands are invoked.
- `configuration`: adds the bound on the log file's growth.
- `favicon-colors`: adds the fixed palette the derived color is snapped to.

## Impact

- Four delta spec files. No change under `src/`.
- `scripts/verify.ps1` gains anchors for the new requirements, which is what keeps
  them honest — a requirement with no anchor is a requirement nobody checks.
- The living spec grows from 54 requirements to roughly 65, and stops being silent
  about a third of what the README promises.
