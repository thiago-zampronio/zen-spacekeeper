# self-update Specification

## Purpose
Let the user update Spacekeeper from inside Spacekeeper — explicitly, visibly, and
from the same source they trusted at install time.

## Requirements

### Requirement: Nothing happens without a click

The system SHALL contact the network for update purposes only in two shapes: a
metadata-only check — shortly after a window opens and then every few hours,
disclosed in the panel and the manual, disabled by a preference — and the
user-initiated check and download from the panel; SHALL NOT download or write
any file except in direct response to the user's click on Update; and SHALL
keep the automatic check silent except for the alert it may raise.

The no-network claim is the product's privacy posture. Its exception grows
from "one click-shaped hole" to "one click-shaped hole plus one disclosed,
disableable heartbeat that reads a single release-metadata endpoint" — and the
line that matters stays absolute: nothing is ever installed without a click.
The heartbeat exists because windows outlive releases: a browser that stays
open for days must still learn about an update without a restart.

#### Scenario: The automatic check is metadata-only

- **GIVEN** the browser started and the automatic check ran
- **WHEN** the latest release is inspected
- **THEN** only release metadata was fetched
- **AND** no file was downloaded or written

#### Scenario: The automatic check can be turned off

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the browser runs for the whole session
- **THEN** no update request is made without a user click

#### Scenario: A user check is only a check

- **WHEN** the user asks whether an update exists
- **THEN** only version information is fetched
- **AND** no file is downloaded or written

#### Scenario: Installing still requires the click

- **GIVEN** the automatic check found a newer release
- **WHEN** the user clicks nothing
- **THEN** nothing is downloaded, and the only visible effect is the alert

### Requirement: Updates come from a release, not a branch

The system SHALL check against and update from the repository's latest published
release tag, and SHALL NOT fetch from a moving branch.

The install one-liner trusts the branch once, at a moment the user chose; an
updater that follows a branch would turn every later push into immediate code on
the user's machine. A release is a deliberate act.

#### Scenario: Check

- **WHEN** the user asks whether an update exists
- **THEN** the latest release version is compared against the running version
- **AND** the result names both versions

#### Scenario: Update

- **GIVEN** the latest release is newer than the running version
- **WHEN** the user confirms the update
- **THEN** the profile-side files are replaced with that release's files
- **AND** the panel states that a restart makes the new version live

### Requirement: The update stays inside the profile

The update SHALL replace only profile-side files, and when the release also
changed the loader, it SHALL say so and point at the installer instead of touching
the application directory.

The application directory may require elevation, and elevation belongs to the
installer, where a human is present by definition.

#### Scenario: Release also changed the loader

- **GIVEN** the latest release changed the loader files
- **WHEN** the user updates from the panel
- **THEN** the profile-side files are updated
- **AND** the result states that the loader changed and the installer must be run

#### Scenario: Download fails midway

- **WHEN** any file of the update cannot be fetched or written
- **THEN** the previously installed files remain in place
- **AND** the failure is reported with the reason

### Requirement: An available update announces itself

The system SHALL, when the automatic check finds a newer release, show a small
floating alert over the sidebar's lower corner naming the available version —
anchored to the window itself, so no browser-layout internals can hide it;
clicking it SHALL open the panel's update section with the check already
performed — the version message and the Update action visible; the alert SHALL
span the tab sidebar's width when that width can be measured; SHALL offer a
dismiss control that hides the alert and silences further automatic checks
until the next session; and the alert SHALL appear only when a newer release
exists.

#### Scenario: The alert appears and leads to one-click distance

- **GIVEN** the automatic check found version x.y.z, newer than the installed one
- **WHEN** the user clicks the alert
- **THEN** the panel opens on the update section
- **AND** the from → to message and the Update button are already on screen

#### Scenario: Not now means quiet until tomorrow

- **GIVEN** the alert is showing
- **WHEN** the user clicks its dismiss control
- **THEN** the alert disappears
- **AND** no further automatic check runs in this session
- **AND** the next session checks and alerts normally

#### Scenario: Up to date means no alert

- **GIVEN** the installed version is the latest release
- **WHEN** the automatic check runs
- **THEN** no alert appears anywhere

### Requirement: A check tells what changed

The system SHALL include, in the check result, the published notes of every
release newer than the installed version — newest first, each under its
version — and SHALL show them with the from → to message, so the decision to
update is made with all the missed changes in view; releases without notes
SHALL degrade to the version message alone.

#### Scenario: Notes with the versions

- **GIVEN** a newer release with published notes
- **WHEN** the check completes — clicked or automatic-then-opened
- **THEN** the panel shows the from → to versions and what the release brought

#### Scenario: Several versions behind means several sets of notes

- **GIVEN** the installed version is three releases behind
- **WHEN** the check completes
- **THEN** the notes of all three missed releases appear, newest first, each
  under its version

### Requirement: Every release publishes its changes

The system's repository SHALL keep a changelog with one entry per released
version, SHALL fail verification when the current version has no entry, and
the published release notes SHALL be that entry.

#### Scenario: A silent version bump fails verification

- **GIVEN** the version constants were bumped
- **WHEN** the changelog has no entry for the new version
- **THEN** `verify.ps1` fails
