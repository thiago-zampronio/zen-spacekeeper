## Context

The loader lives in the application directory; every Zen update replaces that
directory. Everything loaded through the loader — this mod, Sine, any userscript —
dies with it and cannot report its own death. The recovery today is a human
noticing the silence and re-running the installer; the `--restart` option made the
re-run cheap, but noticing still costs days.

## Goals / Non-Goals

**Goals:**

- The gap between "Zen updated" and "the user knows" drops from days to minutes,
  and to zero clicks when the directory is user-writable.
- Every component keeps the project's standing claims: no network at runtime, no
  elevation without a human in front of it, nothing installed without consent.

**Non-Goals:**

- Guarding Sine or other mods' bootstraps (the restored loader is ours; other
  fx-autoconfig mods happen to benefit, which is fine).
- Flatpak, where the image is read-only and only the notify path could exist —
  cut from scope to keep the first version small.
- A daemon: every mechanism below is the OS's own scheduler/watcher, no process of
  ours stays resident.

## Decisions

**Per-platform mechanism, using each OS's native watcher.**

- macOS: a per-user LaunchAgent (`~/Library/LaunchAgents/`) with `WatchPaths` on
  the loader file and `RunAtLoad` — fires within seconds of the deletion and once
  per login as a safety net. Visible to the user in System Settings > Login Items,
  which is transparency, not a leak.
- Linux: a systemd user path unit watching the loader's directory, plus the same
  run-at-login service. Non-systemd distributions fall outside the first version
  (the installer says so rather than half-working).
- Windows: a Scheduled Task at logon plus a daily trigger. Windows has no cheap
  file-deletion trigger for an unelevated task, so detection latency is "next
  logon or next day" — worse than the others and accepted; the failure it guards
  against already takes a restart (the update) to happen.

**The guard is a tiny script deployed to the profile, not inline in the watcher.**
The LaunchAgent/systemd unit/Task only runs `<profile>/spacekeeper/guard.(sh|ps1)`.
Logic in one place per platform family, watcher definitions stay declarative, and
the uninstall has exactly three things to delete (watcher, script, cache).

**Restore-or-notify, never elevate.** Writable directory (the macOS admin-user
case, most Linux user-dir installs): copy the two cached files back, then notify
"restored; it loads on the next Zen start". Not writable: notify "Zen updated and
removed the loader — re-run the installer". Notification via `osascript display
notification` / `notify-send` / a PowerShell toast, each with a plain-text
fallback to a log line when the facility is absent.

**Cache written at install time, under the profile.** `install --guard` copies
`config.js` and `config-prefs.js` to `<profile>/spacekeeper/loader-cache/` and
records the Zen directory path next to them. The guard restores byte-for-byte from
there; a missing cache downgrades to notify-only. The cache is refreshed on every
install run, so it always matches the last installed loader.

**Zen may be running during a restore — that is fine.** The loader files are read
once at startup; writing them while Zen runs affects nothing until the next start,
which is exactly when they are needed.

**Self-disarm kills the orphan problem.** On every run the guard first checks the
mod's own files in the profile; gone means the guard deletes itself — watcher,
script, cache. Persistence that verifies its own reason to exist on every wake is
the answer to "it gets downloaded and never leaves": it leaves on its own.

**Staleness is handled by visibility, not expiry.** The cache is refreshed on
every install run and stamped with its date; a restore notification names that
date. There is no hard expiry: a loader that worked yesterday restored into
today's Zen is exactly what re-running the installer from a clone would do — and
if a future Zen does break it, the startup canary reports the breakage loudly on
the next start, which is the moment the user re-runs the installer. The two
features were built to compose.

**The whole footprint is one directory and one watcher entry.** Everything lives
in `<profile>/spacekeeper/` (script, cache, date stamp) plus the single
LaunchAgent / path unit / Scheduled Task, all documented in the README — deleting
those two things by hand IS a complete uninstall, no scavenger hunt.

## Risks / Trade-offs

- [A background component erodes the "nothing resident" simplicity] → mitigated by
  opt-in, by using only OS-native scheduling (no daemon of ours), by full removal
  on uninstall, and by the check option reporting it honestly.
- [The recorded Zen path goes stale (user moves the installation)] → the guard
  then notifies instead of restoring into a wrong place: it verifies the target
  directory looks like a Zen installation before writing.
- [Notification APIs differ wildly] → each platform gets its native one with a
  log-line fallback; the notification text is part of the installer wording parity
  that verify.ps1 already checks.
- [macOS signature invalidation on restore] → identical to what the installer
  already does; documented, harmless without quarantine.

## Settled Questions

- **Policies spike, resolved: they cannot bootstrap autoconfig.** The `Preferences`
  enterprise policy sets only an explicit allowlist of prefixes
  (mozilla/policy-templates docs, "Preferences that start with the following
  prefixes are supported"), and `general.config.*` is not on it — of `general.`
  only `autoScroll` and `smoothScroll` are allowed. No other policy loads
  privileged JS. There is no update-surviving bootstrap; the guard is necessary.
- **Upstream Zen persistence hook: considered and set aside.** The right fix would
  be the browser supporting this class of mod natively, but the depth of the
  integration makes that unlikely to be accepted; not pursued.

## Open Questions

- Whether the macOS notification should also offer a "restart Zen now" action
  (AppleScript can): deferred — the restored loader working on the next natural
  start may be enough.
