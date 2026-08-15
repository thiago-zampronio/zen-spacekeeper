## Why

The first real macOS install showed that the two steps the installer leaves to the
user — restart Zen and clear the startup cache — are exactly where the experience
breaks: the loader is ignored until the cache is cleared, and the user's first
impression was "nothing loaded". Both steps can be automated on every platform, so
the installer should offer to finish the job itself.

## What Changes

- Both installers (`install.sh` and `install.ps1`) gain a restart step after a
  successful install: close Zen gracefully, clear the profile's startup cache, and
  relaunch Zen.
- The step is consent-gated. It never closes the browser without an explicit yes:
  a prompt when a terminal is available to answer it, an opt-in flag for scripted
  runs, and a silent skip (with the existing manual instructions) when neither is
  possible — piping the script into `sh` must keep working exactly as today.
- The close is graceful and bounded: the browser is asked to quit the way the
  platform does it, and if it has not exited within a bounded wait (for example an
  unsaved-changes dialog is open), the installer reports that and falls back to
  the manual instructions. It never kills the process.
- When Zen is not running, the installer clears the cache directly and offers only
  the launch.
- The startup cache directory is derived from the already-detected profile, per
  platform, including the flatpak cache location on Linux.

Out of scope:

- Restarting after `--check` or `--uninstall` — those flows keep their current
  messages.
- Closing or restarting any browser other than the Zen installation the installer
  detected.
- Waiting for the browser to finish starting up, or verifying the mod loaded after
  the relaunch — the panel address in the final message remains the confirmation
  step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `installation`: the "states what remains to be done" requirement becomes "offers
  to do what remains": consent-gated restart with startup-cache clearing, graceful
  bounded close, and unchanged behavior for non-interactive runs.

Note: `installation` is introduced by the in-flight change
`add-cross-platform-install`, still awaiting its Linux verification tasks. This
change builds on that delta and must be applied and archived after it.

## Impact

- `install.sh`: process detection, graceful quit (macOS/Linux), cache path per
  platform, prompt via the controlling terminal since stdin is the piped script,
  new flag, relaunch.
- `install.ps1`: the same step with Windows mechanisms, keeping options and
  messages aligned with `install.sh` as `verify.ps1` requires.
- `scripts/verify.ps1`: the installer-parity check must cover the new option.
- `README.md`: installation section documents the restart option and when the
  installer will not offer it.
- No change to the mod itself, the loader, or any preference.
