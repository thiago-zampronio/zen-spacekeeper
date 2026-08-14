## ADDED Requirements

### Requirement: Commands reachable without the console

The system SHALL make its organization commands available through the browser's
interface, without requiring the user to open a console.

#### Scenario: From a tab

- **WHEN** the user opens the context menu of a tab
- **THEN** the organization commands are available there

#### Scenario: From the empty area of the tab strip

- **WHEN** the user opens the context menu of the tab strip's empty area
- **THEN** the organization commands are available there as well

The empty area is where people click when they want to act on the list as a whole
rather than on one tab.

#### Scenario: Commands grouped under the product's name

- **WHEN** the user opens either context menu
- **THEN** the commands appear grouped under a single entry named after the product
- **AND** the browser's own menu items are not displaced

### Requirement: Keyboard shortcuts for the most frequent commands

The system SHALL offer keyboard shortcuts for regrouping and ungrouping the
current Space.

#### Scenario: Regrouping from the keyboard

- **WHEN** the user presses the regroup shortcut
- **THEN** the current Space is regrouped

#### Scenario: Ungrouping from the keyboard

- **WHEN** the user presses the ungroup shortcut
- **THEN** the current Space is ungrouped

#### Scenario: A shortcut the keyboard layout does not deliver

- **GIVEN** a keyboard layout on which the shortcut never reaches the browser
- **WHEN** the user needs the command
- **THEN** the same command remains available through the context menu

Shortcuts are a convenience, never the only way to reach a command: some layouts
consume the combinations before the browser sees them.

### Requirement: Each command reports what it did

The system SHALL report the outcome of every command in terms of what changed, and
SHALL distinguish having done nothing from having failed.

"Nothing to do" and "it did not work" look identical to a user when a command
answers with silence.

#### Scenario: A command that changed something

- **WHEN** the user regroups a Space where tabs were out of place
- **THEN** the outcome states how many tabs were reorganized

#### Scenario: A command that had nothing to do

- **WHEN** the user regroups a Space that is already organized
- **THEN** the outcome states that there was nothing to do

### Requirement: Confirmation before a loss that cannot be undone

The system SHALL ask for confirmation before ungrouping, stating that the names
given to those groups are lost and are not restored by regrouping.

#### Scenario: Ungrouping from the panel

- **WHEN** the user triggers ungroup from the panel
- **THEN** a confirmation is requested first
- **AND** it states that the group names will be lost

#### Scenario: Confirmation declined

- **WHEN** the user declines the confirmation
- **THEN** no group is undone
