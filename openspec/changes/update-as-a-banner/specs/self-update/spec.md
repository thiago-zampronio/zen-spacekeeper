## MODIFIED Requirements

### Requirement: An available update announces itself

The system SHALL, when the automatic check finds a newer release, show a small
floating alert over the sidebar's lower corner naming the available version —
anchored to the window itself, so no browser-layout internals can hide it;
clicking it SHALL open the panel, where the update banner is already filled in —
the version message, the release notes and the Update action visible; the alert
SHALL span the tab sidebar's width when that width can be measured; SHALL offer
a dismiss control that hides the alert and silences further automatic checks
until the next session; and the alert SHALL appear only when a newer release
exists.

The alert used to land on the maintenance section's update controls; those were
replaced by the banner, and the alert lands on the banner now.

#### Scenario: The alert appears and leads to one-click distance

- **GIVEN** the automatic check found version x.y.z, newer than the installed one
- **WHEN** the user clicks the alert
- **THEN** the panel opens with the update banner filled in
- **AND** the versions, the notes and the Update action are already on screen

#### Scenario: Not now means quiet until tomorrow

- **GIVEN** the alert is showing
- **WHEN** the user clicks its dismiss control
- **THEN** the alert disappears from every window
- **AND** no further automatic check runs in this session — not the heartbeat,
  not the panel-open check
- **AND** the next session checks and alerts normally

#### Scenario: Up to date means no alert

- **GIVEN** the installed version is the latest release
- **WHEN** the automatic check runs
- **THEN** no alert appears anywhere

### Requirement: Nothing happens without a click

The system SHALL contact the network for update purposes only in these shapes: a
metadata-only check — shortly after a window opens, every few hours, and when the
panel is opened, disclosed in the panel and the manual, disabled by a preference —
and the user-initiated check and download from the panel; SHALL NOT download or
write any file except in direct response to the user's click on Update; and SHALL
keep the automatic check silent except for the alert it may raise.

The no-network claim is the product's privacy posture. Its exception grows from "one
click-shaped hole" to "one click-shaped hole plus one disclosed, disableable
heartbeat that reads a single release-metadata endpoint" — and the line that matters
stays absolute: nothing is ever installed without a click. The heartbeat exists
because windows outlive releases: a browser that stays open for days must still
learn about an update without a restart.

Opening the panel joins that heartbeat rather than forming a new exception: it is
the same endpoint, the same metadata, and the same preference switches it off. The
panel is where an update is acted on, and arriving at it with the answer already
fetched is the difference between an update being noticed and being looked for.

#### Scenario: The automatic check is metadata-only

- **GIVEN** the browser started and the automatic check ran
- **WHEN** the latest release is inspected
- **THEN** only release metadata was fetched
- **AND** no file was downloaded or written

#### Scenario: The automatic check can be turned off

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the browser runs for the whole session
- **THEN** no update request is made without a user click

#### Scenario: Opening the panel obeys the same preference

- **GIVEN** `zen.stg.updateCheck` is false
- **WHEN** the user opens the panel
- **THEN** no update request is made
- **AND** the panel offers a manual check instead

#### Scenario: A user check is only a check

- **WHEN** the user asks whether an update exists
- **THEN** only version information is fetched
- **AND** no file is downloaded or written

#### Scenario: Installing still requires the click

- **GIVEN** the automatic check found a newer release
- **WHEN** the user clicks nothing
- **THEN** nothing is downloaded, and the only visible effect is the alert
