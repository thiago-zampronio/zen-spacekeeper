# space-isolation Specification

## Purpose
Ensure that automatic tab organization never crosses the boundary of a Zen Space, nor
alters structures the browser or the user maintains on their own.

## Requirements

### Requirement: Tab Space preservation

The system SHALL preserve the Space of each tab, never moving a tab from one Space to
another as a side effect of any organization operation.

#### Scenario: Domain already grouped in another Space

- **GIVEN** an existing `youtube` group in the "Personal" Space
- **AND** the "Work" Space is active
- **WHEN** the user opens `https://youtube.com/watch?v=abc`
- **THEN** the tab stays in the "Work" Space
- **AND** the `youtube` group in the "Personal" Space keeps the same tabs

#### Scenario: Bulk reorganization

- **GIVEN** tabs across several Spaces
- **WHEN** any organization operation runs
- **THEN** no tab changes Space

### Requirement: Per-Space group scope

The system SHALL treat groups from different Spaces as independent entities, even when
they share the same key, and changes to one group SHALL NOT affect the group with the
same key in another Space.

#### Scenario: Same key in two Spaces

- **GIVEN** `youtube.com` tabs open in the "Personal" Space and in the "Work" Space
- **WHEN** automatic organization runs
- **THEN** a `youtube` group exists in each Space
- **AND** each group contains only the tabs of its own Space

#### Scenario: Isolated change

- **GIVEN** `youtube` groups in two Spaces
- **WHEN** the user closes every tab of the group in the "Work" Space
- **THEN** the `youtube` group in the "Personal" Space remains unchanged

### Requirement: Space determined by the tab

The system SHALL determine the target Space from the tab itself, not from the Space
active in the window.

#### Scenario: Tab opened in the background in a non-active Space

- **GIVEN** the "Personal" Space is active
- **WHEN** a tab belonging to the "Work" Space is opened in the background
- **THEN** the tab is organized among the groups of the "Work" Space
- **AND** no group in the "Personal" Space is created or changed

### Requirement: Preservation of native Zen structures

The system SHALL leave essential tabs, pinned tabs, native Zen folders and split view
groups intact, not including them in any organization operation.

#### Scenario: Essential tab

- **GIVEN** an essential tab for `youtube.com`
- **WHEN** automatic organization runs
- **THEN** the tab stays in the essentials area
- **AND** is not added to any group

#### Scenario: Native Zen folder

- **GIVEN** a Zen folder containing `github.com` tabs
- **WHEN** the user opens another `github.com` tab
- **THEN** the Zen folder is not modified
- **AND** the new tab is organized outside of it

#### Scenario: Split view

- **GIVEN** two tabs in split view
- **WHEN** automatic organization runs
- **THEN** the split view grouping stays intact

### Requirement: Preservation of the user's manual organization

The system SHALL consider groups it did not create itself to be untouchable, neither
removing those groups nor relocating the tabs contained in them.

#### Scenario: Tab inside a user-created group

- **GIVEN** a `Estudos` group created manually by the user
- **AND** that group contains a `youtube.com` tab
- **WHEN** automatic organization runs
- **THEN** the tab stays in `Estudos`
- **AND** is not moved to the `youtube` group
