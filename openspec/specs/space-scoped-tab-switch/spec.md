# space-scoped-tab-switch Specification

## Purpose
Prevent the automatic switch to an already-open tab from moving the user to another
Space, while preserving that convenience within the current Space.

## Requirements

### Requirement: Switch restricted to the current Space

The system SHALL consider only tabs in the current Space as the target of an automatic
switch to an existing tab.

#### Scenario: Address open only in another Space

- **GIVEN** a `youtube.com` tab open in the "Personal" Space
- **AND** the "Work" Space is active
- **WHEN** the user types `youtube.com` in the address bar and confirms
- **THEN** the active Space remains "Work"
- **AND** the address is opened in a tab of the "Work" Space

#### Scenario: Address open in the current Space

- **GIVEN** a `youtube.com` tab open in the "Work" Space
- **AND** the "Work" Space is active
- **WHEN** the user types `youtube.com` in the address bar and confirms
- **THEN** the browser switches to the already-open tab
- **AND** no new tab is created

#### Scenario: Address open in both Spaces

- **GIVEN** a `youtube.com` tab in "Personal" and another in "Work"
- **AND** the "Work" Space is active
- **WHEN** the user types `youtube.com` and confirms
- **THEN** the browser switches to the tab in the "Work" Space

### Requirement: Essential tabs follow the Space boundary

The system SHALL consider an essential tab as a switch target only when it declares no
Space or declares the current Space. An essential tab that belongs to another Space
SHALL NOT be a target, for the same reason that applies to any other tab.

#### Scenario: Essential tab shared across Spaces

- **GIVEN** an essential tab for `youtube.com` with no declared Space
- **WHEN** the user types `youtube.com` and confirms, in any Space
- **THEN** the browser switches to the essential tab
- **AND** the active Space does not change

#### Scenario: Essential tab belonging to another Space

- **GIVEN** an essential tab for `youtube.com` declared in the "Personal" Space
- **AND** the "Work" Space is active
- **WHEN** the user types `youtube.com` and confirms
- **THEN** the active Space remains "Work"
- **AND** the address is opened in the "Work" Space

### Requirement: Caller contract preserved

The system SHALL preserve the contract of `switchToTabHavingURI`: when there is no
matching tab in the current Space and the caller does not authorize opening a new
tab, the call SHALL report that no switch occurred, instead of opening something on
its own.

#### Scenario: Caller that handles the case itself

- **GIVEN** a caller that requests the switch without authorizing a new tab to be opened
- **AND** the address exists only in another Space
- **WHEN** the switch is requested
- **THEN** the response indicates that no switch occurred
- **AND** no tab is opened by the system

### Requirement: Coverage of all entry points

The system SHALL apply the restriction to all entry points that use the automatic
switch to an existing tab, not just the address bar.

#### Scenario: Bookmark for an address open in another Space

- **GIVEN** a bookmark for `youtube.com`
- **AND** that address is open only in the "Personal" Space
- **AND** the "Work" Space is active
- **WHEN** the user opens the bookmark
- **THEN** the active Space remains "Work"

### Requirement: Behavior can be turned off

The system SHALL allow the restriction to be turned off by preference, restoring Zen's
native behavior without requiring a restart.

#### Scenario: Restriction turned off

- **GIVEN** the restriction preference is turned off
- **AND** `youtube.com` is open only in another Space
- **WHEN** the user types `youtube.com` and confirms
- **THEN** the browser behaves like native Zen and switches Space

### Requirement: Failure does not block navigation

The system SHALL, if the restriction cannot be applied for any reason, delegate to the
native behavior instead of blocking navigation.

#### Scenario: Internal API unavailable

- **GIVEN** Zen's internal Spaces API has changed and cannot be queried
- **WHEN** the user confirms an address in the address bar
- **THEN** navigation happens normally through the native path
- **AND** the error is logged to the console
