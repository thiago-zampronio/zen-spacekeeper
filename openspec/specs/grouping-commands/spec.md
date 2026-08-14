# grouping-commands Specification

## Purpose
Give the user manual actions that reorganize, undo and collapse the groups of the
Space they are in, without affecting the other Spaces.

## Requirements

### Requirement: Command scope

Every organization command SHALL act exclusively on the current Space and SHALL
leave the other Spaces unchanged.

#### Scenario: Command does not leak into another Space

- **GIVEN** existing groups in the "Personal" and "Work" Spaces
- **AND** the "Work" Space is active
- **WHEN** the user triggers any organization command
- **THEN** only the groups of the "Work" Space are affected

### Requirement: Regroup the current Space

The system SHALL offer a command that re-evaluates the eligible tabs of the current Space and
redistributes them into the groups matching their keys.

#### Scenario: Fix existing organization

- **GIVEN** loose tabs and tabs in system groups in the current Space
- **WHEN** the user triggers the regroup command
- **THEN** each eligible tab ends up in the group matching its key

#### Scenario: User-created group is respected

- **GIVEN** an `Estudos` group created manually containing a `youtube.com` tab
- **WHEN** the user triggers the regroup command
- **THEN** the `Estudos` group still exists with the same name
- **AND** the `youtube.com` tab stays inside it

#### Scenario: Minimum tabs is respected

- **GIVEN** the configured minimum is 3
- **AND** there is a single loose `example.com` tab in the Space
- **WHEN** the user triggers the regroup command
- **THEN** the tab stays loose
- **AND** no `example` group is created

#### Scenario: Command available with automatic organization turned off

- **GIVEN** automatic organization is disabled
- **WHEN** the user triggers the regroup command
- **THEN** the eligible tabs of the Space are organized normally

### Requirement: Ungroup the current Space

The system SHALL offer a command that undoes the groups it created in the current
Space, releasing the tabs.

#### Scenario: Undo automatic organization

- **GIVEN** groups created by the system in the current Space
- **WHEN** the user triggers the ungroup command
- **THEN** the tabs of those groups become loose in the Space
- **AND** the groups created by the system cease to exist

#### Scenario: Manual organization survives

- **GIVEN** an `Estudos` group created by the user and a native Zen folder
- **WHEN** the user triggers the ungroup command
- **THEN** the `Estudos` group and the folder remain intact

### Requirement: Rename the active tab's group

The system SHALL offer a command that renames the active tab's group, and the new
name SHALL NOT change the key by which the group is recognized.

#### Scenario: Rename and keep grouping

- **GIVEN** a `youtube` group created by the system
- **WHEN** the user renames the group to `Videos` through the command
- **AND** opens another `youtube.com` tab in the same Space
- **THEN** the tab goes into the `Videos` group
- **AND** no new group is created

#### Scenario: Tab outside a system group

- **GIVEN** the active tab does not belong to a group created by the system
- **WHEN** the user triggers the rename command
- **THEN** nothing is renamed

### Requirement: Collapse and expand all groups

The system SHALL offer commands that collapse and that expand all groups of the
current Space at once.

#### Scenario: Collapse all

- **GIVEN** expanded groups in the current Space
- **WHEN** the user triggers the collapse all command
- **THEN** all groups of the Space become collapsed

#### Scenario: Expand all

- **GIVEN** collapsed groups in the current Space
- **WHEN** the user triggers the expand all command
- **THEN** all groups of the Space become expanded

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
