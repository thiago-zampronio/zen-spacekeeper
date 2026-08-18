## Context

After installing, the mod only loads once the browser restarts with a clear startup
cache. Both installers currently print those two steps and stop. The first macOS
install showed the cost: the user restarted, a staged Zen update muddied the water,
and the stale-cache instruction was the difference between "works" and "nothing
loaded". Everything the instruction asks for can be done by the installer itself,
on all three platforms, with the information it already has: the application
directory and the profile directory.

## Goals / Non-Goals

**Goals:**

- One consented step that closes Zen, clears the right startup cache, and starts
  Zen again, in both installers, with aligned option names and messages.
- Zero behavior change for anyone who declines, runs non-interactively without the
  option, or pipes the script as the README suggests.

**Non-Goals:**

- Killing a browser that refuses to close.
- Verifying the mod loaded after the relaunch.
- Restart after `--check` or `--uninstall`.

## Decisions

**Consent: prompt from the controlling terminal, flag for scripts.**
In `curl | sh`, stdin is the script itself, so the prompt reads from `/dev/tty`;
when `/dev/tty` cannot be opened there is no one to ask, and the step is skipped in
favor of the current instructions. `--restart` (sh) / `-Restart` (PowerShell)
consents up front and also serves non-interactive automation. PowerShell's
`irm | iex` keeps an interactive host, so `Read-Host` works there directly.
Alternative rejected: defaulting to restart with a `--no-restart` opt-out — an
installer that closes your browser by default is hostile, and piped runs would
inherit the hostile default.

**Detecting "Zen is running": by the binary's full path, not by name.**
The process list is matched against the detected application directory (`pgrep -f`
on the resolved binary path; on Windows, the process `Path` against the install
directory). Matching the bare name `zen` would hit unrelated processes and, worse,
a second Zen install the user is not targeting.

**Graceful close, per platform, bounded wait, never kill.**
macOS asks the bundle to quit via `osascript` (`quit app`), Linux sends SIGTERM to
the main process — Firefox-family browsers treat both as a normal quit and save the
session — and Windows uses `CloseMainWindow()`. The installer then polls for exit
for a bounded wait (around 20 seconds). If the browser is still running — an
unsaved-changes or download dialog being the expected reason — the installer
reports it, prints the manual steps, and leaves everything as it was. A kill is
never an acceptable fallback: it trades a stale cache for a lost session.

**Cache path: derived from the detected profile, by substituting roots.**
The startup cache lives under a per-platform cache root, mirroring the profile's
relative path from `profiles.ini`:

- macOS: `~/Library/Caches/zen/<relative-path>/startupCache`
- Linux: `~/.cache/zen/<relative-path>/startupCache`, and under
  `~/.var/app/<flatpak-id>/cache/zen/` when the profile root is the flatpak one
- Windows: `%LOCALAPPDATA%\zen\<relative-path>\startupCache` (the profile itself
  is under `%APPDATA%`)

When the profile directory does not sit under the known profile root — an explicit
`--profile-dir` pointing somewhere unusual, or `IsRelative=0` — the cache location
cannot be derived safely; the restart proceeds without the cache step and says so,
rather than guessing and deleting someone else's cache. An absent cache directory
is already-clear, not an error. Only `startupCache` is removed, never the profile's
cache root.

**Relaunch: detached, via the platform's own front door.**
macOS `open -a` on the bundle (derived from the resources directory), Linux the
detected binary detached from the installer's terminal (`setsid`/`nohup`-style, so
closing the terminal does not take the browser down), Windows `Start-Process`. The
installer does not wait for startup to finish; the final message names
`about:spacekeeper` as the confirmation step, as it does today.

**Order: close, clear, launch — and clear only after exit is confirmed.**
Clearing the cache while the browser runs is a race the browser wins by rewriting
it on shutdown. The cache step runs only after the process is observed gone (or was
never running).

## Risks / Trade-offs

- [The bounded wait fires while Zen is shutting down slowly, not blocked] → the
  wait is generous relative to a normal quit, and the failure mode is the current
  behavior: manual instructions, nothing deleted, browser untouched.
- [A second Zen instance from another install directory stays running and rewrites
  nothing relevant] → path-matched detection ignores it by design; the cache
  cleared belongs to the detected profile, which that instance does not use.
- [Flatpak cache layout differs from the documented one] → the Linux flatpak paths
  remain unverified until the change's real-machine tasks run, same policy as the
  cross-platform installer change.
- [`verify.ps1` parity check must learn the new option] → extending the parity
  check is part of the change, so a drift between the two installers fails the
  gate instead of shipping.

## Open Questions

- None blocking. The exact wait duration and prompt wording are settled during
  implementation, kept identical across the two installers.
