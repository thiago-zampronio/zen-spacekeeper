# Delta for self-update

## Purpose

An update the user never hears about does not exist; the alert and the notes
close that gap without widening what gets installed silently.

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: An available update announces itself

The system SHALL, when the automatic check finds a newer release, show a small
floating alert over the sidebar's lower corner naming the available version —
anchored to the window itself, so no browser-layout internals can hide it;
clicking it SHALL open the panel's update section with the check already
performed — the version message and the Update action visible; and the alert
SHALL appear only when a newer release exists.

#### Scenario: The alert appears and leads to one-click distance

- **GIVEN** the automatic check found version x.y.z, newer than the installed one
- **WHEN** the user clicks the alert
- **THEN** the panel opens on the update section
- **AND** the from → to message and the Update button are already on screen

#### Scenario: Up to date means no alert

- **GIVEN** the installed version is the latest release
- **WHEN** the automatic check runs
- **THEN** no alert appears anywhere

### Requirement: A check tells what changed

The system SHALL include the release's published notes in the check result and
SHALL show them with the from → to message, so the decision to update is made
with the changes in view; a release without notes SHALL degrade to the version
message alone.

#### Scenario: Notes with the versions

- **GIVEN** a newer release with published notes
- **WHEN** the check completes — clicked or automatic-then-opened
- **THEN** the panel shows the from → to versions and what the release brought

### Requirement: Every release publishes its changes

The system's repository SHALL keep a changelog with one entry per released
version, SHALL fail verification when the current version has no entry, and
the published release notes SHALL be that entry.

#### Scenario: A silent version bump fails verification

- **GIVEN** the version constants were bumped
- **WHEN** the changelog has no entry for the new version
- **THEN** `verify.ps1` fails
