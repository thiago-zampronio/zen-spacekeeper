## Why

The mod runs on any platform Zen runs on — the chrome script and the panel are
plain JavaScript with no Windows dependency. Only the installer is Windows-bound,
and it is bound hard: it finds Zen through the Windows registry, looks for the
profile under `%APPDATA%\zen`, and elevates through UAC. None of those exist on
macOS or Linux, so a working product is unreachable to most of the Zen community.

Installation is also the only part of this project that was never specified. It is
where the two failures users actually hit live — a Zen update silently deleting the
loader, and the wrong profile being picked — and neither is written down as a
requirement anywhere. Porting the installer without specifying it would repeat that
mistake on two more platforms.

## What Changes

Installation becomes a specified capability, describing what the installer must do
on **all** platforms: find the browser, find the profile the browser actually uses,
place the loader and the mod, report what is missing, and undo itself.

A POSIX shell installer (`install.sh`) for macOS and Linux joins the existing
PowerShell one. Shell rather than cross-platform PowerShell: PowerShell is not
present by default on either system, and requiring its install before installing a
browser mod is a worse first step than `curl … | sh`.

Both installers gain the same contract: `--check`, `--uninstall`, and explicit
overrides for the browser and profile directories.

Profile discovery keeps `profiles.ini` as the authority on every platform. This is
not a detail — on the author's own machine the `Default=1` profile is **not** the
one Zen uses, so any installer that trusts the folder listing or that flag installs
into a profile the user never opens, and appears to do nothing.

Detection that fails does not guess. When the browser or the profile cannot be
found, the installer stops and prints the exact override flag to pass and where to
read the value (`about:profiles`, `about:support`). A wrong guess writes files into
someone else's application directory; refusing costs one message.

Out of scope: package-manager distribution (Homebrew, AUR, .deb), Sine
compatibility, an installer with a graphical interface, and automatic updates. Also
out of scope: making the mod itself platform-aware — it already is, and nothing in
`src/` changes.

## Capabilities

### New Capabilities

- `installation`: locating the browser and the profile, placing the loader and the
  mod, reporting installation state, and removal — stated once, for every platform.

### Modified Capabilities

None. No grouping, panel or preference behavior changes.

## Impact

- New `install.sh` at the repository root, for macOS and Linux.
- `install.ps1` gains `-Uninstall` parity and aligned messages; its detection logic
  is unchanged.
- `scripts/verify.ps1` learns to check that both installers agree on the file list
  they deploy — a file added to one and forgotten in the other is exactly the kind
  of drift two installers produce.
- README installation section covers three platforms.
- **The author cannot test macOS or Linux locally.** Both platforms are written
  against documented layouts and must be confirmed on a real machine before this
  change is archived; the verification tasks say so explicitly.
