## 1. Shared contract

- [x] 1.1 Settle the option name (`--restart` / `-Restart`), the prompt wording, and
      the messages for: performed, declined, skipped (no terminal), browser did not
      close, cache location not derivable
- [x] 1.2 Settle the bounded wait duration, identical in both installers

## 2. install.sh

- [x] 2.1 Detect a running Zen by matching the process against the detected
      application directory, never by bare process name
- [x] 2.2 Derive the startup cache path from the profile root and the profile's
      relative path (macOS and Linux, including the flatpak cache root); refuse to
      derive when the profile sits outside the known root
- [x] 2.3 Prompt for consent via `/dev/tty`; skip silently when it cannot be opened
      and `--restart` was not given
- [x] 2.4 Ask Zen to quit (osascript on macOS, SIGTERM on Linux) and poll for exit
      within the bounded wait; on timeout, report and fall back to the manual
      instructions without deleting anything
- [x] 2.5 Clear only `startupCache`, treating an absent directory as success
- [x] 2.6 Relaunch detached (open -a on macOS; setsid-style on Linux)
- [x] 2.7 Handle the not-running case: clear the cache and offer only the launch
- [x] 2.8 Adjust the final message per outcome (performed vs manual steps)
- [x] 2.9 Keep to POSIX `sh`; verify with `sh -n` and `dash -n`

## 3. install.ps1

- [x] 3.1 Same step with Windows mechanisms: process path match, `CloseMainWindow()`
      with bounded wait, cache under `%LOCALAPPDATA%\zen`, `Start-Process` relaunch
- [x] 3.2 `-Restart` flag and `Read-Host` prompt, aligned with install.sh wording
- [x] 3.3 Same outcome-dependent final message

## 4. Verification tooling and docs

- [x] 4.1 Extend the `verify.ps1` installer-parity check to cover the new option and
      messages
- [x] 4.2 README: document the restart option, the consent rule, and when the
      installer will not offer it

## 5. Verification on a real machine

These require the actual operating system and a running browser, and are checked
only when the user confirms them.

- [x] 5.1 macOS: accept the prompt — Zen closes, cache cleared, Zen reopens, mod loads
- [x] 5.2 macOS: decline — nothing closes, nothing deleted, manual steps printed
- [x] 5.3 macOS: piped run (`curl | sh`) without the flag skips the restart cleanly
- [x] 5.4 macOS: with an unsaved-changes dialog open, the bounded wait expires and
      nothing is killed or deleted
- [ ] 5.5 Windows: the same four checks with install.ps1
      Only the third is done: repeated non-interactive runs skipped the restart
      cleanly — Zen stayed up across every install, and the startup cache kept its
      earlier timestamps, so nothing was closed and nothing deleted. Accepting the
      prompt, declining it, and the bounded wait against an unsaved-changes dialog
      all need a terminal and a browser someone is willing to have closed.
- [ ] 5.6 Linux: the same four checks, plus the flatpak cache location or a clear
      refusal
- [x] 5.7 Any platform: Zen not running — cache cleared, launch offered
