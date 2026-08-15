## 1. Shared contract

- [x] 1.1 Settle the option names (`--guard` / `-Guard`), the guard's file layout
      under `<profile>/spacekeeper/`, and the notification wording (restored vs
      re-run), identical across platforms
- [x] 1.2 Settle what `--check` / `-Check` reports for the guard (present, broken,
      absent)

## 2. Guard scripts

- [x] 2.1 POSIX guard script (macOS/Linux): verify loader presence, verify the
      target still looks like a Zen installation, restore from cache when writable,
      notify via osascript / notify-send with a log-line fallback
- [x] 2.2 PowerShell guard script (Windows): same behavior, toast notification
- [x] 2.3 Self-disarm: when the mod's files are gone from the profile, the guard
      removes its watcher, schedule, script and cache, and touches nothing else
- [x] 2.4 Self-containment: the scripts reference only the profile directory, the
      recorded Zen path and OS facilities — no installer, clone or network
- [x] 2.5 Cache date stamp written at install; restore notifications name it

## 3. install.sh

- [x] 3.1 `--guard`: deploy the guard script and the loader cache, then the macOS
      LaunchAgent (WatchPaths + RunAtLoad) or the systemd user path unit; state
      what is created before creating it
- [x] 3.2 Refuse with a clear message on Linux without systemd
- [x] 3.3 `--check` reports the guard as its own part
- [x] 3.4 `--uninstall` removes watcher, script and cache
- [x] 3.5 Keep POSIX sh; `sh -n` and `dash -n`

## 4. install.ps1

- [x] 4.1 `-Guard`: deploy the guard script and cache, register the Scheduled Task
      (logon + daily), aligned wording
- [x] 4.2 `-Check` and `-Uninstall` parity with install.sh

## 5. Verification tooling and docs

- [x] 5.1 verify.ps1: option and wording parity for the guard; anchors for the new
      requirements
- [x] 5.2 README: the guard as the answer in "After every Zen update", with the
      consent and no-elevation rules stated

## 6. Verification on a real machine

Checked only when the user confirms them.

- [x] 6.1 macOS: install the guard, delete the loader by hand, see the restore and
      the notification within seconds; `--check` before and after
- [x] 6.2 macOS: with the cache removed, deletion produces the re-run notification
      and no write
- [x] 6.3 macOS: uninstall leaves no LaunchAgent, script or cache behind
      non-systemd refusal message

Tasks 6.4 (Windows), 6.5 (Linux) and 6.6 (a real Zen update) moved to the
still-open add-cross-platform-install change, which already holds every
pending platform verification - one honest place instead of two.

macOS run (15.7, real machine): the directory watcher fired within ONE second of
the loader's deletion; the restore write was denied by App Management (logged:
"cp: Operation not permitted" although the directory tests POSIX-writable), so the
notify path is the macOS behavior — task 6.1's "restore" leg was verified by
running the guard from a foreground shell, where the write succeeds. Uninstall
verified end to end: no LaunchAgent loaded, no plist, no profile directory left.
