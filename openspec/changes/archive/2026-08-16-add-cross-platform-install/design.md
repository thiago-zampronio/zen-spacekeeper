## Context

The mod is platform-neutral; only the installer is not. `install.ps1` finds Zen
through the Windows registry, reads `%APPDATA%\zen`, and elevates through UAC.

fx-autoconfig documents where the loader goes on each platform: on macOS, into the
application bundle's `Contents/Resources/`; on Linux, alongside the browser binary
(`/usr/lib/<app>` and equivalents). The profile side is identical everywhere —
`chrome/utils`, `chrome/JS`, `chrome/CSS`, `chrome/resources` under the profile.

The author develops on Windows and has no macOS or Linux machine available for this
work. A work Mac exists and can be used to confirm, after the fact.

## Goals / Non-Goals

**Goals:**

- One command that installs on Windows, macOS and Linux.
- The same behavior contract across platforms: check, install, uninstall, override.
- Never install into the wrong place silently.

**Non-Goals:**

- Package managers (Homebrew, AUR, `.deb`), Sine, automatic updates.
- A graphical installer.
- Changing anything in `src/`.

## Decisions

### A POSIX shell script, not cross-platform PowerShell

PowerShell 7 runs on macOS and Linux, so one script could in principle serve all
three. It would be the wrong trade: PowerShell is not installed by default on either
system, so the first step of installing a browser mod would be installing a shell.
`curl -fsSL … | sh` is what a user on those platforms already expects, and `sh` is
guaranteed present.

The cost is two installers to keep in step. That cost is real and is paid by a check
in `verify.ps1` comparing the file list each one deploys — drift between them is the
predictable failure, so it gets a test rather than a promise.

`install.sh` targets POSIX `sh`, not `bash`: some minimal Linux images ship `dash` as
`/bin/sh`, and nothing here needs arrays or `[[ ]]`.

### Detection refuses rather than guesses

Application layouts vary more outside Windows: `/Applications` versus `~/Applications`
on macOS, and on Linux a distribution package, a tarball in `/opt`, or a flatpak with
its own filesystem view. The installer probes a list of known layouts, and when none
matches it stops and prints the override flag.

This is deliberate asymmetry: guessing wrong means writing files into some other
application's directory, possibly with elevated privilege. Refusing means the user
passes one flag. Given that the author cannot test these paths, refusing is the only
defensible default.

### Flatpak is detected but not written to blindly

A flatpak Zen keeps its profile under `~/.var/app/<app-id>/.zen` and its application
files inside a read-only runtime image. The loader cannot be installed there the
usual way. The installer detects the flatpak profile, and if the application side is
not writable it says so and stops, rather than reporting success for a half
installation that will never load.

### `profiles.ini` stays the authority, on every platform

Already true on Windows, and the reason is worth restating because it was found the
hard way: on the author's own machine, `Profile1` carries `Default=1` while the
profile Zen actually opens is `Profile0`, named by the `[Install…]` section. An
installer trusting the flag would write into a profile the user never sees, and
report success.

The parsing is the same three-step rule everywhere: the install section wins, then
`Default=1`, then give up and ask.

### Elevation per platform, requested late

Windows re-launches itself through UAC. macOS and Linux use `sudo` for the loader
copy alone, not for the whole run — so the profile files are written as the user and
do not end up owned by root, which would break the next non-elevated install.

Elevation is requested only when the loader is actually missing. After a browser
update that is common; on a first install it always happens; on a routine mod update
it never should.

### The installer explains the loader/mod split

Both installers report the two parts separately, because that split *is* the
diagnosis when the mod stops working. Naming it in the output turns a silent failure
into a one-line answer, which is the same reason the debug log exists.

## Risks / Trade-offs

- **Untested on the target platforms.** The macOS and Linux paths are written from
  documentation, not from a run. Path names, the bundle name (`Zen.app` versus
  `Zen Browser.app`), and the Linux install directory are the likely wrong details.
  Mitigated by refusing on failed detection and by the override flags, so the worst
  realistic outcome is "it asked me to pass a flag" rather than a wrong write. The
  verification tasks require a real run before archiving.
- **Two installers drift.** Mitigated by the file-list check in `verify.ps1`, which
  fails when one deploys a file the other does not.
- **`curl | sh` asks for trust.** Unavoidable for this install shape, and the same
  trust `irm | iex` already asks on Windows. The README will also document the
  download-inspect-run path for anyone who would rather read it first.
- **`sudo` inside a piped script.** Prompting for a password from a script read off
  the network is legitimately uncomfortable. The script prints what it is about to
  write and where before asking, and a user can decline and run only the profile
  half.
