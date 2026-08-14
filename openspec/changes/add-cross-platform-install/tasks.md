## 1. Shared contract

- [ ] 1.1 Settle the option names both installers accept: check, uninstall, browser
      directory override, profile directory override, repository and branch
- [ ] 1.2 Settle the wording of the messages both print, so the two agree
- [ ] 1.3 Define the deployed file list in one place per installer, in the same order

## 2. install.sh: detection

- [ ] 2.1 Detect the platform (macOS or Linux) and select the candidate layouts
- [ ] 2.2 macOS: locate the application bundle and its resources directory
- [ ] 2.3 Linux: locate the directory holding the Zen binary, covering package,
      tarball and per-user installs
- [ ] 2.4 Detect a flatpak install and its profile location
- [ ] 2.5 Locate the profile root per platform (`~/Library/Application Support/zen`,
      `~/.zen`, and the flatpak equivalent)
- [ ] 2.6 Parse `profiles.ini`: install section first, then `Default=1`
- [ ] 2.7 Resolve a relative profile path against the profile root
- [ ] 2.8 Stop with an actionable message when the browser is not found
- [ ] 2.9 Stop with an actionable message when the profile is not found
- [ ] 2.10 Stop with a clear message when the application directory is not writable
      even with elevation, as under flatpak

## 3. install.sh: installing

- [ ] 3.1 Install the mod files into the profile, creating the directories
- [ ] 3.2 Install the loader into the application directory, elevating for that alone
- [ ] 3.3 Install the loader's profile-side utilities
- [ ] 3.4 Skip the loader without elevating when it is already present
- [ ] 3.5 State what will be written and where before asking for a password
- [ ] 3.6 Fetch the files when run standalone; use local files when run from a clone
- [ ] 3.7 Report the loader and the mod as separate parts
- [ ] 3.8 Implement the check option
- [ ] 3.9 Implement the uninstall option, keeping the loader and the preferences
- [ ] 3.10 Print the restart, startup-cache and `about:spacekeeper` instructions
- [ ] 3.11 Keep to POSIX `sh`; verify with `shellcheck -s sh` if available

## 4. install.ps1 alignment

- [ ] 4.1 Align option names and messages with `install.sh`
- [ ] 4.2 Confirm the deployed file list matches, in the same order

## 5. Verification tooling

- [ ] 5.1 `verify.ps1` compares the file list deployed by both installers and fails
      on any difference
- [ ] 5.2 `verify.ps1` includes `install.sh` in the English-language check

## 6. Documentation

- [ ] 6.1 README installation section covers Windows, macOS and Linux
- [ ] 6.2 Document the download-inspect-run path for anyone avoiding a piped script
- [ ] 6.3 Document the override options and when they are needed
- [ ] 6.4 Note the flatpak limitation, if it turns out to be one

## 7. Verification on a real machine

These require the actual operating system. They CANNOT be verified by reading code,
and the change is not archived until the user has run them. The author has no macOS
or Linux machine in the development environment.

- [ ] 7.1 macOS: fresh install works, and the mod loads after restarting Zen
- [ ] 7.2 macOS: the panel opens at `about:spacekeeper`
- [ ] 7.3 macOS: the check option reports the truth before and after installing
- [ ] 7.4 macOS: uninstall removes the mod and keeps the loader
- [ ] 7.5 macOS: the detected profile is the one Zen actually opens
- [ ] 7.6 Linux: fresh install works, and the mod loads after restarting Zen
- [ ] 7.7 Linux: the panel opens at `about:spacekeeper`
- [ ] 7.8 Linux: check and uninstall behave as on the other platforms
- [ ] 7.9 Linux: a flatpak install either works or refuses with a clear reason
- [ ] 7.10 Windows: the aligned installer still installs, checks and uninstalls
- [ ] 7.11 Any platform: failed detection prints a message that actually resolves the
      problem when followed
