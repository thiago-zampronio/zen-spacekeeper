# Delta for group-presentation

## Purpose

Focus becomes a choice of strategies — count-based or time-based — with an
optional ordering that makes the working set visible.

## MODIFIED Requirements

### Requirement: Automatic collapse of the least used groups

The system SHALL offer focus mode as a choice of strategies — off, a maximum
of groups open at once, or a maximum idle time — and SHALL, when the
groups strategy is chosen, keep expanded the N most recently used groups in
the Space — N being configurable — and collapse the rest.

Keeping only the active group open makes the sidebar flicker on every tab
switch: one group closes and another opens on every click. Preserving the last
N reduces that movement without losing the focus effect. The strategy is a
choice because "how many at once" and "how long untouched" are different
mental models of focus; a binary toggle could only ever mean one of them.

#### Scenario: Switching between two groups with N equal to 3

- **GIVEN** the groups strategy keeps 3 groups open
- **AND** the user has recently used the `github`, `youtube`, and `figma` groups
- **WHEN** the user switches between `github` and `youtube` tabs
- **THEN** the three groups remain expanded
- **AND** no group opens or closes during the switching

#### Scenario: Group drops out of the most recent ones

- **GIVEN** the groups strategy keeps 2 groups open
- **AND** the `github` and `youtube` groups are the most recent ones
- **WHEN** the user selects a tab of the `figma` group
- **THEN** `figma` and `github` are expanded
- **AND** `youtube`, now the third most recent, is collapsed

#### Scenario: Active tab's group was collapsed

- **GIVEN** focus mode is on, either strategy
- **AND** the `github` group is collapsed
- **WHEN** the user selects a tab of that group
- **THEN** the `github` group is expanded

#### Scenario: Focus mode off

- **GIVEN** focus mode is off
- **WHEN** the user switches tabs between groups
- **THEN** no group is collapsed automatically

#### Scenario: Upgrading keeps yesterday's behavior

- **GIVEN** a profile where focus mode was enabled before strategies existed
- **WHEN** the new version starts
- **THEN** focus mode runs the groups strategy with the same N as before

## ADDED Requirements

### Requirement: Idle groups collapse on their own

The system SHALL, when the idle strategy is chosen, collapse a group after a
configurable number of minutes without any of its tabs being touched — where
touching means selecting a tab, or opening or closing a tab of the group —
SHALL reset that group's clock on every touch, and SHALL never collapse the
group of the active tab.

A group nobody uses for an hour is finished work still occupying the eye; the
idle strategy retires it without the user having to decide anything.

#### Scenario: An untouched group retires

- **GIVEN** the idle strategy with a 60-minute window
- **AND** a `youtube` group whose tabs have not been touched for 60 minutes
- **WHEN** the sweep next runs
- **THEN** the `youtube` group collapses

#### Scenario: A touch resets the clock

- **GIVEN** the idle strategy with a 60-minute window
- **AND** a `github` group last touched 59 minutes ago
- **WHEN** the user selects one of its tabs
- **THEN** the group's idle clock restarts from zero

#### Scenario: The active group never retires

- **GIVEN** the idle strategy
- **AND** the active tab belongs to the `figma` group
- **WHEN** the idle window elapses with the user reading that tab
- **THEN** the `figma` group stays expanded

#### Scenario: Manual expand is respected until the next touch cycle

- **GIVEN** the idle strategy collapsed a group
- **WHEN** the user expands it by clicking its chip
- **THEN** the group's clock restarts, and it stays open for a fresh window

### Requirement: Open groups sit above collapsed ones

The system SHALL, when focus mode is active with either strategy and the
reorder option is enabled, keep a Space's expanded groups above its collapsed
groups by moving a group at the moment it closes or opens — a group that
collapses sinks below the open cluster, a group that expands rises above the
collapsed cluster; the move SHALL be minimal, preserving the user's order
inside each cluster; the option SHALL be off by default, SHALL react to
collapse and expand only — never to tab focus, never during a drag — and SHALL
leave loose tabs at the bottom as specified elsewhere.

The ordering makes the focus visible without reading a single label: what is
open is simply what is on top, and closing something files it away downward.

#### Scenario: A closing group sinks

- **GIVEN** focus mode is on with reorder enabled
- **AND** the `github` group sits open above the open `youtube` group
- **WHEN** the `github` group collapses — by hand or by the focus strategy
- **THEN** `github` moves below `youtube`, to the top of the collapsed cluster

#### Scenario: An opening group rises

- **GIVEN** focus mode is on with reorder enabled
- **AND** the collapsed `figma` group sits above the open `github` group
- **WHEN** the `figma` group expands
- **THEN** `figma` moves above the collapsed groups, into the open cluster

#### Scenario: Tab focus alone moves nothing

- **GIVEN** focus mode is on with reorder enabled
- **WHEN** the user switches tabs without any group opening or closing
- **THEN** the strip order does not change

#### Scenario: Reorder off means order untouched

- **GIVEN** focus mode is on with reorder disabled
- **WHEN** groups open and close
- **THEN** the strip order does not change

#### Scenario: Other Spaces are never touched

- **GIVEN** reorder enabled and two Spaces with groups
- **WHEN** a group of the active Space sinks or rises
- **THEN** the groups of the other Space keep their order
