## Why

Every Zen update deletes the fx-autoconfig loader and the mod dies silently — the
project's most common real-world failure, already lived through on the first macOS
install. Nothing inside the browser can fix this by construction: whatever would
detect the deletion is exactly what stopped loading (Sine, which bundles its own
bootloader in the same directory, suffers the identical failure). The only layer an
update cannot kill is the operating system.

## What Changes

- A **loader guard**: a small OS-level watcher, one per platform, that notices when
  the loader files disappear from the Zen application directory and restores them
  from a copy cached in the profile — or, when restoring would require privilege,
  notifies the user instead. It never elevates from the background and never
  touches the network.
- The installers gain an **opt-in** guard option: never installed silently, always
  removable, reported by `--check` / `-Check` as a third part alongside the loader
  and the mod.
- Uninstalling Spacekeeper removes the guard (it is ours); the loader itself keeps
  today's rule of being left in place.

Out of scope:

- Flatpak (the application image is read-only; there is nothing to restore into).
- Updating or reinstalling the mod itself — the guard restores only the two loader
  files, byte-for-byte from the cached copy.
- Restarting the browser — the loader is read at startup, so a restored loader
  simply works on the next start.

## Capabilities

### New Capabilities

- `loader-guard`: detection of loader deletion, restore-or-notify behavior, the
  profile-side cache it restores from, and its lifecycle (opt-in install, check,
  uninstall).

### Modified Capabilities

- `installation`: the installers offer the guard as an explicit option, report it
  in the check output, and remove it on uninstall.

Note: `installation` is introduced by the still-open change
`add-cross-platform-install`; this change builds on that delta and must be applied
and archived after it.

## Impact

- `install.sh`: macOS LaunchAgent (WatchPaths on the loader file + RunAtLoad) and
  Linux systemd user path unit; a small POSIX guard script deployed to the profile;
  the loader files cached in the profile at install time.
- `install.ps1`: Windows Scheduled Task (logon + daily) running a PowerShell guard
  script; same cache.
- `scripts/verify.ps1`: parity of the new option and wording; anchors for the new
  requirements.
- `README.md`: the guard as the answer to the "After every Zen update" section.
