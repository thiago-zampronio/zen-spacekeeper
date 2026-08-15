## 1. Shared contract

- [ ] 1.1 Settle the option names (`--guard` / `-Guard`), the guard's file layout
      under `<profile>/spacekeeper/`, and the notification wording (restored vs
      re-run), identical across platforms
- [ ] 1.2 Settle what `--check` / `-Check` reports for the guard (present, broken,
      absent)

## 2. Guard scripts

- [ ] 2.1 POSIX guard script (macOS/Linux): verify loader presence, verify the
      target still looks like a Zen installation, restore from cache when writable,
      notify via osascript / notify-send with a log-line fallback
- [ ] 2.2 PowerShell guard script (Windows): same behavior, toast notification

## 3. install.sh

- [ ] 3.1 `--guard`: deploy the guard script and the loader cache, then the macOS
      LaunchAgent (WatchPaths + RunAtLoad) or the systemd user path unit; state
      what is created before creating it
- [ ] 3.2 Refuse with a clear message on Linux without systemd
- [ ] 3.3 `--check` reports the guard as its own part
- [ ] 3.4 `--uninstall` removes watcher, script and cache
- [ ] 3.5 Keep POSIX sh; `sh -n` and `dash -n`

## 4. install.ps1

- [ ] 4.1 `-Guard`: deploy the guard script and cache, register the Scheduled Task
      (logon + daily), aligned wording
- [ ] 4.2 `-Check` and `-Uninstall` parity with install.sh

## 5. Verification tooling and docs

- [ ] 5.1 verify.ps1: option and wording parity for the guard; anchors for the new
      requirements
- [ ] 5.2 README: the guard as the answer in "After every Zen update", with the
      consent and no-elevation rules stated

## 6. Verification on a real machine

Checked only when the user confirms them.

- [ ] 6.1 macOS: install the guard, delete the loader by hand, see the restore and
      the notification within seconds; `--check` before and after
- [ ] 6.2 macOS: with the cache removed, deletion produces the re-run notification
      and no write
- [ ] 6.3 macOS: uninstall leaves no LaunchAgent, script or cache behind
- [ ] 6.4 Windows: logon-triggered restore and notification; uninstall clean
- [ ] 6.5 Linux: path-unit-triggered restore and notification; uninstall clean;
      non-systemd refusal message
- [ ] 6.6 Any platform: a real Zen update with the guard installed — the scenario
      that motivated all of this
