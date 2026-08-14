# group-visuals Specification

## Purpose
Give the groups created by the system the visual finish that Zen only offers to its
native folders: knowing what is hidden and looking like part of the interface.

## Requirements

### Requirement: Hidden tab count

The system SHALL display, on a collapsed group, the number of hidden tabs, and
SHALL NOT display any count when the group is expanded.

#### Scenario: Collapsed group with hidden tabs

- **GIVEN** a group with three tabs, none of them active
- **WHEN** the user collapses the group
- **THEN** the group displays the count `3`

#### Scenario: Expanded group

- **GIVEN** a collapsed group displaying the count
- **WHEN** the user expands the group
- **THEN** no count is displayed

#### Scenario: Active tab is not counted

- **GIVEN** a group with three tabs, one of them active
- **WHEN** the user collapses the group
- **THEN** the active tab remains visible
- **AND** the group displays the count `2`

### Requirement: Count follows the group content

The system SHALL update the count when tabs enter or leave a collapsed group.

#### Scenario: Tab added to a collapsed group

- **GIVEN** a collapsed group displaying the count `3`
- **WHEN** a new tab from the same domain is grouped into it
- **THEN** the count becomes `4`

#### Scenario: Tab closed inside a collapsed group

- **GIVEN** a collapsed group displaying the count `3`
- **WHEN** the user closes one of the hidden tabs
- **THEN** the count becomes `2`

### Requirement: Shape aligned with the Zen interface

The system SHALL round the container of the groups it creates, using the same radius
adopted by the rest of the Zen interface when it is available.

#### Scenario: Group created by the system

- **WHEN** a group is created by the system
- **THEN** its container appears with rounded corners

### Requirement: Collapsed group recedes in emphasis

The system SHALL present a collapsed group with less visual emphasis than an expanded
group, and SHALL preserve the legibility of the label and the count.

What is hidden must not gain prominence: a collapsed chip stronger than the expanded
one inverts the meaning of the state.

#### Scenario: Collapsed next to expanded

- **GIVEN** one collapsed group and another expanded one in the same list
- **WHEN** the user looks at both
- **THEN** the collapsed one appears with less emphasis than the expanded one
- **AND** the group color remains recognizable on the collapsed one

#### Scenario: Label and count remain legible

- **GIVEN** a collapsed group
- **WHEN** the user reads the label and the count
- **THEN** both remain legible against the sidebar background

### Requirement: Visible hierarchy between group and tabs

The system SHALL present the tabs of a group as visually subordinate to its label, so
that the boundary between two neighboring groups is perceptible without reading the
labels.

#### Scenario: Two consecutive groups

- **GIVEN** two consecutive groups in the sidebar, each one with tabs
- **WHEN** the user looks at the list
- **THEN** there is visible separation between the last item of one group and the
  label of the next one
- **AND** the tabs appear indented relative to the label of their own group

#### Scenario: Collapsed group does not take up content space

- **GIVEN** a collapsed group
- **WHEN** the user looks at the list
- **THEN** the group takes up the height of the label, with no space reserved for the
  hidden tabs

### Requirement: Finish restricted to the system's groups

The visual finish SHALL be applied only to the groups created by this system.

#### Scenario: Native folder and user group

- **GIVEN** a native Zen folder and a group created by the user
- **WHEN** the finish is applied
- **THEN** neither of them displays a count
- **AND** both keep the appearance Zen gives them
