# self-update Specification

## Purpose
Let the user update Spacekeeper from inside Spacekeeper — explicitly, visibly, and
from the same source they trusted at install time.

## Requirements

### Requirement: Nothing happens without a click

The system SHALL contact the network for update purposes only in direct response
to a user action in the panel, SHALL NOT schedule or repeat checks on its own, and
SHALL NOT download anything as part of a check.

The no-network claim is the product's privacy posture; this is its single, explicit
exception, and it must stay exactly as wide as the user's click.

#### Scenario: No spontaneous traffic

- **GIVEN** the panel is open or the browser is simply running
- **WHEN** the user clicks nothing update-related
- **THEN** no update request is made

#### Scenario: A check is only a check

- **WHEN** the user asks whether an update exists
- **THEN** only version information is fetched
- **AND** no file is downloaded or written

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
