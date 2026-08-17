## 1. Shared contract

- [x] 1.1 Settle the option names both installers accept: check, uninstall, browser
      directory override, profile directory override, repository and branch
- [x] 1.2 Settle the wording of the messages both print, so the two agree
- [x] 1.3 Define the deployed file list in one place per installer, in the same order

## 2. install.sh: detection

- [x] 2.1 Detect the platform (macOS or Linux) and select the candidate layouts
- [x] 2.2 macOS: locate the application bundle and its resources directory
- [x] 2.3 Linux: locate the directory holding the Zen binary, covering package,
      tarball and per-user installs
- [x] 2.4 Detect a flatpak install and its profile location
- [x] 2.5 Locate the profile root per platform (`~/Library/Application Support/zen`,
      `~/.zen`, and the flatpak equivalent)
- [x] 2.6 Parse `profiles.ini`: install section first, then `Default=1`
- [x] 2.7 Resolve a relative profile path against the profile root
- [x] 2.8 Stop with an actionable message when the browser is not found
- [x] 2.9 Stop with an actionable message when the profile is not found
- [x] 2.10 Stop with a clear message when the application directory is not writable
      even with elevation, as under flatpak

The `profiles.ini` parsing was tested against the author's real file, where the
`[Install…]` section names `eeijpino` while `Default=1` marks a different profile.
Step one returns the right profile; the fallback would have returned the wrong one.
The macOS and Linux *paths* are written from documentation and remain untested — see
section 7.

## 3. install.sh: installing

- [x] 3.1 Install the mod files into the profile, creating the directories
- [x] 3.2 Install the loader into the application directory, elevating for that alone
- [x] 3.3 Install the loader's profile-side utilities
- [x] 3.4 Skip the loader without elevating when it is already present
- [x] 3.5 State what will be written and where before asking for a password
- [x] 3.6 Fetch the files when run standalone; use local files when run from a clone
- [x] 3.7 Report the loader and the mod as separate parts
- [x] 3.8 Implement the check option
- [x] 3.9 Implement the uninstall option, keeping the loader and the preferences
- [x] 3.10 Print the restart, startup-cache and `about:spacekeeper` instructions
- [x] 3.11 Keep to POSIX `sh`; verified with `sh -n` and `dash -n`

Install, check and uninstall were exercised end to end against throwaway directories,
including the case where a Zen update removed the loader. Two defects were found and
fixed there rather than shipped:

- `printf | while` runs the loop body in a subshell, so the staging directory created
  inside one was invisible to the cleanup trap and leaked. Every loop now reads its
  lines through a redirect, and the staging directory is created up front.
- The `EXIT` trap's last command replaced the script's exit status, so `[ -n "" ]`
  made every successful run exit 1 — a `--check` reporting "everything installed"
  signalled failure to anything reading the code.

## 4. install.ps1 alignment

- [x] 4.1 Align option names and messages with `install.sh`
- [x] 4.2 Confirm the deployed file list matches, in the same order

## 5. Verification tooling

- [x] 5.1 `verify.ps1` compares the file list deployed by both installers and fails
      on any difference
- [x] 5.2 `verify.ps1` includes `install.sh` in the English-language check

The comparison was confirmed to fail by removing a file from one installer, not only
by observing it pass. It also checks that `install.sh` lists every vendored loader
utility, since those are named one by one and a missed file yields a half-loading
loader.

## 6. Documentation

- [x] 6.1 README installation section covers Windows, macOS and Linux
- [x] 6.2 Document the download-inspect-run path for anyone avoiding a piped script
- [x] 6.3 Document the override options and when they are needed
- [x] 6.4 Note the flatpak limitation, if it turns out to be one

## 7. Verification on a real machine

These require the actual operating system. They CANNOT be verified by reading code,
and the change is not archived until the user has run them. The author has no macOS
or Linux machine in the development environment.

- [x] 7.1 macOS: fresh install works, and the mod loads after restarting Zen
- [x] 7.2 macOS: the panel opens at `about:spacekeeper`
- [x] 7.3 macOS: the check option reports the truth before and after installing
- [x] 7.4 macOS: uninstall removes the mod and keeps the loader
- [x] 7.5 macOS: the detected profile is the one Zen actually opens
- [ ] 7.6 Linux: fresh install works, and the mod loads after restarting Zen
- [ ] 7.7 Linux: the panel opens at `about:spacekeeper`
- [x] 7.8 Linux: check and uninstall behave as on the other platforms
- [ ] 7.9 Linux: a flatpak install either works or refuses with a clear reason
- [x] 7.10 Windows: the aligned installer still installs, checks and uninstalls
- [x] 7.11 Any platform: failed detection prints a message that actually resolves the
      problem when followed
- [x] 7.12 Windows (moved from add-loader-guard): logon-triggered guard restore and
      notification; uninstall clean
- [x] 7.13 Linux (moved from add-loader-guard): path-unit-triggered guard restore and
      notification; uninstall clean; non-systemd refusal message
- [ ] 7.14 Any platform (moved from add-loader-guard): a real Zen update with the
      guard installed - the scenario that motivated it

The Linux run happened on WSL Ubuntu 26.04 — systemd as PID 1, `dash` as `/bin/sh`,
and a real Zen 1.21.14b tarball under `~/.local/share/zen`. It surfaced five
defects, all fixed, and not one of them would have appeared on macOS:

- The profile was searched for in `~/.zen`, which a real Zen install never creates:
  it uses `~/.config/zen`. The installer would have failed to find the profile on
  every Linux machine and told the user to pass `--profile-dir`.
- `ask_tty` asked whether `/dev/tty` opens, which is not whether anyone will
  answer. Under `wsl -- bash -lc` a terminal exists and nobody types, so the
  restart prompt blocked for 337 seconds before being killed. Cron and CI reach
  the same state.
- `warn` wrote to stderr while the headings wrote to stdout, so anything capturing
  both interleaved them — a missing LOADER file appeared under the MOD's heading.
- The elevation notice was printed before working out whether elevation was needed.
  A per-user install under the home directory is writable, so it announced
  "administrator rights" and then asked for nothing.
- `--guard` on a system without systemd called `die`, aborting the whole install
  over an optional extra. The mod works perfectly without a watcher.

Verified after the fixes: `curl … | sh` from the published `main` installs from
nothing (7.6 in part, and 7.8), the guard registers and systemd reports it
`enabled`, deleting the loader has it restored **within one second** by the path
unit with both events logged, a system without `systemctl` warns and keeps the
install, and `--uninstall` leaves no unit, no directory and no marker while
preserving the loader (7.13).

Still open on Linux: 7.6's browser half and 7.7 need Zen running with a GUI, which
needs the GTK libraries WSL does not ship by default.

The Windows run of 7.11 and 7.12 surfaced four defects, all fixed rather than noted.

Two were Windows-only and had passed on macOS for environmental reasons, which is
the argument for running the suite on every platform rather than trusting one:
`verify.ps1` invoked `node_modules/.bin/eslint`, the extensionless POSIX launcher,
which PowerShell refuses inside a pipeline; and eslint's verdict depended on
untracked files in the working tree, so a leftover backup present only on this
machine failed the gate here and passed everywhere else.

Two were real product defects. `-Guard` printed `[ok] guard installed` while
`Register-ScheduledTask` had failed with access denied — `-AtLogOn` without `-User`
registers an all-users task, which needs administrator. The user would have had the
cache, the script and the success message, and no watcher at all. Registration is
now scoped to the account, and the result is checked instead of assumed.

And the guard notified *or* logged, never both. A toast whose AppID Windows does not
know returns success and displays nothing, so a Zen update could delete the loader,
the guard could notice, and no trace would exist anywhere. The same hole exists on
macOS under Do Not Disturb. Both guards now always log and additionally notify.

Overrides were also accepted without checking they exist: `-ZenDir C:\nao\existe`
printed the invented path and proceeded toward writing the loader into a directory
it would have created. Both installers now require an explicit override to exist —
existence only, since anything stricter risks rejecting a layout never seen.

The macOS run (Sequoia 15.x, Zen 1.21.14b, admin user) surfaced two facts worth
recording. A staged Zen update applied itself on the first restart after install,
replaced the whole bundle and deleted the loader — `--check` diagnosed it and a
re-run fixed it, which is the documented recovery working on a real machine. And
`/Applications/Zen.app` was group-writable for an admin user, so the loader went in
without sudo; the elevation path remains exercised only on Windows. The detected
profile was confirmed against the running process arguments, where `Default=1` in
`profiles.ini` named a different profile than the `[Install…]` section — the case
the parser was written for. The uninstall cycle was verified end to end: mod files
removed, loader kept, reinstall skipped elevation.
