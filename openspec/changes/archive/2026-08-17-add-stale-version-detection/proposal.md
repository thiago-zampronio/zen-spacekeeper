## Why

The mod was updated on disk from 0.17.0 to 0.48.3 while Zen was running. Zen kept
executing the 0.17.0 it had loaded at startup, and every surface said everything was
fine: `install.ps1` reported five files installed, `-Check` reported everything
installed, `verify.ps1` reported the profile at the repository version. All of them
were right, and all of them were answering a question nobody had asked — they
compare files to files. What was actually running was invisible.

The panel was the only thing that showed a symptom, and it showed the wrong one: it
said "this page isn't connected to the browser window", which points at the browsing
context, not at a version mismatch. Half an hour went into the wrong hypotheses
before the debug log settled it, and it only settled it because a log field had been
renamed between the two versions — an accident, not a designed signal.

This is the project's own recurring failure mode, in the one place that had escaped
it: a success message that is technically true and practically misleading. It will
recur, because installing while the browser is open is the normal thing to do.

## What Changes

Three layers, deliberately different from each other — the same check repeated three
times would only shift where the silence happens.

**The script notices, by itself.** At startup, the running script compares the
version compiled into it against the version in the file it was loaded from. It
needs no user, no click and no browser restart to find out, and it records what it
found.

**The panel says it plainly.** When the two disagree, the panel states which version
is running, which is installed, and what to do about it — instead of a version badge
the user must think about, or a "not connected" message that names the wrong cause.

**The installer warns before the browser is even opened.** `--check` reports when
Zen has been running since before the current files were installed, which is exactly
the condition that produces this state.

The panel's "not connected" message also stops carrying two meanings: it currently
covers both "opened outside a browser window" and "the mod is not loaded here", and
the second one now has a message of its own.

Out of scope: reloading the script without restarting Zen (fx-autoconfig has no
supported path for that, and a half-swapped script is worse than a stale one), and
blocking installation while Zen is running.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `diagnostics`: the running version is not only identifiable, it is compared
  against the installed one, and a disagreement is reported.
- `control-panel`: the panel distinguishes "not loaded in this window" from "running
  a different version than the one installed", and states the remedy.
- `installation`: reporting installation state includes whether the browser is
  running code older than what is installed.

## Impact

- `src/zen-space-tab-groups.uc.mjs`: a startup comparison, its log event, and the
  result exposed on `ZSTG` for the panel to read.
- `src/resources/zstg-panel.html`: a banner for the mismatch, and the split of the
  overloaded "not connected" case.
- `src/resources/zstg-i18n.mjs`: the new texts, in three languages.
- `install.ps1`, `install.sh`: `--check` compares the browser's start time against
  the installation marker.
- `scripts/verify.ps1`: anchors for the new requirements.
- No change to grouping behavior.
