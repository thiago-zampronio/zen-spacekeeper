## ADDED Requirements

### Requirement: An available update is announced, not looked for

The panel SHALL report an available update as a banner at the top of the page,
stating the version in use and the version available, without the user asking.

An update the user never notices is an update that does not happen. Reporting it
where a fault is reported, in the same shape, means it is seen by someone who opened
the panel for an unrelated reason.

#### Scenario: An update exists when the panel opens

- **GIVEN** a newer release exists
- **WHEN** the user opens the panel
- **THEN** a banner states the version in use and the version available

#### Scenario: No update exists

- **WHEN** the user opens the panel and there is no newer release
- **THEN** no banner is shown

#### Scenario: Arriving from the alert

- **GIVEN** the alert in the tab strip is showing
- **WHEN** the user acts on it
- **THEN** the panel opens with the banner already filled in

### Requirement: The banner reads as an opportunity, not a fault

The panel SHALL present the update banner visually distinct from the banner that
reports something wrong, while keeping the same shape and position.

Two banners in the same place carrying opposite meanings must not look identical:
one says the product is misbehaving, the other says something good is available.
Same shape so it is recognized; different color so it is not confused.

#### Scenario: Both kinds are recognizable

- **WHEN** either banner is shown
- **THEN** it occupies the same position and shape as the other
- **AND** the two are visually distinguishable from each other

### Requirement: Release notes are readable, and out of the way

The panel SHALL offer the release notes from the banner, hidden until asked for and
readable when shown, and SHALL NOT require the user to read them to update.

Notes flattened into a diagnostic output area are technically present and
practically unread. Notes that expand on request are there for whoever wants them
and silent for whoever does not.

#### Scenario: Notes on request

- **GIVEN** the update banner is showing
- **WHEN** the user asks for the release notes
- **THEN** the notes for every release newer than the one in use are shown

#### Scenario: Updating without reading them

- **GIVEN** the update banner is showing
- **WHEN** the user updates
- **THEN** no interaction with the notes was required

#### Scenario: A release without notes

- **GIVEN** a newer release that published no notes
- **WHEN** the banner is shown
- **THEN** the notes control is absent or states that there are none

### Requirement: A stale version is settled before an update is offered

When the running version differs from the installed one, the panel SHALL report that
condition and SHALL NOT show the update banner at the same time.

Both conditions end in the same first step — restart — and the staleness one is a
prerequisite: applying an update while the browser runs older code writes new files
that will not take effect either, leaving the user one restart away from correct in
both cases while having read two stacked warnings. Once the restart happens, the
staleness clears and the update banner appears normally.

#### Scenario: Both conditions hold

- **GIVEN** the running version differs from the installed one
- **AND** a newer release exists
- **WHEN** the user opens the panel
- **THEN** only the stale-version banner is shown

#### Scenario: After settling the stale version

- **GIVEN** the user restarted and the running version now matches the installed one
- **AND** a newer release still exists
- **WHEN** the user opens the panel
- **THEN** the update banner is shown

### Requirement: The manual check survives the preference being off

The panel SHALL offer a manual update check when automatic checking is disabled, and
MAY omit it when automatic checking is enabled.

With checking on, a button asking for something that already happened on open is
noise. With it off, that button is the only way to look — removing it would turn a
preference the user set into a dead end, which is a different thing from respecting
it.

#### Scenario: Automatic checking disabled

- **GIVEN** automatic update checking is off
- **WHEN** the user opens the panel
- **THEN** a manual check is available

#### Scenario: Automatic checking enabled

- **GIVEN** automatic update checking is on
- **WHEN** the user opens the panel
- **THEN** the check has already run, and its result is what the panel reports
