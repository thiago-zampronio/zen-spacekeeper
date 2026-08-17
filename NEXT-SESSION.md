# What is open, and what to run next

Scratch notes between sessions. Not documentation — delete it when the four changes
below are archived.

## State

Windows is current: the repository, the profile and the running browser are all on
the version in `CHANGELOG.md`, and `scripts/verify.ps1` passes. Releases v0.49.0
through v0.52.0 are published on GitHub, with their changelog entries as notes.

Four changes are open, and **every one of them is blocked on a machine, not on
work**. Nothing is waiting on a decision except the one question at the bottom.

| Change | Left | Needs |
| --- | --- | --- |
| `add-cross-platform-install` | 7.9 | a flatpak Zen |
| `add-installer-restart` | 5.5, 5.6 | Windows (interactive), Linux |
| `add-stale-version-detection` | 6.8 | macOS |
| `update-as-a-banner` | 8.2–8.8 | any browser, mostly macOS |

## Linux is done, on WSL

Ubuntu 26.04 under WSL turned out to be a better test bed than the Docker plan:
systemd runs as PID 1, `/bin/sh` is `dash`, and WSLg renders windows onto the
Windows desktop. Zen 1.21.14b installs from its own tarball into
`~/.local/share/zen`, which needs no root, and the only missing library was
`libasound2t64`.

Everything in section 7 passed except the flatpak case, and the run found **nine
real defects** — five of them impossible to see anywhere but Linux. They are
written up in that change's `tasks.md`.

Two limits worth knowing before repeating it: WSLg renders Zen in software
(`[WARN:COPY MODE]` in the title) so the window paints blank, which makes it
useless for judging appearance; and the taskbar shows a generic Linux icon because
a tarball install registers no `.desktop` entry. Neither is a product problem.

To bring the WSL side back up:

```sh
wsl -d Ubuntu
curl -fsSL https://raw.githubusercontent.com/thiago-zampronio/zen-spacekeeper/main/install.sh | sh -s -- --guard
~/.local/share/zen/zen --profile ~/.config/zen/*.default about:spacekeeper &
```

## On the Mac

Clone fresh and install — that alone exercises `add-stale-version-detection` 6.8
and confirms the installer half behaves as it does on Windows:

```sh
git clone https://github.com/thiago-zampronio/zen-spacekeeper
cd zen-spacekeeper && ./install.sh --check     # before installing
./install.sh --guard --restart
./install.sh --check                            # after
```

Then, for `update-as-a-banner`, the Mac is in the right state by accident: whatever
is installed there is older than v0.52.0, so opening `about:spacekeeper` should show
the blue banner immediately. That covers 8.1 again and opens the door to the rest:

- **8.2** — click **Release notes**. The Mac is several releases behind, so this is
  the multi-release backlog case that Windows could not produce.
- **8.3** — click **Update**. It should download and then hand over to the orange
  banner, because updating leaves the browser running the older code.
- **8.5** — that hand-over IS the precedence case: at that moment an update no
  longer exists but a stale version does. To see it properly, install an older
  version while a newer release exists.
- **8.6** — restart from the orange banner; the update banner should be gone,
  because there is nothing newer left.
- **8.7** — the pill appears a few seconds after a window opens when a release is
  newer. Clicking it should land on the filled-in banner.
- **8.4** — turn `zen.stg.updateCheck` off in the new Updates section, reload the
  panel: no request, and the manual **Check for updates** button present.
- **8.8** — the two banners side by side in the dark theme.

For `add-installer-restart` 5.5 (Windows) the three interactive checks were never
run because they close the browser: accept the restart prompt, decline it, and
leave an unsaved-changes dialog open so the bounded wait expires. The non-
interactive case is done.

## Settled: the two restarts stay different

Raised and decided. After a successful update the panel's dialog calls
`resetAndRestart`, which dissolves every group; the stale banner calls
`restartToApply`, which touches nothing. That asymmetry is intentional — a version
change can alter the group marking and leave the old groups unrecognized, so an
update rebuilds them, while applying code already sitting on disk has no reason to.

Written into the source above `restartToApply` so the next person to notice it
finds the answer instead of the question. Nothing to do here.
