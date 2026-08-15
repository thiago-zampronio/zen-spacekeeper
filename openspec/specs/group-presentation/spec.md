# group-presentation Specification

## Purpose
Define how a group presents itself to the user — label, color, and collapse state — and
ensure that this appearance stays stable across Spaces and across sessions.

## Requirements

### Requirement: Label derived from the key

The system SHALL label the groups it creates with the corresponding group key.

#### Scenario: Group by domain

- **WHEN** a group is created for `https://www.youtube.com/watch`
- **THEN** the displayed label is `youtube`

#### Scenario: Group by custom rule

- **GIVEN** a `Dev` rule covering `github.com`
- **WHEN** a group is created for `https://github.com/x`
- **THEN** the displayed label is `Dev`

### Requirement: Identity independent from the label

The system SHALL identify its groups by its own marking, and not by the label text, so
that renaming a group does not break the association with the key.

#### Scenario: User renames a group

- **GIVEN** a group created by the system with key `youtube`
- **WHEN** the user renames the group to `Videos`
- **AND** opens another `youtube.com` tab in the same Space
- **THEN** the tab is added to the renamed group
- **AND** no new `youtube` group is created

### Requirement: Stable color per key

The system SHALL assign a group's color deterministically from the key and SHALL persist
that association.

#### Scenario: Same color in different Spaces

- **GIVEN** a red `youtube` group in the "Personal" Space
- **WHEN** a `youtube` group is created in the "Work" Space
- **THEN** that group is also red

#### Scenario: Color kept across sessions

- **GIVEN** a red `youtube` group
- **WHEN** the user restarts the browser
- **THEN** the recreated `youtube` group is still red

### Requirement: Color chosen by the user

The system SHALL respect the color the user sets manually for a group, preserving it in
the following recreations of that key.

#### Scenario: Manual color preserved

- **GIVEN** the user changed the `youtube` group color to blue
- **WHEN** the `youtube` group is recreated in any Space
- **THEN** it is blue

### Requirement: Collapsing hides the group's tabs

The system SHALL ensure that collapsing a group visually hides its tabs in the sidebar,
keeping only the active tab visible when it belongs to the group.

#### Scenario: Collapsed group hides the tabs

- **GIVEN** a group with three tabs, none of them active
- **WHEN** the user collapses the group
- **THEN** none of the three tabs appear in the sidebar
- **AND** the group label remains visible

#### Scenario: Active tab remains visible

- **GIVEN** a group with three tabs, one of them active
- **WHEN** the user collapses the group
- **THEN** the active tab remains visible
- **AND** the other two are hidden

#### Scenario: Third-party groups are not affected

- **GIVEN** a native Zen folder and a group created by the user
- **WHEN** the system style is applied
- **THEN** the appearance and collapse of those elements remain Zen's own

### Requirement: Collapse state preserved

The system SHALL preserve each group's collapse state, neither expanding nor collapsing a
group on its own when adding or removing tabs.

#### Scenario: Active tab enters a collapsed group with focus enabled

- **GIVEN** focus mode is enabled
- **AND** a collapsed group
- **WHEN** a new tab enters that group and receives focus
- **THEN** the group is expanded by focus mode

This is the deliberate exception to collapse preservation: focus mode keeps the active
tab's group open, and a newly opened tab is the active tab. Without focus mode, the group
stays collapsed.

#### Scenario: Tab added to a collapsed group

- **GIVEN** a collapsed `youtube` group
- **WHEN** a new `youtube.com` tab is added to it
- **THEN** the group stays collapsed

### Requirement: Automatic collapse of the least used groups

The system SHALL, when focus mode is enabled, keep expanded the N most recently used
groups in the Space — N being configurable — and collapse the rest.

Keeping only the active group open makes the sidebar flicker on every tab switch: one
group closes and another opens on every click. Preserving the last N reduces that movement
without losing the focus effect.

#### Scenario: Switching between two groups with N equal to 3

- **GIVEN** focus mode keeps 3 groups open
- **AND** the user has recently used the `github`, `youtube`, and `figma` groups
- **WHEN** the user switches between `github` and `youtube` tabs
- **THEN** the three groups remain expanded
- **AND** no group opens or closes during the switching

#### Scenario: Group drops out of the most recent ones

- **GIVEN** focus mode keeps 2 groups open
- **AND** the `github` and `youtube` groups are the most recent ones
- **WHEN** the user selects a tab of the `figma` group
- **THEN** `figma` and `github` are expanded
- **AND** `youtube`, now the third most recent, is collapsed

#### Scenario: Active tab's group was collapsed

- **GIVEN** focus mode is enabled
- **AND** the `github` group is collapsed
- **WHEN** the user selects a tab of that group
- **THEN** the `github` group is expanded

#### Scenario: Focus mode disabled

- **GIVEN** focus mode is disabled
- **WHEN** the user switches tabs between groups
- **THEN** no group is collapsed automatically

### Requirement: Active tab without a group does not trigger collapse

The system SHALL, when the active tab does not belong to any group, leave the collapse
state of all groups in the Space as it was, even with focus mode enabled.

#### Scenario: Opening a transient tab

- **GIVEN** focus mode is enabled
- **AND** the `github` group is expanded and the `youtube` group is collapsed
- **WHEN** the user opens a new tab that does not belong to any group
- **THEN** the `github` group stays expanded
- **AND** the `youtube` group stays collapsed

### Requirement: System groups are never left nested

The system SHALL detect one of its groups sitting inside another group and restore
it as a sibling at the next organization moment, preserving the group's identity,
label, color and tabs — and SHALL NOT touch nestings that involve only the user's
own groups or folders.

Dragging is how this happens: the browser accepts the drop but renders the nested
tabs at the parent's level. Reordering is what a group drag should mean.

#### Scenario: A system group dropped inside another group

- **GIVEN** a group the system created was dragged inside another group
- **WHEN** the next organization moment runs
- **THEN** the system's group is restored as a sibling, outside the other group
- **AND** its key, label, color and tabs are preserved
- **AND** no tab changes Space

#### Scenario: The user's own structures stay theirs

- **GIVEN** a manual group nested inside another manual group or folder
- **WHEN** the system organizes
- **THEN** nothing is moved
