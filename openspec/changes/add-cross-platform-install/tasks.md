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
- [ ] 7.8 Linux: check and uninstall behave as on the other platforms
- [ ] 7.9 Linux: a flatpak install either works or refuses with a clear reason
- [x] 7.10 Windows: the aligned installer still installs, checks and uninstalls
- [ ] 7.11 Any platform: failed detection prints a message that actually resolves the
      problem when followed

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
