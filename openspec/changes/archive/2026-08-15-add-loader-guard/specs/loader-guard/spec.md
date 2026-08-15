## Purpose

Survive the one failure the project cannot prevent: the browser update that deletes
the loader. Detect it from outside the browser, restore what can be restored
without privilege, and say what happened.

## ADDED Requirements

### Requirement: The guard lives outside the browser

The guard SHALL run as an operating-system facility (per-user, no elevation),
independent of the browser process, and SHALL keep working after a browser update
replaces the application directory.

Anything loaded by the browser dies with the loader it would be guarding; only the
operating system survives the update.

#### Scenario: A browser update removes the loader

- **GIVEN** the guard is installed
- **WHEN** a browser update deletes the loader files
- **THEN** the guard detects it without the browser's help

### Requirement: Restore when the system allows it, notify when it does not

The guard SHALL attempt to restore the loader files from the profile-side cache,
and SHALL fall back to notifying the user whenever the write is denied — whether
by file permissions or by an OS protection such as macOS App Management, which
denies background writes into application bundles even when POSIX permissions
would allow them. It SHALL NOT request elevation or any permission grant from the
background, SHALL notify what it did in either case, and SHALL log the denial's
actual reason.

A background process asking for a password or a permission is indistinguishable
from malware asking for one. The guard's job is to make the failure visible within
seconds and, where the system allows, already fixed.

#### Scenario: The write is allowed

- **GIVEN** the loader files are missing
- **AND** the operating system allows the guard to write them
- **WHEN** the guard runs
- **THEN** the loader files are restored from the cache
- **AND** the user is notified that a restore happened

#### Scenario: The write is denied

- **GIVEN** the loader files are missing
- **AND** the write is denied by permissions or by an OS protection
- **WHEN** the guard runs
- **THEN** no elevation or permission is requested
- **AND** the user is notified to re-run the installer
- **AND** the denial's reason is logged

#### Scenario: Nothing is missing

- **WHEN** the guard runs and the loader files are present
- **THEN** it does nothing and notifies nothing

### Requirement: The restore source is a local cache

The guard SHALL restore only from a copy of the loader files cached in the profile
at install time, byte-for-byte, and SHALL NOT fetch anything over the network.

The profile survives updates; the cache makes the guard self-contained and keeps
the no-network claim true for every component.

#### Scenario: Restoring

- **WHEN** the guard restores the loader
- **THEN** the written files are identical to the cached ones
- **AND** no network request is made

#### Scenario: The cache itself is missing

- **GIVEN** the profile-side cache is absent
- **WHEN** the guard finds the loader missing
- **THEN** it notifies the user to re-run the installer
- **AND** writes nothing

### Requirement: Self-contained after install

The guard SHALL depend only on what the installer deployed (the profile directory
and the watcher entry) and on operating-system facilities. Deleting the installer,
the repository clone, or having no network SHALL NOT affect any of the guard's
behavior.

Think like an installer: once installed, the installer can be deleted and
everything keeps working. The only moment that ever needs the installer again is
the notify-only path, whose recovery instruction is the same piped one-liner that
needs no prior artifact.

#### Scenario: Installer and clone deleted

- **GIVEN** the guard is installed
- **AND** the installer file and any repository clone were deleted
- **WHEN** a browser update removes the loader
- **THEN** the guard detects, restores or notifies exactly as specified

#### Scenario: No network

- **GIVEN** the machine is offline
- **WHEN** the guard runs
- **THEN** every behavior works, since nothing is fetched

### Requirement: The guard never outlives its reason to exist

The guard SHALL verify, on every run, that the mod's own files are still installed
in the profile, and SHALL remove itself entirely — watcher, schedule, script and
cache — when they are not.

The formal uninstall only reaches people who remember it. Someone who deleted the
mod by hand, or abandoned the profile, must not keep a watcher running forever
over something that no longer exists: orphaned persistence is exactly the
discomfort that makes people distrust background components.

#### Scenario: The mod was removed by hand

- **GIVEN** the guard is installed
- **AND** the mod's files are no longer in the profile
- **WHEN** the guard runs
- **THEN** it removes its watcher, its schedule, its script and its cache
- **AND** restores nothing

#### Scenario: The mod is present

- **GIVEN** the mod's files are in the profile
- **WHEN** the guard runs
- **THEN** it stays installed and proceeds normally

### Requirement: Nothing about the guard is hidden

Everything the guard leaves on the machine SHALL live in one profile directory
plus one OS watcher entry, both documented; and every notification SHALL name what
was done and from a cache of which date.

#### Scenario: The user audits the machine

- **WHEN** the user looks at the documented locations
- **THEN** the guard's entire footprint is there: one directory, one watcher entry

#### Scenario: A restore is reported

- **WHEN** the guard restores the loader
- **THEN** the notification states that a restore happened
- **AND** it states the date the cached copy was made

### Requirement: Opt-in, visible, removable

The guard SHALL be installed only on explicit request, SHALL be visible through
the installer's check output, and SHALL be fully removed by the uninstall option —
leaving no watcher, no schedule and no cache behind.

#### Scenario: Not requested

- **WHEN** the user installs without asking for the guard
- **THEN** no watcher or schedule is created

#### Scenario: Checked

- **GIVEN** the guard is installed
- **WHEN** the user runs the installer's check option
- **THEN** the guard is reported as its own part, alongside the loader and the mod

#### Scenario: Uninstalled

- **GIVEN** the guard is installed
- **WHEN** the user runs the uninstall option
- **THEN** the watcher, its schedule and the cache are removed
